-- Existing financial amounts are COP and keep their original denomination.
alter table public.accounts drop constraint if exists accounts_currency_check;
alter table public.accounts add constraint accounts_currency_check
  check (currency in ('COP', 'PEN', 'USD', 'EUR'));

alter table public.budgets
  add column currency text not null default 'COP'
  constraint budgets_currency_check check (currency in ('COP', 'PEN', 'USD', 'EUR'));

alter table public.monthly_plans
  add column currency text not null default 'COP'
  constraint monthly_plans_currency_check check (currency in ('COP', 'PEN', 'USD', 'EUR'));

drop index public.monthly_plans_user_month_key;
create unique index monthly_plans_user_month_currency_key
  on public.monthly_plans (user_id, month, currency);

create table public.user_profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 80),
  avatar_path text,
  default_currency text not null default 'COP'
    check (default_currency in ('COP', 'PEN', 'USD', 'EUR')),
  updated_at timestamptz not null default now(),
  constraint user_profiles_avatar_own_path check (
    avatar_path is null or avatar_path like id::text || '/%'
  )
);

insert into public.user_profiles (id)
select id from auth.users
on conflict (id) do nothing;

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select, insert, update on public.user_profiles to authenticated;

create policy user_profiles_select_own on public.user_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy user_profiles_insert_own on public.user_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy user_profiles_update_own on public.user_profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Currency is part of the identity of an account, budget, or monthly plan.
create function public.prevent_finance_currency_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.currency is distinct from new.currency then
    raise exception 'Currency cannot be changed after creation';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_finance_currency_change() from public;
grant execute on function public.prevent_finance_currency_change() to authenticated;

create trigger accounts_preserve_currency before update of currency on public.accounts
  for each row execute function public.prevent_finance_currency_change();
create trigger budgets_preserve_currency before update of currency on public.budgets
  for each row execute function public.prevent_finance_currency_change();
create trigger monthly_plans_preserve_currency before update of currency on public.monthly_plans
  for each row execute function public.prevent_finance_currency_change();

-- A transaction must match the denomination of every linked financial record.
create function public.validate_finance_currency()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  record_currency text;
  linked_currency text;
begin
  if tg_table_name = 'transactions' then
    select currency into record_currency from public.accounts where id = new.account_id;
    if new.budget_cycle_id is not null then
      select b.currency into linked_currency
      from public.budget_cycles bc join public.budgets b on b.id = bc.budget_id
      where bc.id = new.budget_cycle_id;
      if linked_currency is distinct from record_currency then
        raise exception 'Transaction and budget currencies must match';
      end if;
    end if;
    if new.plan_item_id is not null then
      select p.currency into linked_currency
      from public.plan_items pi join public.monthly_plans p on p.id = pi.plan_id
      where pi.id = new.plan_item_id;
      if linked_currency is distinct from record_currency then
        raise exception 'Transaction and plan currencies must match';
      end if;
    end if;
    if new.related_transaction_id is not null then
      select a.currency into linked_currency
      from public.transactions t join public.accounts a on a.id = t.account_id
      where t.id = new.related_transaction_id;
      if linked_currency is distinct from record_currency then
        raise exception 'Refund and original transaction currencies must match';
      end if;
    end if;
  elsif tg_table_name = 'plan_items' and new.budget_id is not null then
    select currency into record_currency from public.monthly_plans where id = new.plan_id;
    select currency into linked_currency from public.budgets where id = new.budget_id;
    if linked_currency is distinct from record_currency then
      raise exception 'Plan item and budget currencies must match';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_finance_currency() from public;
grant execute on function public.validate_finance_currency() to authenticated;

create trigger transactions_validate_currency
  before insert or update of account_id, budget_cycle_id, plan_item_id, related_transaction_id
  on public.transactions for each row execute function public.validate_finance_currency();
create trigger plan_items_validate_currency
  before insert or update of plan_id, budget_id
  on public.plan_items for each row execute function public.validate_finance_currency();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy profile_avatars_insert_own on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
create policy profile_avatars_delete_own on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid()::text)
  );
