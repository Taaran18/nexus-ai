import json
from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.core.visitor import Visitor, get_visitor
from app.models.schemas import PreferencesUpdate
from app.services import memory
from app.store import chats, documents, folders, keys, usage, visitors
from app.store.files import now_iso

router = APIRouter(prefix="/me", tags=["me"])


@router.get("")
async def get_me(visitor: Visitor = Depends(get_visitor)):
    return visitors.public(visitors.get(visitor.id))


@router.patch("")
async def update_me(body: PreferencesUpdate, visitor: Visitor = Depends(get_visitor)):
    return visitors.public(await visitors.update_preferences(visitor.id, body.preferences))


@router.get("/usage")
async def get_usage(visitor: Visitor = Depends(get_visitor)):
    return usage.summary(visitor.ip)


@router.get("/overview")
async def overview(visitor: Visitor = Depends(get_visitor)):
    chat_list = chats.list_chats(visitor.id)
    docs = documents.list_documents(visitor.id)
    folder_list = folders.list_folders(visitor.id)
    return {
        "stats": {
            "chats": len(chat_list),
            "messages": sum(c.get("message_count", 0) for c in chat_list),
            "documents": len(docs),
            "chunks": sum(d["chunks"] for d in docs),
            "folders": len(folder_list),
            "memories": len(memory.list_items(visitor.id)),
            "providers": len(keys.list_keys(visitor.id)),
        },
        "usage": usage.summary(visitor.ip),
        "recent_documents": docs[:5],
    }


@router.get("/export")
async def export_data(visitor: Visitor = Depends(get_visitor)):
    payload = {
        "exported_at": now_iso(),
        "trial_id": visitor.id,
        "preferences": visitors.get(visitor.id).get("preferences", {}),
        "folders": folders.list_folders(visitor.id),
        "chats": [{**c, "messages": chats.get_messages(visitor.id, c["id"])} for c in chats.list_chats(visitor.id)],
        "documents": documents.list_documents(visitor.id),
        "memory": memory.list_items(visitor.id),
        "connected_providers": list(keys.list_keys(visitor.id).keys()),
    }
    filename = f"nexus-export-{datetime.now().strftime('%Y-%m-%d')}.json"
    return Response(
        content=json.dumps(payload, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/history")
async def clear_history(visitor: Visitor = Depends(get_visitor)):
    deleted = await chats.delete_all(visitor.id)
    memory.wipe(visitor.id)
    return {"deleted": deleted}


@router.delete("")
async def delete_everything(visitor: Visitor = Depends(get_visitor)):
    await visitors.delete(visitor.id)
    return {"status": "deleted"}
