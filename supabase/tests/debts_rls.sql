begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(a),(b);
  insert into public.financial_periods(user_id,month,status,reconciliation_status,closed_at)
  values(a,date_trunc('month',current_date-interval '1 month')::date,'closed','reconciled',now());
  perform set_config('test.user_a',a::text,true);
  perform set_config('test.user_b',b::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;

set local role authenticated;
do $$
declare d uuid; p uuid; n integer; bal numeric; st text;
begin
  insert into public.debt_strategy_profiles(user_id,strategy,extra_monthly_payment)
  values(auth.uid(),'avalanche',100);

  insert into public.debts(user_id,name,debt_type,current_balance,annual_interest_rate,minimum_payment)
  values(auth.uid(),'Synthetic debt','personal_loan',1000,20,100)
  returning id into d;
  perform set_config('test.debt_a',d::text,true);

  insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on,note)
  values(auth.uid(),d,150,850,(now() at time zone 'America/Sao_Paulo')::date,'test')
  returning id into p;

  select current_balance,status into bal,st from public.debts where id=d;
  if bal<>850 or st<>'active' then raise exception 'Payment trigger did not update balance'; end if;
  if not exists(select 1 from public.debt_payments where id=p and resulting_balance=850) then raise exception 'Payment history missing'; end if;

  begin
    insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on)
    values(auth.uid(),d,10,840,(date_trunc('month',current_date-interval '1 month')+interval '5 days')::date);
    raise exception 'Closed-period payment allowed';
  exception when insufficient_privilege then null; end;

  insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on,note)
  values(auth.uid(),d,850,0,(now() at time zone 'America/Sao_Paulo')::date,'settled')
  returning id into p;

  select current_balance,status into bal,st from public.debts where id=d;
  if bal<>0 or st<>'paid' then raise exception 'Debt was not marked paid'; end if;

  begin
    update public.debts set current_balance=999 where id=d;
    raise exception 'Direct balance update allowed';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$
declare d uuid:=current_setting('test.debt_a')::uuid; n integer;
begin
  if exists(select 1 from public.debts where id=d)
    or exists(select 1 from public.debt_payments where debt_id=d)
  then raise exception 'Cross-user read allowed'; end if;

  update public.debts set name='Intrusion' where id=d;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-user update allowed'; end if;

  begin
    insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on)
    values(auth.uid(),d,1,0,current_date);
    raise exception 'Cross-user payment allowed';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform 1 from public.debts;
    raise exception 'Anonymous debt read allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'debts: ownership, private payment trigger, closed-period protection and anon tests passed' as result;
rollback;
