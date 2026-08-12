-- Keep the balance available independently from future credit-limit changes.
alter table public.accounts
  add column credit_opening_balance numeric(15, 2);

with ordered_transactions as (
  select
    t.account_id,
    sum(t.amount) over (
      partition by t.account_id
      order by t.date, t.created_at, t.id
      rows between unbounded preceding and current row
    ) as running_balance
  from public.transactions t
), raw_balances as (
  select
    a.id,
    coalesce(sum(t.amount), 0) as raw_balance
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  group by a.id
), inferred_limits as (
  select account_id, max(running_balance) as inferred_limit
  from ordered_transactions
  group by account_id
)
update public.accounts a
set credit_opening_balance =
  a.credit_limit
  - coalesce(inferred.inferred_limit, 0)
from raw_balances raw
left join inferred_limits inferred on inferred.account_id = raw.id
where a.id = raw.id
  and a.type = 'credit'
  and a.credit_limit is not null;
