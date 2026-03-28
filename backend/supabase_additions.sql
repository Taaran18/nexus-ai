-- ============================================================
-- Nexus — Additions Migration
-- Run in Supabase → SQL Editor after the original schema
-- ============================================================

-- 1. Folders table (skip if already ran supabase_folders.sql)
create table if not exists folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz default timezone('utc', now()) not null
);
alter table folders disable row level security;

-- 2. folder_id on sessions (skip if already ran supabase_folders.sql)
alter table chat_sessions
  add column if not exists folder_id uuid references folders(id) on delete set null;

-- 3. Message rating (thumbs up/down)
alter table messages
  add column if not exists rating smallint default null
  check (rating in (-1, 1));

-- 4. Document metadata improvements
alter table documents
  add column if not exists source_name text generated always as (metadata->>'source') stored;

alter table documents
  add column if not exists created_at timestamptz
  default timezone('utc', now()) not null;
