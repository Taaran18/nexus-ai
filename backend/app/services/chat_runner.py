import asyncio
import json
import logging
import math
import re
import time
from collections.abc import AsyncIterator

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from app.config import settings
from app.core.errors import AppError
from app.graph.builder import NODE_LABELS, nexus_graph
from app.llm.catalog import groq_entry
from app.llm.factory import byok_model, groq_catalog_model, groq_model, think_engine
from app.llm.providers import get_provider
from app.services import memory
from app.services.citations import attach_highlights
from app.store import chats, documents, keys
from app.store import usage as trial_usage

logger = logging.getLogger("nexus")


def resolve_llm(user_id: str, provider: str, model: str):
    if provider == "groq":
        entry = groq_entry(model)
        if entry is None:
            raise AppError(
                400, "unknown_model", "That model isn't available anymore. Pick another model and try again."
            )
        return groq_catalog_model(entry), entry["name"]
    if get_provider(provider) is None:
        raise AppError(400, "unknown_provider", "That provider isn't supported.")
    return byok_model(provider, model, keys.get(user_id, provider)), model


def to_history(messages: list[dict], limit: int = 20) -> list[BaseMessage]:
    history: list[BaseMessage] = []
    for m in messages[-limit:]:
        if not m.get("content"):
            continue
        history.append(HumanMessage(content=m["content"]) if m["role"] == "user" else AIMessage(content=m["content"]))
    return history


GENERATION_TIMEOUT = 180

STEP_NAMES = {
    "classify": "Understand",
    "retrieve": "Documents",
    "web_search": "Web Search",
    "deliberate": "Think",
    "generate": "Write",
    "decide": "Decision Board",
}

_INTENT_DETAIL = {
    "rag": "About your documents",
    "search": "Needs fresh information",
    "general": "Answer from knowledge",
}


def _step_detail(node: str, output: dict) -> str:
    if node == "classify":
        detail = _INTENT_DETAIL.get(output.get("intent", "general"), "")
        if output.get("router") == "JEV" and output.get("route_confidence"):
            return f"{detail} · JEV {round(output['route_confidence'] * 100)}% sure"
        if output.get("router") == "your choice":
            return "Your documents, as you chose"
        return detail
    if node == "retrieve":
        count = len(output.get("sources") or [])
        return f"{count} passage{'s' if count != 1 else ''} found" if count else "No matching passages"
    if node == "web_search":
        count = len(output.get("sources") or [])
        return f"{count} result{'s' if count != 1 else ''}" if count else "No results"
    if node == "deliberate":
        return "Options weighed"
    if node == "generate":
        words = len((output.get("answer") or "").split())
        return f"{words} words"
    if node == "decide":
        board = output.get("board")
        if not board:
            return "Not a decision"
        return "Scored by JEV" if board.get("scored_by", "").startswith("JEV") else "Board ready"
    return ""


def _usage_of(event: dict) -> tuple[int, int, bool]:
    output = event["data"].get("output")
    meta = getattr(output, "usage_metadata", None)
    if isinstance(meta, dict) and meta.get("total_tokens"):
        return int(meta.get("input_tokens", 0)), int(meta.get("output_tokens", 0)), False
    batches = (event["data"].get("input") or {}).get("messages") or []
    input_chars = sum(len(str(getattr(m, "content", ""))) for batch in batches for m in batch)
    output_chars = len(getattr(output, "text", "") or "")
    return math.ceil(input_chars / 4), math.ceil(output_chars / 4), True


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _friendly_error(exc: Exception, provider: str) -> tuple[str, str]:
    if isinstance(exc, AppError):
        return exc.code, exc.message
    status = getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)
    name = type(exc).__name__
    source = (
        "Groq"
        if provider == "groq"
        else (get_provider(provider).name if get_provider(provider) else "The model provider")
    )
    if status in (401, 403) or "Authentication" in name or "PermissionDenied" in name:
        if provider == "groq":
            logger.error("groq_key_rejected check GROQ_API_KEY in the backend environment")
            return (
                "service_unavailable",
                "The free models aren't available right now because Nexus can't connect to Groq. "
                "Try again later, or pick a model from your own API key in Settings → Models & Keys.",
            )
        return "invalid_key", f"{source} rejected your API key. Update it in Settings → Models & Keys."
    if status == 429 or "RateLimit" in name:
        return "rate_limited", f"{source} is receiving too many requests right now. Wait a moment and try again."
    if status == 404 or "NotFound" in name:
        return "model_unavailable", f"{source} says this model isn't available to you. Choose a different model."
    if status == 402 or "quota" in str(exc).lower() or "insufficient" in str(exc).lower():
        return "quota_exceeded", f"Your {source} account is out of credit or over its quota."
    if "context" in str(exc).lower() and "length" in str(exc).lower():
        return (
            "too_long",
            "This conversation is too long for the selected model. Start a new chat or pick a model with a larger context.",
        )
    if "Timeout" in name or isinstance(exc, (asyncio.TimeoutError, TimeoutError)):
        return "timeout", f"{source} took too long to respond. Try again, or pick a faster model."
    if "Connection" in name:
        return "provider_unreachable", f"We couldn't reach {source}. Try again in a moment."
    return "generation_failed", "Something went wrong while writing the answer. Try again."


async def _title_for(question: str) -> str | None:
    try:
        result = await asyncio.wait_for(
            groq_model(settings.router_model, temperature=0.2).ainvoke(
                [
                    SystemMessage(
                        content="Write a 2 to 6 word title for a chat that starts with the message below. Title Case. No quotes, no punctuation at the end. Reply with the title only."
                    ),
                    HumanMessage(content=question[:1500]),
                ]
            ),
            timeout=10,
        )
        title = re.sub(r"[\"'*#]", "", (result.text or "").strip().splitlines()[0] if result.text else "").strip()
        return title[:80] or None
    except Exception:
        return None


def fallback_title(message: str) -> str:
    text = " ".join(message.split())
    return text[:60] + ("…" if len(text) > 60 else "")


async def stream_answer(
    *,
    user_id: str,
    chat_id: str,
    is_new_chat: bool,
    question: str,
    prior: list[dict],
    provider: str,
    model: str,
    llm,
    model_label: str,
    ip: str,
    think: bool,
    use_memory: bool,
    source_mode: str = "auto",
    document_ids: list[str] | None = None,
) -> AsyncIterator[str]:
    started = time.monotonic()
    answer, thinking = "", ""
    sources: list[dict] = []
    intent = "general"
    tokens = {"input": 0, "output": 0, "estimated": False}
    pipeline: list[dict] = []
    node_started: dict[str, float] = {}
    node_tokens: dict[str, int] = {}
    board: dict | None = None
    finished = False
    think_label = think_engine()[1] if think else None

    def build_message(stopped: bool = False) -> dict:
        return chats.new_message(
            "assistant",
            answer,
            provider=provider,
            model=model,
            model_label=model_label,
            think=think,
            think_engine=think_label,
            thinking=thinking or None,
            sources=sources,
            intent=intent,
            input_tokens=tokens["input"] or None,
            output_tokens=tokens["output"] or None,
            total_tokens=(tokens["input"] + tokens["output"]) or None,
            tokens_estimated=tokens["estimated"],
            source_mode=source_mode,
            document_ids=document_ids or [],
            pipeline=pipeline,
            board=board,
            time_ms=int((time.monotonic() - started) * 1000),
            stopped=stopped,
        )

    try:
        yield _sse(
            {
                "type": "meta",
                "chat_id": chat_id,
                "model_label": model_label,
                "think": think,
                "think_engine": think_label,
            }
        )
        state = {
            "user_id": user_id,
            "question": question,
            "history": to_history(prior) + [HumanMessage(content=question)],
            "memory": memory.prompt_block(user_id) if use_memory else "",
            "think": think,
            "has_documents": bool(documents.list_documents(user_id)),
            "context": "",
            "sources": [],
            "analysis": "",
            "source_mode": source_mode,
            "document_ids": document_ids or [],
        }
        async with asyncio.timeout(GENERATION_TIMEOUT):
            async for event in nexus_graph.astream_events(state, config={"configurable": {"llm": llm}}, version="v2"):
                kind = event["event"]
                node = event.get("metadata", {}).get("langgraph_node", "")
                if kind == "on_chain_start" and event.get("name") in NODE_LABELS and node == event.get("name"):
                    node_started[node] = time.monotonic()
                    yield _sse({"type": "node_start", "node": node, "label": NODE_LABELS[node]})
                elif kind == "on_chain_end" and event.get("name") in NODE_LABELS and node == event.get("name"):
                    output = event["data"].get("output") or {}
                    if node == "classify":
                        intent = output.get("intent", "general")
                        yield _sse({"type": "intent", "intent": intent})
                    elif node in ("retrieve", "web_search"):
                        sources = output.get("sources", [])
                        if sources:
                            yield _sse(
                                {
                                    "type": "sources",
                                    "sources": [{k: v for k, v in s.items() if k != "line_numbers"} for s in sources],
                                }
                            )
                    elif node == "decide":
                        board = output.get("board")
                        if board:
                            yield _sse({"type": "board", "board": board})
                    jev_usage = output.get("jev_usage") or {}
                    if jev_usage:
                        tokens["input"] += jev_usage.get("input", 0)
                        tokens["output"] += jev_usage.get("output", 0)
                        node_tokens[node] = (
                            node_tokens.get(node, 0) + jev_usage.get("input", 0) + jev_usage.get("output", 0)
                        )
                        yield _sse(
                            {
                                "type": "usage",
                                "input_tokens": tokens["input"],
                                "output_tokens": tokens["output"],
                                "total_tokens": tokens["input"] + tokens["output"],
                                "estimated": tokens["estimated"],
                            }
                        )
                    now = time.monotonic()
                    step = {
                        "node": node,
                        "label": STEP_NAMES.get(node, node),
                        "ms": int((now - node_started.get(node, now)) * 1000),
                        "tokens": node_tokens.get(node, 0),
                        "detail": _step_detail(node, output),
                    }
                    pipeline.append(step)
                    yield _sse({"type": "node_end", **step})
                elif kind == "on_chat_model_stream" and node in ("deliberate", "generate"):
                    chunk = event["data"]["chunk"]
                    reasoning = (chunk.additional_kwargs or {}).get("reasoning_content") or ""
                    text = chunk.text or ""
                    if node == "deliberate":
                        piece = text or reasoning
                        if piece:
                            thinking += piece
                            yield _sse({"type": "thinking", "content": piece})
                    else:
                        if reasoning and think:
                            thinking += reasoning
                            yield _sse({"type": "thinking", "content": reasoning})
                        if text:
                            answer += text
                            yield _sse({"type": "token", "content": text})
                elif kind == "on_chat_model_end" and node in NODE_LABELS:
                    used_in, used_out, estimated = _usage_of(event)
                    node_tokens[node] = node_tokens.get(node, 0) + used_in + used_out
                    tokens["input"] += used_in
                    tokens["output"] += used_out
                    tokens["estimated"] = tokens["estimated"] or estimated
                    yield _sse(
                        {
                            "type": "usage",
                            "input_tokens": tokens["input"],
                            "output_tokens": tokens["output"],
                            "total_tokens": tokens["input"] + tokens["output"],
                            "estimated": tokens["estimated"],
                        }
                    )
        if not answer.strip():
            raise AppError(
                502, "empty_answer", "The model returned an empty answer. Try again or pick a different model."
            )
        sources = attach_highlights(answer, sources)
        message = build_message()
        await chats.append(user_id, chat_id, message)
        finished = True
        if is_new_chat:
            title = await _title_for(question)
            if title:
                await chats.update(user_id, chat_id, title=title)
                yield _sse({"type": "title", "chat_id": chat_id, "title": title})
        yield _sse({"type": "done", "chat_id": chat_id, "message": message})
    except asyncio.CancelledError:
        if answer and not finished:
            try:
                chats.append_now(user_id, chat_id, build_message(stopped=True))
            except Exception:
                logger.warning("partial_save_failed chat=%s", chat_id)
        raise
    except Exception as exc:
        try:
            code, text = _friendly_error(exc, provider)
        except Exception:
            code, text = "generation_failed", "Something went wrong while writing the answer. Try again."
        if not isinstance(exc, AppError):
            logger.warning(
                "generation_failed code=%s provider=%s model=%s error=%s", code, provider, model, type(exc).__name__
            )
        try:
            if not answer:
                await trial_usage.refund(ip, "messages")
            elif not finished:
                await chats.append(user_id, chat_id, build_message(stopped=True))
        except Exception:
            logger.exception("error_cleanup_failed chat=%s", chat_id)
        yield _sse({"type": "error", "code": code, "message": text, "chat_id": chat_id, "refunded": not answer})
