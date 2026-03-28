-- ============================================================
-- Nexus — Supabase Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- 1. Enable the pgvector extension (free on all Supabase plans)
create extension if not exists vector;


-- 2. Chat sessions
create table if not exists chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'New Chat',
  created_at  timestamptz default timezone('utc', now()) not null
);


-- 3. Messages
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references chat_sessions(id) on delete cascade not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz default timezone('utc', now()) not null
);

create index if not exists messages_session_id_idx on messages(session_id);


-- 4. Documents (for RAG / vector search)
--    all-MiniLM-L6-v2 produces 384-dimensional vectors
create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  content    text,
  metadata   jsonb default '{}',
  embedding  vector(384)
);


-- 5. Similarity search function (used by LangChain SupabaseVectorStore)
create or replace function match_documents (
  query_embedding  vector(384),
  match_count      int     default null,
  filter           jsonb   default '{}'
)
returns table (
  id          uuid,
  content     text,
  metadata    jsonb,
  similarity  float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;


-- 6. (Optional) Disable Row Level Security for local dev — enable + add policies for prod
alter table chat_sessions disable row level security;
alter table messages      disable row level security;
alter table documents     disable row level security;
