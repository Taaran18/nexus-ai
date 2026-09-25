import re

CATALOG_CHECKED = "2026-09-25"

GROQ_MODELS: list[dict] = [
    {
        "id": "openai/gpt-oss-20b",
        "model": "openai/gpt-oss-20b",
        "name": "GPT-OSS 20B",
        "developer": "OpenAI",
        "group": "fast",
        "reasoning_effort": "low",
        "context": 131072,
        "speed": "About 1,000 words per second",
        "best_for": "Quick everyday questions, short emails, summaries and simple explanations.",
        "why": "Pick this when you want an answer right now and the question isn't complicated.",
        "default": True,
    },
    {
        "id": "openai/gpt-oss-120b",
        "model": "openai/gpt-oss-120b",
        "name": "GPT-OSS 120B",
        "developer": "OpenAI",
        "group": "fast",
        "reasoning_effort": "medium",
        "context": 131072,
        "speed": "About 500 words per second",
        "best_for": "Smarter all-round answers: writing, coding help and research that still arrive almost instantly.",
        "why": "Pick this when the fastest model feels too shallow but you don't want to wait.",
    },
    {
        "id": "openai/gpt-oss-120b:thorough",
        "model": "openai/gpt-oss-120b",
        "name": "GPT-OSS 120B Thorough",
        "developer": "OpenAI",
        "group": "thorough",
        "reasoning_effort": "high",
        "context": 131072,
        "speed": "Takes longer because it reasons step by step first",
        "best_for": "Maths, logic puzzles, tricky code, planning and anything where accuracy matters more than speed.",
        "why": "Pick this when a wrong answer would cost you more than a few extra seconds of waiting.",
    },
    {
        "id": "qwen/qwen3.8-27b",
        "model": "qwen/qwen3.8-27b",
        "name": "Qwen 3.8 27B",
        "developer": "Alibaba",
        "group": "new",
        "reasoning_effort": "default",
        "reasoning_format": "parsed",
        "context": 131072,
        "speed": "Moderate",
        "best_for": "The newest model on Groq: careful problem solving, coding and multilingual answers.",
        "why": "Pick this to try the latest model. It's a preview, so Groq may change or retire it at short notice.",
        "preview": True,
    },
]

GROQ_GROUPS = [
    {"id": "fast", "name": "Fast", "description": "Answers in a second or two. Best for everyday questions."},
    {
        "id": "thorough",
        "name": "Slow & Thorough",
        "description": "Thinks step by step before answering. Slower, but more careful.",
    },
    {"id": "new", "name": "New", "description": "The latest models on Groq, in preview."},
]

_BYOK: dict[str, dict[str, dict]] = {
    "openai": {
        "gpt-6-luna": {
            "name": "GPT-6 Luna",
            "tier": "fast",
            "price_in": 0.10,
            "price_out": 0.50,
            "context": 1050000,
            "reasoning": True,
            "best_for": "Cheap, quick answers for simple or high-volume chats.",
        },
        "gpt-6-sol": {
            "name": "GPT-6 Sol",
            "tier": "balanced",
            "price_in": 2.00,
            "price_out": 10.00,
            "context": 1050000,
            "reasoning": True,
            "best_for": "A strong everyday choice for writing, coding and multi-step work.",
        },
        "gpt-6-astra": {
            "name": "GPT-6 Astra",
            "tier": "deep",
            "price_in": 10.00,
            "price_out": 50.00,
            "context": 1050000,
            "reasoning": True,
            "best_for": "The hardest, most important tasks where quality matters more than cost.",
        },
        "gpt-5.6-terra": {
            "name": "GPT-5.6 Terra",
            "tier": "balanced",
            "price_in": 2.00,
            "price_out": 12.00,
            "context": 1050000,
            "reasoning": True,
            "best_for": "Previous generation that balances quality and cost.",
        },
        "gpt-5.6-sol": {
            "name": "GPT-5.6 Sol",
            "tier": "balanced",
            "price_in": 4.00,
            "price_out": 20.00,
            "reasoning": True,
            "best_for": "Previous-generation all-rounder.",
        },
        "gpt-5.6-luna": {
            "name": "GPT-5.6 Luna",
            "tier": "fast",
            "price_in": 0.20,
            "price_out": 1.20,
            "reasoning": True,
            "best_for": "Previous-generation budget model for quick replies.",
        },
        "gpt-5.5": {
            "name": "GPT-5.5",
            "tier": "deep",
            "price_in": 5.00,
            "price_out": 30.00,
            "reasoning": True,
            "best_for": "Earlier flagship; choose it only for a specific need.",
        },
        "gpt-5.4-mini": {
            "name": "GPT-5.4 Mini",
            "tier": "fast",
            "price_in": 0.75,
            "price_out": 4.50,
            "reasoning": True,
            "best_for": "Small and quick for everyday tasks.",
        },
        "gpt-5.4-nano": {
            "name": "GPT-5.4 Nano",
            "tier": "fast",
            "price_in": 0.20,
            "price_out": 1.25,
            "reasoning": True,
            "best_for": "The tiniest, cheapest option for very simple replies.",
        },
    },
    "anthropic": {
        "claude-haiku-4-5": {
            "name": "Claude Haiku 4.5",
            "tier": "fast",
            "price_in": 1.00,
            "price_out": 5.00,
            "context": 200000,
            "reasoning": True,
            "best_for": "The quickest Claude, for short, simple replies.",
        },
        "claude-sonnet-5": {
            "name": "Claude Sonnet 5",
            "tier": "balanced",
            "price_in": 2.00,
            "price_out": 10.00,
            "context": 1000000,
            "reasoning": True,
            "best_for": "A fast, smart all-rounder for most everyday work.",
        },
        "claude-opus-5-5": {
            "name": "Claude Opus 5.5",
            "tier": "deep",
            "price_in": 4.00,
            "price_out": 20.00,
            "context": 1000000,
            "reasoning": True,
            "best_for": "Serious writing, analysis and coding where quality matters.",
        },
        "claude-fable-5-1": {
            "name": "Claude Fable 5.1",
            "tier": "deep",
            "price_in": 10.00,
            "price_out": 50.00,
            "context": 1000000,
            "reasoning": True,
            "best_for": "The most demanding reasoning and long, complex projects.",
        },
    },
    "gemini": {
        "gemini-3.5-flash-lite": {
            "name": "Gemini 3.5 Flash-Lite",
            "tier": "fast",
            "price_in": 0.30,
            "price_out": 2.50,
            "context": 1048576,
            "reasoning": True,
            "best_for": "Google's fastest, cheapest option for quick answers.",
        },
        "gemini-3.1-flash-lite": {
            "name": "Gemini 3.1 Flash-Lite",
            "tier": "fast",
            "price_in": 0.25,
            "price_out": 1.50,
            "best_for": "The lowest-cost Gemini for simple chats.",
        },
        "gemini-3.8-flash": {
            "name": "Gemini 3.8 Flash",
            "tier": "balanced",
            "price_in": 0.75,
            "price_out": 3.75,
            "context": 1048576,
            "reasoning": True,
            "best_for": "Google's smartest fast model, good for most tasks including coding.",
        },
        "gemini-3.7-flash": {
            "name": "Gemini 3.7 Flash",
            "tier": "balanced",
            "price_in": 0.75,
            "price_out": 3.75,
            "best_for": "Previous Flash version; a solid general helper.",
        },
        "gemini-3.1-pro-preview": {
            "name": "Gemini 3.1 Pro Preview",
            "tier": "deep",
            "price_in": 2.00,
            "price_out": 12.00,
            "context": 1048576,
            "reasoning": True,
            "best_for": "Deeper thinking on complex questions.",
        },
    },
    "xai": {
        "grok-4.3": {
            "name": "Grok 4.3",
            "tier": "fast",
            "price_in": 1.25,
            "price_out": 2.50,
            "context": 1000000,
            "reasoning": True,
            "best_for": "Fast, reliable everyday answers at a low price.",
        },
        "grok-4.20-0309-non-reasoning": {
            "name": "Grok 4.20 Instant",
            "tier": "fast",
            "price_in": 1.25,
            "price_out": 2.50,
            "context": 1000000,
            "best_for": "Instant replies without a thinking pause.",
        },
        "grok-build-0.1": {
            "name": "Grok Build 0.1",
            "tier": "fast",
            "price_in": 1.00,
            "price_out": 2.00,
            "context": 256000,
            "reasoning": True,
            "best_for": "Quick help with programming tasks.",
        },
        "grok-4.7": {
            "name": "Grok 4.7",
            "tier": "deep",
            "price_in": 2.00,
            "price_out": 6.00,
            "context": 500000,
            "reasoning": True,
            "best_for": "xAI's most capable model for chat and code.",
        },
    },
    "deepseek": {
        "deepseek-flash": {
            "name": "DeepSeek V4.1 Flash",
            "tier": "fast",
            "price_in": 0.30,
            "price_out": 1.20,
            "context": 1000000,
            "reasoning": True,
            "best_for": "Very cheap, capable answers. Prices drop by half outside peak hours.",
        },
        "deepseek-v4-pro": {
            "name": "DeepSeek V4 Pro",
            "tier": "deep",
            "price_in": 1.32,
            "price_out": 3.96,
            "context": 1000000,
            "reasoning": True,
            "best_for": "Careful step-by-step reasoning at a low price. Off-peak is half price.",
        },
    },
    "mistral": {
        "ministral-8b-latest": {
            "name": "Ministral 3 8B",
            "tier": "fast",
            "price_in": 0.15,
            "price_out": 0.15,
            "context": 256000,
            "best_for": "Tiny, very cheap model for quick replies.",
        },
        "ministral-14b-latest": {
            "name": "Ministral 3 14B",
            "tier": "fast",
            "price_in": 0.20,
            "price_out": 0.20,
            "context": 256000,
            "best_for": "Small, low-cost model for simple questions.",
        },
        "mistral-small-latest": {
            "name": "Mistral Small 4",
            "tier": "fast",
            "price_in": 0.15,
            "price_out": 0.60,
            "context": 256000,
            "reasoning": True,
            "best_for": "Cheap, quick everyday chat that can also think when needed.",
        },
        "mistral-large-latest": {
            "name": "Mistral Large 3",
            "tier": "balanced",
            "price_in": 0.50,
            "price_out": 1.50,
            "context": 256000,
            "best_for": "A general-purpose model for broad knowledge tasks.",
        },
        "mistral-medium-latest": {
            "name": "Mistral Medium 3.5",
            "tier": "balanced",
            "price_in": 1.50,
            "price_out": 7.50,
            "context": 256000,
            "reasoning": True,
            "best_for": "Mistral's best model for coding and detailed work.",
        },
    },
}

_DATE_SUFFIX = re.compile(r"-\d{8}$")


def groq_entry(model_id: str) -> dict | None:
    return next((m for m in GROQ_MODELS if m["id"] == model_id), None)


def default_groq_id() -> str:
    return next(m["id"] for m in GROQ_MODELS if m.get("default"))


def catalog_entry(provider_id: str, model_id: str) -> dict | None:
    if provider_id == "openrouter":
        provider_id, _, model_id = model_id.partition("/")
        if provider_id == "google":
            provider_id = "gemini"
        if provider_id == "x-ai":
            provider_id = "xai"
        entry = _BYOK.get(provider_id, {}).get(model_id) or _BYOK.get(provider_id, {}).get(
            _DATE_SUFFIX.sub("", model_id)
        )
        return {k: v for k, v in entry.items() if k not in ("price_in", "price_out")} if entry else None
    models = _BYOK.get(provider_id, {})
    return models.get(model_id) or models.get(_DATE_SUFFIX.sub("", model_id))
