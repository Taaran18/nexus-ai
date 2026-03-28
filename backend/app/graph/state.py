from typing import TypedDict, List, Annotated
from langchain_core.messages import BaseMessage
import operator


class NexusState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add]
    session_id: str
    context: str
    intent: str   # "general" | "rag" | "search"
    model: str    # Groq model ID chosen by the user
