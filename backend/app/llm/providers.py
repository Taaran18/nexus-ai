from dataclasses import dataclass


@dataclass(frozen=True)
class Provider:
    id: str
    name: str
    kind: str
    base_url: str
    models_url: str
    key_url: str
    key_placeholder: str
    tagline: str


PROVIDERS: dict[str, Provider] = {
    p.id: p
    for p in [
        Provider(
            id="openai",
            name="OpenAI",
            kind="openai",
            base_url="https://api.openai.com/v1",
            models_url="https://api.openai.com/v1/models",
            key_url="https://platform.openai.com/api-keys",
            key_placeholder="sk-...",
            tagline="GPT models for writing, coding and everyday reasoning.",
        ),
        Provider(
            id="anthropic",
            name="Anthropic Claude",
            kind="anthropic",
            base_url="https://api.anthropic.com",
            models_url="https://api.anthropic.com/v1/models?limit=100",
            key_url="https://console.anthropic.com/settings/keys",
            key_placeholder="sk-ant-...",
            tagline="Claude models known for careful writing, analysis and long documents.",
        ),
        Provider(
            id="gemini",
            name="Google Gemini",
            kind="openai",
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            models_url="https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
            key_url="https://aistudio.google.com/app/apikey",
            key_placeholder="AIza...",
            tagline="Gemini models with very long context and strong multimodal skills.",
        ),
        Provider(
            id="openrouter",
            name="OpenRouter",
            kind="openai",
            base_url="https://openrouter.ai/api/v1",
            models_url="https://openrouter.ai/api/v1/models",
            key_url="https://openrouter.ai/settings/keys",
            key_placeholder="sk-or-...",
            tagline="One key for hundreds of models from every major lab, with live pricing.",
        ),
        Provider(
            id="xai",
            name="xAI Grok",
            kind="openai",
            base_url="https://api.x.ai/v1",
            models_url="https://api.x.ai/v1/models",
            key_url="https://console.x.ai",
            key_placeholder="xai-...",
            tagline="Grok models with real-time knowledge and a direct style.",
        ),
        Provider(
            id="deepseek",
            name="DeepSeek",
            kind="openai",
            base_url="https://api.deepseek.com",
            models_url="https://api.deepseek.com/models",
            key_url="https://platform.deepseek.com/api_keys",
            key_placeholder="sk-...",
            tagline="Low-cost models that are strong at maths and code.",
        ),
        Provider(
            id="mistral",
            name="Mistral AI",
            kind="openai",
            base_url="https://api.mistral.ai/v1",
            models_url="https://api.mistral.ai/v1/models",
            key_url="https://console.mistral.ai/api-keys",
            key_placeholder="...",
            tagline="European models that are fast, efficient and multilingual.",
        ),
    ]
}


def get_provider(provider_id: str) -> Provider | None:
    return PROVIDERS.get(provider_id)
