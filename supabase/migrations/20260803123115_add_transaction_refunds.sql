alter table public.transactions
  add column kind text not null default 'regular'
    check (kind in ('regular', 'refund')),
  add column related_transaction_id uuid
    references public.transactions (id) on delete restrict;

alter table public.transactions
  drop constraint transactions_category_matches_amount;

alter table public.transactions
  add constraint transactions_category_matches_amount check (
    (
      kind = 'regular'
      and related_transaction_id is null
      and transfer_id is not null
      and category_id is null
      and budget_cycle_id is null
    )
    or (
      kind = 'regular'
      and related_transaction_id is null
      and transfer_id is null
      and amount < 0
      and category_id is not null
    )
    or (
      kind = 'regular'
      and related_transaction_id is null
      and transfer_id is null
      and amount >= 0
      and budget_cycle_id is null
    )
    or (
      kind = 'refund'
      and related_transaction_id is not null
      and transfer_id is null
      and amount > 0
      and category_id is not null
      and budget_cycle_id is not null
    )
  );

create index idx_transactions_related
on public.transactions (related_transaction_id)
where related_transaction_id is not null;

create or replace function public.validate_transaction_refund()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original_transaction public.transactions%rowtype;
  refunded_amount numeric(15, 2);
  refund_count integer;
  cycle_ended_at timestamptz;
begin
  if new.kind = 'refund' then
    if new.related_transaction_id = new.id then
      raise exception 'Un reembolso no puede relacionarse consigo mismo';
    end if;

    select *
    into original_transaction
    from public.transactions
    where id = new.related_transaction_id
    for update;

    if not found then
      raise exception 'No se encontró el gasto relacionado';
    end if;

    if original_transaction.kind <> 'regular'
      or original_transaction.amount >= 0
      or original_transaction.transfer_id is not null
      or original_transaction.budget_cycle_id is null then
      raise exception 'El movimiento relacionado debe ser un gasto con presupuesto';
    end if;

    select ended_at
    into cycle_ended_at
    from public.budget_cycles
    where id = original_transaction.budget_cycle_id;

    if cycle_ended_at is not null then
      raise exception 'No se pueden registrar reembolsos en un ciclo cerrado';
    end if;

    if new.category_id is distinct from original_transaction.category_id
      or new.budget_cycle_id is distinct from original_transaction.budget_cycle_id then
      raise exception 'El reembolso debe conservar la categoría y el presupuesto del gasto';
    end if;

    select coalesce(sum(amount), 0)
    into refunded_amount
    from public.transactions
    where kind = 'refund'
      and related_transaction_id = new.related_transaction_id
      and id is distinct from new.id;

    if refunded_amount + new.amount > abs(original_transaction.amount) then
      raise exception 'El total reembolsado no puede superar el valor del gasto';
    end if;
  elsif tg_op = 'UPDATE' then
    select coalesce(sum(amount), 0), count(*)
    into refunded_amount, refund_count
    from public.transactions
    where kind = 'refund'
      and related_transaction_id = old.id;

    if refund_count > 0 then
      if new.kind <> 'regular'
        or new.amount >= 0
        or new.transfer_id is not null
        or new.budget_cycle_id is null then
        raise exception 'Un gasto con reembolsos no puede convertirse en otro tipo de movimiento';
      end if;

      if refunded_amount > abs(new.amount) then
        raise exception 'El gasto no puede ser menor que el total ya reembolsado';
      end if;

      if exists (
        select 1
        from public.transactions refund
        where refund.kind = 'refund'
          and refund.related_transaction_id = old.id
          and (
            refund.category_id is distinct from new.category_id
            or refund.budget_cycle_id is distinct from new.budget_cycle_id
          )
      ) then
        raise exception 'Elimina los reembolsos antes de cambiar la categoría o el presupuesto';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_validate_refund
before insert or update on public.transactions
for each row execute function public.validate_transaction_refund();
