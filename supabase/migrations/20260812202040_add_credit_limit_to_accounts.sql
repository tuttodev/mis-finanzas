-- Store the credit limit configured for each credit account.
alter table public.accounts
  add column credit_limit numeric(15, 2)
  check (credit_limit is null or credit_limit > 0);
