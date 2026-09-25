import json
import re


def _clamp(value, low: int, high: int) -> int:
    try:
        return max(low, min(high, int(round(float(value)))))
    except (TypeError, ValueError):
        return low


def parse_board(text: str) -> dict | None:
    match = re.search(r"\{[\s\S]*\}", text or "")
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict) or not data.get("is_decision"):
        return None
    criteria = []
    for item in data.get("criteria") or []:
        name = str(item.get("name", "")).strip()[:40] if isinstance(item, dict) else ""
        if name and name not in [c["name"] for c in criteria]:
            criteria.append(
                {"name": name, "weight": _clamp(item.get("weight"), 1, 5), "why": str(item.get("why", ""))[:160]}
            )
    options = []
    for item in data.get("options") or []:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()[:60]
        scores = item.get("scores") if isinstance(item.get("scores"), dict) else {}
        if name:
            options.append(
                {
                    "name": name,
                    "summary": str(item.get("summary", ""))[:200],
                    "scores": {c["name"]: _clamp(scores.get(c["name"], 5), 1, 10) for c in criteria},
                }
            )
    criteria, options = criteria[:6], options[:5]
    if len(criteria) < 2 or len(options) < 2:
        return None
    recommendation = str(data.get("recommendation", "")).strip()
    return {
        "title": str(data.get("title") or "Decision Board")[:80],
        "criteria": criteria,
        "options": options,
        "recommendation": recommendation if recommendation in [o["name"] for o in options] else None,
        "reason": str(data.get("reason", ""))[:240],
    }
