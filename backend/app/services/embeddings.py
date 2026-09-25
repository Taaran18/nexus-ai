import asyncio
from functools import lru_cache

from langchain_huggingface import HuggingFaceEndpointEmbeddings

from app.config import settings
from app.core.errors import AppError


@lru_cache
def _client() -> HuggingFaceEndpointEmbeddings:
    return HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/all-MiniLM-L6-v2",
        huggingfacehub_api_token=settings.huggingface_api_key,
    )


async def embed_documents(chunks: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    try:
        for start in range(0, len(chunks), 64):
            batch = chunks[start : start + 64]
            vectors.extend(await asyncio.wait_for(asyncio.to_thread(_client().embed_documents, batch), timeout=90))
    except Exception as exc:
        raise AppError(
            502,
            "embedding_failed",
            "We couldn't index this file because the embedding service didn't respond. Try uploading it again.",
        ) from exc
    return vectors


async def embed_query(text: str) -> list[float] | None:
    try:
        return await asyncio.wait_for(asyncio.to_thread(_client().embed_query, text[:2000]), timeout=20)
    except Exception:
        return None
