-- Sections belong to a monthly plan and only their owner may manage them.
create table public.plan_sections (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.monthly_plans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  sort_order integer not null default 1000,
  created_at timestamptz not null default now()
);

create unique index plan_sections_plan_name_key
  on public.plan_sections(plan_id, lower(trim(name)));
create index plan_sections_user_plan_order_idx
  on public.plan_sections(user_id, plan_id, sort_order);

alter table public.plan_sections enable row level security;
revoke all on table public.plan_sections from anon, authenticated;
grant select, insert, update, delete on table public.plan_sections to authenticated;

create policy plan_sections_select_own on public.plan_sections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy plan_sections_insert_own on public.plan_sections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy plan_sections_update_own on public.plan_sections
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy plan_sections_delete_own on public.plan_sections
  for delete to authenticated using ((select auth.uid()) = user_id);

create function public.validate_plan_section_ownership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.monthly_plans plan
    where plan.id = new.plan_id and plan.user_id = new.user_id
  ) then
    raise exception 'The plan section must belong to the same user as its plan';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_plan_section_ownership() from public;
grant execute on function public.validate_plan_section_ownership() to authenticated;
create trigger plan_sections_validate_ownership
before insert or update on public.plan_sections
for each row execute function public.validate_plan_section_ownership();

alter table public.plan_items
  add column section_id uuid references public.plan_sections(id) on delete set null;
alter table public.plan_items
  add constraint plan_items_section_shape_check
  check (
    section_id is null
    or (kind in ('expense', 'group') and parent_item_id is null)
  );
create index plan_items_section_id_idx on public.plan_items(section_id)
  where section_id is not null;

create function public.validate_plan_item_section()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.section_id is not null and not exists (
    select 1 from public.plan_sections section
    where section.id = new.section_id
      and section.plan_id = new.plan_id
      and section.user_id = new.user_id
  ) then
    raise exception 'The section must belong to the same plan and user';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_plan_item_section() from public;
grant execute on function public.validate_plan_item_section() to authenticated;
create trigger plan_items_validate_section
before insert or update of section_id, plan_id, user_id, kind, parent_item_id on public.plan_items
for each row execute function public.validate_plan_item_section();

-- Existing expenses remain unassigned until the owner classifies them.
insert into public.plan_sections(plan_id, user_id, name, sort_order)
select id, user_id, 'Obligatorios', 10 from public.monthly_plans;
insert into public.plan_sections(plan_id, user_id, name, sort_order)
select id, user_id, 'Opcionales', 20 from public.monthly_plans;
