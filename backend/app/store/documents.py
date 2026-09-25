import asyncio
import math
import uuid
from dataclasses import dataclass

from app.core.errors import not_found
from app.store.files import lock, now_iso, read_json, require_id, user_dir, write_json

_cache: dict[str, tuple[float, list[dict]]] = {}


@dataclass
class Match:
    content: str
    source: str
    score: float
    doc_id: str
    page: int | None
    start_line: int | None
    end_line: int | None
    line_numbers: list[int] | None = None


def _dir(user_id: str):
    return user_dir(user_id) / "documents"


def _index_path(user_id: str):
    return _dir(user_id) / "index.json"


def _doc_path(user_id: str, doc_id: str):
    return _dir(user_id) / f"{require_id(doc_id, 'document')}.json"


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vector)) or 1.0
    return [round(v / norm, 6) for v in vector]


def list_documents(user_id: str) -> list[dict]:
    docs = read_json(_index_path(user_id), [])
    return sorted(docs, key=lambda d: d["created_at"], reverse=True)


async def add(user_id: str, source: str, size_bytes: int, chunks: list[dict], vectors: list[list[float]]) -> dict:
    doc = {
        "id": str(uuid.uuid4()),
        "source": source,
        "chunks": len(chunks),
        "size_bytes": size_bytes,
        "created_at": now_iso(),
        "preview": chunks[0]["content"][:240] if chunks else "",
        "pages": max((c["page"] or 0 for c in chunks), default=0) or None,
    }
    payload = {"id": doc["id"], "chunks": [{**c, "embedding": _normalize(v)} for c, v in zip(chunks, vectors)]}
    async with lock(f"documents:{user_id}"):
        await asyncio.to_thread(write_json, _doc_path(user_id, doc["id"]), payload)
        index = read_json(_index_path(user_id), [])
        index.append(doc)
        write_json(_index_path(user_id), index)
    return doc


async def delete(user_id: str, doc_id: str) -> None:
    async with lock(f"documents:{user_id}"):
        index = read_json(_index_path(user_id), [])
        remaining = [d for d in index if d["id"] != doc_id]
        if len(remaining) == len(index):
            raise not_found("We couldn't find that document. It may already be deleted.")
        write_json(_index_path(user_id), remaining)
        _doc_path(user_id, doc_id).unlink(missing_ok=True)
        _cache.pop(f"{user_id}:{doc_id}", None)


async def delete_all(user_id: str) -> int:
    async with lock(f"documents:{user_id}"):
        index = read_json(_index_path(user_id), [])
        for doc in index:
            _doc_path(user_id, doc["id"]).unlink(missing_ok=True)
            _cache.pop(f"{user_id}:{doc['id']}", None)
        write_json(_index_path(user_id), [])
        return len(index)


def _load_chunks(user_id: str, doc_id: str) -> list[dict]:
    path = _doc_path(user_id, doc_id)
    key = f"{user_id}:{doc_id}"
    try:
        mtime = path.stat().st_mtime
    except OSError:
        return []
    cached = _cache.get(key)
    if cached and cached[0] == mtime:
        return cached[1]
    chunks = read_json(path, {"chunks": []})["chunks"]
    if len(_cache) > 200:
        _cache.clear()
    _cache[key] = (mtime, chunks)
    return chunks


def search(user_id: str, query_vector: list[float], k: int = 4, doc_ids: list[str] | None = None) -> list[Match]:
    query = _normalize(query_vector)
    allowed = set(doc_ids) if doc_ids else None
    scored: list[Match] = []
    for doc in list_documents(user_id):
        if allowed is not None and doc["id"] not in allowed:
            continue
        for chunk in _load_chunks(user_id, doc["id"]):
            score = sum(a * b for a, b in zip(query, chunk["embedding"]))
            scored.append(
                Match(
                    content=chunk["content"],
                    source=doc["source"],
                    score=score,
                    doc_id=doc["id"],
                    page=chunk.get("page"),
                    start_line=chunk.get("start_line"),
                    end_line=chunk.get("end_line"),
                    line_numbers=chunk.get("line_numbers"),
                )
            )
    scored.sort(key=lambda m: m.score, reverse=True)
    return [m for m in scored[:k] if m.score > 0.2]
