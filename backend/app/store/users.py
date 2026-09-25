import hashlib
import hmac
import secrets
import uuid

from app.store.files import lock, now_iso, read_json, remove_tree, root, user_dir, valid_id, write_json

_INDEX_LOCK = "users-index"


def _index_path():
    return root() / "users" / "index.json"


def _profile_path(user_id: str):
    return user_dir(user_id) / "profile.json"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1, dklen=32)
    return hmac.compare_digest(digest.hex(), digest_hex)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def find_id_by_email(email: str) -> str | None:
    return read_json(_index_path(), {}).get(normalize_email(email))


def get(user_id: str) -> dict | None:
    if not valid_id(user_id):
        return None
    return read_json(_profile_path(user_id), None)


def public(profile: dict) -> dict:
    return {
        "id": profile["id"],
        "email": profile["email"],
        "name": profile.get("name", ""),
        "created_at": profile["created_at"],
        "password_changed_at": profile.get("password_changed_at"),
        "preferences": profile.get("preferences", {}),
    }


async def create(email: str, password: str, name: str) -> dict | None:
    async with lock(_INDEX_LOCK):
        index = read_json(_index_path(), {})
        key = normalize_email(email)
        if key in index:
            return None
        user_id = str(uuid.uuid4())
        profile = {
            "id": user_id,
            "email": key,
            "name": name.strip(),
            "password_hash": hash_password(password),
            "created_at": now_iso(),
            "password_changed_at": now_iso(),
            "preferences": {},
        }
        write_json(_profile_path(user_id), profile)
        index[key] = user_id
        write_json(_index_path(), index)
        return profile


async def update(user_id: str, **changes) -> dict:
    async with lock(f"profile:{user_id}"):
        profile = get(user_id)
        if profile is None:
            raise KeyError(user_id)
        profile.update(changes)
        write_json(_profile_path(user_id), profile)
        return profile


async def change_email(user_id: str, new_email: str) -> dict | None:
    async with lock(_INDEX_LOCK):
        index = read_json(_index_path(), {})
        key = normalize_email(new_email)
        if index.get(key) not in (None, user_id):
            return None
        profile = get(user_id)
        index.pop(profile["email"], None)
        index[key] = user_id
        profile["email"] = key
        write_json(_profile_path(user_id), profile)
        write_json(_index_path(), index)
        return profile


async def delete(user_id: str) -> None:
    async with lock(_INDEX_LOCK):
        profile = get(user_id)
        index = read_json(_index_path(), {})
        if profile:
            index.pop(profile["email"], None)
            write_json(_index_path(), index)
        remove_tree(user_dir(user_id))
