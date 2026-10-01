drop function if exists public.record_debt_payment(uuid,numeric,numeric,date,text);

create or replace function private.apply_debt_payment_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid();
  v_debt public.debts%rowtype;
begin
  if v_user_id is null or new.user_id<>v_user_id then
    raise exception 'authentication required' using errcode='42501';
  end if;
  if new.occurred_on>(now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'invalid payment date' using errcode='22023';
  end if;

  select * into v_debt from public.debts
  where id=new.debt_id and user_id=v_user_id
  for update;

  if not found then raise exception 'debt not found' using errcode='42501'; end if;
  if v_debt.status<>'active' then raise exception 'debt is not active' using errcode='22023'; end if;
  if new.resulting_balance>v_debt.current_balance then
    raise exception 'resulting balance cannot exceed current balance in a payment' using errcode='22023';
  end if;
  if exists(
    select 1 from public.financial_periods fp
    where fp.user_id=v_user_id
      and fp.status='closed'
      and fp.month=date_trunc('month',new.occurred_on)::date
  ) then
    raise exception 'closed financial period' using errcode='42501';
  end if;

  update public.debts
  set current_balance=new.resulting_balance,
      status=case when new.resulting_balance=0 then 'paid' else status end,
      updated_at=now()
  where id=new.debt_id and user_id=v_user_id;

  return new;
end;
$$;

revoke all on function private.apply_debt_payment_trigger() from public,anon,authenticated;

drop trigger if exists debt_payment_apply_balance on public.debt_payments;
create trigger debt_payment_apply_balance
before insert on public.debt_payments
for each row execute function private.apply_debt_payment_trigger();

create policy debt_payments_insert_own
on public.debt_payments for insert to authenticated
with check (
  (select auth.uid())=user_id
  and exists(
    select 1 from public.debts d
    where d.id=debt_id
      and d.user_id=(select auth.uid())
  )
);

grant insert on public.debt_payments to authenticated;

comment on function private.apply_debt_payment_trigger() is
  'Private trigger that validates debt payment ownership, open period and resulting balance, then atomically updates debt balance.';
