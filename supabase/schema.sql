-- My AI Chat database
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  image_data text,
  created_at timestamptz not null default now()
);

create index if not exists chats_user_updated_idx
  on public.chats(user_id, updated_at desc);

create index if not exists messages_chat_created_idx
  on public.messages(chat_id, created_at);

alter table public.chats enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can view their chats" on public.chats;
create policy "Users can view their chats"
  on public.chats for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their chats" on public.chats;
create policy "Users can create their chats"
  on public.chats for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their chats" on public.chats;
create policy "Users can update their chats"
  on public.chats for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their chats" on public.chats;
create policy "Users can delete their chats"
  on public.chats for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view their messages" on public.messages;
create policy "Users can view their messages"
  on public.messages for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their messages" on public.messages;
create policy "Users can create their messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their messages" on public.messages;
create policy "Users can delete their messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_chat()
returns trigger
language plpgsql
security invoker
as $$
begin
  update public.chats
  set updated_at = now()
  where id = new.chat_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_chat on public.messages;
create trigger messages_touch_chat
after insert on public.messages
for each row execute function public.touch_chat();

-- Useful grants for the Data API.
grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, delete on public.messages to authenticated;
