import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request

from app.config import settings
from app.core.auth import CurrentUser, client_meta, get_current_user, issue_access_token
from app.core.errors import AppError
from app.core.mailer import send_email
from app.core.ratelimit import RateLimiter
from app.models.schemas import ForgotPasswordRequest, LoginRequest, RefreshRequest, ResetPasswordRequest, SignupRequest
from app.store import auth_sessions, users
from app.store.files import now_iso

router = APIRouter(prefix="/auth", tags=["auth"])
login_limiter = RateLimiter(10, 900, "sign-in attempt")
signup_limiter = RateLimiter(5, 3600, "sign-up")
reset_limiter = RateLimiter(5, 3600, "password reset")


async def _issue(profile: dict, request: Request) -> dict:
    agent, ip = client_meta(request)
    session_id, refresh_token = await auth_sessions.create(profile["id"], agent, ip)
    access_token, expires_in = issue_access_token(profile["id"], session_id)
    return {
        "user": users.public(profile),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in,
    }


@router.post("/signup")
async def signup(body: SignupRequest, request: Request):
    signup_limiter.check(client_meta(request)[1] or "unknown")
    profile = await users.create(body.email, body.password, body.name)
    if profile is None:
        raise AppError(409, "email_taken", "An account with this email already exists. Sign in instead.")
    return await _issue(profile, request)


@router.post("/login")
async def login(body: LoginRequest, request: Request):
    login_limiter.check(f"{users.normalize_email(body.email)}|{client_meta(request)[1]}")
    user_id = users.find_id_by_email(body.email)
    profile = users.get(user_id) if user_id else None
    if profile is None or not users.verify_password(body.password, profile["password_hash"]):
        raise AppError(401, "invalid_credentials", "That email and password don't match. Check them and try again.")
    return await _issue(profile, request)


@router.post("/refresh")
async def refresh(body: RefreshRequest, request: Request):
    try:
        user_id, session_id, secret = body.refresh_token.split(".", 2)
    except ValueError as exc:
        raise AppError(401, "unauthorized", "Your session has expired. Sign in again to continue.") from exc
    profile = users.get(user_id)
    agent, ip = client_meta(request)
    new_refresh = await auth_sessions.rotate(user_id, session_id, secret, agent, ip) if profile else None
    if not new_refresh:
        raise AppError(401, "unauthorized", "Your session has expired. Sign in again to continue.")
    access_token, expires_in = issue_access_token(user_id, session_id)
    return {
        "user": users.public(profile),
        "access_token": access_token,
        "refresh_token": new_refresh,
        "expires_in": expires_in,
    }


@router.post("/logout")
async def logout(user: CurrentUser = Depends(get_current_user)):
    await auth_sessions.revoke(user.id, user.session_id)
    return {"status": "signed_out"}


@router.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)):
    return users.public(users.get(user.id))


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request):
    reset_limiter.check(f"{users.normalize_email(body.email)}|{client_meta(request)[1]}")
    user_id = users.find_id_by_email(body.email)
    if user_id:
        secret = secrets.token_urlsafe(32)
        await users.update(
            user_id,
            reset={
                "hash": hashlib.sha256(secret.encode()).hexdigest(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat(),
            },
        )
        link = f"{settings.site_url.rstrip('/')}/reset-password?token={user_id}.{secret}"
        await send_email(
            body.email,
            "Reset your Nexus AI password",
            f"We received a request to reset your Nexus AI password.\n\nChoose a new password here (the link expires in 30 minutes):\n{link}\n\nIf you didn't ask for this, you can ignore this email and your password won't change.",
        )
    return {"status": "sent", "email_delivery": settings.smtp_enabled}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    invalid = AppError(400, "invalid_reset_link", "This reset link is invalid or has expired. Request a new one.")
    try:
        user_id, secret = body.token.split(".", 1)
    except ValueError as exc:
        raise invalid from exc
    profile = users.get(user_id)
    reset = (profile or {}).get("reset")
    if not reset or datetime.fromisoformat(reset["expires_at"]) < datetime.now(timezone.utc):
        raise invalid
    if not hmac.compare_digest(hashlib.sha256(secret.encode()).hexdigest(), reset["hash"]):
        raise invalid
    await users.update(
        user_id, password_hash=users.hash_password(body.password), password_changed_at=now_iso(), reset=None
    )
    await auth_sessions.revoke_others(user_id, None)
    return {"status": "password_reset"}
