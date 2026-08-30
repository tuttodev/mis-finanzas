begin;
select plan(9);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'feedback-owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'feedback-stranger@example.com');

set local role anon;
select throws_ok(
  $$select * from public.feedback$$,
  '42501',
  null,
  'anon cannot read feedback'
);
select throws_ok(
  $$insert into public.feedback (message, page_path) values ('Anonymous note', '/')$$,
  '42501',
  null,
  'anon cannot submit feedback'
);
select throws_ok(
  $$update public.feedback set message = 'Changed'$$,
  '42501',
  null,
  'anon cannot update feedback'
);
select throws_ok(
  $$delete from public.feedback$$,
  '42501',
  null,
  'anon cannot delete feedback'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select lives_ok(
  $$insert into public.feedback (message, page_path) values ('This is useful feedback', '/accounts')$$,
  'an authenticated user can submit feedback'
);
select throws_ok(
  $$select * from public.feedback$$,
  '42501',
  null,
  'an authenticated user cannot read feedback'
);
select throws_ok(
  $$update public.feedback set message = 'Changed'$$,
  '42501',
  null,
  'an authenticated user cannot update feedback'
);
select throws_ok(
  $$delete from public.feedback$$,
  '42501',
  null,
  'an authenticated user cannot delete feedback'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok(
  $$insert into public.feedback (user_id, message, page_path)
    values ('11111111-1111-1111-1111-111111111111', 'Forged feedback', '/')$$,
  '42501',
  null,
  'an authenticated user cannot submit feedback for another user'
);

select * from finish();
rollback;
