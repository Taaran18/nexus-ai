import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.config import settings
from app.graph import prompts
from app.graph.state import NexusState
from app.llm.factory import groq_model, think_engine
from app.services.embeddings import embed_query
from app.services.search import web_search as run_web_search
from app.store import documents

logger = logging.getLogger("nexus")


async def classify(state: NexusState) -> NexusState:
    try:
        result = await groq_model(settings.router_model, temperature=0).ainvoke(
            [SystemMessage(content=prompts.CLASSIFY), HumanMessage(content=state["question"][:2000])]
        )
        word = (result.text or "").strip().lower().split()[0].strip(".,") if result.text else "general"
    except Exception as exc:
        logger.warning("classify_failed error=%s", type(exc).__name__)
        word = "general"
    if word == "rag" and not state.get("has_documents"):
        word = "general"
    return {"intent": word if word in ("rag", "search") else "general"}


async def retrieve(state: NexusState) -> NexusState:
    vector = await embed_query(state["question"])
    if vector is None:
        return {"context": "", "sources": []}
    matches = documents.search(state["user_id"], vector, k=4)
    context = "\n\n---\n\n".join(f"File: {m.source}\n{m.content}" for m in matches)
    sources = []
    for m in matches:
        if not any(s["title"] == m.source for s in sources):
            sources.append({"type": "document", "title": m.source, "url": None})
    return {"context": context, "sources": sources}


async def web_search(state: NexusState) -> NexusState:
    results = await run_web_search(state["question"])
    context = "\n\n".join(
        f"[{i}] {r['title']}\nURL: {r['url']}\n{r['snippet']}" for i, r in enumerate(results, start=1)
    )
    return {"context": context, "sources": [{"type": "web", "title": r["title"], "url": r["url"]} for r in results]}


def _context_messages(state: NexusState) -> list[SystemMessage]:
    parts = [prompts.ASSISTANT]
    if state.get("memory"):
        parts.append(prompts.MEMORY.format(memory=state["memory"]))
    if state.get("context") and state.get("intent") == "rag":
        parts.append(prompts.RAG.format(context=state["context"]))
    if state.get("context") and state.get("intent") == "search":
        parts.append(prompts.SEARCH.format(context=state["context"]))
    return [SystemMessage(content="\n\n".join(parts))]


async def deliberate(state: NexusState) -> NexusState:
    engine, _ = think_engine()
    messages = _context_messages(state) + [SystemMessage(content=prompts.DELIBERATE)] + state["history"][-6:]
    result = await engine.ainvoke(messages)
    return {"analysis": result.text or ""}


async def generate(state: NexusState, config: RunnableConfig) -> NexusState:
    llm = config["configurable"]["llm"]
    messages = _context_messages(state)
    if state.get("analysis"):
        messages.append(SystemMessage(content=prompts.ANALYSIS.format(analysis=state["analysis"])))
    result = await llm.ainvoke(messages + state["history"])
    return {"answer": result.text or ""}


def route_after_classify(state: NexusState) -> str:
    if state["intent"] == "rag":
        return "retrieve"
    if state["intent"] == "search":
        return "web_search"
    return "deliberate" if state.get("think") else "generate"


def route_after_context(state: NexusState) -> str:
    return "deliberate" if state.get("think") else "generate"
