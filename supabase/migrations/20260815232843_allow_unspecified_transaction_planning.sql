-- Allow transactions to remain without a planning decision.
alter table public.transactions
  alter column is_planned drop not null,
  alter column is_planned set default null;
