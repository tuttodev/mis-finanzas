-- Remove the credit-limit fields while preserving accounts and transactions.
alter table public.accounts
  drop column if exists credit_opening_balance,
  drop column if exists credit_limit;
