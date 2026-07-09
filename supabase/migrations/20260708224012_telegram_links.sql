create table public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_chat_id bigint unique,
  link_code text,
  linked_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.telegram_links enable row level security;
create policy "Users manage own telegram link"
  on public.telegram_links for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.telegram_bot_logs (
  id uuid primary key default gen_random_uuid(),
  telegram_chat_id bigint,
  raw_text text,
  parsed jsonb,
  status text not null default 'received',
  created_at timestamptz not null default now()
);
