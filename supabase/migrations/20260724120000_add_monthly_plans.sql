-- Monthly budget plans: free-form income/expense line items per calendar month.
create table monthly_plans (
  id uuid primary key default gen_random_uuid(),
  -- First day of the month; one plan per month
  month date not null unique,
  payday date,
  created_at timestamptz not null default now()
);

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references monthly_plans (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  kind text not null check (kind in ('income', 'expense')),
  planned_amount numeric(15, 2) not null check (planned_amount >= 0),
  note text,
  is_paid boolean not null default false,
  budget_id uuid references budgets (id) on delete set null,
  category_id uuid references categories (id) on delete set null,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now()
);

create index idx_plan_items_plan on plan_items (plan_id, sort_order);

alter table monthly_plans enable row level security;
alter table plan_items enable row level security;

create policy "authenticated full access" on monthly_plans for all to authenticated using (true) with check (true);
create policy "authenticated full access" on plan_items for all to authenticated using (true) with check (true);
