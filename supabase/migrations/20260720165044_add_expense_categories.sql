create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (slug, name, sort_order) values
  ('food', 'Alimentación', 10),
  ('transport', 'Transporte', 20),
  ('housing', 'Vivienda', 30),
  ('utilities', 'Servicios', 40),
  ('health', 'Salud', 50),
  ('education', 'Educación', 60),
  ('entertainment', 'Entretenimiento', 70),
  ('shopping', 'Compras', 80),
  ('debt', 'Deudas', 90),
  ('other', 'Otros', 100);

grant select on public.categories to anon;

alter table public.categories enable row level security;

create policy "anon read access"
on public.categories
for select
to anon
using (true);

alter table public.transactions
  add column category_id uuid references public.categories (id) on delete restrict;

update public.transactions
set category_id = (
  select id
  from public.categories
  where slug = 'other'
)
where amount < 0;

alter table public.transactions
  add constraint transactions_category_matches_amount check (
    (amount < 0 and category_id is not null)
    or (amount >= 0 and category_id is null)
  );

create index idx_transactions_category
on public.transactions (category_id, date desc);
