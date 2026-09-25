from fastapi import APIRouter, Depends

from app.core.auth import CurrentUser, get_current_user
from app.models.schemas import FolderCreate, FolderUpdate
from app.store import chats, folders

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("")
async def list_folders(user: CurrentUser = Depends(get_current_user)):
    return folders.list_folders(user.id)


@router.post("", status_code=201)
async def create_folder(body: FolderCreate, user: CurrentUser = Depends(get_current_user)):
    return await folders.create(user.id, body.name.strip(), body.color)


@router.patch("/{folder_id}")
async def update_folder(folder_id: str, body: FolderUpdate, user: CurrentUser = Depends(get_current_user)):
    return await folders.update(user.id, folder_id, name=body.name.strip() if body.name else None, color=body.color)


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str, user: CurrentUser = Depends(get_current_user)):
    await folders.delete(user.id, folder_id)
    await chats.clear_folder(user.id, folder_id)
    return {"status": "deleted"}
