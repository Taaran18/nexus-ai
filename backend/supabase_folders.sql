-- ============================================================
-- Nexus — Folders Migration
-- Run this in Supabase → SQL Editor → New Query
-- Only needed if you already ran supabase_schema.sql
-- ============================================================

-- 1. Folders table
create table if not exists folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#6366f1',
  created_at timestamptz default timezone('utc', now()) not null
);

alter table folders disable row level security;

-- 2. Add folder_id to chat_sessions
alter table chat_sessions
  add column if not exists folder_id uuid references folders(id) on delete set null;
