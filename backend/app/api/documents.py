from pathlib import PurePath

from fastapi import APIRouter, Depends, File, UploadFile

from app.config import settings
from app.core.errors import AppError
from app.core.ratelimit import upload_limiter
from app.core.visitor import Visitor, get_visitor
from app.services.chunking import chunk_pages, extract_pages
from app.services.embeddings import embed_documents
from app.store import documents, usage

router = APIRouter(prefix="/documents", tags=["documents"])
_ALLOWED = {".pdf", ".txt", ".md", ".markdown", ".csv"}
_MAX_CHUNKS = 600
_MAX_DOCUMENTS = 20


@router.get("")
async def list_documents(visitor: Visitor = Depends(get_visitor)):
    return documents.list_documents(visitor.id)


@router.post("/upload", status_code=201)
async def upload(file: UploadFile = File(...), visitor: Visitor = Depends(get_visitor)):
    upload_limiter.check(visitor.ip)
    name = PurePath(file.filename or "document.txt").name[:120]
    if PurePath(name).suffix.lower() not in _ALLOWED:
        raise AppError(400, "unsupported_type", "Upload a PDF, TXT, MD or CSV file.")
    if len(documents.list_documents(visitor.id)) >= _MAX_DOCUMENTS:
        raise AppError(
            409, "document_limit", f"You can keep up to {_MAX_DOCUMENTS} documents. Delete some to upload more."
        )
    limit = settings.max_upload_mb * 1024 * 1024
    raw = await file.read(limit + 1)
    if len(raw) > limit:
        raise AppError(
            413, "file_too_large", f"This file is larger than {settings.max_upload_mb} MB. Upload a smaller file."
        )
    chunks = chunk_pages(extract_pages(name, raw), _MAX_CHUNKS)
    if not chunks:
        raise AppError(
            400, "no_text", "We couldn't find any text in this file. Scanned PDFs need text to be searchable."
        )
    await usage.consume(visitor.ip, visitor.id, "uploads")
    try:
        vectors = await embed_documents([c["content"] for c in chunks])
    except Exception:
        await usage.refund(visitor.ip, "uploads")
        raise
    return await documents.add(visitor.id, name, len(raw), chunks, vectors)


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, visitor: Visitor = Depends(get_visitor)):
    await documents.delete(visitor.id, doc_id)
    return {"status": "deleted"}


@router.delete("")
async def delete_all_documents(visitor: Visitor = Depends(get_visitor)):
    return {"deleted": await documents.delete_all(visitor.id)}
