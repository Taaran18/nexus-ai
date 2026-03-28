# Nexus AI

A full-stack AI chatbot built with **LangGraph**, **LangChain**, **FastAPI**, and **Next.js**. Supports real-time streaming, RAG (document Q&A), live web search, conversation history, folders, and 6 Groq LLM models — all on a completely free stack.

---

## Features

- **Streaming responses** via Server-Sent Events (SSE)
- **6 Groq LLM models** — switch mid-conversation (Llama 3.1 8B, Llama 3.3 70B, Mixtral, Gemma 2, DeepSeek R1, Llama Vision)
- **RAG** — upload PDF, TXT, or MD files; Nexus searches them when answering
- **Live web search** — DuckDuckGo, no API key needed
- **LangGraph pipeline** — classify intent → retrieve / web search / generate
- **Node visualizer** — see which graph node is running in real time
- **Conversation history** — persisted to Supabase, loaded on return
- **Folder organisation** — group chats into colour-coded folders
- **Export chat** — download any conversation as a Markdown file
- **Voice input** — browser-native Web Speech API (Chrome)
- **Token count & response time** — shown per assistant message
- **Dark / light mode** toggle
- **Mobile responsive** — sidebar drawer on small screens

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | [Groq](https://groq.com) (free tier) |
| Orchestration | LangGraph + LangChain |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` (free) |
| Vector store | Supabase pgvector |
| Database | Supabase (PostgreSQL) |
| Web search | DuckDuckGo (no key needed) |
| Backend | FastAPI + Uvicorn |
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, next-themes |

**Total cost to run: $0**

---

## Project Structure

```
nexus-ai/
├── backend/
│   ├── app/
│   │   ├── graph/          # LangGraph nodes, edges, state
│   │   ├── db/             # Supabase + vector store clients
│   │   ├── models/         # Pydantic schemas
│   │   └── main.py         # FastAPI routes
│   ├── requirements.txt
│   ├── .env.example
│   └── supabase_schema.sql # Run this in Supabase SQL editor
└── frontend/
    ├── app/                # Next.js App Router pages
    ├── components/         # React components
    ├── lib/                # API client + types
    └── .env.example
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A free [Supabase](https://supabase.com) account
- A free [Groq](https://console.groq.com) API key
- A free [Hugging Face](https://huggingface.co/settings/tokens) API key

---

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run these files in order:
   - `backend/supabase_schema.sql`
   - `backend/supabase_additions.sql`
3. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_KEY`

---

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, HUGGINGFACE_API_KEY
```

Start the server:

```bash
uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`

---

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

App runs at `http://localhost:3000`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role |
| `HUGGINGFACE_API_KEY` | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

### Frontend (`frontend/.env.local`)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (local) or your Render URL |

---

## Available Models

| Model | Badge | Best for |
|---|---|---|
| Llama 3.1 8B | 8B · Fast | Everyday questions, fast replies |
| Llama 3.3 70B | 70B · Smart | Complex reasoning, analysis |
| Mixtral 8×7B | Mixtral · 32k | Long context (32k tokens) |
| Gemma 2 9B | Gemma 2 | Creative and instructional tasks |
| DeepSeek R1 70B | R1 · Reasoning | Step-by-step reasoning |
| Llama 3.2 11B Vision | 11B · Vision | Multimodal (vision preview) |

---

## How It Works

Every message runs through a LangGraph pipeline:

```
User message
     │
     ▼
  classify        ← determines intent: general / rag / search
     │
     ├── rag       ← similarity search on uploaded documents
     ├── web_search ← DuckDuckGo live search
     │
     ▼
  generate        ← Groq LLM streams the final response
```

The frontend receives live node progress events (`node_start`) and token chunks (`token`) via SSE, showing which step is running in real time.

---

## License

MIT
