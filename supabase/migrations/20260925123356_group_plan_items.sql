-- A group is a summary row. Its own amount is always zero; only child expense
-- items contribute to the plan's expense total and remaining balance.
alter table public.plan_items
  add column parent_item_id uuid references public.plan_items(id) on delete set null;

alter table public.plan_items drop constraint plan_items_kind_check;
alter table public.plan_items
  add constraint plan_items_kind_check
  check (kind in ('income', 'expense', 'deduction', 'group'));

alter table public.plan_items
  add constraint plan_items_group_shape_check
  check (
    (kind = 'group' and planned_amount = 0 and parent_item_id is null)
    or (kind <> 'group' and (parent_item_id is null or kind = 'expense'))
  );

create index plan_items_parent_item_id_idx
  on public.plan_items(parent_item_id)
  where parent_item_id is not null;

create function public.validate_plan_item_group()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_item_id is not null and not exists (
    select 1
    from public.plan_items parent
    where parent.id = new.parent_item_id
      and parent.kind = 'group'
      and parent.plan_id = new.plan_id
      and parent.user_id = new.user_id
  ) then
    raise exception 'The parent group must belong to the same plan and user';
  end if;

  if new.kind <> 'group' and exists (
    select 1 from public.plan_items child
    where child.parent_item_id = new.id
  ) then
    raise exception 'A group with children cannot become a regular item';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_plan_item_group() from public;
grant execute on function public.validate_plan_item_group() to authenticated;

create trigger plan_items_validate_group
before insert or update on public.plan_items
for each row execute function public.validate_plan_item_group();

-- Group rows are visual summaries and cannot receive expense transactions.
create function public.reject_group_plan_transaction()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.plan_item_id is not null and exists (
    select 1 from public.plan_items
    where id = new.plan_item_id and kind = 'group'
  ) then
    raise exception 'Transactions cannot be linked to a plan group';
  end if;
  return new;
end;
$$;

revoke all on function public.reject_group_plan_transaction() from public;
grant execute on function public.reject_group_plan_transaction() to authenticated;

create trigger transactions_reject_group_plan_item
before insert or update of plan_item_id on public.transactions
for each row execute function public.reject_group_plan_transaction();
