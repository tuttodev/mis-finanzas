-- Schema for the mis-finanzas app. Run in the Supabase SQL Editor.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  type text not null default 'cash' check (type in ('savings', 'credit', 'cash')),
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  limit_amount numeric(15, 2) not null check (limit_amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table budget_cycles (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  snapshot_limit_amount numeric(15, 2),
  snapshot_spent_amount numeric(15, 2),
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default ('custom-' || gen_random_uuid()::text),
  name text not null unique check (char_length(trim(name)) between 1 and 60),
  sort_order integer not null default 1000,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

insert into categories (slug, name, sort_order, is_system) values
  ('food', 'Alimentación', 10, true),
  ('transport', 'Transporte', 20, true),
  ('housing', 'Vivienda', 30, true),
  ('utilities', 'Servicios', 40, true),
  ('health', 'Salud', 50, true),
  ('education', 'Educación', 60, true),
  ('entertainment', 'Entretenimiento', 70, true),
  ('shopping', 'Compras', 80, true),
  ('debt', 'Deudas', 90, true),
  ('other', 'Otros', 100, true);

create unique index categories_name_unique_ci on categories (lower(name));

create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  budget_cycle_id uuid references budget_cycles (id) on delete set null,
  category_id uuid references categories (id) on delete restrict,
  date date not null,
  description text not null,
  -- Negative = expense, positive = income
  amount numeric(15, 2) not null,
  -- Shared by the two legs of a transfer between accounts
  transfer_id uuid,
  constraint transactions_category_matches_amount check (
    (transfer_id is not null and category_id is null and budget_cycle_id is null)
    or (transfer_id is null and amount < 0 and category_id is not null)
    or (transfer_id is null and amount >= 0 and category_id is null)
  ),
  created_at timestamptz not null default now()
);

create index idx_transactions_account on transactions (account_id, date desc);
create index idx_transactions_cycle on transactions (budget_cycle_id);
create index idx_transactions_category on transactions (category_id, date desc);
create index idx_transactions_transfer on transactions (transfer_id) where transfer_id is not null;
create index idx_budget_cycles_budget on budget_cycles (budget_id, started_at desc);

create view account_balances with (security_invoker = true) as
select a.id as account_id, coalesce(sum(t.amount), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.id;

-- The app uses the anon key without user auth, so open access to the anon role.
-- Anyone holding the anon key can read/write this data; keep the key private.
alter table accounts enable row level security;
alter table budgets enable row level security;
alter table budget_cycles enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "anon full access" on accounts for all to anon using (true) with check (true);
create policy "anon full access" on budgets for all to anon using (true) with check (true);
create policy "anon full access" on budget_cycles for all to anon using (true) with check (true);
create policy "anon read access" on categories for select to anon using (true);
create policy "anon insert custom categories" on categories for insert to anon
with check (not is_system);
create policy "anon full access" on transactions for all to anon using (true) with check (true);

grant select, insert on categories to anon;
grant select, insert on accounts to anon;

-- Seed your accounts (edit names/types as needed, then uncomment):
-- insert into accounts (name, type) values
--   ('Bancolombia', 'savings'),
--   ('Tarjeta de crédito', 'credit'),
--   ('Efectivo', 'cash');
