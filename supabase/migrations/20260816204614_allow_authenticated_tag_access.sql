-- Allow signed-in app sessions to access the shared tag catalog.
create policy "authenticated full access" on public.tags
for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.transaction_tags
for all to authenticated using (true) with check (true);

grant select, insert, delete on public.tags to authenticated;
grant select, insert, delete on public.transaction_tags to authenticated;
