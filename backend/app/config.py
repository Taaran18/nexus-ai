from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = Field(default="development", alias="ENVIRONMENT")
    groq_api_key: str = Field(alias="GROQ_API_KEY")
    jwt_secret: str = Field(alias="JWT_SECRET")
    huggingface_api_key: str = Field(alias="HUGGINGFACE_API_KEY")
    encryption_key: str = Field(default="", alias="ENCRYPTION_KEY")
    allowed_origins: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")
    data_dir: Path = Field(default=Path("./data"), alias="DATA_DIR")
    site_url: str = Field(default="http://localhost:3000", alias="SITE_URL")
    max_upload_mb: int = Field(default=10, alias="MAX_UPLOAD_MB")
    max_memories: int = Field(default=3, alias="MAX_MEMORIES")
    jev_base_url: str = Field(default="", alias="JEV_BASE_URL")
    jev_api_key: str = Field(default="", alias="JEV_API_KEY")
    jev_model: str = Field(default="", alias="JEV_MODEL")
    think_fallback_model: str = Field(default="openai/gpt-oss-120b", alias="THINK_FALLBACK_MODEL")
    router_model: str = Field(default="openai/gpt-oss-20b", alias="ROUTER_MODEL")
    access_token_minutes: int = Field(default=15, alias="ACCESS_TOKEN_MINUTES")
    refresh_token_days: int = Field(default=30, alias="REFRESH_TOKEN_DAYS")
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="", alias="SMTP_FROM")

    @property
    def origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def jev_enabled(self) -> bool:
        return bool(self.jev_base_url and self.jev_api_key and self.jev_model)

    @property
    def smtp_enabled(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
