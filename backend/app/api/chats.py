import re

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import not_found
from app.models.schemas import ChatUpdate, FeedbackRequest
from app.services import memory
from app.store import chats, folders

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("")
async def list_chats(user: CurrentUser = Depends(get_current_user)):
    saved = {m["session_id"] for m in memory.list_items(user.id)}
    return [{**c, "in_memory": c["id"] in saved} for c in chats.list_chats(user.id)]


@router.get("/{chat_id}")
async def get_chat(chat_id: str, user: CurrentUser = Depends(get_current_user)):
    chat = chats.get_chat(user.id, chat_id)
    saved = {m["session_id"] for m in memory.list_items(user.id)}
    return {**chat, "in_memory": chat_id in saved, "messages": chats.get_messages(user.id, chat_id)}


@router.patch("/{chat_id}")
async def update_chat(chat_id: str, body: ChatUpdate, user: CurrentUser = Depends(get_current_user)):
    chats.get_chat(user.id, chat_id)
    changes = {}
    if body.title is not None:
        changes["title"] = body.title.strip()
    if body.clear_folder:
        changes["folder_id"] = None
    elif body.folder_id is not None:
        if not folders.exists(user.id, body.folder_id):
            raise not_found("That folder no longer exists.")
        changes["folder_id"] = body.folder_id
    return await chats.update(user.id, chat_id, **changes)


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, user: CurrentUser = Depends(get_current_user)):
    await chats.delete(user.id, chat_id)
    await memory.remove(user.id, chat_id)
    return {"status": "deleted"}


@router.patch("/{chat_id}/messages/{message_id}/feedback")
async def feedback(chat_id: str, message_id: str, body: FeedbackRequest, user: CurrentUser = Depends(get_current_user)):
    message = await chats.rate(user.id, chat_id, message_id, body.rating)
    return {"id": message["id"], "rating": message["rating"]}


@router.get("/{chat_id}/export")
async def export_chat(chat_id: str, user: CurrentUser = Depends(get_current_user)):
    chat = chats.get_chat(user.id, chat_id)
    lines = [f"# {chat['title']}", "", f"_Exported from Nexus AI on {chat['updated_at'][:10]}_", ""]
    for message in chats.get_messages(user.id, chat_id):
        lines += [f"## {'You' if message['role'] == 'user' else 'Nexus'}", "", message["content"], ""]
    safe = re.sub(r"[^A-Za-z0-9 _-]", "", chat["title"])[:50].strip().replace(" ", "-") or "chat"
    return Response(
        content="\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="nexus-{safe}.md"'},
    )
