from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq

from app.config import settings
from app.llm.providers import get_provider

_groq_cache: dict[tuple, ChatGroq] = {}


def groq_model(
    model: str,
    temperature: float = 0.6,
    reasoning_effort: str | None = "low",
    reasoning_format: str | None = None,
) -> ChatGroq:
    key = (model, temperature, reasoning_effort, reasoning_format)
    if key not in _groq_cache:
        _groq_cache[key] = ChatGroq(
            model=model,
            api_key=settings.groq_api_key,
            temperature=temperature,
            reasoning_effort=reasoning_effort,
            reasoning_format=reasoning_format,
            streaming=True,
            max_retries=2,
            timeout=90,
        )
    return _groq_cache[key]


def groq_catalog_model(entry: dict) -> ChatGroq:
    return groq_model(
        entry["model"],
        temperature=0.6,
        reasoning_effort=entry.get("reasoning_effort"),
        reasoning_format=entry.get("reasoning_format"),
    )


def byok_model(provider_id: str, model: str, api_key: str) -> BaseChatModel:
    provider = get_provider(provider_id)
    if provider is None:
        raise ValueError(f"Unknown provider {provider_id}")
    if provider.kind == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model, api_key=api_key, streaming=True, max_tokens=8192, max_retries=1, timeout=120)
    from langchain_openai import ChatOpenAI

    headers = {"HTTP-Referer": settings.site_url, "X-Title": "Nexus AI"} if provider_id == "openrouter" else None
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=provider.base_url,
        streaming=True,
        stream_usage=True,
        max_retries=1,
        timeout=120,
        default_headers=headers,
    )


THINK_LABEL = "GPT-OSS 120B Thorough on Groq"


def think_engine() -> tuple[BaseChatModel, str]:
    label = f"{THINK_LABEL} + JEV by TypeSafe" if settings.jev_enabled else THINK_LABEL
    return groq_model(settings.think_fallback_model, temperature=0.3, reasoning_effort="high"), label
