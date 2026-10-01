-- Run as an administrative SQL test session. All synthetic fixtures roll back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
begin
 insert into auth.users(id) values(a),(b);
 perform set_config('test.user_a',a::text,true);
 perform set_config('test.user_b',b::text,true);
 perform set_config('request.jwt.claim.sub',a::text,true);
end $$;
set local role authenticated;
do $$
declare g uuid; c uuid; n integer; total numeric;
begin
 insert into public.financial_goals(user_id,name,target_amount,initial_amount,target_date)
 values(auth.uid(),'Synthetic goal',1000,100,current_date+30) returning id into g;
 perform set_config('test.goal_a',g::text,true);
 insert into public.goal_contributions(user_id,goal_id,amount,occurred_on)
 values(auth.uid(),g,50,(now() at time zone 'America/Sao_Paulo')::date) returning id into c;
 select saved_amount into total from public.financial_goal_progress where id=g;
 if total<>150 then raise exception 'Incorrect aggregate'; end if;
 update public.financial_goals set name='Edited synthetic goal',target_amount=1200 where id=g;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Owner edit failed'; end if;
 begin
  update public.financial_goals set initial_amount=999 where id=g;
  raise exception 'Initial amount mutation allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.financial_goals set user_id=current_setting('test.user_b')::uuid where id=g;
  raise exception 'Owner reassignment allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(auth.uid(),g,0,current_date);
  raise exception 'Zero contribution allowed';
 exception when check_violation then null; end;
 begin
  insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(auth.uid(),g,10,current_date+2);
  raise exception 'Future contribution allowed';
 exception when insufficient_privilege then null; end;
 update public.financial_goals set status='archived' where id=g;
 begin
  insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(auth.uid(),g,10,current_date-1);
  raise exception 'Archived contribution allowed';
 exception when insufficient_privilege then null; end;
 delete from public.goal_contributions where id=c;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Archived correction allowed'; end if;
 update public.financial_goals set status='active' where id=g;
 delete from public.goal_contributions where id=c;
 select saved_amount into total from public.financial_goal_progress where id=g;
 if total<>100 then raise exception 'Removal did not recalculate'; end if;
 insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(auth.uid(),g,25,current_date-1);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$
declare g uuid:=current_setting('test.goal_a')::uuid; n integer;
begin
 if exists(select 1 from public.financial_goals where id=g) or exists(select 1 from public.financial_goal_progress where id=g)
 or exists(select 1 from public.goal_contributions where goal_id=g) then raise exception 'Cross-user read allowed'; end if;
 update public.financial_goals set name='Intrusion' where id=g;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user edit allowed'; end if;
 delete from public.goal_contributions where goal_id=g;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user delete allowed'; end if;
 begin
  insert into public.goal_contributions(user_id,goal_id,amount,occurred_on) values(auth.uid(),g,10,current_date-1);
  raise exception 'Cross-owner reference allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.financial_goals(user_id,name,target_amount,target_date)
  values(current_setting('test.user_a')::uuid,'Intrusion',100,current_date+1);
  raise exception 'Cross-user goal insert allowed';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
do $$ begin
 begin
  perform 1 from public.financial_goal_progress;
  raise exception 'Anonymous aggregate read allowed';
 exception when insufficient_privilege then null; end;
end $$;
select 'goals: ownership, reference isolation, aggregate, archive and correction tests passed' as result;
rollback;
