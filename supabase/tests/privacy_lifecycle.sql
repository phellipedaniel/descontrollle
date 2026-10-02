-- Synthetic users only. Every fixture and erasure is rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  batch_a uuid; batch_b uuid; account_id uuid; category_id uuid; plan_id uuid;
  merchant_id uuid; payment_id uuid; recurring_id uuid; version_id uuid; goal_id uuid; debt_id uuid; asset_id uuid;
  pmonth date:=date_trunc('month',current_date)::date;
  export_result jsonb; erase_result jsonb; table_name text; n bigint;
begin
  insert into auth.users(id) values(a),(b);
  perform set_config('test.user_a',a::text,true);
  perform set_config('test.user_b',b::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  insert into auth.sessions(user_id) values(a),(b);
  insert into public.accounts(user_id,name) values(a,'Synthetic account') returning id into account_id;
  insert into public.accounts(user_id,name) values(b,'Other synthetic account');
  insert into public.categories(user_id,name,kind) values(a,'Synthetic expense','expense') returning id into category_id;
  insert into public.merchants(user_id,name) values(a,'Synthetic merchant') returning id into merchant_id;
  insert into public.merchant_aliases(user_id,merchant_id,alias) values(a,merchant_id,'Synthetic alias');
  insert into public.payment_methods(user_id,kind,name) values(a,'pix','Synthetic Pix') returning id into payment_id;
  insert into public.monthly_plans(user_id,month) values(a,pmonth) returning id into plan_id;
  insert into public.category_budgets(user_id,plan_id,category_id) values(a,plan_id,category_id);
  insert into public.recurring_expenses(user_id) values(a) returning id into recurring_id;
  insert into public.recurring_expense_versions(user_id,recurring_expense_id,effective_from,description,amount,day_of_month,account_id,category_id,merchant_id,payment_method_id)
    values(a,recurring_id,pmonth,'Synthetic recurring',10,1,account_id,category_id,merchant_id,payment_id) returning id into version_id;
  insert into public.transactions(user_id,account_id,kind,amount,category_id,merchant_id,payment_method_id,source_type,recurring_expense_id,recurring_expense_version_id,recurring_period,occurred_on)
    values(a,account_id,'expense',10,category_id,merchant_id,payment_id,'recurring',recurring_id,version_id,pmonth,current_date);
  insert into public.financial_goals(user_id,name,target_amount,target_date) values(a,'Synthetic goal',100,current_date+30) returning id into goal_id;
  insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(a,goal_id,10,current_date);
  insert into public.debts(user_id,name,current_balance) values(a,'Synthetic debt',100) returning id into debt_id;
  insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on) values(a,debt_id,10,90,current_date);
  insert into public.assets(user_id,name,current_value,valuation_date) values(a,'Synthetic asset',100,current_date) returning id into asset_id;
  insert into public.net_worth_snapshots(user_id,captured_on,accounts_value,manual_assets_value,liabilities_value,net_worth) values(a,current_date,0,100,90,10);
  insert into public.annual_provisions(user_id,name,annual_amount) values(a,'Synthetic provision',100);
  insert into public.resilience_profiles(user_id,manual_essential_monthly) values(a,100);
  insert into public.resilience_essential_categories(user_id,category_id) values(a,category_id);
  insert into public.planning_engine_profiles(user_id) values(a);
  insert into public.debt_strategy_profiles(user_id) values(a);
  insert into public.behavior_profiles(user_id) values(a);
  insert into public.behavior_checkins(user_id,month) values(a,pmonth);
  insert into public.financial_periods(user_id,month,status,closed_at) values(a,pmonth,'closed',now());
  insert into private.historical_import_batches(owner_user_id,label) values(a,'Synthetic batch A') returning id into batch_a;
  insert into private.historical_import_batches(owner_user_id,label) values(b,'Synthetic batch B') returning id into batch_b;
  perform set_config('test.batch_b',batch_b::text,true);
  insert into private.historical_expense_staging(batch_id,historical_expense_key,reference_date,reference_year_month,amount) values(batch_a,'synthetic-'||batch_a,current_date,to_char(current_date,'YYYY-MM'),1);
  insert into private.historical_forecast_staging(batch_id,forecast_key,reference_month,amount) values(batch_a,'synthetic-'||batch_a,pmonth,1);
  insert into private.historical_import_issues(batch_id,issue_key,issue_type) values(batch_a,'synthetic','synthetic');
  insert into private.historical_period_staging(batch_id,month,expense_count,expense_total,reconciliation_status,target_period_status) values(batch_a,pmonth,1,1,'reconciled','closed');
  insert into private.historical_settlement_staging(batch_id,settlement_event_id,reference_date,reference_year_month,amount) values(batch_a,'synthetic',current_date,to_char(current_date,'YYYY-MM'),1);
  insert into private.historical_source_documents(batch_id,source_sha256,source_name,parser_version,payload_sha256,expected_row_count,manifest)
    values(batch_a,repeat('a',64),'synthetic','test',repeat('b',64),1,'{}'),(batch_b,repeat('c',64),'synthetic','test',repeat('d',64),1,'{}');
  insert into private.historical_source_rows(batch_id,source_row_id,sheet_name,source_cell,amount_cell,block_key,description_original,selected_version,review_state,source_payload)
    values(batch_a,repeat('a',24),'test','A1','B1','test','Synthetic source A',false,'holdout','{}'),
          (batch_b,repeat('b',24),'test','A1','B1','test','Synthetic source B',false,'holdout','{}');
  export_result:=private.export_import_sources(a);
  if jsonb_array_length(export_result->'historical_source_rows')<>1 or export_result->'historical_source_rows'->0->>'description_original'<>'Synthetic source A'
    then raise exception 'private source export ownership failed'; end if;
  if (select count(*) from jsonb_object_keys(export_result))<>8 then raise exception 'private inventory incomplete'; end if;
  begin
    perform private.erase_account_data(a,'wrong confirmation');
    raise exception 'missing erasure confirmation accepted';
  exception when invalid_parameter_value then null; end;
  if not exists(select 1 from public.transactions where user_id=a) then raise exception 'invalid request changed data'; end if;
  erase_result:=private.erase_account_data(a,'ERASE '||a::text);
  if (erase_result->>'account')::integer<>1 then raise exception 'account not erased'; end if;
  for table_name in select c.table_name::text from information_schema.columns c where c.table_schema='public' and c.column_name='user_id' loop
    execute format('select count(*) from public.%I where user_id=$1',table_name) into n using a;
    if n<>0 then raise exception 'residual data in %',table_name; end if;
  end loop;
  if exists(select 1 from auth.users where id=a) or exists(select 1 from auth.sessions where user_id=a)
    or exists(select 1 from private.historical_import_batches where id=batch_a)
    or exists(select 1 from private.historical_source_rows where batch_id=batch_a)
    then raise exception 'private/auth residual data'; end if;
  if not exists(select 1 from auth.users where id=b) or not exists(select 1 from auth.sessions where user_id=b)
    or not exists(select 1 from public.accounts where user_id=b)
    or not exists(select 1 from private.historical_source_rows where batch_id=batch_b)
    then raise exception 'other account affected'; end if;
  -- Verify the FK repair also covers direct account deletion for private sources.
  delete from public.accounts where user_id=b;
  delete from auth.users where id=b;
  if exists(select 1 from private.historical_source_rows where batch_id=batch_b)
    then raise exception 'direct auth deletion left private sources'; end if;
end $$;
set local role authenticated;
do $$ begin
  begin
    perform private.erase_account_data(current_setting('test.user_b')::uuid,'ERASE '||current_setting('test.user_b'));
    raise exception 'authenticated erasure access allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform private.export_import_sources(current_setting('test.user_b')::uuid);
    raise exception 'authenticated private export access allowed';
  exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
  begin
    perform private.erase_account_data(current_setting('test.user_b')::uuid,'ERASE '||current_setting('test.user_b'));
    raise exception 'anonymous erasure access allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'privacy lifecycle: confirmation, 25 public tables, eight private tables, closed periods, sessions, ownership and private privileges passed' as result;
rollback;
