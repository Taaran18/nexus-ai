from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = Field(default="development", alias="ENVIRONMENT")
    groq_api_key: str = Field(alias="GROQ_API_KEY")
    huggingface_api_key: str = Field(alias="HUGGINGFACE_API_KEY")
    encryption_key: str = Field(alias="ENCRYPTION_KEY")
    allowed_origins: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")
    data_dir: Path = Field(default=Path("./data"), alias="DATA_DIR")
    site_url: str = Field(default="http://localhost:3000", alias="SITE_URL")
    max_upload_mb: int = Field(default=10, alias="MAX_UPLOAD_MB")
    max_memories: int = Field(default=3, alias="MAX_MEMORIES")
    jev_base_url: str = Field(default="https://api.typesafe.ai/v1", alias="JEV_BASE_URL")
    jev_api_key: str = Field(default="", alias="JEV_API_KEY")
    jev_model: str = Field(default="jev-latest", alias="JEV_MODEL")
    jev_min_confidence: float = Field(default=0.55, alias="JEV_MIN_CONFIDENCE")
    think_fallback_model: str = Field(default="openai/gpt-oss-120b", alias="THINK_FALLBACK_MODEL")
    router_model: str = Field(default="openai/gpt-oss-20b", alias="ROUTER_MODEL")
    trial_daily_messages: int = Field(default=25, alias="TRIAL_DAILY_MESSAGES")
    trial_max_turns_per_chat: int = Field(default=15, alias="TRIAL_MAX_TURNS_PER_CHAT")
    trial_daily_uploads: int = Field(default=5, alias="TRIAL_DAILY_UPLOADS")
    trial_daily_voice: int = Field(default=30, alias="TRIAL_DAILY_VOICE")
    whisper_model: str = Field(default="whisper-large-v3-turbo", alias="WHISPER_MODEL")
    trust_proxy: bool = Field(default=True, alias="TRUST_PROXY")

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def jev_enabled(self) -> bool:
        return bool(self.jev_base_url and self.jev_api_key and self.jev_model)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
