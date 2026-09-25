from typing import Literal

from pydantic import BaseModel, Field, field_validator

HEX_COLOR = r"^#[0-9a-fA-F]{6}$"
MODEL_ID = r"^[A-Za-z0-9._:/@+-]{1,160}$"


class PreferencesUpdate(BaseModel):
    preferences: dict

    @field_validator("preferences")
    @classmethod
    def small_preferences(cls, value: dict) -> dict:
        if len(str(value)) > 4000:
            raise ValueError("preferences are too large")
        return value


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=12000)
    chat_id: str | None = None
    provider: str = Field(default="groq", pattern=r"^[a-z]{2,20}$")
    model: str = Field(default="openai/gpt-oss-20b", pattern=MODEL_ID)
    think: bool = False
    use_memory: bool = True


class RegenerateRequest(BaseModel):
    chat_id: str
    provider: str = Field(default="groq", pattern=r"^[a-z]{2,20}$")
    model: str = Field(default="openai/gpt-oss-20b", pattern=MODEL_ID)
    think: bool = False
    use_memory: bool = True


class FeedbackRequest(BaseModel):
    rating: Literal[1, -1] | None


class ChatUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    folder_id: str | None = None
    clear_folder: bool = False


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    color: str = Field(default="#0D9488", pattern=HEX_COLOR)


class FolderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    color: str | None = Field(default=None, pattern=HEX_COLOR)


class MemorySaveRequest(BaseModel):
    chat_id: str


class ProviderKeyRequest(BaseModel):
    api_key: str = Field(min_length=8, max_length=400)

    @field_validator("api_key")
    @classmethod
    def strip_key(cls, value: str) -> str:
        value = value.strip()
        if any(ch.isspace() for ch in value):
            raise ValueError("API keys can't contain spaces")
        return value
