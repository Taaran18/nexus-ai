from fastapi import APIRouter, Depends

from app.config import settings
from app.core.errors import not_found
from app.core.ratelimit import memory_limiter
from app.core.visitor import Visitor, get_visitor
from app.models.schemas import MemorySaveRequest
from app.services import memory
from app.store import chats

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("")
async def list_memory(visitor: Visitor = Depends(get_visitor)):
    return {"limit": settings.max_memories, "items": memory.list_items(visitor.id)}


@router.post("", status_code=201)
async def save_memory(body: MemorySaveRequest, visitor: Visitor = Depends(get_visitor)):
    memory_limiter.check(visitor.id)
    chat = chats.get_chat(visitor.id, body.chat_id)
    messages = [m for m in chats.get_messages(visitor.id, chat["id"]) if m.get("content")]
    return await memory.save(visitor.id, chat["id"], chat["title"], messages)


@router.delete("/{chat_id}")
async def delete_memory(chat_id: str, visitor: Visitor = Depends(get_visitor)):
    if not await memory.remove(visitor.id, chat_id):
        raise not_found("That chat isn't saved to memory.")
    return {"status": "removed"}
