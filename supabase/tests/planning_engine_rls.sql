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
declare n integer;
begin
  insert into public.planning_engine_profiles(
    user_id,horizon_months,planned_income_mode,planned_expense_mode,
    manual_monthly_income,manual_monthly_expense,probable_window_months,
    reserve_monthly_allocation
  ) values(
    auth.uid(),12,'manual','manual',5000,3000,3,200
  );

  update public.planning_engine_profiles
  set horizon_months=18
  where user_id=auth.uid();

  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner update failed'; end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);

do $$
declare n integer;
begin
  if exists(
    select 1 from public.planning_engine_profiles
    where user_id=current_setting('test.user_a')::uuid
  ) then raise exception 'Cross-user read allowed'; end if;

  update public.planning_engine_profiles
  set horizon_months=24
  where user_id=current_setting('test.user_a')::uuid;

  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-user update allowed'; end if;
end $$;

set local role anon;
do $$ begin
  begin
    perform 1 from public.planning_engine_profiles;
    raise exception 'Anonymous planning-engine read allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'planning engine: owner CRUD isolation and anon blocking passed' as result;
rollback;
