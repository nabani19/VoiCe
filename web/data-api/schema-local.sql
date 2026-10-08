-- ==============================================================================
-- VoiCe — Local PostgreSQL Schema (adapted for sandbox without Supabase Auth)
-- Mirrors supabase/schema.sql but replaces auth.users with a local users table.
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 0. USERS (replaces auth.users for local development)
-- ------------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  display_name text,
  created_at timestamptz default now() not null
);

insert into public.users (id, email, display_name)
values ('00000000-0000-0000-0000-000000000001', 'demo@voice.local', 'Demo User')
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  email text not null,
  display_name text,
  timezone text default 'UTC' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

insert into public.profiles (id, email, display_name)
values ('00000000-0000-0000-0000-000000000001', 'demo@voice.local', 'Demo User')
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 2. CONVERSATIONS
-- ------------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'New Conversation',
  source_type text not null check (source_type in ('screenshot', 'paste')),
  current_tone text,
  current_flow text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  archived_at timestamptz
);

create index if not exists idx_conversations_user_created
  on public.conversations(user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. MESSAGES
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  sender_label text not null check (sender_label in ('me', 'them')),
  body text not null,
  sequence_no integer not null,
  ocr_confidence numeric(4,3),
  created_at timestamptz default now() not null
);

create index if not exists idx_messages_conversation_sequence
  on public.messages(conversation_id, sequence_no asc);

-- ------------------------------------------------------------------------------
-- 4. GENERATIONS & REPLIES
-- ------------------------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  tone text not null,
  intent text not null,
  delivery text not null default 'Casual & Direct',
  intensity integer not null default 5,
  created_at timestamptz default now() not null
);

create table if not exists public.replies (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  style_tag text,
  copied_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_replies_generation
  on public.replies(generation_id);

-- ------------------------------------------------------------------------------
-- 5. FAVORITES
-- ------------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  reply_id uuid references public.replies(id) on delete set null,
  body text not null,
  category text not null check (category in ('Flirty', 'Funny', 'Professional', 'Spicy', 'Natural', 'Romantic', 'Sarcastic', 'Other')),
  created_at timestamptz default now() not null
);

create index if not exists idx_favorites_user_category
  on public.favorites(user_id, category, created_at desc);

-- ------------------------------------------------------------------------------
-- 6. DIAGNOSTIC REPORTS
-- ------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_reports_conversation
  on public.reports(conversation_id);

-- ------------------------------------------------------------------------------
-- 7. STREAKS
-- ------------------------------------------------------------------------------
create table if not exists public.streaks (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_count integer default 0 not null,
  longest_count integer default 0 not null,
  last_checkin_date date not null default '1970-01-01',
  updated_at timestamptz default now() not null
);

insert into public.streaks (user_id, current_count, longest_count, last_checkin_date)
values ('00000000-0000-0000-0000-000000000001', 0, 0, '1970-01-01')
on conflict (user_id) do nothing;
