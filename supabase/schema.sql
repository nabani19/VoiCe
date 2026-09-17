-- ==============================================================================
-- VoiCe — Supabase PostgreSQL Schema with Strict Row-Level Security (RLS)
-- Master Auth Hardening Compliant (IDOR-resistant, auth.uid() bounded)
-- ==============================================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES (Linked directly to Supabase auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  timezone text default 'UTC' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Trigger: Automatically create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  insert into public.streaks (user_id, current_count, longest_count, last_checkin_date)
  values (new.id, 1, 1, current_date);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. CONVERSATIONS
-- ------------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Conversation',
  source_type text not null check (source_type in ('screenshot', 'paste')),
  current_tone text,
  current_flow text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  archived_at timestamptz
);

alter table public.conversations enable row level security;

create policy "conversations_all_own" on public.conversations
  for all using (auth.uid() = user_id);

create index if not exists idx_conversations_user_created 
  on public.conversations(user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 3. MESSAGES (Chat Turns)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_label text not null check (sender_label in ('me', 'them')),
  body text not null,
  sequence_no integer not null,
  ocr_confidence numeric(4,3),
  created_at timestamptz default now() not null
);

alter table public.messages enable row level security;

create policy "messages_all_own" on public.messages
  for all using (auth.uid() = user_id);

create index if not exists idx_messages_conversation_sequence 
  on public.messages(conversation_id, sequence_no asc);

-- ------------------------------------------------------------------------------
-- 4. GENERATIONS & REPLIES
-- ------------------------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tone text not null,
  intent text not null,
  delivery text not null default 'Casual & Direct',
  intensity integer not null default 5,
  created_at timestamptz default now() not null
);

alter table public.generations enable row level security;

create policy "generations_all_own" on public.generations
  for all using (auth.uid() = user_id);

create table if not exists public.replies (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  style_tag text,
  copied_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.replies enable row level security;

create policy "replies_all_own" on public.replies
  for all using (auth.uid() = user_id);

create index if not exists idx_replies_generation 
  on public.replies(generation_id);

-- ------------------------------------------------------------------------------
-- 5. FAVORITES (Grouped by Category)
-- ------------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reply_id uuid references public.replies(id) on delete set null,
  body text not null,
  category text not null check (category in ('Flirty', 'Funny', 'Professional', 'Spicy', 'Natural', 'Romantic', 'Sarcastic', 'Other')),
  created_at timestamptz default now() not null
);

alter table public.favorites enable row level security;

create policy "favorites_all_own" on public.favorites
  for all using (auth.uid() = user_id);

create index if not exists idx_favorites_user_category 
  on public.favorites(user_id, category, created_at desc);

-- ------------------------------------------------------------------------------
-- 6. DIAGNOSTIC REPORTS
-- ------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz default now() not null
);

alter table public.reports enable row level security;

create policy "reports_all_own" on public.reports
  for all using (auth.uid() = user_id);

create index if not exists idx_reports_conversation 
  on public.reports(conversation_id);

-- ------------------------------------------------------------------------------
-- 7. STREAKS (Idempotent Daily Check-in)
-- ------------------------------------------------------------------------------
create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_count integer default 1 not null,
  longest_count integer default 1 not null,
  last_checkin_date date not null default current_date,
  updated_at timestamptz default now() not null
);

alter table public.streaks enable row level security;

create policy "streaks_all_own" on public.streaks
  for all using (auth.uid() = user_id);

-- Stored Procedure: Idempotent streak check-in
create or replace function public.checkin_streak(target_user_id uuid)
returns table(current_streak int, longest_streak int, already_checked_in boolean) as $$
declare
  v_streak record;
  v_today date := current_date;
begin
  select * into v_streak from public.streaks where user_id = target_user_id;
  
  if not found then
    insert into public.streaks (user_id, current_count, longest_count, last_checkin_date)
    values (target_user_id, 1, 1, v_today)
    returning current_count, longest_count into current_streak, longest_streak;
    already_checked_in := false;
    return next;
    return;
  end if;

  if v_streak.last_checkin_date = v_today then
    current_streak := v_streak.current_count;
    longest_streak := v_streak.longest_count;
    already_checked_in := true;
    return next;
    return;
  elsif v_streak.last_checkin_date = (v_today - 1) then
    -- Consecutive day
    update public.streaks
    set current_count = current_count + 1,
        longest_count = greatest(longest_count, current_count + 1),
        last_checkin_date = v_today,
        updated_at = now()
    where user_id = target_user_id
    returning current_count, longest_count into current_streak, longest_streak;
    already_checked_in := false;
    return next;
    return;
  else
    -- Streak reset
    update public.streaks
    set current_count = 1,
        last_checkin_date = v_today,
        updated_at = now()
    where user_id = target_user_id
    returning current_count, longest_count into current_streak, longest_streak;
    already_checked_in := false;
    return next;
    return;
  end if;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET RLS FOR SCREENSHOTS
-- ------------------------------------------------------------------------------
-- Insert bucket if not present
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'screenshots',
  'screenshots',
  false,
  10485760, -- 10MB limit
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Storage Policy: Users can only upload and read files in their own user folder (screenshots/<user_id>/*)
create policy "storage_user_screenshots_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage_user_screenshots_select"
  on storage.objects for select
  using (
    bucket_id = 'screenshots' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "storage_user_screenshots_delete"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );
