-- Harden the existing transfer trigger and cover foreign keys reported by the
-- Supabase performance advisor.
create or replace function public.enforce_transfer_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_currency text;
  paired_currency text;
begin
  if new.transfer_id is null then
    return new;
  end if;

  select account.currency into source_currency
  from public.accounts account
  where account.id = new.account_id;

  select account.currency into paired_currency
  from public.transactions transaction
  join public.accounts account on account.id = transaction.account_id
  where transaction.transfer_id = new.transfer_id
    and transaction.id <> new.id
  limit 1;

  if paired_currency is not null and source_currency <> paired_currency then
    raise exception 'Transfers must use accounts with the same currency';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_transfer_currency() from public;
grant execute on function public.enforce_transfer_currency() to authenticated;

create index if not exists plan_items_budget_id_idx
  on public.plan_items (budget_id);
create index if not exists plan_items_category_id_idx
  on public.plan_items (category_id);
