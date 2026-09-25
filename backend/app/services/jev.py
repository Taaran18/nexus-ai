import logging
import time

import httpx

from app.config import settings

logger = logging.getLogger("nexus")

LEVELS = ["Very poor", "Poor", "Fair", "Good", "Excellent"]
_client: httpx.AsyncClient | None = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.jev_base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {settings.jev_api_key}", "Content-Type": "application/json"},
            timeout=httpx.Timeout(25, connect=8),
        )
    return _client


async def ask(state, questions: dict, timeout: float = 25) -> tuple[dict | None, dict]:
    if not settings.jev_enabled or not questions:
        return None, {}
    started = time.monotonic()
    try:
        response = await _http().post(
            "/systemone",
            json={"model": settings.jev_model, "state": state, "questions": questions},
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        logger.warning("jev_unreachable error=%s", type(exc).__name__)
        return None, {}
    if response.status_code >= 400:
        level = logging.ERROR if response.status_code in (401, 403) else logging.WARNING
        logger.log(level, "jev_error status=%s", response.status_code)
        return None, {}
    data = response.json()
    usage = data.get("usage") or {}
    logger.info(
        "jev_ok questions=%d ms=%d tokens=%s",
        len(questions),
        (time.monotonic() - started) * 1000,
        usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
    )
    return data.get("answers") or {}, {
        "input": int(usage.get("input_tokens", 0)),
        "output": int(usage.get("output_tokens", 0)),
    }


async def route(question: str, has_documents: bool) -> tuple[str | None, float, dict]:
    criteria = {
        "search": "Needs fresh or live information from the internet: news, prices, weather, sports, "
        "recent releases, events after 2024, or the user explicitly asks to search",
        "general": "Can be answered from general knowledge: explanations, writing, coding, maths, advice, ideas",
    }
    if has_documents:
        criteria["rag"] = "Asks about the user's own uploaded files, documents, notes, contracts or knowledge base"
    answers, usage = await ask(
        {"user_message": question[:4000]},
        {
            "route": {
                "type": "choice",
                "instructions": "Where should an AI assistant look to answer `user_message`?",
                "criteria": criteria,
            }
        },
        timeout=12,
    )
    answer = (answers or {}).get("route") or {}
    choice = answer.get("choice")
    if choice not in criteria:
        return None, 0.0, usage
    return choice, float(answer.get("confidence", 0)), usage


def _to_ten(score: float) -> int:
    return max(1, min(10, round(1 + score * 9 / (len(LEVELS) - 1))))


async def score_board(question: str, analysis: str, board: dict) -> tuple[dict, dict]:
    questions: dict = {}
    for i, option in enumerate(board["options"]):
        for j, criterion in enumerate(board["criteria"]):
            questions[f"s{i}_{j}"] = {
                "type": "score",
                "instructions": {
                    "option": f"{option['name']}: {option['summary']}",
                    "criterion": f"{criterion['name']}: {criterion['why']}",
                    "question": "For the user's situation in the state, how well does `option` do on `criterion`? "
                    "Higher is always better for the user (for costs and risks, lower cost or risk rates higher).",
                },
                "criteria": LEVELS,
            }
    questions["pick"] = {
        "type": "choice",
        "instructions": "Which option is the best decision for the user, considering everything in the state?",
        "criteria": {option["name"]: option["summary"] or None for option in board["options"]},
    }
    answers, usage = await ask({"decision": question[:3000], "analysis": analysis[:8000]}, questions, timeout=30)
    if not answers:
        return board, usage
    options = []
    for i, option in enumerate(board["options"]):
        scores, confidence = dict(option["scores"]), {}
        for j, criterion in enumerate(board["criteria"]):
            answer = answers.get(f"s{i}_{j}") or {}
            if "score" in answer:
                scores[criterion["name"]] = _to_ten(float(answer["score"]))
                confidence[criterion["name"]] = round(float(answer.get("confidence", 0)), 2)
        options.append({**option, "scores": scores, "confidence": confidence})
    pick = answers.get("pick") or {}
    names = [o["name"] for o in options]
    probabilities = {k: round(float(v), 3) for k, v in (pick.get("probabilities") or {}).items() if k in names}
    recommendation = pick.get("choice") if pick.get("choice") in names else board.get("recommendation")
    confidence = float(pick.get("confidence", 0))
    reason = (
        f"JEV scored {len(options)} options on {len(board['criteria'])} criteria and picked {recommendation} "
        f"with {round(confidence * 100)}% confidence."
        if recommendation and pick
        else board.get("reason", "")
    )
    return {
        **board,
        "options": options,
        "reason": reason,
        "scored_by": "JEV by TypeSafe",
        "recommendation": recommendation,
        "pick": {"probabilities": probabilities, "confidence": round(float(pick.get("confidence", 0)), 2)}
        if probabilities
        else None,
    }, usage
