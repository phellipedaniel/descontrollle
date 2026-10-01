-- Administrative test. Synthetic fixtures are rolled back.
begin;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(a),(b);
  insert into public.categories(id,user_id,name,kind) values
    (ca,a,'Synthetic essential A','expense'),
    (cb,b,'Synthetic essential B','expense');
  perform set_config('test.user_a',a::text,true);
  perform set_config('test.user_b',b::text,true);
  perform set_config('test.category_a',ca::text,true);
  perform set_config('test.category_b',cb::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
end $$;

set local role authenticated;
do $$
declare p uuid; n integer;
begin
  insert into public.resilience_profiles(user_id,protection_months,baseline_mode,manual_essential_monthly,emergency_reserve_amount)
  values(auth.uid(),6,'manual',2000,5000);

  insert into public.resilience_essential_categories(user_id,category_id)
  values(auth.uid(),current_setting('test.category_a')::uuid);

  begin
    insert into public.resilience_essential_categories(user_id,category_id)
    values(auth.uid(),current_setting('test.category_b')::uuid);
    raise exception 'Cross-owner essential category allowed';
  exception when insufficient_privilege or foreign_key_violation then null; end;

  insert into public.annual_provisions(user_id,name,annual_amount,reserved_amount,due_month)
  values(auth.uid(),'Synthetic provision',1200,300,12) returning id into p;
  perform set_config('test.provision_a',p::text,true);

  update public.annual_provisions set reserved_amount=400 where id=p;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Owner provision update failed'; end if;

  begin
    update public.resilience_profiles set user_id=current_setting('test.user_b')::uuid where user_id=auth.uid();
    raise exception 'Profile ownership reassignment allowed';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$
declare n integer;
begin
  if exists(select 1 from public.resilience_profiles where user_id=current_setting('test.user_a')::uuid)
     or exists(select 1 from public.resilience_essential_categories where user_id=current_setting('test.user_a')::uuid)
     or exists(select 1 from public.annual_provisions where id=current_setting('test.provision_a')::uuid)
  then raise exception 'Cross-user read allowed'; end if;

  update public.annual_provisions set reserved_amount=999 where id=current_setting('test.provision_a')::uuid;
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Cross-user provision update allowed'; end if;
end $$;

set local role anon;
do $$ begin
  begin
    perform 1 from public.resilience_profiles;
    raise exception 'Anonymous resilience read allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'resilience: ownership, category isolation, provision update and anon tests passed' as result;
rollback;
