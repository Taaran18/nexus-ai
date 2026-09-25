import uuid

from app.core.errors import not_found
from app.store.files import lock, now_iso, read_json, require_id, user_dir, write_json


def _dir(user_id: str):
    return user_dir(user_id) / "chats"


def _index_path(user_id: str):
    return _dir(user_id) / "index.json"


def _chat_path(user_id: str, chat_id: str):
    return _dir(user_id) / f"{require_id(chat_id, 'conversation')}.json"


def _lock(user_id: str):
    return lock(f"chats:{user_id}")


def list_chats(user_id: str) -> list[dict]:
    chats = read_json(_index_path(user_id), [])
    return sorted(chats, key=lambda c: c.get("updated_at", c["created_at"]), reverse=True)


def get_chat(user_id: str, chat_id: str) -> dict:
    require_id(chat_id, "conversation")
    chat = next((c for c in read_json(_index_path(user_id), []) if c["id"] == chat_id), None)
    if chat is None:
        raise not_found("We couldn't find that conversation. It may have been deleted.")
    return chat


def get_messages(user_id: str, chat_id: str) -> list[dict]:
    get_chat(user_id, chat_id)
    return read_json(_chat_path(user_id, chat_id), {"messages": []})["messages"]


async def create_chat(user_id: str, title: str) -> dict:
    chat = {
        "id": str(uuid.uuid4()),
        "title": title,
        "folder_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "message_count": 0,
    }
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        index.append(chat)
        write_json(_chat_path(user_id, chat["id"]), {"id": chat["id"], "messages": []})
        write_json(_index_path(user_id), index)
    return chat


def new_message(role: str, content: str, **extra) -> dict:
    return {"id": str(uuid.uuid4()), "role": role, "content": content, "created_at": now_iso(), "rating": None, **extra}


def append_now(user_id: str, chat_id: str, *messages: dict) -> None:
    index = read_json(_index_path(user_id), [])
    chat = next((c for c in index if c["id"] == chat_id), None)
    if chat is None:
        raise not_found("This conversation was deleted while you were chatting.")
    data = read_json(_chat_path(user_id, chat_id), {"id": chat_id, "messages": []})
    data["messages"].extend(messages)
    chat["updated_at"] = now_iso()
    chat["message_count"] = len(data["messages"])
    write_json(_chat_path(user_id, chat_id), data)
    write_json(_index_path(user_id), index)


async def append(user_id: str, chat_id: str, *messages: dict) -> None:
    async with _lock(user_id):
        append_now(user_id, chat_id, *messages)


async def pop_last_assistant(user_id: str, chat_id: str) -> dict | None:
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        chat = next((c for c in index if c["id"] == chat_id), None)
        if chat is None:
            raise not_found("We couldn't find that conversation.")
        data = read_json(_chat_path(user_id, chat_id), {"id": chat_id, "messages": []})
        messages = data["messages"]
        if messages and messages[-1]["role"] == "assistant":
            messages.pop()
        last_user = next((m for m in reversed(messages) if m["role"] == "user"), None)
        chat["message_count"] = len(messages)
        write_json(_chat_path(user_id, chat_id), data)
        write_json(_index_path(user_id), index)
        return last_user


async def rate(user_id: str, chat_id: str, message_id: str, rating: int | None) -> dict:
    async with _lock(user_id):
        get_chat(user_id, chat_id)
        data = read_json(_chat_path(user_id, chat_id), {"id": chat_id, "messages": []})
        message = next((m for m in data["messages"] if m["id"] == message_id and m["role"] == "assistant"), None)
        if message is None:
            raise not_found("We couldn't find that reply.")
        message["rating"] = rating
        write_json(_chat_path(user_id, chat_id), data)
        return message


async def update(user_id: str, chat_id: str, **changes) -> dict:
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        chat = next((c for c in index if c["id"] == chat_id), None)
        if chat is None:
            raise not_found("We couldn't find that conversation.")
        chat.update(changes)
        write_json(_index_path(user_id), index)
        return chat


async def delete(user_id: str, chat_id: str) -> None:
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        remaining = [c for c in index if c["id"] != chat_id]
        if len(remaining) == len(index):
            raise not_found("We couldn't find that conversation.")
        write_json(_index_path(user_id), remaining)
        _chat_path(user_id, chat_id).unlink(missing_ok=True)


async def delete_all(user_id: str) -> int:
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        for chat in index:
            _chat_path(user_id, chat["id"]).unlink(missing_ok=True)
        write_json(_index_path(user_id), [])
        return len(index)


async def clear_folder(user_id: str, folder_id: str) -> None:
    async with _lock(user_id):
        index = read_json(_index_path(user_id), [])
        for chat in index:
            if chat.get("folder_id") == folder_id:
                chat["folder_id"] = None
        write_json(_index_path(user_id), index)
