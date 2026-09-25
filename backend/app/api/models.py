from fastapi import APIRouter, Depends

from app.config import settings
from app.core.errors import AppError
from app.core.ratelimit import key_limiter
from app.core.visitor import Visitor, get_visitor
from app.llm.catalog import CATALOG_CHECKED, GROQ_GROUPS, GROQ_MODELS
from app.llm.listing import list_models
from app.llm.providers import PROVIDERS, get_provider
from app.models.schemas import ProviderKeyRequest
from app.store import keys

router = APIRouter(tags=["models"])


def _think_info() -> dict:
    return {
        "engine": "JEV by TypeSpace AI" if settings.jev_enabled else "GPT-OSS 120B Thorough on Groq",
        "jev_enabled": settings.jev_enabled,
    }


@router.get("/models")
async def catalog():
    return {
        "checked": CATALOG_CHECKED,
        "groups": GROQ_GROUPS,
        "groq": [{k: v for k, v in m.items() if k != "model"} for m in GROQ_MODELS],
        "think": _think_info(),
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "tagline": p.tagline,
                "key_url": p.key_url,
                "key_placeholder": p.key_placeholder,
            }
            for p in PROVIDERS.values()
        ],
    }


@router.get("/providers")
async def providers(visitor: Visitor = Depends(get_visitor)):
    saved = keys.list_keys(visitor.id)
    return [
        {
            "id": p.id,
            "name": p.name,
            "tagline": p.tagline,
            "key_url": p.key_url,
            "key_placeholder": p.key_placeholder,
            "connected": p.id in saved,
            "key_hint": saved.get(p.id, {}).get("key_hint"),
            "updated_at": saved.get(p.id, {}).get("updated_at"),
        }
        for p in PROVIDERS.values()
    ]


def _provider_or_404(provider_id: str):
    provider = get_provider(provider_id)
    if provider is None:
        raise AppError(404, "unknown_provider", "That provider isn't supported.")
    return provider


@router.put("/providers/{provider_id}/key")
async def save_key(provider_id: str, body: ProviderKeyRequest, visitor: Visitor = Depends(get_visitor)):
    provider = _provider_or_404(provider_id)
    key_limiter.check(visitor.id)
    models = await list_models(provider, body.api_key, use_cache=False)
    saved = await keys.save(visitor.id, provider.id, body.api_key)
    return {**saved, "models": models}


@router.delete("/providers/{provider_id}/key")
async def delete_key(provider_id: str, visitor: Visitor = Depends(get_visitor)):
    _provider_or_404(provider_id)
    await keys.delete(visitor.id, provider_id)
    return {"status": "removed"}


@router.get("/providers/{provider_id}/models")
async def provider_models(provider_id: str, visitor: Visitor = Depends(get_visitor)):
    provider = _provider_or_404(provider_id)
    return await list_models(provider, keys.get(visitor.id, provider.id))
