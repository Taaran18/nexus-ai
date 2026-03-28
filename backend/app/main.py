import uuid
import json
import io
import time
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
import asyncio

from app.graph.builder import nexus_graph
from app.db.supabase_client import get_supabase
from app.db.vector_store import get_vector_store
from app.models.schemas import (
    MessageRequest,
    DocumentUpload,
    FolderCreate,
    FolderUpdate,
    SessionUpdate,
    MessageFeedback,
)

app = FastAPI(title="Nexus API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODE_LABELS = {
    "classify":  "Analyzing your question…",
    "retrieve":  "Searching knowledge base…",
    "web_search": "Searching the web…",
    "generate":  "Generating response…",
}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Nexus API running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}


# ─── Chat (SSE streaming) ─────────────────────────────────────────────────────

@app.post("/chat")
async def chat(request: MessageRequest):
    """
    Streams the full LangGraph execution as Server-Sent Events.

    Event types emitted:
      node_start  → which graph node just started (for the UI visualizer)
      token       → LLM output token
      done        → generation complete
      error       → something went wrong
    """
    session_id = request.session_id or str(uuid.uuid4())
    supabase = get_supabase()

    # 1. Fetch conversation history BEFORE saving the new message
    history: list[HumanMessage | AIMessage] = []
    if request.session_id:
        prev = (
            supabase.table("messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for m in reversed(prev.data):
            cls = HumanMessage if m["role"] == "user" else AIMessage
            history.append(cls(content=m["content"]))

    # 2. Create session row if brand new
    if not request.session_id:
        title = request.message[:60] + ("..." if len(request.message) > 60 else "")
        supabase.table("chat_sessions").insert({"id": session_id, "title": title}).execute()

    # 3. Save user message
    supabase.table("messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": request.message,
    }).execute()

    # 4. Build full message list: history + current
    history.append(HumanMessage(content=request.message))

    async def stream_response():
        full_response = ""
        total_tokens = 0
        start_time = time.time()

        try:
            initial_state = {
                "messages": history,
                "session_id": session_id,
                "context": "",
                "intent": "general",
                "model": request.model,
            }

            async for event in nexus_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]
                node = event.get("metadata", {}).get("langgraph_node", "")

                # Node progress events
                if kind == "on_chain_start" and node in NODE_LABELS:
                    yield f"data: {json.dumps({'type': 'node_start', 'node': node, 'label': NODE_LABELS[node]})}\n\n"

                # Stream tokens from the generate node
                elif kind == "on_chat_model_stream" and node == "generate":
                    chunk = event["data"]["chunk"]
                    if chunk.content:
                        full_response += chunk.content
                        yield f"data: {json.dumps({'type': 'token', 'content': chunk.content, 'session_id': session_id})}\n\n"

                # Capture token usage when generate node finishes
                elif kind == "on_chat_model_end" and node == "generate":
                    output = event["data"].get("output")
                    if output and hasattr(output, "usage_metadata") and output.usage_metadata:
                        meta = output.usage_metadata
                        total_tokens = (
                            meta.get("total_tokens", 0)
                            if isinstance(meta, dict)
                            else getattr(meta, "total_tokens", 0)
                        )

            elapsed_ms = int((time.time() - start_time) * 1000)

            # Save full response
            supabase.table("messages").insert({
                "session_id": session_id,
                "role": "assistant",
                "content": full_response,
            }).execute()

            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'total_tokens': total_tokens, 'time_ms': elapsed_ms})}\n\n"

        except Exception as e:
            print(f"[stream_response] {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Regenerate ───────────────────────────────────────────────────────────────

@app.post("/chat/regenerate")
async def regenerate(data: dict):
    """
    Deletes the last assistant message for a session and re-streams a new one.
    The frontend re-uses the same SSE handling as /chat.
    """
    session_id = data.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    supabase = get_supabase()

    # Find the last assistant message
    last_ai = (
        supabase.table("messages")
        .select("id")
        .eq("session_id", session_id)
        .eq("role", "assistant")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if last_ai.data:
        supabase.table("messages").delete().eq("id", last_ai.data[0]["id"]).execute()

    # Find the last user message to re-send
    last_user = (
        supabase.table("messages")
        .select("content")
        .eq("session_id", session_id)
        .eq("role", "user")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not last_user.data:
        raise HTTPException(status_code=404, detail="No user message found")

    model = data.get("model", "llama-3.1-8b-instant")

    # Re-use the chat endpoint with the existing session
    return await chat(MessageRequest(
        message=last_user.data[0]["content"],
        session_id=session_id,
        model=model,
    ))


# ─── Message feedback ─────────────────────────────────────────────────────────

@app.patch("/messages/{message_id}/feedback")
async def message_feedback(message_id: str, data: MessageFeedback):
    supabase = get_supabase()
    result = (
        supabase.table("messages")
        .update({"rating": data.rating})
        .eq("id", message_id)
        .execute()
    )
    return result.data[0] if result.data else {"status": "ok"}


# ─── Sessions ─────────────────────────────────────────────────────────────────

@app.get("/sessions")
async def get_sessions():
    supabase = get_supabase()
    return supabase.table("chat_sessions").select("*").order("created_at", desc=True).execute().data


@app.get("/sessions/search")
async def search_sessions(q: str = Query(..., min_length=1)):
    supabase = get_supabase()
    return (
        supabase.table("chat_sessions")
        .select("*")
        .ilike("title", f"%{q}%")
        .order("created_at", desc=True)
        .execute()
        .data
    )


@app.patch("/sessions/{session_id}")
async def update_session(session_id: str, data: SessionUpdate):
    supabase = get_supabase()
    update_data = {}
    if data.folder_id is not None:
        update_data["folder_id"] = data.folder_id
    if data.title is not None:
        update_data["title"] = data.title
    result = supabase.table("chat_sessions").update(update_data).eq("id", session_id).execute()
    return result.data[0]


@app.get("/sessions/{session_id}/messages")
async def get_messages(session_id: str):
    supabase = get_supabase()
    return (
        supabase.table("messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
        .data
    )


@app.get("/sessions/{session_id}/export")
async def export_session(session_id: str):
    """Export a chat session as a downloadable Markdown file."""
    supabase = get_supabase()
    session = supabase.table("chat_sessions").select("*").eq("id", session_id).execute().data
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        supabase.table("messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
        .data
    )

    lines = [f"# {session[0]['title']}\n", f"*Exported from Nexus*\n\n---\n"]
    for msg in messages:
        label = "**You**" if msg["role"] == "user" else "**Nexus**"
        lines.append(f"\n### {label}\n{msg['content']}\n")

    content = "\n".join(lines)
    safe_title = session[0]["title"][:40].replace(" ", "_").replace("/", "-")
    filename = f"nexus_{safe_title}.md"

    return Response(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    supabase = get_supabase()
    supabase.table("messages").delete().eq("session_id", session_id).execute()
    supabase.table("chat_sessions").delete().eq("id", session_id).execute()
    return {"status": "deleted"}


# ─── Folders ──────────────────────────────────────────────────────────────────

@app.get("/folders")
async def get_folders():
    supabase = get_supabase()
    return supabase.table("folders").select("*").order("created_at").execute().data


@app.post("/folders")
async def create_folder(data: FolderCreate):
    supabase = get_supabase()
    return supabase.table("folders").insert({"name": data.name, "color": data.color}).execute().data[0]


@app.patch("/folders/{folder_id}")
async def update_folder(folder_id: str, data: FolderUpdate):
    supabase = get_supabase()
    return supabase.table("folders").update({"name": data.name}).eq("id", folder_id).execute().data[0]


@app.delete("/folders/{folder_id}")
async def delete_folder(folder_id: str):
    supabase = get_supabase()
    supabase.table("chat_sessions").update({"folder_id": None}).eq("folder_id", folder_id).execute()
    supabase.table("folders").delete().eq("id", folder_id).execute()
    return {"status": "deleted"}


# ─── Documents (RAG) ──────────────────────────────────────────────────────────

@app.get("/documents")
async def list_documents():
    supabase = get_supabase()
    result = (
        supabase.table("documents")
        .select("id, metadata, content, created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@app.post("/documents/upload")
async def upload_document_file(file: UploadFile = File(...)):
    """
    Upload a PDF or TXT file. The backend:
      1. Extracts text (pypdf for PDFs)
      2. Splits into chunks (RecursiveCharacterTextSplitter)
      3. Embeds each chunk (HuggingFace)
      4. Stores vectors in Supabase pgvector
    """
    raw = await file.read()
    filename = file.filename or "upload"

    # Extract text
    if filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            text = "\n\n".join(
                page.extract_text() or "" for page in reader.pages
            ).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse PDF: {e}")
    else:
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File must be PDF or UTF-8 text")

    if not text:
        raise HTTPException(status_code=400, detail="No text extracted from file")

    # Split into overlapping chunks
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=60)
    chunks = splitter.split_text(text)

    # Embed + store
    vector_store = get_vector_store()
    docs = [
        Document(page_content=chunk, metadata={"source": filename})
        for chunk in chunks
    ]
    await asyncio.to_thread(vector_store.add_documents, docs)

    return {
        "status": "uploaded",
        "filename": filename,
        "chunks": len(chunks),
        "preview": text[:200],
    }


@app.post("/documents")
async def upload_document_text(doc: DocumentUpload):
    """Upload raw text directly (for programmatic use)."""
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=60)
        chunks = splitter.split_text(doc.content)
        vector_store = get_vector_store()
        docs = [Document(page_content=c, metadata=doc.metadata or {}) for c in chunks]
        await asyncio.to_thread(vector_store.add_documents, docs)
        return {"status": "uploaded", "chunks": len(chunks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    supabase = get_supabase()
    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"status": "deleted"}
