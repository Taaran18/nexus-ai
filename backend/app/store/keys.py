from app.core.crypto import decrypt, encrypt, hint
from app.core.errors import AppError
from app.llm.providers import PROVIDERS
from app.store.files import lock, now_iso, read_json, user_dir, write_json


def _path(user_id: str):
    return user_dir(user_id) / "keys.json"


def list_keys(user_id: str) -> dict[str, dict]:
    data = read_json(_path(user_id), {})
    return {p: {"key_hint": v["key_hint"], "updated_at": v["updated_at"]} for p, v in data.items()}


async def save(user_id: str, provider: str, api_key: str) -> dict:
    async with lock(f"keys:{user_id}"):
        data = read_json(_path(user_id), {})
        data[provider] = {"encrypted_key": encrypt(api_key), "key_hint": hint(api_key), "updated_at": now_iso()}
        write_json(_path(user_id), data)
        return {
            "provider": provider,
            "key_hint": data[provider]["key_hint"],
            "updated_at": data[provider]["updated_at"],
        }


def get(user_id: str, provider: str) -> str:
    if provider not in PROVIDERS:
        raise AppError(400, "unknown_provider", "That provider isn't supported.")
    entry = read_json(_path(user_id), {}).get(provider)
    if not entry:
        raise AppError(
            400,
            "missing_key",
            f"Add your {PROVIDERS[provider].name} API key in Settings → Models & Keys to use this model.",
        )
    return decrypt(entry["encrypted_key"])


async def delete(user_id: str, provider: str) -> bool:
    async with lock(f"keys:{user_id}"):
        data = read_json(_path(user_id), {})
        removed = data.pop(provider, None) is not None
        write_json(_path(user_id), data)
        return removed
