alter table public.accounts
  add column if not exists include_in_net_worth boolean not null default true;

alter table public.debts
  add column if not exists include_in_net_worth boolean not null default true;

update public.accounts a
set include_in_net_worth=false
where exists (
  select 1 from public.transactions t where t.account_id=a.id and t.source_type='historical_import'
)
and not exists (
  select 1 from public.transactions t where t.account_id=a.id and t.source_type<>'historical_import'
)
and a.initial_balance=0;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  asset_type text not null default 'other' check (asset_type in ('investment','real_estate','vehicle','retirement','business','valuable','receivable','other')),
  current_value numeric(14,2) not null check (current_value >= 0 and current_value <= 9999999999.99),
  valuation_date date not null check (valuation_date between date '2000-01-01' and date '2100-12-31'),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create index assets_user_status_idx on public.assets(user_id,status);

create table public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null,
  value numeric(14,2) not null check (value >= 0 and value <= 9999999999.99),
  valued_on date not null check (valued_on between date '2000-01-01' and date '2100-12-31'),
  note text check (note is null or char_length(note) <= 160),
  created_at timestamptz not null default now(),
  foreign key(asset_id,user_id) references public.assets(id,user_id) on delete cascade
);
create index asset_valuations_asset_owner_date_idx on public.asset_valuations(asset_id,user_id,valued_on desc,created_at desc);

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  captured_on date not null check (captured_on between date '2000-01-01' and date '2100-12-31'),
  accounts_value numeric(14,2) not null,
  manual_assets_value numeric(14,2) not null check (manual_assets_value >= 0),
  liabilities_value numeric(14,2) not null check (liabilities_value >= 0),
  net_worth numeric(14,2) not null,
  notes text check (notes is null or char_length(notes) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,captured_on)
);
create index net_worth_snapshots_user_date_idx on public.net_worth_snapshots(user_id,captured_on desc);

alter table public.assets enable row level security;
alter table public.asset_valuations enable row level security;
alter table public.net_worth_snapshots enable row level security;

create policy assets_select_own on public.assets for select to authenticated using ((select auth.uid())=user_id);
create policy assets_insert_own on public.assets for insert to authenticated with check ((select auth.uid())=user_id);
create policy assets_update_own on public.assets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy asset_valuations_select_own on public.asset_valuations for select to authenticated using ((select auth.uid())=user_id);
create policy asset_valuations_insert_own on public.asset_valuations for insert to authenticated with check (
  (select auth.uid())=user_id
  and exists(select 1 from public.assets a where a.id=asset_id and a.user_id=(select auth.uid()))
);

create policy net_worth_snapshots_select_own on public.net_worth_snapshots for select to authenticated using ((select auth.uid())=user_id);
create policy net_worth_snapshots_insert_own on public.net_worth_snapshots for insert to authenticated with check ((select auth.uid())=user_id);
create policy net_worth_snapshots_update_own on public.net_worth_snapshots for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

revoke all on public.assets,public.asset_valuations,public.net_worth_snapshots from anon,authenticated;
grant select,insert on public.assets to authenticated;
grant update(name,asset_type,notes,status,updated_at) on public.assets to authenticated;
grant select,insert on public.asset_valuations to authenticated;
grant select,insert on public.net_worth_snapshots to authenticated;
grant update(accounts_value,manual_assets_value,liabilities_value,net_worth,notes,updated_at) on public.net_worth_snapshots to authenticated;
grant update(include_in_net_worth) on public.debts to authenticated;

create or replace function private.seed_asset_initial_valuation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.valuation_date>(now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'future asset valuation date' using errcode='22023';
  end if;
  insert into public.asset_valuations(user_id,asset_id,value,valued_on,note)
  values(new.user_id,new.id,new.current_value,new.valuation_date,'Avaliação inicial');
  return new;
end;
$$;
revoke all on function private.seed_asset_initial_valuation() from public,anon,authenticated;
create trigger asset_seed_initial_valuation after insert on public.assets
for each row execute function private.seed_asset_initial_valuation();

create or replace function private.apply_asset_valuation()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_user_id uuid:=auth.uid(); v_asset public.assets%rowtype;
begin
  if v_user_id is null or new.user_id<>v_user_id then raise exception 'authentication required' using errcode='42501'; end if;
  if new.valued_on>(now() at time zone 'America/Sao_Paulo')::date then raise exception 'future asset valuation date' using errcode='22023'; end if;
  select * into v_asset from public.assets where id=new.asset_id and user_id=v_user_id for update;
  if not found then raise exception 'asset not found' using errcode='42501'; end if;
  if new.valued_on>=v_asset.valuation_date then
    update public.assets set current_value=new.value,valuation_date=new.valued_on,updated_at=now()
    where id=new.asset_id and user_id=v_user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.apply_asset_valuation() from public,anon,authenticated;
create trigger asset_apply_valuation before insert on public.asset_valuations
for each row execute function private.apply_asset_valuation();

comment on table public.assets is 'Manual balance-sheet assets not already represented by financial accounts.';
comment on table public.asset_valuations is 'Append-only asset valuation history. Newer valuations update the current value through a private trigger.';
comment on table public.net_worth_snapshots is 'User snapshots of accounts plus manual assets minus included debts.';
