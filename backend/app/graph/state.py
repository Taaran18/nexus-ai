from typing import TypedDict

from langchain_core.messages import BaseMessage


class NexusState(TypedDict, total=False):
    user_id: str
    history: list[BaseMessage]
    question: str
    intent: str
    context: str
    sources: list[dict]
    memory: str
    think: bool
    analysis: str
    has_documents: bool
    answer: str
    source_mode: str
    board: dict | None
    route_confidence: float
    router: str
    jev_usage: dict
    document_ids: list[str]
