from supabase import create_client, Client
from app.config import settings
from functools import lru_cache


@lru_cache
def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
