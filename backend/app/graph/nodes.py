import asyncio
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.tools import DuckDuckGoSearchRun

from app.graph.state import NexusState
from app.db.vector_store import similarity_search_async
from app.config import settings

DEFAULT_MODEL = "llama-3.1-8b-instant"

# ── LLM cache (keyed by model id) ────────────────────────────────────────────
_llm_cache: dict[str, ChatGroq] = {}

def get_llm(model: str = DEFAULT_MODEL) -> ChatGroq:
    if model not in _llm_cache:
        _llm_cache[model] = ChatGroq(
            model=model,
            api_key=settings.GROQ_API_KEY,
            streaming=True,
            temperature=0.7,
        )
    return _llm_cache[model]


# ── Node 1: Classify intent ───────────────────────────────────────────────────

async def classify_intent(state: NexusState) -> NexusState:
    """
    Classifies the user message into one of:
      'rag'     → search uploaded knowledge base
      'search'  → live web search (DuckDuckGo)
      'general' → direct LLM answer
    """
    last_message = state["messages"][-1].content
    llm = get_llm(state.get("model", DEFAULT_MODEL))

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            """You are a query classifier. Classify into exactly one of:

"rag"     – question about specific uploaded documents or knowledge base
"search"  – needs current/live info: news, weather, prices, recent events
"general" – everything else: coding, math, creative writing, general Q&A

Reply with ONLY the single word. No punctuation.""",
        ),
        ("human", "{question}"),
    ])

    chain = prompt | llm
    result = await chain.ainvoke({"question": last_message})
    raw = result.content.strip().lower()
    intent = raw if raw in ("rag", "search") else "general"
    return {**state, "intent": intent}


# ── Node 2a: RAG retrieval ────────────────────────────────────────────────────

async def retrieve_context(state: NexusState) -> NexusState:
    """Fetch top-3 relevant chunks from Supabase pgvector."""
    try:
        docs = await similarity_search_async(state["messages"][-1].content, k=3)
        context = "\n\n---\n\n".join([
            f"Source: {doc.metadata.get('source', 'knowledge base')}\n{doc.page_content}"
            for doc in docs
        ]) if docs else ""
        return {**state, "context": context}
    except Exception as e:
        print(f"[retrieve_context] {e}")
        return {**state, "context": ""}


# ── Node 2b: Web search ───────────────────────────────────────────────────────

async def web_search(state: NexusState) -> NexusState:
    """Live web search via DuckDuckGo — no API key needed."""
    try:
        query = state["messages"][-1].content
        search = DuckDuckGoSearchRun()
        raw = await asyncio.to_thread(search.run, query)
        return {**state, "context": f"Web search results for: {query}\n\n{raw}"}
    except Exception as e:
        print(f"[web_search] {e}")
        return {**state, "context": ""}


# ── Node 3: Generate response ─────────────────────────────────────────────────

async def generate_response(state: NexusState) -> NexusState:
    """Generate the final answer using the user-selected Groq model."""
    llm = get_llm(state.get("model", DEFAULT_MODEL))
    context = state.get("context", "")
    intent = state.get("intent", "general")

    system_content = (
        "You are Nexus, an intelligent and helpful AI assistant. "
        "You are concise, accurate, and friendly. "
        "Format responses with markdown when it improves clarity. "
        "Never reveal which underlying model you are based on."
    )

    if context and intent == "rag":
        system_content += (
            "\n\nUse the following retrieved documents to answer. "
            "If they don't contain the answer, say so and use your general knowledge.\n\n"
            + context
        )
    elif context and intent == "search":
        system_content += (
            "\n\nUse the following live web search results to answer. "
            "Cite sources where relevant.\n\n"
            + context
        )

    messages_to_send = [SystemMessage(content=system_content)] + list(state["messages"])
    response = await llm.ainvoke(messages_to_send)
    return {**state, "messages": [response]}


# ── Edge: route after classify ────────────────────────────────────────────────

def route_after_classify(state: NexusState) -> str:
    return {"rag": "retrieve", "search": "web_search"}.get(
        state.get("intent", "general"), "generate"
    )
