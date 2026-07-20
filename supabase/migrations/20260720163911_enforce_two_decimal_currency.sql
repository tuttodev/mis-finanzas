-- Keep every persisted currency value at two decimal places.
drop view if exists account_balances;

alter table budgets
  alter column limit_amount type numeric(15, 2)
  using round(limit_amount, 2);

alter table budget_cycles
  alter column snapshot_limit_amount type numeric(15, 2)
  using round(snapshot_limit_amount, 2),
  alter column snapshot_spent_amount type numeric(15, 2)
  using round(snapshot_spent_amount, 2);

alter table transactions
  alter column amount type numeric(15, 2)
  using round(amount, 2);

create view account_balances with (security_invoker = true) as
select a.id as account_id, coalesce(sum(t.amount), 0) as balance
from accounts a
left join transactions t on t.account_id = a.id
group by a.id;

grant select on account_balances to anon;
