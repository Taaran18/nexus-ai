import asyncio
import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.core.errors import AppError
from app.llm.factory import groq_model
from app.store.files import lock, now_iso, read_json, user_dir, write_json

logger = logging.getLogger("nexus")


def _file(user_id: str):
    return user_dir(user_id) / "memory.json"


def _read(user_id: str) -> dict:
    return read_json(_file(user_id), {"version": 1, "items": []})


def list_items(user_id: str) -> list[dict]:
    return _read(user_id).get("items", [])


async def _summarize(title: str, messages: list[dict]) -> tuple[str, bool]:
    transcript = "\n".join(f"{m['role'].upper()}: {m['content'][:1500]}" for m in messages[-30:])
    try:
        result = await asyncio.wait_for(
            groq_model(settings.router_model, temperature=0.2).ainvoke(
                [
                    SystemMessage(
                        content=(
                            "You write long-term memory notes for an AI assistant. Summarise the conversation below in at most "
                            "8 short bullet points. Capture the user's goals, decisions, preferences, facts about their work and "
                            "open questions. Write in third person about 'the user'. No preamble."
                        )
                    ),
                    HumanMessage(content=f"Conversation title: {title}\n\n{transcript}"),
                ]
            ),
            timeout=30,
        )
        text = (result.text or "").strip()
        if text:
            return text[:2500], True
    except Exception as exc:
        logger.warning("memory_summary_failed error=%s", type(exc).__name__)
    excerpt = "\n".join(f"- {m['role']}: {m['content'][:200]}" for m in messages[-8:])
    return excerpt, False


async def save(user_id: str, session_id: str, title: str, messages: list[dict]) -> dict:
    if not messages:
        raise AppError(400, "empty_chat", "This chat has no messages yet, so there's nothing to remember.")
    async with lock(f"memory:{user_id}"):
        data = _read(user_id)
        items = [i for i in data.get("items", []) if i["session_id"] != session_id]
        if len(items) >= settings.max_memories:
            raise AppError(
                409,
                "memory_full",
                f"You can save up to {settings.max_memories} chats to memory. Remove one before saving another.",
            )
        summary, summarized = await _summarize(title, messages)
        item = {
            "session_id": session_id,
            "title": title,
            "saved_at": now_iso(),
            "message_count": len(messages),
            "summary": summary,
            "summary_type": "ai" if summarized else "excerpt",
        }
        data["items"] = items + [item]
        data["updated_at"] = item["saved_at"]
        write_json(_file(user_id), data)
        return item


async def remove(user_id: str, session_id: str) -> bool:
    async with lock(f"memory:{user_id}"):
        data = _read(user_id)
        items = data.get("items", [])
        remaining = [i for i in items if i["session_id"] != session_id]
        if len(remaining) == len(items):
            return False
        data["items"] = remaining
        write_json(_file(user_id), data)
        return True


def wipe(user_id: str) -> None:
    _file(user_id).unlink(missing_ok=True)


def prompt_block(user_id: str) -> str:
    items = list_items(user_id)
    if not items:
        return ""
    parts = [
        f"[{index}] {item['title']} (saved {item['saved_at'][:10]})\n{item['summary']}"
        for index, item in enumerate(items, start=1)
    ]
    return "\n\n".join(parts)
