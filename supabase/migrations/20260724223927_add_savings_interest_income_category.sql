-- Categorize income separately from expenses and keep savings interest traceable.
alter table public.categories
  add column transaction_type text not null default 'expense'
  check (transaction_type in ('expense', 'income'));

insert into public.categories (
  slug,
  name,
  sort_order,
  is_system,
  transaction_type
) values (
  'savings-interest',
  'Intereses de ahorros',
  10,
  true,
  'income'
);

alter table public.transactions
  drop constraint transactions_category_matches_amount;

alter table public.transactions
  add constraint transactions_category_matches_amount check (
    (transfer_id is not null and category_id is null and budget_cycle_id is null)
    or (transfer_id is null and amount < 0 and category_id is not null)
    or (transfer_id is null and amount >= 0 and budget_cycle_id is null)
  );
