create policy "authenticated delete custom categories"
on public.categories
for delete
to authenticated
using (not is_system);
