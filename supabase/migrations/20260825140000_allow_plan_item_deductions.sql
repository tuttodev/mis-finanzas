-- Allow 'deduction' kind in plan_items for payroll deductions / colilla de pago.
alter table public.plan_items
  drop constraint if exists plan_items_kind_check;

alter table public.plan_items
  add constraint plan_items_kind_check check (kind in ('income', 'expense', 'deduction'));
