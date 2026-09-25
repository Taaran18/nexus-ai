from fastapi import APIRouter, Depends

from app.config import settings
from app.core.auth import CurrentUser, get_current_user
from app.core.errors import not_found
from app.core.ratelimit import memory_limiter
from app.models.schemas import MemorySaveRequest
from app.services import memory
from app.store import chats

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("")
async def list_memory(user: CurrentUser = Depends(get_current_user)):
    return {"limit": settings.max_memories, "items": memory.list_items(user.id)}


@router.post("", status_code=201)
async def save_memory(body: MemorySaveRequest, user: CurrentUser = Depends(get_current_user)):
    memory_limiter.check(user.id)
    chat = chats.get_chat(user.id, body.chat_id)
    messages = [m for m in chats.get_messages(user.id, chat["id"]) if m.get("content")]
    return await memory.save(user.id, chat["id"], chat["title"], messages)


@router.delete("/{chat_id}")
async def delete_memory(chat_id: str, user: CurrentUser = Depends(get_current_user)):
    if not await memory.remove(user.id, chat_id):
        raise not_found("That chat isn't saved to memory.")
    return {"status": "removed"}
