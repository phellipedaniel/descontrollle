begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(a),(b);
  insert into public.categories(id,user_id,name,kind)
  values(ca,a,'Synthetic A','expense'),(cb,b,'Synthetic B','expense');
  perform set_config('test.user_a',a::text,true);
  perform set_config('test.user_b',b::text,true);
  perform set_config('test.category_a',ca::text,true);
  perform set_config('test.category_b',cb::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;

set local role authenticated;
do $$
declare n integer;
begin
  insert into public.behavior_profiles(user_id,comparison_window_months)
  values(auth.uid(),3);

  insert into public.behavior_checkins(user_id,month,intention,focus_category_id,reflection)
  values(auth.uid(),date '2026-08-01','observe',current_setting('test.category_a')::uuid,'synthetic');

  begin
    insert into public.behavior_checkins(user_id,month,intention,focus_category_id)
    values(auth.uid(),date '2026-07-01','reduce',current_setting('test.category_b')::uuid);
    raise exception 'Cross-owner focus category allowed';
  exception when insufficient_privilege or foreign_key_violation then null; end;

  update public.behavior_profiles set monthly_change_pct=25 where user_id=auth.uid();
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner profile update failed'; end if;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);

do $$
declare n integer;
begin
  if exists(select 1 from public.behavior_profiles where user_id=current_setting('test.user_a')::uuid)
    or exists(select 1 from public.behavior_checkins where user_id=current_setting('test.user_a')::uuid)
  then raise exception 'Cross-user read allowed'; end if;

  update public.behavior_checkins
  set reflection='intrusion'
  where user_id=current_setting('test.user_a')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-user update allowed'; end if;
end $$;

set local role anon;
do $$ begin
  begin
    perform 1 from public.behavior_profiles;
    raise exception 'Anonymous behavior read allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'behavior: owner isolation, focus-category isolation and anon blocking passed' as result;
rollback;
