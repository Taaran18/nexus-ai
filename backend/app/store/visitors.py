from datetime import datetime, timedelta, timezone

from app.store.files import lock, now_iso, read_json, remove_tree, user_dir, write_json

_TOUCH_EVERY = timedelta(minutes=5)


def _path(visitor_id: str):
    return user_dir(visitor_id) / "profile.json"


def get(visitor_id: str) -> dict:
    return read_json(_path(visitor_id), None) or {"id": visitor_id, "created_at": now_iso(), "preferences": {}}


async def touch(visitor_id: str, ip: str) -> dict:
    profile = read_json(_path(visitor_id), None)
    now = datetime.now(timezone.utc)
    if profile and profile.get("ip") == ip:
        last = datetime.fromisoformat(profile.get("last_seen", profile["created_at"]))
        if now - last < _TOUCH_EVERY:
            return profile
    async with lock(f"profile:{visitor_id}"):
        profile = read_json(_path(visitor_id), None) or {
            "id": visitor_id,
            "created_at": now_iso(),
            "preferences": {},
        }
        profile["last_seen"] = now_iso()
        profile["ip"] = ip
        write_json(_path(visitor_id), profile)
        return profile


def public(profile: dict) -> dict:
    return {"id": profile["id"], "created_at": profile["created_at"], "preferences": profile.get("preferences", {})}


async def update_preferences(visitor_id: str, changes: dict) -> dict:
    async with lock(f"profile:{visitor_id}"):
        profile = get(visitor_id)
        profile["preferences"] = {**profile.get("preferences", {}), **changes}
        write_json(_path(visitor_id), profile)
        return profile


async def delete(visitor_id: str) -> None:
    async with lock(f"profile:{visitor_id}"):
        remove_tree(user_dir(visitor_id))
