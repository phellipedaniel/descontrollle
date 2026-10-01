begin;
do $$
declare
  u1 uuid:=gen_random_uuid();
  u2 uuid:=gen_random_uuid();
  a1 uuid:=gen_random_uuid();
  a2 uuid:=gen_random_uuid();
  c1 uuid:=gen_random_uuid();
  c2 uuid:=gen_random_uuid();
  p1 uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(u1),(u2);
  insert into public.accounts(id,user_id,name,account_type,initial_balance,currency)
  values(a1,u1,'Automation A','checking',0,'BRL'),(a2,u2,'Automation B','checking',0,'BRL');
  insert into public.categories(id,user_id,name,kind)
  values(c1,u1,'Recurring A','expense'),(c2,u2,'Recurring B','expense');
  insert into public.payment_methods(id,user_id,kind,name,is_active)
  values(p1,u1,'pix','Pix synthetic',true);
  perform set_config('test.user_a',u1::text,true);
  perform set_config('test.user_b',u2::text,true);
  perform set_config('test.account_a',a1::text,true);
  perform set_config('test.account_b',a2::text,true);
  perform set_config('test.category_a',c1::text,true);
  perform set_config('test.category_b',c2::text,true);
  perform set_config('test.payment_a',p1::text,true);
  perform set_config('request.jwt.claim.sub',u1::text,true);
end $$;

set local role authenticated;

do $$
declare
  v_month date:=date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date;
  v_recurring uuid;
  v_count integer;
  v_amount numeric;
begin
  v_recurring:=public.create_recurring_expense(
    v_month,'Synthetic recurring',100,31,
    current_setting('test.account_a')::uuid,
    current_setting('test.category_a')::uuid,
    null,
    current_setting('test.payment_a')::uuid
  );
  perform set_config('test.recurring_a',v_recurring::text,true);

  perform public.sync_recurring_month(v_month);
  perform public.sync_recurring_month(v_month);

  select count(*),max(amount)
  into v_count,v_amount
  from public.transactions
  where user_id=auth.uid()
    and recurring_expense_id=v_recurring
    and recurring_period=v_month;

  if v_count<>1 then raise exception 'Recurring sync duplicated rows'; end if;
  if v_amount<>100 then raise exception 'Initial recurring amount mismatch'; end if;

  perform public.version_recurring_expense(
    v_recurring,v_month,'Synthetic recurring updated',150,10,
    current_setting('test.account_a')::uuid,
    current_setting('test.category_a')::uuid,
    null,
    current_setting('test.payment_a')::uuid,
    true
  );

  perform public.sync_recurring_month(v_month);

  select count(*),max(amount)
  into v_count,v_amount
  from public.transactions
  where user_id=auth.uid()
    and recurring_expense_id=v_recurring
    and recurring_period=v_month;

  if v_count<>1 or v_amount<>150 then
    raise exception 'Open-month version did not synchronize idempotently';
  end if;

  perform public.close_financial_period(v_month,'reconciled','synthetic close');

  if not exists(
    select 1 from public.financial_periods
    where user_id=auth.uid() and month=v_month and status='closed'
  ) then raise exception 'Period was not closed'; end if;

  begin
    perform public.version_recurring_expense(
      v_recurring,v_month,'Illegal historical rewrite',999,1,
      current_setting('test.account_a')::uuid,
      current_setting('test.category_a')::uuid,
      null,
      current_setting('test.payment_a')::uuid,
      true
    );
    raise exception 'Closed-month recurring rewrite allowed';
  exception when insufficient_privilege then null; when check_violation then null; end;

  begin
    insert into public.transactions(user_id,account_id,category_id,kind,amount,occurred_on,description)
    values(auth.uid(),current_setting('test.account_a')::uuid,current_setting('test.category_a')::uuid,'expense',1,v_month,'blocked');
    raise exception 'Closed-month transaction insert allowed';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);

do $$
declare
  v_month date:=date_trunc('month',(now() at time zone 'America/Sao_Paulo'))::date;
  v_recurring uuid:=current_setting('test.recurring_a')::uuid;
begin
  if exists(select 1 from public.recurring_expenses where id=v_recurring)
    or exists(select 1 from public.recurring_expense_versions where recurring_expense_id=v_recurring)
    or exists(select 1 from public.transactions where recurring_expense_id=v_recurring)
  then raise exception 'Cross-user recurring read allowed'; end if;

  begin
    perform public.version_recurring_expense(
      v_recurring,v_month,'Intrusion',1,1,
      current_setting('test.account_b')::uuid,
      current_setting('test.category_b')::uuid,
      null,null,true
    );
    raise exception 'Cross-user recurring version allowed';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform public.sync_recurring_month(date_trunc('month',current_date)::date);
    raise exception 'Anonymous recurring sync allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'automation: idempotent sync, forward-only versions, immutable close and owner isolation passed' as result;
rollback;
