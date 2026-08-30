-- Convert the original single-user dataset into an isolated multi-user model.
-- The existing data belongs to the confirmed owner account below. Google OAuth
-- with the same email will automatically link to this existing auth user.

do $$
begin
  if (
    select count(*)
    from auth.users
    where lower(email) = 'jsebas2426@gmail.com'
  ) <> 1 then
    raise exception 'Expected exactly one confirmed legacy owner';
  end if;
end;
$$;

alter table public.accounts
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.budgets
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.budget_cycles
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.transactions
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.monthly_plans
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.plan_items
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.payroll_documents
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.categories
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.tags
  add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;

update public.accounts
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
update public.budgets
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
update public.budget_cycles
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;

-- Adding ownership does not change financial data. Avoid revalidating historical
-- refunds in already closed cycles while this metadata-only update runs.
alter table public.transactions disable trigger transactions_validate_refund;
update public.transactions
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
alter table public.transactions enable trigger transactions_validate_refund;

update public.monthly_plans
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
update public.plan_items
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
update public.payroll_documents
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null;
update public.categories
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null and not is_system;
update public.tags
set user_id = (select id from auth.users where lower(email) = 'jsebas2426@gmail.com')
where user_id is null and not is_system;

alter table public.accounts alter column user_id set not null;
alter table public.budgets alter column user_id set not null;
alter table public.budget_cycles alter column user_id set not null;
alter table public.transactions alter column user_id set not null;
alter table public.monthly_plans alter column user_id set not null;
alter table public.plan_items alter column user_id set not null;
alter table public.payroll_documents alter column user_id set not null;

alter table public.monthly_plans drop constraint monthly_plans_month_key;
alter table public.categories drop constraint categories_name_key;
drop index public.categories_name_unique_ci;
alter table public.tags drop constraint tags_name_key;
drop index public.tags_name_unique_ci;

create unique index monthly_plans_user_month_key
  on public.monthly_plans (user_id, month);
create unique index categories_system_name_unique_ci
  on public.categories (lower(name)) where user_id is null;
create unique index categories_user_name_unique_ci
  on public.categories (user_id, lower(name)) where user_id is not null;
create unique index tags_system_name_unique_ci
  on public.tags (lower(name)) where user_id is null;
create unique index tags_user_name_unique_ci
  on public.tags (user_id, lower(name)) where user_id is not null;

create index accounts_user_id_idx on public.accounts (user_id);
create index budgets_user_id_idx on public.budgets (user_id);
create index budget_cycles_user_id_idx on public.budget_cycles (user_id);
create index transactions_user_id_idx on public.transactions (user_id);
create index monthly_plans_user_id_idx on public.monthly_plans (user_id);
create index plan_items_user_id_idx on public.plan_items (user_id);
create index payroll_documents_user_id_idx on public.payroll_documents (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index tags_user_id_idx on public.tags (user_id);

create or replace function public.validate_finance_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'budget_cycles' then
    if not exists (
      select 1 from public.budgets
      where id = new.budget_id and user_id = new.user_id
    ) then
      raise exception 'The budget does not belong to the current user';
    end if;
  elsif tg_table_name = 'transactions' then
    if not exists (
      select 1 from public.accounts
      where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'The account does not belong to the current user';
    end if;

    if new.budget_cycle_id is not null and not exists (
      select 1 from public.budget_cycles
      where id = new.budget_cycle_id and user_id = new.user_id
    ) then
      raise exception 'The budget cycle does not belong to the current user';
    end if;

    if new.category_id is not null and not exists (
      select 1 from public.categories
      where id = new.category_id
        and (user_id = new.user_id or (user_id is null and is_system))
    ) then
      raise exception 'The category is not available to the current user';
    end if;

    if new.related_transaction_id is not null and not exists (
      select 1 from public.transactions
      where id = new.related_transaction_id and user_id = new.user_id
    ) then
      raise exception 'The related transaction does not belong to the current user';
    end if;

    if new.plan_item_id is not null and not exists (
      select 1 from public.plan_items
      where id = new.plan_item_id and user_id = new.user_id
    ) then
      raise exception 'The plan item does not belong to the current user';
    end if;
  elsif tg_table_name = 'plan_items' then
    if not exists (
      select 1 from public.monthly_plans
      where id = new.plan_id and user_id = new.user_id
    ) then
      raise exception 'The monthly plan does not belong to the current user';
    end if;

    if new.budget_id is not null and not exists (
      select 1 from public.budgets
      where id = new.budget_id and user_id = new.user_id
    ) then
      raise exception 'The budget does not belong to the current user';
    end if;

    if new.category_id is not null and not exists (
      select 1 from public.categories
      where id = new.category_id
        and (user_id = new.user_id or (user_id is null and is_system))
    ) then
      raise exception 'The category is not available to the current user';
    end if;
  elsif tg_table_name = 'payroll_documents' then
    if not exists (
      select 1 from public.monthly_plans
      where id = new.plan_id and user_id = new.user_id
    ) then
      raise exception 'The monthly plan does not belong to the current user';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_finance_ownership() from public;
grant execute on function public.validate_finance_ownership() to authenticated;

create trigger budget_cycles_validate_ownership
before insert or update on public.budget_cycles
for each row execute function public.validate_finance_ownership();
create trigger transactions_validate_ownership
before insert or update on public.transactions
for each row execute function public.validate_finance_ownership();
create trigger plan_items_validate_ownership
before insert or update on public.plan_items
for each row execute function public.validate_finance_ownership();
create trigger payroll_documents_validate_ownership
before insert or update on public.payroll_documents
for each row execute function public.validate_finance_ownership();

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'accounts', 'budgets', 'budget_cycles', 'categories', 'transactions',
        'tags', 'transaction_tags', 'monthly_plans', 'plan_items',
        'plan_item_tags', 'payroll_documents'
      ])
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

revoke all on table
  public.accounts, public.budgets, public.budget_cycles, public.categories,
  public.transactions, public.tags, public.transaction_tags,
  public.monthly_plans, public.plan_items, public.plan_item_tags,
  public.payroll_documents, public.account_balances
from anon, authenticated;

grant select, insert, update, delete on table
  public.accounts, public.budgets, public.budget_cycles, public.categories,
  public.transactions, public.tags, public.monthly_plans, public.plan_items,
  public.payroll_documents
to authenticated;
grant select, insert, delete on table
  public.transaction_tags, public.plan_item_tags
to authenticated;
grant select on table public.account_balances to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts', 'budgets', 'budget_cycles', 'transactions',
    'monthly_plans', 'plan_items', 'payroll_documents'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end;
$$;

create policy categories_select_available
on public.categories for select to authenticated
using ((user_id is null and is_system) or (select auth.uid()) = user_id);
create policy categories_insert_own
on public.categories for insert to authenticated
with check (not is_system and (select auth.uid()) = user_id);
create policy categories_update_own
on public.categories for update to authenticated
using (not is_system and (select auth.uid()) = user_id)
with check (not is_system and (select auth.uid()) = user_id);
create policy categories_delete_own
on public.categories for delete to authenticated
using (not is_system and (select auth.uid()) = user_id);

create policy tags_select_available
on public.tags for select to authenticated
using ((user_id is null and is_system) or (select auth.uid()) = user_id);
create policy tags_insert_own
on public.tags for insert to authenticated
with check (not is_system and (select auth.uid()) = user_id);
create policy tags_update_own
on public.tags for update to authenticated
using (not is_system and (select auth.uid()) = user_id)
with check (not is_system and (select auth.uid()) = user_id);
create policy tags_delete_own
on public.tags for delete to authenticated
using (not is_system and (select auth.uid()) = user_id);

create policy transaction_tags_select_own
on public.transaction_tags for select to authenticated
using (
  transaction_id in (
    select id from public.transactions where user_id = (select auth.uid())
  )
);
create policy transaction_tags_insert_own
on public.transaction_tags for insert to authenticated
with check (
  transaction_id in (
    select id from public.transactions where user_id = (select auth.uid())
  )
  and tag_id in (
    select id from public.tags
    where user_id = (select auth.uid()) or (user_id is null and is_system)
  )
);
create policy transaction_tags_delete_own
on public.transaction_tags for delete to authenticated
using (
  transaction_id in (
    select id from public.transactions where user_id = (select auth.uid())
  )
);

create policy plan_item_tags_select_own
on public.plan_item_tags for select to authenticated
using (
  plan_item_id in (
    select id from public.plan_items where user_id = (select auth.uid())
  )
);
create policy plan_item_tags_insert_own
on public.plan_item_tags for insert to authenticated
with check (
  plan_item_id in (
    select id from public.plan_items where user_id = (select auth.uid())
  )
  and tag_id in (
    select id from public.tags
    where user_id = (select auth.uid()) or (user_id is null and is_system)
  )
);
create policy plan_item_tags_delete_own
on public.plan_item_tags for delete to authenticated
using (
  plan_item_id in (
    select id from public.plan_items where user_id = (select auth.uid())
  )
);

alter view public.account_balances set (security_invoker = true);

drop policy if exists "authenticated can upload payroll documents" on storage.objects;
drop policy if exists "authenticated can read payroll document files" on storage.objects;
drop policy if exists "authenticated can delete payroll document files" on storage.objects;

create policy payroll_documents_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payroll-documents'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
create policy payroll_documents_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'payroll-documents'
  and owner_id = (select auth.uid()::text)
);
create policy payroll_documents_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'payroll-documents'
  and owner_id = (select auth.uid()::text)
);
