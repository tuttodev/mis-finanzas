begin;
select plan(6);

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'currency-owner@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'currency-stranger@example.com');

set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select lives_ok(
  $$insert into public.user_profiles (display_name, default_currency)
    values ('Currency owner', 'PEN')$$,
  'a user can save their own preferred currency'
);
select throws_ok(
  $$insert into public.user_profiles (id, default_currency)
    values ('44444444-4444-4444-4444-444444444444', 'EUR')$$,
  '42501', null, 'a user cannot write another profile'
);

insert into public.accounts (id, name, type, currency) values
  ('33333333-0000-0000-0000-000000000001', 'Soles', 'cash', 'PEN'),
  ('33333333-0000-0000-0000-000000000002', 'Dollars', 'cash', 'USD');
insert into public.budgets (id, name, limit_amount, currency) values
  ('33333333-0000-0000-0000-000000000003', 'Peru budget', 100, 'PEN'),
  ('33333333-0000-0000-0000-000000000004', 'Euro budget', 100, 'EUR');
insert into public.budget_cycles (id, budget_id, started_at) values
  ('33333333-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000003', now());

select lives_ok(
  $$insert into public.monthly_plans (id, month, currency) values
    ('33333333-0000-0000-0000-000000000006', '2026-10-01', 'PEN'),
    ('33333333-0000-0000-0000-000000000007', '2026-10-01', 'EUR')$$,
  'one user can have plans in two currencies for the same month'
);

select throws_ok(
  $$insert into public.transactions
    (account_id, budget_cycle_id, category_id, date, description, amount)
    values (
      '33333333-0000-0000-0000-000000000002',
      '33333333-0000-0000-0000-000000000005',
      (select id from public.categories where slug = 'food' and is_system),
      '2026-10-02', 'Different currency', -10
    )$$,
  'P0001', 'Transaction and budget currencies must match',
  'a USD expense cannot use a PEN budget'
);

select throws_ok(
  $$insert into public.plan_items
    (plan_id, name, kind, planned_amount, budget_id)
    values (
      '33333333-0000-0000-0000-000000000006',
      'Different currency', 'expense', 10,
      '33333333-0000-0000-0000-000000000004'
    )$$,
  'P0001', 'Plan item and budget currencies must match',
  'a PEN plan item cannot use a EUR budget'
);

select throws_ok(
  $$update public.accounts set currency = 'EUR'
    where id = '33333333-0000-0000-0000-000000000001'$$,
  'P0001', 'Currency cannot be changed after creation',
  'an existing account cannot be relabeled as another currency'
);

select * from finish();
rollback;
