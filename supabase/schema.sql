-- ResearchMind Supabase schema (optional). SQLite is used locally by default.
-- Run in the Supabase SQL editor if you want cloud persistence + pgvector.

create extension if not exists vector;

create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key,
  user_id uuid not null,
  title text not null,
  query text not null,
  created_at timestamptz default now()
);

create table if not exists research_sessions (
  id uuid primary key,
  project_id uuid,
  user_id uuid not null,
  query text not null,
  status text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  title text,
  url text,
  source_type text,
  snippet text,
  score float8 default 0
);

create table if not exists extracted_evidence (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  source_id uuid,
  claim text,
  excerpt text
);

create table if not exists research_findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  kind text,
  payload jsonb
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  markdown text,
  voice_script text,
  created_at timestamptz default now()
);

create table if not exists chat_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid,
  role text,
  content text,
  created_at timestamptz default now()
);

create table if not exists user_preferences (
  user_id uuid primary key,
  voice_enabled boolean default true,
  llm_preference text default 'auto'
);

create table if not exists document_embeddings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  source_id uuid,
  chunk_text text,
  embedding vector(384)
);

create index if not exists document_embeddings_ivfflat
  on document_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

alter table profiles enable row level security;
alter table projects enable row level security;
alter table research_sessions enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own projects" on projects for all using (auth.uid() = user_id);
create policy "own sessions" on research_sessions for all using (auth.uid() = user_id);
