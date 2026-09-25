from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.config import settings
from app.core.errors import AppError
from app.core.ratelimit import chat_limiter
from app.core.visitor import Visitor, get_visitor
from app.models.schemas import ChatRequest, RegenerateRequest
from app.services.chat_runner import fallback_title, resolve_llm, stream_answer
from app.store import chats, usage

router = APIRouter(prefix="/chat", tags=["chat"])

_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def _check_turns(prior: list[dict]) -> None:
    turns = sum(1 for m in prior if m["role"] == "user")
    if turns >= settings.trial_max_turns_per_chat:
        raise AppError(
            409,
            "chat_limit",
            f"This chat has reached the trial limit of {settings.trial_max_turns_per_chat} messages. "
            "Start a new chat to keep going.",
        )


@router.post("")
async def chat(body: ChatRequest, visitor: Visitor = Depends(get_visitor)):
    chat_limiter.check(visitor.ip)
    llm, model_label = resolve_llm(visitor.id, body.provider, body.model)
    is_new = not body.chat_id
    prior: list[dict] = [] if is_new else chats.get_messages(visitor.id, chats.get_chat(visitor.id, body.chat_id)["id"])
    _check_turns(prior)
    await usage.consume(visitor.ip, visitor.id, "messages")
    chat_meta = (
        await chats.create_chat(visitor.id, fallback_title(body.message))
        if is_new
        else chats.get_chat(visitor.id, body.chat_id)
    )
    await chats.append(visitor.id, chat_meta["id"], chats.new_message("user", body.message))
    return StreamingResponse(
        stream_answer(
            user_id=visitor.id,
            chat_id=chat_meta["id"],
            is_new_chat=is_new,
            question=body.message,
            prior=prior,
            provider=body.provider,
            model=body.model,
            llm=llm,
            model_label=model_label,
            ip=visitor.ip,
            think=body.think,
            use_memory=body.use_memory,
        ),
        media_type="text/event-stream",
        headers=_HEADERS,
    )


@router.post("/regenerate")
async def regenerate(body: RegenerateRequest, visitor: Visitor = Depends(get_visitor)):
    chat_limiter.check(visitor.ip)
    llm, model_label = resolve_llm(visitor.id, body.provider, body.model)
    chats.get_chat(visitor.id, body.chat_id)
    await usage.consume(visitor.ip, visitor.id, "messages")
    last_user = await chats.pop_last_assistant(visitor.id, body.chat_id)
    if last_user is None:
        raise AppError(400, "nothing_to_regenerate", "There's no question in this chat to answer again.")
    messages = chats.get_messages(visitor.id, body.chat_id)
    index = max(i for i, m in enumerate(messages) if m["id"] == last_user["id"])
    return StreamingResponse(
        stream_answer(
            user_id=visitor.id,
            chat_id=body.chat_id,
            is_new_chat=False,
            question=last_user["content"],
            prior=messages[:index],
            provider=body.provider,
            model=body.model,
            llm=llm,
            model_label=model_label,
            ip=visitor.ip,
            think=body.think,
            use_memory=body.use_memory,
        ),
        media_type="text/event-stream",
        headers=_HEADERS,
    )
