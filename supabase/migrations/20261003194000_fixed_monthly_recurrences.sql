-- Forecasts are read from effective versions. Only explicit confirmation creates a transaction.
create table public.fixed_recurring_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('income','expense')),
 created_at timestamptz not null default now()
);
create table public.fixed_recurring_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id uuid not null references public.fixed_recurring_items(id) on delete cascade,
 effective_from date not null check(extract(day from effective_from)=1 and effective_from>='2026-10-01'),
 description text not null check(char_length(btrim(description)) between 1 and 160),
 amount numeric(14,2) not null check(amount>0 and amount<=9999999999.99),
 account_id uuid not null references public.accounts(id) on delete restrict,
 category_id uuid references public.categories(id) on delete set null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(item_id,effective_from)
);
create table public.fixed_recurring_confirmations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id uuid not null references public.fixed_recurring_items(id) on delete cascade,
 version_id uuid not null references public.fixed_recurring_versions(id) on delete restrict,
 month date not null check(extract(day from month)=1 and month>='2026-10-01'),
 transaction_id uuid unique references public.transactions(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(item_id,month)
);
create index fixed_items_user_idx on public.fixed_recurring_items(user_id);
create index fixed_versions_user_month_idx on public.fixed_recurring_versions(user_id,effective_from);
create index fixed_versions_account_idx on public.fixed_recurring_versions(account_id);
create index fixed_versions_category_idx on public.fixed_recurring_versions(category_id);
create index fixed_confirmations_user_month_idx on public.fixed_recurring_confirmations(user_id,month);
create index fixed_confirmations_version_idx on public.fixed_recurring_confirmations(version_id);
alter table public.fixed_recurring_items enable row level security;
alter table public.fixed_recurring_versions enable row level security;
alter table public.fixed_recurring_confirmations enable row level security;
revoke all on public.fixed_recurring_items,public.fixed_recurring_versions,public.fixed_recurring_confirmations from public,anon,authenticated;
grant select,insert on public.fixed_recurring_items to authenticated;
grant select,insert,update on public.fixed_recurring_versions,public.fixed_recurring_confirmations to authenticated;
create policy fixed_items_read on public.fixed_recurring_items for select to authenticated using(user_id=(select auth.uid()));
create policy fixed_items_create on public.fixed_recurring_items for insert to authenticated with check(user_id=(select auth.uid()));
create policy fixed_versions_read on public.fixed_recurring_versions for select to authenticated using(user_id=(select auth.uid()));
create policy fixed_versions_create on public.fixed_recurring_versions for insert to authenticated with check(user_id=(select auth.uid()));
create policy fixed_versions_change on public.fixed_recurring_versions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy fixed_confirmations_read on public.fixed_recurring_confirmations for select to authenticated using(user_id=(select auth.uid()));
create policy fixed_confirmations_create on public.fixed_recurring_confirmations for insert to authenticated with check(user_id=(select auth.uid()));
create policy fixed_confirmations_change on public.fixed_recurring_confirmations for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create function public.guard_fixed_version() returns trigger language plpgsql security invoker set search_path='' as $$
declare v_kind text;
begin
 if new.user_id is distinct from auth.uid() then raise exception 'ownership required' using errcode='42501'; end if;
 if tg_op='UPDATE' and (new.id,new.item_id,new.user_id,new.effective_from,new.created_at) is distinct from (old.id,old.item_id,old.user_id,old.effective_from,old.created_at)
 then raise exception 'immutable version identity' using errcode='42501'; end if;
 if new.effective_from<greatest('2026-10-01'::date,date_trunc('month',now() at time zone 'America/Sao_Paulo')::date)
 or exists(select 1 from public.financial_periods where user_id=new.user_id and status='closed' and month>=new.effective_from)
 then raise exception 'past or closed period' using errcode='42501'; end if;
 select kind into v_kind from public.fixed_recurring_items where id=new.item_id and user_id=new.user_id;
 if v_kind is null or not exists(select 1 from public.accounts where id=new.account_id and user_id=new.user_id and currency='BRL')
 or (new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and user_id=new.user_id and kind=v_kind))
 then raise exception 'invalid owned reference' using errcode='42501'; end if;
 return new;
end $$;
create trigger fixed_version_guard before insert or update on public.fixed_recurring_versions for each row execute function public.guard_fixed_version();

create function public.save_fixed_recurrence(p_item_id uuid,p_kind text,p_effective_from date,p_description text,p_amount numeric,p_account_id uuid,p_category_id uuid,p_is_active boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_item uuid:=p_item_id;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then raise exception 'positive cent amount required' using errcode='22023'; end if;
 if v_item is null then insert into public.fixed_recurring_items(user_id,kind) values(auth.uid(),p_kind) returning id into v_item;
 elsif not exists(select 1 from public.fixed_recurring_items where id=v_item and user_id=auth.uid() and kind=p_kind)
 then raise exception 'owned item required' using errcode='42501'; end if;
 insert into public.fixed_recurring_versions(user_id,item_id,effective_from,description,amount,account_id,category_id,is_active)
 values(auth.uid(),v_item,p_effective_from,btrim(p_description),p_amount,p_account_id,p_category_id,p_is_active)
 on conflict(item_id,effective_from) do update set description=excluded.description,amount=excluded.amount,account_id=excluded.account_id,category_id=excluded.category_id,is_active=excluded.is_active;
 return v_item;
end $$;

create function public.guard_fixed_confirmation() returns trigger language plpgsql security invoker set search_path='' as $$
declare v public.fixed_recurring_versions; v_kind text;
begin
 if new.user_id is distinct from auth.uid() or new.month<>date_trunc('month',now() at time zone 'America/Sao_Paulo')::date
 or exists(select 1 from public.financial_periods where user_id=new.user_id and month=new.month and status='closed')
 then raise exception 'only current open period' using errcode='42501'; end if;
 if tg_op='UPDATE' and ((new.id,new.user_id,new.item_id,new.version_id,new.month,new.created_at) is distinct from (old.id,old.user_id,old.item_id,old.version_id,old.month,old.created_at)
 or (old.transaction_id is not null and new.transaction_id is distinct from old.transaction_id))
 then raise exception 'immutable confirmation' using errcode='42501'; end if;
 select * into v from public.fixed_recurring_versions where id=new.version_id and item_id=new.item_id and user_id=new.user_id;
 select kind into v_kind from public.fixed_recurring_items where id=new.item_id and user_id=new.user_id;
 if v.id is null or v_kind is null or not v.is_active or v.effective_from>new.month
 or not exists(select 1 from public.accounts where id=v.account_id and user_id=new.user_id and currency='BRL')
 or exists(select 1 from public.fixed_recurring_versions where item_id=new.item_id and effective_from<=new.month and effective_from>v.effective_from)
 then raise exception 'latest active version required' using errcode='42501'; end if;
 if new.transaction_id is not null and not exists(select 1 from public.transactions t where t.id=new.transaction_id and t.user_id=new.user_id
 and t.kind=v_kind and t.amount=v.amount and t.account_id=v.account_id and t.category_id is not distinct from v.category_id
 and t.occurred_on>=new.month and t.occurred_on<new.month+interval '1 month' and t.occurred_on<=(now() at time zone 'America/Sao_Paulo')::date
 and t.metadata->>'fixed_confirmation_id'=new.id::text)
 then raise exception 'matching transaction required' using errcode='42501'; end if;
 return new;
end $$;
create trigger fixed_confirmation_guard before insert or update on public.fixed_recurring_confirmations for each row execute function public.guard_fixed_confirmation();

create function public.confirm_fixed_recurrence(p_item_id uuid,p_month date,p_occurred_on date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v public.fixed_recurring_versions; c public.fixed_recurring_confirmations; v_kind text; v_transaction uuid;
begin
 if auth.uid() is null or p_month is null or p_month<>date_trunc('month',now() at time zone 'America/Sao_Paulo')::date
 or p_occurred_on is null or p_occurred_on<p_month or p_occurred_on>=p_month+interval '1 month' or p_occurred_on>(now() at time zone 'America/Sao_Paulo')::date
 or exists(select 1 from public.financial_periods where user_id=auth.uid() and month=p_month and status='closed')
 then raise exception 'only current open period' using errcode='42501'; end if;
 select kind into v_kind from public.fixed_recurring_items where id=p_item_id and user_id=auth.uid();
 if v_kind is null then raise exception 'owned item required' using errcode='42501'; end if;
 -- Unique monthly slot + row lock serializes repeated/concurrent confirmations atomically.
 select * into c from public.fixed_recurring_confirmations where item_id=p_item_id and month=p_month and user_id=auth.uid();
 if c.transaction_id is not null then return c.transaction_id; end if;
 select * into v from public.fixed_recurring_versions where item_id=p_item_id and user_id=auth.uid() and effective_from<=p_month order by effective_from desc limit 1;
 if v.id is null or not v.is_active then raise exception 'active version required' using errcode='42501'; end if;
 insert into public.fixed_recurring_confirmations(user_id,item_id,version_id,month) values(auth.uid(),p_item_id,v.id,p_month) on conflict(item_id,month) do nothing;
 select * into c from public.fixed_recurring_confirmations where item_id=p_item_id and month=p_month and user_id=auth.uid() for update;
 if c.transaction_id is not null then return c.transaction_id; end if;
 if c.version_id<>v.id then raise exception 'refresh forecast before confirmation' using errcode='40001'; end if;
 insert into public.transactions(user_id,account_id,category_id,kind,amount,occurred_on,description,source_type,source_description,metadata)
 values(auth.uid(),v.account_id,v.category_id,v_kind,v.amount,p_occurred_on,v.description,'manual','Confirmação de receita ou custo fixo',jsonb_build_object('fixed_confirmation_id',c.id,'fixed_item_id',p_item_id,'fixed_month',p_month)) returning id into v_transaction;
 update public.fixed_recurring_confirmations set transaction_id=v_transaction where id=c.id;
 return v_transaction;
end $$;

create function public.fixed_recurrence_month(p_month date) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
 if p_month is null or extract(day from p_month)<>1 then raise exception 'month must be first day' using errcode='22023'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'version',to_jsonb(v),'history',h.versions,'confirmation',case when t.id is null then null else jsonb_build_object('transaction_id',t.id,'amount',t.amount,'occurred_on',t.occurred_on) end) order by i.created_at,i.id),'[]'::jsonb) into result
 from public.fixed_recurring_items i
 left join lateral(select * from public.fixed_recurring_versions where item_id=i.id and user_id=auth.uid() and effective_from<=p_month order by effective_from desc limit 1)v on true
 left join lateral(select coalesce(jsonb_agg(to_jsonb(x) order by x.effective_from desc),'[]'::jsonb) versions from public.fixed_recurring_versions x where x.item_id=i.id and x.user_id=auth.uid())h on true
 left join public.fixed_recurring_confirmations c on c.item_id=i.id and c.month=p_month and c.user_id=auth.uid()
 left join public.transactions t on t.id=c.transaction_id and t.user_id=auth.uid()
 where i.user_id=auth.uid();
 return result;
end $$;
revoke all on function public.guard_fixed_version(),public.guard_fixed_confirmation(),public.save_fixed_recurrence(uuid,text,date,text,numeric,uuid,uuid,boolean),public.confirm_fixed_recurrence(uuid,date,date),public.fixed_recurrence_month(date) from public,anon;
grant execute on function public.save_fixed_recurrence(uuid,text,date,text,numeric,uuid,uuid,boolean),public.confirm_fixed_recurrence(uuid,date,date),public.fixed_recurrence_month(date) to authenticated;

-- Protect only transactions linked to these explicit confirmations; existing transactions keep their behavior.
create function public.guard_fixed_realized_transaction() returns trigger language plpgsql security invoker set search_path='' as $$
declare fixed_month date;
begin
 select month into fixed_month from public.fixed_recurring_confirmations where transaction_id=old.id;
 if fixed_month is not null and (tg_op='UPDATE' or fixed_month<date_trunc('month',now() at time zone 'America/Sao_Paulo')::date)
 then raise exception 'confirmed fixed transaction is immutable; remove only in current open month' using errcode='42501'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger fixed_realized_transaction_guard before update or delete on public.transactions for each row execute function public.guard_fixed_realized_transaction();
revoke all on function public.guard_fixed_realized_transaction() from public,anon;

-- Keep the private account-erasure inventory complete without exposing an erasure API.
create or replace function private.erase_account_data(target_user uuid, confirmation text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  table_name text; removed bigint; result jsonb:='{}'::jsonb;
  expected_tables text[]:=array['fixed_recurring_confirmations','fixed_recurring_versions','fixed_recurring_items','transactions','category_budgets','goal_contributions','debt_payments','asset_valuations','resilience_essential_categories','behavior_checkins','recurring_expense_versions','recurring_expenses','merchant_aliases','annual_provisions','net_worth_snapshots','financial_goals','debts','assets','monthly_plans','financial_periods','planning_engine_profiles','debt_strategy_profiles','resilience_profiles','behavior_profiles','categories','merchants','payment_methods','accounts'];
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
