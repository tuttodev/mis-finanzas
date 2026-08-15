-- Existing transactions did not have an explicit planning decision.
update public.transactions
set is_planned = null
where is_planned is not null;
