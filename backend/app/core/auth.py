from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Header, Request

from app.config import settings
from app.core.errors import AppError
from app.store import auth_sessions, users

_ALGORITHM = "HS256"


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    name: str
    session_id: str


def issue_access_token(user_id: str, session_id: str) -> tuple[str, int]:
    expires_in = settings.access_token_minutes * 60
    payload = {
        "sub": user_id,
        "sid": session_id,
        "typ": "access",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM), expires_in


def _unauthorized(message: str = "Your session has expired. Sign in again to continue.") -> AppError:
    return AppError(401, "unauthorized", message)


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _unauthorized("Sign in to continue.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise _unauthorized() from exc
    except jwt.InvalidTokenError as exc:
        raise _unauthorized("Sign in to continue.") from exc
    if claims.get("typ") != "access":
        raise _unauthorized("Sign in to continue.")
    user_id, session_id = claims.get("sub", ""), claims.get("sid", "")
    profile = users.get(user_id)
    if profile is None or not auth_sessions.exists(user_id, session_id):
        raise _unauthorized("You were signed out. Sign in again to continue.")
    return CurrentUser(id=user_id, email=profile["email"], name=profile.get("name", ""), session_id=session_id)


def client_meta(request: Request) -> tuple[str, str]:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "")
    return request.headers.get("user-agent", ""), ip
