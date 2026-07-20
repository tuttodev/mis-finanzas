-- Schema for the mis-finanzas app. Run in the Supabase SQL Editor.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'cash' check (type in ('savings', 'credit', 'cash')),
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  limit_amount numeric not null check (limit_amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table budget_cycles (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  snapshot_limit_amount numeric,
  snapshot_spent_amount numeric,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts (id) on delete cascade,
  budget_cycle_id uuid references budget_cycles (id) on delete set null,
  date date not null,
  description text not null,
  -- Negative = expense, positive = income
  amount numeric not null,
  created_at timestamptz not null default now()
);

create index idx_transactions_account on transactions (account_id, date desc);
create index idx_transactions_cycle on transactions (budget_cycle_id);
create index idx_budget_cycles_budget on budget_cycles (budget_id, started_at desc);

create view account_balances as
select a.id as account_id, coalesce(sum(t.amount), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.id;

-- The app uses the anon key without user auth, so open access to the anon role.
-- Anyone holding the anon key can read/write this data; keep the key private.
alter table accounts enable row level security;
alter table budgets enable row level security;
alter table budget_cycles enable row level security;
alter table transactions enable row level security;

create policy "anon full access" on accounts for all to anon using (true) with check (true);
create policy "anon full access" on budgets for all to anon using (true) with check (true);
create policy "anon full access" on budget_cycles for all to anon using (true) with check (true);
create policy "anon full access" on transactions for all to anon using (true) with check (true);

-- Seed your accounts (edit names/types as needed, then uncomment):
-- insert into accounts (name, type) values
--   ('Bancolombia', 'savings'),
--   ('Tarjeta de crédito', 'credit'),
--   ('Efectivo', 'cash');
