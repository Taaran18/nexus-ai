import re
import time

import httpx

from app.core.errors import AppError
from app.llm.catalog import catalog_entry
from app.llm.providers import Provider

_DATED = re.compile(r"-\d{4}-?\d{2}-?\d{2}$|-\d{4}$")
_CACHE_TTL = 600
_cache: dict[tuple[str, str], tuple[float, list[dict]]] = {}

_EXCLUDE = (
    "embed",
    "tts",
    "whisper",
    "dall-e",
    "image",
    "imagine",
    "video",
    "audio",
    "realtime",
    "transcribe",
    "moderation",
    "search",
    "instruct",
    "codex",
    "ocr",
    "guard",
    "safeguard",
    "live",
    "aqa",
    "learnlm",
    "veo",
    "imagen",
    "computer-use",
)

_FAST = ("mini", "nano", "flash", "lite", "haiku", "small", "instant", "fast", "8b", "20b", "tiny")
_DEEP = ("opus", "-pro", "large", "reasoner", "o1", "o3", "thinking", "120b", "405b", "heavy", "max")


def _tier(model_id: str) -> str:
    lower = model_id.lower()
    if any(k in lower for k in _DEEP):
        return "deep"
    if any(k in lower for k in _FAST):
        return "fast"
    return "balanced"


def _generic_best_for(tier: str) -> str:
    return {
        "fast": "Quick replies and simple everyday questions where speed matters most.",
        "deep": "Hard problems that need careful, step-by-step thinking. Slower, but more thorough.",
        "balanced": "A good all-rounder for writing, questions and everyday work.",
    }[tier]


def _headers(provider: Provider, api_key: str) -> dict[str, str]:
    if provider.id == "anthropic":
        return {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    if provider.id == "gemini":
        return {"x-goog-api-key": api_key}
    return {"Authorization": f"Bearer {api_key}"}


def _keep(model_id: str) -> bool:
    lower = model_id.lower()
    return not any(term in lower for term in _EXCLUDE)


def _raw_ids(provider: Provider, payload: dict) -> list[dict]:
    if provider.id == "gemini":
        items = []
        for m in payload.get("models", []):
            model_id = m.get("name", "").removeprefix("models/")
            if (
                "generateContent" in m.get("supportedGenerationMethods", [])
                and model_id.startswith("gemini")
                and _keep(model_id)
            ):
                items.append(
                    {"id": model_id, "name": m.get("displayName") or model_id, "context": m.get("inputTokenLimit")}
                )
        return items
    data = payload.get("data", [])
    items = []
    for m in data:
        model_id = m.get("id", "")
        if not model_id or not _keep(model_id):
            continue
        if provider.id == "openai":
            if not model_id.startswith(("gpt-", "o1", "o3", "o4", "o5", "chatgpt")) or _DATED.search(model_id):
                continue
        if provider.id == "mistral":
            caps = m.get("capabilities") or {}
            if not caps.get("completion_chat") or _DATED.search(model_id):
                continue
        if provider.id == "openrouter":
            pricing = m.get("pricing") or {}
            try:
                price_in = round(float(pricing.get("prompt", 0)) * 1_000_000, 4)
                price_out = round(float(pricing.get("completion", 0)) * 1_000_000, 4)
            except (TypeError, ValueError):
                price_in = price_out = None
            if price_in is not None and price_in < 0:
                continue
            items.append(
                {
                    "id": model_id,
                    "name": m.get("name") or model_id,
                    "context": m.get("context_length"),
                    "price_in": price_in,
                    "price_out": price_out,
                    "live_price": True,
                }
            )
            continue
        items.append({"id": model_id, "name": m.get("display_name") or model_id, "context": m.get("context_window")})
    return items


def _enrich(provider: Provider, item: dict) -> dict:
    entry = catalog_entry(provider.id, item["id"]) or {}
    tier = entry.get("tier") or _tier(item["id"])
    price_in = item.get("price_in") if item.get("live_price") else entry.get("price_in")
    price_out = item.get("price_out") if item.get("live_price") else entry.get("price_out")
    return {
        "id": item["id"],
        "name": entry.get("name") or item.get("name") or item["id"],
        "context": item.get("context") or entry.get("context"),
        "price_in": price_in,
        "price_out": price_out,
        "pricing_source": "live"
        if item.get("live_price")
        else ("catalog" if entry.get("price_in") is not None else "unknown"),
        "tier": tier,
        "reasoning": bool(entry.get("reasoning")),
        "best_for": entry.get("best_for") or _generic_best_for(tier),
        "recommended": bool(entry),
    }


async def _validate_openrouter(client: httpx.AsyncClient, api_key: str) -> None:
    response = await client.get("https://openrouter.ai/api/v1/key", headers={"Authorization": f"Bearer {api_key}"})
    if response.status_code in (401, 403):
        raise AppError(
            400, "invalid_key", "OpenRouter rejected this key. Check that it's copied correctly and still active."
        )
    response.raise_for_status()


async def list_models(provider: Provider, api_key: str, use_cache: bool = True) -> list[dict]:
    cache_key = (provider.id, api_key[-12:])
    now = time.monotonic()
    if use_cache and cache_key in _cache and _cache[cache_key][0] > now:
        return _cache[cache_key][1]
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            if provider.id == "openrouter":
                await _validate_openrouter(client, api_key)
            response = await client.get(provider.models_url, headers=_headers(provider, api_key))
    except httpx.TimeoutException as exc:
        raise AppError(
            504, "provider_timeout", f"{provider.name} took too long to respond. Try again in a moment."
        ) from exc
    except httpx.HTTPError as exc:
        if isinstance(exc, httpx.HTTPStatusError):
            raise AppError(502, "provider_error", f"{provider.name} returned an error. Try again later.") from exc
        raise AppError(
            502, "provider_unreachable", f"We couldn't reach {provider.name}. Check your connection and try again."
        ) from exc
    if response.status_code in (400, 401, 403):
        raise AppError(
            400, "invalid_key", f"{provider.name} rejected this key. Check that it's copied correctly and still active."
        )
    if response.status_code == 429:
        raise AppError(
            429, "provider_rate_limited", f"{provider.name} is rate limiting this key. Wait a minute and try again."
        )
    if response.status_code >= 400:
        raise AppError(
            502, "provider_error", f"{provider.name} returned an error ({response.status_code}). Try again later."
        )
    items = [_enrich(provider, item) for item in _raw_ids(provider, response.json())]
    order = {"fast": 0, "balanced": 1, "deep": 2}
    items.sort(key=lambda m: (not m["recommended"], order.get(m["tier"], 1), m["name"].lower()))
    _cache[cache_key] = (now + _CACHE_TTL, items)
    return items
