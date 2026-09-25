import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.store.files import lock, now_iso, read_json, user_dir, write_json

_GRACE_SECONDS = 30


def _path(user_id: str):
    return user_dir(user_id) / "sessions.json"


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _alive(session: dict) -> bool:
    return datetime.fromisoformat(session["expires_at"]) > datetime.now(timezone.utc)


def list_all(user_id: str) -> list[dict]:
    return [s for s in read_json(_path(user_id), []) if _alive(s)]


def exists(user_id: str, session_id: str) -> bool:
    return any(s["id"] == session_id for s in list_all(user_id))


async def create(user_id: str, user_agent: str, ip: str) -> tuple[str, str]:
    session_id = str(uuid.uuid4())
    secret = secrets.token_urlsafe(32)
    session = {
        "id": session_id,
        "refresh_hash": _hash(secret),
        "previous_hash": None,
        "rotated_at": now_iso(),
        "created_at": now_iso(),
        "last_used_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days)).isoformat(),
        "user_agent": user_agent[:300],
        "ip": ip[:64],
    }
    async with lock(f"sessions:{user_id}"):
        sessions = list_all(user_id)
        sessions.append(session)
        write_json(_path(user_id), sessions[-50:])
    return session_id, f"{user_id}.{session_id}.{secret}"


async def rotate(user_id: str, session_id: str, secret: str, user_agent: str, ip: str) -> str | None:
    async with lock(f"sessions:{user_id}"):
        sessions = list_all(user_id)
        session = next((s for s in sessions if s["id"] == session_id), None)
        if session is None:
            return None
        presented = _hash(secret)
        in_grace = (
            session.get("previous_hash")
            and hmac.compare_digest(presented, session["previous_hash"])
            and (datetime.now(timezone.utc) - datetime.fromisoformat(session["rotated_at"])).total_seconds()
            < _GRACE_SECONDS
        )
        if not hmac.compare_digest(presented, session["refresh_hash"]) and not in_grace:
            write_json(_path(user_id), [s for s in sessions if s["id"] != session_id])
            return None
        new_secret = secrets.token_urlsafe(32)
        session["previous_hash"] = session["refresh_hash"]
        session["refresh_hash"] = _hash(new_secret)
        session["rotated_at"] = now_iso()
        session["last_used_at"] = now_iso()
        session["user_agent"] = user_agent[:300] or session["user_agent"]
        session["ip"] = ip[:64] or session["ip"]
        write_json(_path(user_id), sessions)
        return f"{user_id}.{session_id}.{new_secret}"


async def revoke(user_id: str, session_id: str) -> bool:
    async with lock(f"sessions:{user_id}"):
        sessions = list_all(user_id)
        remaining = [s for s in sessions if s["id"] != session_id]
        write_json(_path(user_id), remaining)
        return len(remaining) != len(sessions)


async def revoke_others(user_id: str, keep_session_id: str | None) -> int:
    async with lock(f"sessions:{user_id}"):
        sessions = list_all(user_id)
        remaining = [s for s in sessions if s["id"] == keep_session_id]
        write_json(_path(user_id), remaining)
        return len(sessions) - len(remaining)


def public(session: dict, current_id: str | None) -> dict:
    return {
        "id": session["id"],
        "created_at": session["created_at"],
        "last_used_at": session["last_used_at"],
        "expires_at": session["expires_at"],
        "user_agent": session["user_agent"],
        "ip": session["ip"],
        "current": session["id"] == current_id,
    }
