alter table public.categories
  add column is_system boolean not null default false,
  alter column slug set default ('custom-' || gen_random_uuid()::text),
  alter column sort_order set default 1000,
  add constraint categories_name_not_blank
    check (char_length(trim(name)) between 1 and 60);

update public.categories
set is_system = true
where slug in (
  'food',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'shopping',
  'debt',
  'other'
);

create unique index categories_name_unique_ci
on public.categories (lower(name));

grant select, insert on public.categories to anon;

create policy "anon insert custom categories"
on public.categories
for insert
to anon
with check (not is_system);

alter table public.accounts
  add constraint accounts_name_not_blank
    check (char_length(trim(name)) between 1 and 80);

grant select, insert on public.accounts to anon;
