import asyncio
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from app.db.supabase_client import get_supabase
from app.config import settings
from functools import lru_cache


@lru_cache
def get_embeddings() -> HuggingFaceEndpointEmbeddings:
    return HuggingFaceEndpointEmbeddings(
        model="sentence-transformers/all-MiniLM-L6-v2",
        huggingfacehub_api_token=settings.HUGGINGFACE_API_KEY,
    )


def get_vector_store() -> SupabaseVectorStore:
    return SupabaseVectorStore(
        client=get_supabase(),
        embedding=get_embeddings(),
        table_name="documents",
        query_name="match_documents",
    )


async def similarity_search_async(query: str, k: int = 3):
    """Run sync similarity_search in a thread to avoid blocking the event loop."""
    vector_store = get_vector_store()
    return await asyncio.to_thread(vector_store.similarity_search, query, k)
