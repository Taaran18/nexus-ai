from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.auth import CurrentUser, get_current_user
from app.core.errors import AppError
from app.core.ratelimit import chat_limiter
from app.models.schemas import ChatRequest, RegenerateRequest
from app.services.chat_runner import fallback_title, resolve_llm, stream_answer
from app.store import chats

router = APIRouter(prefix="/chat", tags=["chat"])

_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


@router.post("")
async def chat(body: ChatRequest, user: CurrentUser = Depends(get_current_user)):
    chat_limiter.check(user.id)
    llm, model_label = resolve_llm(user.id, body.provider, body.model)
    is_new = not body.chat_id
    if is_new:
        chat_meta = await chats.create_chat(user.id, fallback_title(body.message))
        prior: list[dict] = []
    else:
        chat_meta = chats.get_chat(user.id, body.chat_id)
        prior = chats.get_messages(user.id, chat_meta["id"])
    await chats.append(user.id, chat_meta["id"], chats.new_message("user", body.message))
    return StreamingResponse(
        stream_answer(
            user_id=user.id,
            chat_id=chat_meta["id"],
            is_new_chat=is_new,
            question=body.message,
            prior=prior,
            provider=body.provider,
            model=body.model,
            llm=llm,
            model_label=model_label,
            think=body.think,
            use_memory=body.use_memory,
        ),
        media_type="text/event-stream",
        headers=_HEADERS,
    )


@router.post("/regenerate")
async def regenerate(body: RegenerateRequest, user: CurrentUser = Depends(get_current_user)):
    chat_limiter.check(user.id)
    llm, model_label = resolve_llm(user.id, body.provider, body.model)
    chats.get_chat(user.id, body.chat_id)
    last_user = await chats.pop_last_assistant(user.id, body.chat_id)
    if last_user is None:
        raise AppError(400, "nothing_to_regenerate", "There's no question in this chat to answer again.")
    messages = chats.get_messages(user.id, body.chat_id)
    index = max(i for i, m in enumerate(messages) if m["id"] == last_user["id"])
    return StreamingResponse(
        stream_answer(
            user_id=user.id,
            chat_id=body.chat_id,
            is_new_chat=False,
            question=last_user["content"],
            prior=messages[:index],
            provider=body.provider,
            model=body.model,
            llm=llm,
            model_label=model_label,
            think=body.think,
            use_memory=body.use_memory,
        ),
        media_type="text/event-stream",
        headers=_HEADERS,
    )
