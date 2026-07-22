-- Link paired transactions that move money between accounts.
alter table public.transactions
  add column transfer_id uuid;

alter table public.transactions
  drop constraint transactions_category_matches_amount;

alter table public.transactions
  add constraint transactions_category_matches_amount check (
    (transfer_id is not null and category_id is null and budget_cycle_id is null)
    or (transfer_id is null and amount < 0 and category_id is not null)
    or (transfer_id is null and amount >= 0 and category_id is null)
  );

create index idx_transactions_transfer
on public.transactions (transfer_id)
where transfer_id is not null;
