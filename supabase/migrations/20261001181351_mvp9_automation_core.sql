alter table public.recurring_expense_versions
  add column account_id uuid references public.accounts(id) on delete restrict;

alter table public.recurring_expense_versions
  alter column account_id set not null;

create index recurring_versions_account_idx
  on public.recurring_expense_versions(account_id,user_id);

alter table public.transactions
  add column recurring_expense_id uuid references public.recurring_expenses(id) on delete restrict,
  add column recurring_period date;

alter table public.transactions
  drop constraint if exists transactions_recurring_fields_chk;

alter table public.transactions
  add constraint transactions_recurring_fields_chk
  check (
    (
      source_type='recurring'
      and recurring_expense_id is not null
      and recurring_expense_version_id is not null
      and recurring_period is not null
      and extract(day from recurring_period)=1
    )
    or (
      source_type<>'recurring'
      and recurring_expense_id is null
      and recurring_expense_version_id is null
      and recurring_period is null
    )
  );

create unique index transactions_recurring_month_uq
  on public.transactions(user_id,recurring_expense_id,recurring_period)
  where source_type='recurring';

create index transactions_recurring_period_idx
  on public.transactions(user_id,recurring_period)
  where source_type='recurring';

drop policy if exists recurring_versions_insert_future on public.recurring_expense_versions;
drop policy if exists recurring_versions_update_open on public.recurring_expense_versions;

create policy recurring_versions_insert_future
on public.recurring_expense_versions for insert to authenticated
with check (
  (select auth.uid())=user_id
  and exists (select 1 from public.recurring_expenses r where r.id=recurring_expense_id and r.user_id=(select auth.uid()))
  and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
  and (category_id is null or exists (select 1 from public.categories c where c.id=category_id and c.user_id=(select auth.uid()) and c.kind='expense'))
  and (merchant_id is null or exists (select 1 from public.merchants m where m.id=merchant_id and m.user_id=(select auth.uid())))
  and (payment_method_id is null or exists (select 1 from public.payment_methods p where p.id=payment_method_id and p.user_id=(select auth.uid())))
  and effective_from > coalesce((select max(fp.month) from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed'),date '1900-01-01')
);

create policy recurring_versions_update_open
on public.recurring_expense_versions for update to authenticated
using (
  (select auth.uid())=user_id
  and effective_from > coalesce((select max(fp.month) from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed'),date '1900-01-01')
)
with check (
  (select auth.uid())=user_id
  and exists (select 1 from public.recurring_expenses r where r.id=recurring_expense_id and r.user_id=(select auth.uid()))
  and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
  and (category_id is null or exists (select 1 from public.categories c where c.id=category_id and c.user_id=(select auth.uid()) and c.kind='expense'))
  and (merchant_id is null or exists (select 1 from public.merchants m where m.id=merchant_id and m.user_id=(select auth.uid())))
  and (payment_method_id is null or exists (select 1 from public.payment_methods p where p.id=payment_method_id and p.user_id=(select auth.uid())))
  and effective_from > coalesce((select max(fp.month) from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed'),date '1900-01-01')
);

grant update(description,amount,day_of_month,account_id,category_id,merchant_id,payment_method_id,is_active)
on public.recurring_expense_versions to authenticated;

drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;

create policy transactions_insert_own on public.transactions for insert to authenticated
with check (
  (select auth.uid())=user_id
  and not exists (select 1 from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=date_trunc('month',transactions.occurred_on)::date)
  and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
  and (category_id is null or exists (select 1 from public.categories c where c.id=category_id and c.user_id=(select auth.uid()) and c.kind=transactions.kind))
  and (merchant_id is null or exists (select 1 from public.merchants m where m.id=merchant_id and m.user_id=(select auth.uid())))
  and (payment_method_id is null or exists (select 1 from public.payment_methods p where p.id=payment_method_id and p.user_id=(select auth.uid())))
  and (
    (
      source_type='recurring' and kind='expense'
      and recurring_period=date_trunc('month',occurred_on)::date
      and exists (select 1 from public.recurring_expenses r where r.id=recurring_expense_id and r.user_id=(select auth.uid()))
      and exists (select 1 from public.recurring_expense_versions rv where rv.id=recurring_expense_version_id and rv.recurring_expense_id=recurring_expense_id and rv.user_id=(select auth.uid()))
    )
    or (
      source_type<>'recurring'
      and recurring_expense_id is null and recurring_expense_version_id is null and recurring_period is null
    )
  )
);

create policy transactions_update_own on public.transactions for update to authenticated
using (
  (select auth.uid())=user_id
  and not exists (select 1 from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=date_trunc('month',transactions.occurred_on)::date)
)
with check (
  (select auth.uid())=user_id
  and not exists (select 1 from public.financial_periods fp where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=date_trunc('month',transactions.occurred_on)::date)
  and exists (select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
  and (category_id is null or exists (select 1 from public.categories c where c.id=category_id and c.user_id=(select auth.uid()) and c.kind=transactions.kind))
  and (merchant_id is null or exists (select 1 from public.merchants m where m.id=merchant_id and m.user_id=(select auth.uid())))
  and (payment_method_id is null or exists (select 1 from public.payment_methods p where p.id=payment_method_id and p.user_id=(select auth.uid())))
  and (
    (
      source_type='recurring' and kind='expense'
      and recurring_period=date_trunc('month',occurred_on)::date
      and exists (select 1 from public.recurring_expenses r where r.id=recurring_expense_id and r.user_id=(select auth.uid()))
      and exists (select 1 from public.recurring_expense_versions rv where rv.id=recurring_expense_version_id and rv.recurring_expense_id=recurring_expense_id and rv.user_id=(select auth.uid()))
    )
    or (
      source_type<>'recurring'
      and recurring_expense_id is null and recurring_expense_version_id is null and recurring_period is null
    )
  )
);

create or replace function public.create_recurring_expense(
  p_effective_from date,p_description text,p_amount numeric,p_day_of_month integer,p_account_id uuid,
  p_category_id uuid default null,p_merchant_id uuid default null,p_payment_method_id uuid default null
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_recurring_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  insert into public.recurring_expenses(user_id) values(v_user_id) returning id into v_recurring_id;
  insert into public.recurring_expense_versions(
    recurring_expense_id,user_id,effective_from,description,amount,day_of_month,
    account_id,category_id,merchant_id,payment_method_id,is_active
  ) values(
    v_recurring_id,v_user_id,p_effective_from,btrim(p_description),p_amount,p_day_of_month,
    p_account_id,p_category_id,p_merchant_id,p_payment_method_id,true
  );
  return v_recurring_id;
end;
$$;
revoke all on function public.create_recurring_expense(date,text,numeric,integer,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.create_recurring_expense(date,text,numeric,integer,uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.version_recurring_expense(
  p_recurring_expense_id uuid,p_effective_from date,p_description text,p_amount numeric,p_day_of_month integer,p_account_id uuid,
  p_category_id uuid default null,p_merchant_id uuid default null,p_payment_method_id uuid default null,p_is_active boolean default true
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_version_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.recurring_expenses r where r.id=p_recurring_expense_id and r.user_id=v_user_id)
  then raise exception 'recurring expense not found' using errcode='42501'; end if;
  insert into public.recurring_expense_versions(
    recurring_expense_id,user_id,effective_from,description,amount,day_of_month,
    account_id,category_id,merchant_id,payment_method_id,is_active
  ) values(
    p_recurring_expense_id,v_user_id,p_effective_from,btrim(p_description),p_amount,p_day_of_month,
    p_account_id,p_category_id,p_merchant_id,p_payment_method_id,p_is_active
  )
  on conflict(recurring_expense_id,effective_from)
  do update set description=excluded.description,amount=excluded.amount,day_of_month=excluded.day_of_month,
    account_id=excluded.account_id,category_id=excluded.category_id,merchant_id=excluded.merchant_id,
    payment_method_id=excluded.payment_method_id,is_active=excluded.is_active
  returning id into v_version_id;
  return v_version_id;
end;
$$;
revoke all on function public.version_recurring_expense(uuid,date,text,numeric,integer,uuid,uuid,uuid,uuid,boolean) from public,anon;
grant execute on function public.version_recurring_expense(uuid,date,text,numeric,integer,uuid,uuid,uuid,uuid,boolean) to authenticated;

create or replace function public.sync_recurring_month(p_month date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_last_day integer; v_removed integer:=0; v_synced integer:=0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_month is null or extract(day from p_month)<>1 then raise exception 'month must be first day' using errcode='22023'; end if;
  if exists(select 1 from public.financial_periods fp where fp.user_id=v_user_id and fp.month=p_month and fp.status='closed')
  then raise exception 'closed financial period' using errcode='42501'; end if;
  v_last_day:=extract(day from (p_month + interval '1 month - 1 day'))::integer;

  with latest as (
    select distinct on (rv.recurring_expense_id) rv.*
    from public.recurring_expense_versions rv
    where rv.user_id=v_user_id and rv.effective_from<=p_month
    order by rv.recurring_expense_id,rv.effective_from desc,rv.created_at desc
  ), desired as (
    select recurring_expense_id from latest where is_active
  )
  delete from public.transactions t
  where t.user_id=v_user_id and t.source_type='recurring' and t.recurring_period=p_month
    and not exists(select 1 from desired d where d.recurring_expense_id=t.recurring_expense_id);
  get diagnostics v_removed=row_count;

  with latest as (
    select distinct on (rv.recurring_expense_id) rv.*
    from public.recurring_expense_versions rv
    where rv.user_id=v_user_id and rv.effective_from<=p_month
    order by rv.recurring_expense_id,rv.effective_from desc,rv.created_at desc
  )
  insert into public.transactions(
    user_id,account_id,category_id,kind,amount,occurred_on,description,merchant_id,payment_method_id,
    source_type,source_description,recurring_expense_version_id,recurring_expense_id,recurring_period,metadata
  )
  select v_user_id,rv.account_id,rv.category_id,'expense',rv.amount,
    p_month+(least(rv.day_of_month,v_last_day)-1),rv.description,rv.merchant_id,rv.payment_method_id,
    'recurring',rv.description,rv.id,rv.recurring_expense_id,p_month,
    jsonb_build_object('generated_by','recurring_sync','recurring_period',p_month)
  from latest rv where rv.is_active
  on conflict(user_id,recurring_expense_id,recurring_period) where source_type='recurring'
  do update set account_id=excluded.account_id,category_id=excluded.category_id,amount=excluded.amount,
    occurred_on=excluded.occurred_on,description=excluded.description,merchant_id=excluded.merchant_id,
    payment_method_id=excluded.payment_method_id,source_description=excluded.source_description,
    recurring_expense_version_id=excluded.recurring_expense_version_id,metadata=excluded.metadata;
  get diagnostics v_synced=row_count;
  return jsonb_build_object('month',p_month,'synced',v_synced,'removed',v_removed);
end;
$$;
revoke all on function public.sync_recurring_month(date) from public,anon;
grant execute on function public.sync_recurring_month(date) to authenticated;

create or replace function public.close_financial_period(
  p_month date,p_reconciliation_status text default 'reconciled',p_notes text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_sync jsonb; v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_month is null or extract(day from p_month)<>1 then raise exception 'month must be first day' using errcode='22023'; end if;
  if p_month>date_trunc('month',v_today)::date then raise exception 'future financial period' using errcode='22023'; end if;
  if p_reconciliation_status not in ('reconciled','unreconciled','incomplete') then raise exception 'invalid reconciliation status' using errcode='22023'; end if;
  if p_notes is not null and char_length(p_notes)>500 then raise exception 'notes too long' using errcode='22023'; end if;
  if exists(select 1 from public.financial_periods fp where fp.user_id=v_user_id and fp.month=p_month and fp.status='closed')
  then raise exception 'financial period already closed' using errcode='42501'; end if;

  v_sync:=public.sync_recurring_month(p_month);
  insert into public.financial_periods(user_id,month,status,reconciliation_status,notes)
  values(v_user_id,p_month,'open',p_reconciliation_status,nullif(btrim(p_notes),''))
  on conflict(user_id,month) do nothing;

  update public.financial_periods
  set status='closed',reconciliation_status=p_reconciliation_status,closed_at=now(),
      notes=nullif(btrim(p_notes),''),updated_at=now()
  where user_id=v_user_id and month=p_month and status='open';

  if not found then raise exception 'financial period could not be closed' using errcode='42501'; end if;
  return jsonb_build_object('month',p_month,'status','closed','reconciliation_status',p_reconciliation_status,'sync',v_sync);
end;
$$;
revoke all on function public.close_financial_period(date,text,text) from public,anon;
grant execute on function public.close_financial_period(date,text,text) to authenticated;

comment on function public.sync_recurring_month(date) is 'Idempotently synchronizes generated recurring expense transactions for one open month using the latest effective version.';
comment on function public.close_financial_period(date,text,text) is 'Synchronizes recurring expenses and irreversibly closes a financial period under caller RLS.';
