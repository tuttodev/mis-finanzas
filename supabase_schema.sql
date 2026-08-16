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
  transaction_type text not null default 'expense'
    check (transaction_type in ('expense', 'income')),
  sort_order integer not null default 1000,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

insert into categories (slug, name, transaction_type, sort_order, is_system) values
  ('food', 'Alimentación', 'expense', 10, true),
  ('transport', 'Transporte', 'expense', 20, true),
  ('housing', 'Vivienda', 'expense', 30, true),
  ('utilities', 'Servicios', 'expense', 40, true),
  ('health', 'Salud', 'expense', 50, true),
  ('education', 'Educación', 'expense', 60, true),
  ('entertainment', 'Entretenimiento', 'expense', 70, true),
  ('shopping', 'Compras', 'expense', 80, true),
  ('debt', 'Deudas', 'expense', 90, true),
  ('other', 'Otros', 'expense', 100, true),
  ('savings-interest', 'Intereses de ahorros', 'income', 10, true);

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
  is_planned boolean default null,
  -- Shared by the two legs of a transfer between accounts
  transfer_id uuid,
  kind text not null default 'regular' check (kind in ('regular', 'refund')),
  related_transaction_id uuid references transactions (id) on delete restrict,
  constraint transactions_category_matches_amount check (
    (
      kind = 'regular' and related_transaction_id is null and transfer_id is not null
      and category_id is null and budget_cycle_id is null
    )
    or (
      kind = 'regular' and related_transaction_id is null and transfer_id is null
      and amount < 0 and category_id is not null
    )
    or (
      kind = 'regular' and related_transaction_id is null and transfer_id is null
      and amount >= 0 and budget_cycle_id is null
    )
    or (
      kind = 'refund' and related_transaction_id is not null and transfer_id is null
      and amount > 0 and category_id is not null and budget_cycle_id is not null
    )
  ),
  created_at timestamptz not null default now()
);

create index idx_transactions_account on transactions (account_id, date desc);
create index idx_transactions_cycle on transactions (budget_cycle_id);
create index idx_transactions_category on transactions (category_id, date desc);
create index idx_transactions_transfer on transactions (transfer_id) where transfer_id is not null;
create index idx_transactions_related on transactions (related_transaction_id)
where related_transaction_id is not null;
create index idx_budget_cycles_budget on budget_cycles (budget_id, started_at desc);

create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 40),
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index tags_name_unique_ci on tags (lower(name));

insert into tags (name, is_system)
select common_tags.name, true
from (values
  ('Mercado'), ('Restaurantes'), ('Domicilios'), ('Cafeterías'), ('Snacks'),
  ('Gasolina'), ('Taxi'), ('Transporte público'), ('Parqueadero'), ('Peajes'),
  ('Mantenimiento vehículo'), ('Arriendo'), ('Hipoteca'), ('Reparaciones del hogar'),
  ('Muebles'), ('Decoración'), ('Energía'), ('Agua'), ('Gas'), ('Internet'),
  ('Telefonía'), ('Suscripciones'), ('Medicamentos'), ('Médico'), ('Odontología'),
  ('Exámenes médicos'), ('Seguro médico'), ('Matrícula'), ('Cursos'), ('Libros'),
  ('Útiles escolares'), ('Certificaciones'), ('Cine'), ('Streaming'), ('Eventos'),
  ('Juegos'), ('Hobbies'), ('Ropa'), ('Tecnología'), ('Hogar'), ('Regalos'),
  ('Mascotas'), ('Tarjeta de crédito'), ('Préstamo'), ('Cuota'), ('Intereses de deuda'),
  ('Donaciones'), ('Impuestos'), ('Trámites'), ('Viajes'), ('Rendimientos de ahorro'),
  ('Intereses de ahorro')
) as common_tags(name)
where not exists (
  select 1 from tags existing where lower(existing.name) = lower(common_tags.name)
);

create table transaction_tags (
  transaction_id uuid not null references transactions (id) on delete cascade,
  tag_id uuid not null references tags (id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create index idx_transaction_tags_tag on transaction_tags (tag_id, transaction_id);

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
alter table tags enable row level security;
alter table transaction_tags enable row level security;

create policy "anon full access" on accounts for all to anon using (true) with check (true);
create policy "anon full access" on budgets for all to anon using (true) with check (true);
create policy "anon full access" on budget_cycles for all to anon using (true) with check (true);
create policy "anon read access" on categories for select to anon using (true);
create policy "anon insert custom categories" on categories for insert to anon
with check (not is_system);
create policy "anon full access" on transactions for all to anon using (true) with check (true);
create policy "anon full access" on tags for all to anon using (true) with check (true);
create policy "anon full access" on transaction_tags for all to anon using (true) with check (true);

grant select, insert on categories to anon;
grant select, insert on accounts to anon;
grant select, insert, delete on tags to anon;
grant select, insert, delete on transaction_tags to anon;

-- Seed your accounts (edit names/types as needed, then uncomment):
-- insert into accounts (name, type) values
--   ('Bancolombia', 'savings'),
--   ('Tarjeta de crédito', 'credit'),
--   ('Efectivo', 'cash');
