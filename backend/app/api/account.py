import json
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import AppError, not_found
from app.models.schemas import ChangeEmailRequest, ChangePasswordRequest, DeleteAccountRequest, ProfileUpdate
from app.services import memory
from app.store import auth_sessions, chats, documents, folders, keys, users
from app.store.files import now_iso

router = APIRouter(prefix="/account", tags=["account"])


def _require_password(user_id: str, password: str) -> dict:
    profile = users.get(user_id)
    if profile is None or not users.verify_password(password, profile["password_hash"]):
        raise AppError(403, "wrong_password", "That password isn't correct. Check it and try again.")
    return profile


@router.get("")
async def get_account(user: CurrentUser = Depends(get_current_user)):
    return users.public(users.get(user.id))


@router.patch("")
async def update_account(body: ProfileUpdate, user: CurrentUser = Depends(get_current_user)):
    changes = {}
    if body.name is not None:
        changes["name"] = body.name.strip()
    if body.preferences is not None:
        current = users.get(user.id).get("preferences", {})
        changes["preferences"] = {**current, **body.preferences}
    profile = await users.update(user.id, **changes) if changes else users.get(user.id)
    return users.public(profile)


@router.post("/password")
async def change_password(body: ChangePasswordRequest, user: CurrentUser = Depends(get_current_user)):
    _require_password(user.id, body.current_password)
    if body.current_password == body.new_password:
        raise AppError(400, "same_password", "Choose a new password that's different from your current one.")
    await users.update(user.id, password_hash=users.hash_password(body.new_password), password_changed_at=now_iso())
    revoked = await auth_sessions.revoke_others(user.id, user.session_id) if body.sign_out_others else 0
    return {"status": "password_changed", "signed_out_sessions": revoked}


@router.post("/email")
async def change_email(body: ChangeEmailRequest, user: CurrentUser = Depends(get_current_user)):
    _require_password(user.id, body.password)
    profile = await users.change_email(user.id, body.email)
    if profile is None:
        raise AppError(409, "email_taken", "Another account already uses this email.")
    return users.public(profile)


@router.get("/sessions")
async def list_sessions(user: CurrentUser = Depends(get_current_user)):
    sessions = auth_sessions.list_all(user.id)
    sessions.sort(key=lambda s: s["last_used_at"], reverse=True)
    return [auth_sessions.public(s, user.session_id) for s in sessions]


@router.delete("/sessions/{session_id}")
async def revoke_session(session_id: str, user: CurrentUser = Depends(get_current_user)):
    if session_id == user.session_id:
        raise AppError(400, "current_session", "To end this session, use Sign Out instead.")
    if not await auth_sessions.revoke(user.id, session_id):
        raise not_found("That session has already ended.")
    return {"status": "revoked"}


@router.post("/sessions/revoke-others")
async def revoke_other_sessions(user: CurrentUser = Depends(get_current_user)):
    return {"revoked": await auth_sessions.revoke_others(user.id, user.session_id)}


@router.get("/overview")
async def overview(user: CurrentUser = Depends(get_current_user)):
    chat_list = chats.list_chats(user.id)
    docs = documents.list_documents(user.id)
    folder_list = folders.list_folders(user.id)
    folder_names = {f["id"]: f for f in folder_list}
    return {
        "stats": {
            "chats": len(chat_list),
            "messages": sum(c.get("message_count", 0) for c in chat_list),
            "documents": len(docs),
            "chunks": sum(d["chunks"] for d in docs),
            "folders": len(folder_list),
            "memories": len(memory.list_items(user.id)),
            "providers": len(keys.list_keys(user.id)),
        },
        "recent_chats": [{**c, "folder": folder_names.get(c.get("folder_id"))} for c in chat_list[:8]],
        "recent_documents": docs[:5],
    }


@router.get("/export")
async def export_data(user: CurrentUser = Depends(get_current_user)):
    payload = {
        "exported_at": now_iso(),
        "account": users.public(users.get(user.id)),
        "folders": folders.list_folders(user.id),
        "chats": [{**c, "messages": chats.get_messages(user.id, c["id"])} for c in chats.list_chats(user.id)],
        "documents": documents.list_documents(user.id),
        "memory": memory.list_items(user.id),
        "connected_providers": list(keys.list_keys(user.id).keys()),
    }
    filename = f"nexus-export-{datetime.now().strftime('%Y-%m-%d')}.json"
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/history")
async def clear_history(user: CurrentUser = Depends(get_current_user)):
    deleted = await chats.delete_all(user.id)
    memory.wipe(user.id)
    return {"deleted": deleted}


@router.post("/delete")
async def delete_account(body: DeleteAccountRequest, user: CurrentUser = Depends(get_current_user)):
    _require_password(user.id, body.password)
    await users.delete(user.id)
    return {"status": "deleted"}
