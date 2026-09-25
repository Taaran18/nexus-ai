import hashlib
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.core.errors import AppError
from app.store.files import lock, now_iso, read_json, root, write_json

_KEEP_DAYS = 14
_LIMITS = {
    "messages": lambda: settings.trial_daily_messages,
    "uploads": lambda: settings.trial_daily_uploads,
    "voice": lambda: settings.trial_daily_voice,
}


def _path(ip: str):
    key = hashlib.sha256(ip.encode()).hexdigest()[:32]
    return root() / "usage" / f"{key}.json"


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _resets_at() -> str:
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    return datetime(tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=timezone.utc).isoformat()


def _read(ip: str) -> dict:
    return read_json(_path(ip), None) or {"ip": ip, "first_seen": now_iso(), "visitors": [], "days": {}}


def _prune(record: dict) -> None:
    cutoff = (datetime.now(timezone.utc).date() - timedelta(days=_KEEP_DAYS)).isoformat()
    record["days"] = {day: counts for day, counts in record["days"].items() if day >= cutoff}


def _limit_message(kind: str, limit: int) -> str:
    if kind == "voice":
        return (
            f"You've used today's {limit} voice recordings. Type your message, or try voice again after midnight UTC."
        )
    if kind == "uploads":
        noun = "upload" if limit == 1 else "uploads"
        return f"You've used today's {limit} trial file {noun}. You can upload again after midnight UTC."
    noun = "message" if limit == 1 else "messages"
    return f"You've used today's {limit} trial {noun}. Your limit resets at midnight UTC."


async def consume(ip: str, visitor_id: str, kind: str) -> None:
    limit = _LIMITS[kind]()
    async with lock(f"usage:{ip}"):
        record = _read(ip)
        _prune(record)
        today = record["days"].setdefault(_today(), {"messages": 0, "uploads": 0, "voice": 0})
        if today.get(kind, 0) >= limit:
            raise AppError(429, "trial_limit", _limit_message(kind, limit))
        today[kind] = today.get(kind, 0) + 1
        record["last_seen"] = now_iso()
        if visitor_id not in record["visitors"]:
            record["visitors"] = (record["visitors"] + [visitor_id])[-20:]
        write_json(_path(ip), record)


async def refund(ip: str, kind: str) -> None:
    async with lock(f"usage:{ip}"):
        record = _read(ip)
        today = record["days"].get(_today())
        if today and today.get(kind, 0) > 0:
            today[kind] -= 1
            write_json(_path(ip), record)


def summary(ip: str) -> dict:
    today = _read(ip)["days"].get(_today(), {})
    messages_used = today.get("messages", 0)
    uploads_used = today.get("uploads", 0)
    voice_used = today.get("voice", 0)
    return {
        "messages_limit": settings.trial_daily_messages,
        "messages_used": messages_used,
        "messages_left": max(0, settings.trial_daily_messages - messages_used),
        "uploads_limit": settings.trial_daily_uploads,
        "uploads_used": uploads_used,
        "uploads_left": max(0, settings.trial_daily_uploads - uploads_used),
        "voice_limit": settings.trial_daily_voice,
        "voice_used": voice_used,
        "voice_left": max(0, settings.trial_daily_voice - voice_used),
        "max_turns_per_chat": settings.trial_max_turns_per_chat,
        "resets_at": _resets_at(),
    }
