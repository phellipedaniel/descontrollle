create table public.behavior_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  comparison_window_months smallint not null default 3 check (comparison_window_months between 1 and 12),
  monthly_change_pct numeric(6,2) not null default 15 check (monthly_change_pct between 0 and 500),
  category_change_pct numeric(6,2) not null default 20 check (category_change_pct between 0 and 500),
  category_min_change numeric(14,2) not null default 50 check (category_min_change >= 0 and category_min_change <= 9999999999.99),
  frequency_change_pct numeric(6,2) not null default 20 check (frequency_change_pct between 0 and 500),
  merchant_min_coverage_pct numeric(5,2) not null default 60 check (merchant_min_coverage_pct between 0 and 100),
  merchant_concentration_pct numeric(5,2) not null default 35 check (merchant_concentration_pct between 0 and 100),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.behavior_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month)=1),
  intention text not null default 'observe' check (intention in ('observe','maintain','reduce','redirect')),
  focus_category_id uuid,
  reflection text check (reflection is null or char_length(reflection) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,month),
  foreign key(focus_category_id,user_id) references public.categories(id,user_id) on delete set null
);

create index behavior_checkins_user_month_idx on public.behavior_checkins(user_id,month desc);
create index behavior_checkins_focus_category_idx on public.behavior_checkins(focus_category_id,user_id);

alter table public.behavior_profiles enable row level security;
alter table public.behavior_checkins enable row level security;

create policy behavior_profiles_select_own on public.behavior_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy behavior_profiles_insert_own on public.behavior_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy behavior_profiles_update_own on public.behavior_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy behavior_checkins_select_own on public.behavior_checkins for select to authenticated using ((select auth.uid())=user_id);
create policy behavior_checkins_insert_own on public.behavior_checkins for insert to authenticated with check (
  (select auth.uid())=user_id
  and (focus_category_id is null or exists(
    select 1 from public.categories c
    where c.id=focus_category_id and c.user_id=(select auth.uid()) and c.kind='expense'
  ))
);
create policy behavior_checkins_update_own on public.behavior_checkins for update to authenticated using ((select auth.uid())=user_id) with check (
  (select auth.uid())=user_id
  and (focus_category_id is null or exists(
    select 1 from public.categories c
    where c.id=focus_category_id and c.user_id=(select auth.uid()) and c.kind='expense'
  ))
);

revoke all on public.behavior_profiles,public.behavior_checkins from anon,authenticated;
grant select,insert on public.behavior_profiles to authenticated;
grant update(
  comparison_window_months,monthly_change_pct,category_change_pct,category_min_change,
  frequency_change_pct,merchant_min_coverage_pct,merchant_concentration_pct,notes,updated_at
) on public.behavior_profiles to authenticated;
grant select,insert on public.behavior_checkins to authenticated;
grant update(intention,focus_category_id,reflection,updated_at) on public.behavior_checkins to authenticated;

comment on table public.behavior_profiles is 'User-controlled thresholds for descriptive spending signals. Thresholds do not classify the user.';
comment on table public.behavior_checkins is 'Monthly user-authored reflection and intended action. Financial balances are not modified.';
