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
declare asset_id uuid; valuation_id uuid; current_value numeric; snapshot_id uuid;
begin
  insert into public.assets(user_id,name,asset_type,current_value,valuation_date)
  values(auth.uid(),'Synthetic asset','investment',1000,current_date)
  returning id into asset_id;
  perform set_config('test.asset_a',asset_id::text,true);

  if not exists(
    select 1 from public.asset_valuations
    where asset_id=asset_id and value=1000
  ) then
    raise exception 'Initial valuation was not seeded';
  end if;

  insert into public.asset_valuations(user_id,asset_id,value,valued_on,note)
  values(auth.uid(),asset_id,1250,current_date,'refresh')
  returning id into valuation_id;

  select a.current_value into current_value
  from public.assets a where a.id=asset_id;

  if current_value<>1250 then
    raise exception 'Current asset value was not updated from valuation';
  end if;

  begin
    update public.assets set current_value=9999 where id=asset_id;
    raise exception 'Direct current value update allowed';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.asset_valuations(user_id,asset_id,value,valued_on)
    values(auth.uid(),asset_id,1300,current_date+1);
    raise exception 'Future valuation allowed';
  exception when invalid_parameter_value then null; end;

  insert into public.net_worth_snapshots(
    user_id,captured_on,accounts_value,manual_assets_value,liabilities_value,net_worth
  ) values(auth.uid(),current_date,100,1250,200,1150)
  returning id into snapshot_id;
  perform set_config('test.snapshot_a',snapshot_id::text,true);
end $$;

select set_config('request.jwt.claim.sub',current_setting('test.user_b'),true);
do $$
declare asset_id uuid:=current_setting('test.asset_a')::uuid;
begin
  if exists(select 1 from public.assets where id=asset_id)
    or exists(select 1 from public.asset_valuations where asset_id=asset_id)
    or exists(select 1 from public.net_worth_snapshots where id=current_setting('test.snapshot_a')::uuid)
  then raise exception 'Cross-user read allowed'; end if;

  begin
    insert into public.asset_valuations(user_id,asset_id,value,valued_on)
    values(auth.uid(),asset_id,1,current_date);
    raise exception 'Cross-user valuation allowed';
  exception when insufficient_privilege or foreign_key_violation then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform 1 from public.assets;
    raise exception 'Anonymous asset read allowed';
  exception when insufficient_privilege then null; end;
end $$;

select 'net worth: ownership, valuation triggers, protected current value and snapshots passed' as result;
rollback;
