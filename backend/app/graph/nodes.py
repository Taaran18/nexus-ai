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


async def detect_intent(question: str, has_documents: bool) -> str:
    try:
        result = await groq_model(settings.router_model, temperature=0).ainvoke(
            [SystemMessage(content=prompts.CLASSIFY), HumanMessage(content=question[:2000])]
        )
        word = (result.text or "").strip().lower().split()[0].strip(".,") if result.text else "general"
    except Exception as exc:
        logger.warning("classify_failed error=%s", type(exc).__name__)
        word = "general"
    if word == "rag" and not has_documents:
        word = "general"
    return word if word in ("rag", "search") else "general"


async def classify(state: NexusState) -> NexusState:
    mode = state.get("source_mode", "auto")
    if mode == "documents":
        return {"intent": "rag"}
    return {"intent": await detect_intent(state["question"], bool(state.get("has_documents")) and mode != "ai")}


def _location(match) -> str:
    parts = [match.source]
    if match.page:
        parts.append(f"Page {match.page}")
    if match.start_line:
        lines = (
            f"Line {match.start_line}"
            if match.start_line == match.end_line
            else f"Lines {match.start_line}-{match.end_line}"
        )
        parts.append(lines)
    return " · ".join(parts)


async def retrieve(state: NexusState) -> NexusState:
    vector = await embed_query(state["question"])
    if vector is None:
        return {"context": "", "sources": []}
    documents_mode = state.get("source_mode") == "documents"
    matches = documents.search(
        state["user_id"],
        vector,
        k=6 if documents_mode else 4,
        doc_ids=state.get("document_ids") or None,
    )
    context = "\n\n".join(f"[{n}] {_location(m)}\n{m.content}" for n, m in enumerate(matches, start=1))
    sources = [
        {
            "type": "document",
            "ref": n,
            "title": m.source,
            "url": None,
            "document_id": m.doc_id,
            "page": m.page,
            "start_line": m.start_line,
            "end_line": m.end_line,
            "quote": m.content,
            "line_numbers": m.line_numbers,
        }
        for n, m in enumerate(matches, start=1)
    ]
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
    if state.get("intent") == "rag" and state.get("source_mode") == "documents":
        parts.append(
            prompts.DOCUMENTS_ONLY.format(context=state["context"])
            if state.get("context")
            else prompts.NO_DOCUMENT_MATCH
        )
    elif state.get("context") and state.get("intent") == "rag":
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
