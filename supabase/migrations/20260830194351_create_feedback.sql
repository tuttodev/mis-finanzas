create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  page_path text not null check (char_length(page_path) <= 500),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon, authenticated;
grant insert on table public.feedback to authenticated;

create policy feedback_insert_own
on public.feedback for insert to authenticated
with check ((select auth.uid()) = user_id);
