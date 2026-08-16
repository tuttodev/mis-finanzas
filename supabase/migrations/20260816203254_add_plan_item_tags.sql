-- Store reusable tags configured on monthly plan items.
create table public.plan_item_tags (
  plan_item_id uuid not null references public.plan_items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (plan_item_id, tag_id)
);

create index idx_plan_item_tags_tag on public.plan_item_tags (tag_id, plan_item_id);

alter table public.plan_item_tags enable row level security;

create policy "authenticated full access" on public.plan_item_tags
for all to authenticated using (true) with check (true);

grant select, insert, delete on public.plan_item_tags to authenticated;
