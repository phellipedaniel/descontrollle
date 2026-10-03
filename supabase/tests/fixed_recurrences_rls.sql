begin;
do $$ declare u uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); foreign_a uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); begin
 insert into auth.users(id) values(u),(b);
 insert into public.accounts(id,user_id,name,currency) values(a,u,'Fixed local','BRL'),(foreign_a,b,'Other local','BRL');
 insert into public.categories(id,user_id,name,kind) values(c,u,'Local expense','expense');
 perform set_config('test.fixed_user',u::text,true); perform set_config('test.fixed_other',b::text,true);
 perform set_config('test.fixed_account',a::text,true); perform set_config('test.fixed_foreign_account',foreign_a::text,true); perform set_config('test.fixed_category',c::text,true);
 perform set_config('request.jwt.claim.sub',u::text,true);
end $$;
set local role authenticated;
do $$ declare m date:=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date; salary uuid; cost uuid; t uuid; t2 uuid; forecast jsonb; n integer; begin
 salary:=public.save_fixed_recurrence(null,'income',m,'Local salary',5000,current_setting('test.fixed_account')::uuid,null,true);
 cost:=public.save_fixed_recurrence(null,'expense',m,'Local rent',1000,current_setting('test.fixed_account')::uuid,current_setting('test.fixed_category')::uuid,true);
 perform set_config('test.fixed_salary',salary::text,true);
 forecast:=public.fixed_recurrence_month(m);
 if jsonb_array_length(forecast)<>2 then raise exception 'monthly forecasts missing'; end if;
 if exists(select 1 from public.transactions where user_id=auth.uid()) then raise exception 'forecast created realized entries'; end if;
 if exists(select 1 from jsonb_array_elements(public.fixed_recurrence_month((m-interval '1 month')::date)) x where x->'version'<>'null'::jsonb) then raise exception 'forecast changed past'; end if;
 begin perform public.save_fixed_recurrence(null,'income',m,'Foreign account',10,current_setting('test.fixed_foreign_account')::uuid,null,true); raise exception 'foreign reference allowed'; exception when insufficient_privilege then null; end;
 begin perform public.save_fixed_recurrence(null,'income',m,'Wrong category',10,current_setting('test.fixed_account')::uuid,current_setting('test.fixed_category')::uuid,true); raise exception 'wrong category kind allowed'; exception when insufficient_privilege then null; end;
 begin perform public.save_fixed_recurrence(salary,'income',(m-interval '1 month')::date,'Past salary',1,current_setting('test.fixed_account')::uuid,null,true); raise exception 'past edit allowed'; exception when insufficient_privilege then null; end;
 begin perform public.confirm_fixed_recurrence(salary,(m+interval '1 month')::date,(m+interval '1 month')::date); raise exception 'future confirmation allowed'; exception when insufficient_privilege then null; end;
 begin perform public.confirm_fixed_recurrence(salary,m,(now() at time zone 'America/Sao_Paulo')::date+1); raise exception 'future receipt allowed'; exception when insufficient_privilege then null; end;
 t:=public.confirm_fixed_recurrence(salary,m,(now() at time zone 'America/Sao_Paulo')::date);
 t2:=public.confirm_fixed_recurrence(salary,m,(now() at time zone 'America/Sao_Paulo')::date);
 if t<>t2 then raise exception 'confirmation not idempotent'; end if;
 begin update public.transactions set amount=1 where id=t; raise exception 'confirmed amount directly rewritable'; exception when insufficient_privilege then null; end;
 select count(*) into n from public.transactions where user_id=auth.uid(); if n<>1 then raise exception 'duplicate transactions'; end if;
 perform public.save_fixed_recurrence(salary,'income',(m+interval '1 month')::date,'Salary increase',5500,current_setting('test.fixed_account')::uuid,null,true);
 if not exists(select 1 from jsonb_array_elements(public.fixed_recurrence_month(m)) x where x->>'id'=salary::text and (x->'version'->>'amount')::numeric=5000) then raise exception 'future version rewrote month'; end if;
 if not exists(select 1 from jsonb_array_elements(public.fixed_recurrence_month((m+interval '1 month')::date)) x where x->>'id'=salary::text and (x->'version'->>'amount')::numeric=5500) then raise exception 'future version not applied'; end if;
 perform public.save_fixed_recurrence(salary,'income',m,'Current salary adjusted',5200,current_setting('test.fixed_account')::uuid,null,true);
 if (select amount from public.transactions where id=t)<>5000 then raise exception 'version rewrote confirmed receipt'; end if;
 -- Deleting a manually confirmed entry in an open month returns the occurrence to forecast.
 delete from public.transactions where id=t;
 if exists(select 1 from public.fixed_recurring_confirmations where transaction_id=t) then raise exception 'confirmation not released'; end if;
 t:=public.confirm_fixed_recurrence(salary,m,(now() at time zone 'America/Sao_Paulo')::date);
 if (select amount from public.transactions where id=t)<>5200 then raise exception 'reconfirmation used wrong amount'; end if;
 perform public.confirm_fixed_recurrence(cost,m,(now() at time zone 'America/Sao_Paulo')::date);
 if not exists(select 1 from public.transactions where kind='expense' and amount=1000 and user_id=auth.uid()) then raise exception 'cost payment missing'; end if;
 perform public.close_financial_period(m,'reconciled','local test');
 begin perform public.confirm_fixed_recurrence(salary,m,(now() at time zone 'America/Sao_Paulo')::date); raise exception 'closed confirmation allowed'; exception when insufficient_privilege then null; end;
 begin perform public.save_fixed_recurrence(salary,'income',m,'Closed edit',1,current_setting('test.fixed_account')::uuid,null,true); raise exception 'closed version allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.fixed_other'),true);
do $$ begin
 if jsonb_array_length(public.fixed_recurrence_month(date_trunc('month',now() at time zone 'America/Sao_Paulo')::date))<>0 then raise exception 'cross-user read allowed'; end if;
 begin perform public.confirm_fixed_recurrence(current_setting('test.fixed_salary')::uuid,date_trunc('month',now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::date); raise exception 'cross-user confirmation allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin perform public.fixed_recurrence_month('2026-10-01'); raise exception 'anonymous RPC allowed'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.fixed_recurring_items; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare u uuid:=current_setting('test.fixed_user')::uuid; result jsonb; begin
 result:=private.erase_account_data(u,'ERASE '||u::text);
 if not (result ? 'fixed_recurring_items' and result ? 'fixed_recurring_versions' and result ? 'fixed_recurring_confirmations') then raise exception 'erasure omitted new sources'; end if;
 if exists(select 1 from public.fixed_recurring_items where user_id=u) or exists(select 1 from public.fixed_recurring_versions where user_id=u) or exists(select 1 from public.fixed_recurring_confirmations where user_id=u) then raise exception 'erasure left fixed data'; end if;
 if not exists(select 1 from auth.users where id=current_setting('test.fixed_other')::uuid) then raise exception 'erasure affected other user'; end if;
end $$;
rollback;
