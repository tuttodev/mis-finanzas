-- Add plan_item_id to transactions so each expense created from a plan item
-- stays linked to that item, allowing the plan view to show the actual amount paid.

alter table transactions
  add column if not exists plan_item_id uuid references plan_items (id) on delete set null;

create index if not exists idx_transactions_plan_item
  on transactions (plan_item_id)
  where plan_item_id is not null;
