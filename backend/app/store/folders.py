import uuid

from app.core.errors import AppError, not_found
from app.store.files import lock, now_iso, read_json, user_dir, write_json

MAX_FOLDERS = 50


def _path(user_id: str):
    return user_dir(user_id) / "folders.json"


def list_folders(user_id: str) -> list[dict]:
    return read_json(_path(user_id), [])


def exists(user_id: str, folder_id: str) -> bool:
    return any(f["id"] == folder_id for f in list_folders(user_id))


async def create(user_id: str, name: str, color: str) -> dict:
    async with lock(f"folders:{user_id}"):
        folders = list_folders(user_id)
        if len(folders) >= MAX_FOLDERS:
            raise AppError(
                409, "folder_limit", f"You can have up to {MAX_FOLDERS} folders. Delete one to create another."
            )
        folder = {"id": str(uuid.uuid4()), "name": name, "color": color, "created_at": now_iso()}
        folders.append(folder)
        write_json(_path(user_id), folders)
        return folder


async def update(user_id: str, folder_id: str, **changes) -> dict:
    async with lock(f"folders:{user_id}"):
        folders = list_folders(user_id)
        folder = next((f for f in folders if f["id"] == folder_id), None)
        if folder is None:
            raise not_found("We couldn't find that folder.")
        folder.update({k: v for k, v in changes.items() if v is not None})
        write_json(_path(user_id), folders)
        return folder


async def delete(user_id: str, folder_id: str) -> None:
    async with lock(f"folders:{user_id}"):
        folders = list_folders(user_id)
        remaining = [f for f in folders if f["id"] != folder_id]
        if len(remaining) == len(folders):
            raise not_found("We couldn't find that folder.")
        write_json(_path(user_id), remaining)
