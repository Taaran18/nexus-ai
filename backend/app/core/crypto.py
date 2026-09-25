import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings
from app.core.errors import AppError


@lru_cache
def _fernet() -> Fernet:
    secret = settings.encryption_key
    try:
        return Fernet(secret.encode())
    except ValueError:
        return Fernet(base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest()))


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise AppError(
            409, "key_unreadable", "This saved API key can no longer be read. Remove it and add it again."
        ) from exc


def hint(value: str) -> str:
    return f"…{value[-4:]}" if len(value) >= 8 else "…"
