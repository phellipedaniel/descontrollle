-- No data is deleted by this migration. Administrative calls are explicit.
alter table private.historical_import_batches drop constraint historical_import_batches_owner_user_id_fkey;
alter table private.historical_import_batches add constraint historical_import_batches_owner_user_id_fkey
  foreign key (owner_user_id) references auth.users(id) on delete cascade;
alter table private.historical_source_documents drop constraint historical_source_documents_batch_id_fkey;
alter table private.historical_source_documents add constraint historical_source_documents_batch_id_fkey
  foreign key (batch_id) references private.historical_import_batches(id) on delete cascade;
alter table private.historical_source_rows drop constraint historical_source_rows_batch_id_fkey;
alter table private.historical_source_rows add constraint historical_source_rows_batch_id_fkey
  foreign key (batch_id) references private.historical_source_documents(batch_id) on delete cascade;

-- SQL administrator only: never expose these functions as an HTTP/RPC endpoint.
create function private.export_import_sources(target_user uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare table_name text; rows jsonb; result jsonb:='{}'::jsonb;
begin
  if target_user is null or not exists(select 1 from auth.users where id=target_user)
    then raise exception 'account not found' using errcode='22023'; end if;
  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into rows
    from private.historical_import_batches b where b.owner_user_id=target_user;
  result:=jsonb_build_object('historical_import_batches', rows);
  foreach table_name in array array[
    'historical_expense_staging','historical_forecast_staging','historical_import_issues',
    'historical_period_staging','historical_settlement_staging','historical_source_documents','historical_source_rows'
  ] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from private.%I t join private.historical_import_batches b on b.id=t.batch_id where b.owner_user_id=$1',table_name)
      into rows using target_user;
    result:=result || jsonb_build_object(table_name, rows);
  end loop;
  return result;
end;
$$;
revoke all on function private.export_import_sources(uuid) from public,anon,authenticated,service_role;

create function private.erase_account_data(target_user uuid, confirmation text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  table_name text; removed bigint; result jsonb:='{}'::jsonb;
  expected_tables text[]:=array['transactions','category_budgets','goal_contributions','debt_payments','asset_valuations','resilience_essential_categories','behavior_checkins','recurring_expense_versions','recurring_expenses','merchant_aliases','annual_provisions','net_worth_snapshots','financial_goals','debts','assets','monthly_plans','financial_periods','planning_engine_profiles','debt_strategy_profiles','resilience_profiles','behavior_profiles','categories','merchants','payment_methods','accounts'];
  actual_tables text[];
begin
  if target_user is null or confirmation is distinct from ('ERASE ' || target_user::text)
    then raise exception 'explicit account confirmation required' using errcode='22023'; end if;
  perform 1 from auth.users where id=target_user for update;
  if not found then raise exception 'account not found' using errcode='22023'; end if;
  -- Stop if the schema inventory changed, rather than silently omitting a new table.
  select array_agg(c.table_name::text order by c.table_name) into actual_tables
  from information_schema.columns c join information_schema.tables t
    on t.table_schema=c.table_schema and t.table_name=c.table_name
  where c.table_schema='public' and c.column_name='user_id' and t.table_type='BASE TABLE';
  if actual_tables is distinct from (select array_agg(x order by x) from unnest(expected_tables) x)
    then raise exception 'review account inventory before erasure'; end if;
  -- Revoke refresh sessions first. Access JWTs may remain valid until their expiry.
  delete from auth.sessions where user_id=target_user;
  get diagnostics removed=row_count;
  result:=jsonb_build_object('sessions', removed);
  delete from private.historical_import_batches where owner_user_id=target_user;
  get diagnostics removed=row_count;
  result:=result || jsonb_build_object('import_batches', removed);
  foreach table_name in array expected_tables loop
    execute format('delete from public.%I where user_id=$1',table_name) using target_user;
    get diagnostics removed=row_count;
    result:=result || jsonb_build_object(table_name, removed);
  end loop;
  delete from auth.users where id=target_user;
  get diagnostics removed=row_count;
  if removed<>1 then raise exception 'account erasure incomplete'; end if;
  return result || jsonb_build_object('account',removed);
end;
$$;
revoke all on function private.erase_account_data(uuid,text) from public,anon,authenticated,service_role;
comment on function private.erase_account_data(uuid,text) is
  'Administrative, explicit, atomic database erasure. Does not erase local files, external logs or backups. Not a public API.';
