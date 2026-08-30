-- Accounts hold balances in exactly one currency. Existing accounts remain in COP.
alter table public.accounts
  add column currency text not null default 'COP'
    check (currency in ('COP', 'USD'));

-- A transfer has one amount, so it is only valid when both account legs share a currency.
create or replace function public.enforce_transfer_currency()
returns trigger
language plpgsql
as $$
declare
  source_currency text;
  paired_currency text;
begin
  if new.transfer_id is null then
    return new;
  end if;

  select currency into source_currency
  from public.accounts
  where id = new.account_id;

  select accounts.currency into paired_currency
  from public.transactions
  join public.accounts on accounts.id = transactions.account_id
  where transactions.transfer_id = new.transfer_id
    and transactions.id <> new.id
  limit 1;

  if paired_currency is not null and source_currency <> paired_currency then
    raise exception 'Transfers must use accounts with the same currency';
  end if;

  return new;
end;
$$;

create trigger transactions_enforce_transfer_currency
before insert or update of account_id, transfer_id on public.transactions
for each row execute function public.enforce_transfer_currency();

revoke all on function public.enforce_transfer_currency() from public;
