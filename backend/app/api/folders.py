from fastapi import APIRouter, Depends

from app.core.visitor import Visitor, get_visitor
from app.models.schemas import FolderCreate, FolderUpdate
from app.store import chats, folders

router = APIRouter(prefix="/folders", tags=["folders"])


@router.get("")
async def list_folders(visitor: Visitor = Depends(get_visitor)):
    return folders.list_folders(visitor.id)


@router.post("", status_code=201)
async def create_folder(body: FolderCreate, visitor: Visitor = Depends(get_visitor)):
    return await folders.create(visitor.id, body.name.strip(), body.color)


@router.patch("/{folder_id}")
async def update_folder(folder_id: str, body: FolderUpdate, visitor: Visitor = Depends(get_visitor)):
    return await folders.update(visitor.id, folder_id, name=body.name.strip() if body.name else None, color=body.color)


@router.delete("/{folder_id}")
async def delete_folder(folder_id: str, visitor: Visitor = Depends(get_visitor)):
    await folders.delete(visitor.id, folder_id)
    await chats.clear_folder(visitor.id, folder_id)
    return {"status": "deleted"}
