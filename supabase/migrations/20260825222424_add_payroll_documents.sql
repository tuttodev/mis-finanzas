-- Store the original payroll PDF separately from the parsed plan items.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payroll-documents',
  'payroll-documents',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.payroll_documents (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.monthly_plans (id) on delete cascade,
  storage_path text not null unique,
  original_name text not null check (char_length(trim(original_name)) between 1 and 255),
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now()
);

create index idx_payroll_documents_plan on public.payroll_documents (plan_id, created_at desc);

alter table public.payroll_documents enable row level security;

create policy "authenticated can read payroll documents"
on public.payroll_documents
for select
to authenticated
using (true);

create policy "authenticated can create payroll documents"
on public.payroll_documents
for insert
to authenticated
with check (true);

create policy "authenticated can upload payroll documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'payroll-documents');

create policy "authenticated can read payroll document files"
on storage.objects
for select
to authenticated
using (bucket_id = 'payroll-documents');

create policy "authenticated can delete payroll document files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'payroll-documents');
