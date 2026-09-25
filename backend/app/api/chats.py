import re

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.errors import not_found
from app.core.visitor import Visitor, get_visitor
from app.models.schemas import ChatUpdate, FeedbackRequest
from app.services import memory
from app.store import chats, folders

router = APIRouter(prefix="/chats", tags=["chats"])


@router.get("")
async def list_chats(visitor: Visitor = Depends(get_visitor)):
    saved = {m["session_id"] for m in memory.list_items(visitor.id)}
    return [{**c, "in_memory": c["id"] in saved} for c in chats.list_chats(visitor.id)]


@router.get("/{chat_id}")
async def get_chat(chat_id: str, visitor: Visitor = Depends(get_visitor)):
    chat = chats.get_chat(visitor.id, chat_id)
    saved = {m["session_id"] for m in memory.list_items(visitor.id)}
    return {**chat, "in_memory": chat_id in saved, "messages": chats.get_messages(visitor.id, chat_id)}


@router.patch("/{chat_id}")
async def update_chat(chat_id: str, body: ChatUpdate, visitor: Visitor = Depends(get_visitor)):
    chats.get_chat(visitor.id, chat_id)
    changes = {}
    if body.title is not None:
        changes["title"] = body.title.strip()
    if body.clear_folder:
        changes["folder_id"] = None
    elif body.folder_id is not None:
        if not folders.exists(visitor.id, body.folder_id):
            raise not_found("That folder no longer exists.")
        changes["folder_id"] = body.folder_id
    return await chats.update(visitor.id, chat_id, **changes)


@router.delete("/{chat_id}")
async def delete_chat(chat_id: str, visitor: Visitor = Depends(get_visitor)):
    await chats.delete(visitor.id, chat_id)
    await memory.remove(visitor.id, chat_id)
    return {"status": "deleted"}


@router.patch("/{chat_id}/messages/{message_id}/feedback")
async def feedback(chat_id: str, message_id: str, body: FeedbackRequest, visitor: Visitor = Depends(get_visitor)):
    message = await chats.rate(visitor.id, chat_id, message_id, body.rating)
    return {"id": message["id"], "rating": message["rating"]}


@router.get("/{chat_id}/export")
async def export_chat(chat_id: str, visitor: Visitor = Depends(get_visitor)):
    chat = chats.get_chat(visitor.id, chat_id)
    lines = [f"# {chat['title']}", "", f"_Exported from Nexus AI on {chat['updated_at'][:10]}_", ""]
    for message in chats.get_messages(visitor.id, chat_id):
        lines += [f"## {'You' if message['role'] == 'user' else 'Nexus'}", "", message["content"], ""]
    safe = re.sub(r"[^A-Za-z0-9 _-]", "", chat["title"])[:50].strip().replace(" ", "-") or "chat"
    return Response(
        content="\n".join(lines),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="nexus-{safe}.md"'},
    )
