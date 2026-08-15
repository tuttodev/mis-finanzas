-- Add planning status and reusable many-to-many tags for transactions.
alter table public.transactions
  add column is_planned boolean not null default true;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index tags_name_unique_ci on public.tags (lower(name));

create table public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create index idx_transaction_tags_tag on public.transaction_tags (tag_id, transaction_id);

alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;

create policy "anon full access" on public.tags
for all to anon using (true) with check (true);

create policy "anon full access" on public.transaction_tags
for all to anon using (true) with check (true);

grant select, insert on public.tags to anon;
grant select, insert, delete on public.transaction_tags to anon;
