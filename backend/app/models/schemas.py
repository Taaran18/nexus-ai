from pydantic import BaseModel
from typing import Optional
from datetime import datetime

DEFAULT_MODEL = "llama-3.1-8b-instant"


class MessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: str = DEFAULT_MODEL


class MessageFeedback(BaseModel):
    rating: int  # 1 = thumbs up, -1 = thumbs down


class DocumentUpload(BaseModel):
    content: str
    metadata: Optional[dict] = {}


class FolderCreate(BaseModel):
    name: str
    color: str = "#6366f1"


class FolderUpdate(BaseModel):
    name: str


class SessionUpdate(BaseModel):
    folder_id: Optional[str] = None
    title: Optional[str] = None


class ChatSession(BaseModel):
    id: str
    title: str
    folder_id: Optional[str] = None
    created_at: datetime


class Message(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    rating: Optional[int] = None
    created_at: datetime


class Folder(BaseModel):
    id: str
    name: str
    color: str
    created_at: datetime
