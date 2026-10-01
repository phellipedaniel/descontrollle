create unique index if not exists categories_id_user_id_uq
  on public.categories(id, user_id);

create table public.resilience_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  protection_months smallint not null default 6 check (protection_months between 1 and 24),
  baseline_mode text not null default 'manual' check (baseline_mode in ('manual','current_plan','trailing_3_closed')),
  manual_essential_monthly numeric(14,2) check (manual_essential_monthly is null or (manual_essential_monthly >= 0 and manual_essential_monthly <= 9999999999.99)),
  emergency_reserve_amount numeric(14,2) not null default 0 check (emergency_reserve_amount >= 0 and emergency_reserve_amount <= 9999999999.99),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (baseline_mode <> 'manual' or manual_essential_monthly is not null)
);

create table public.resilience_essential_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade
);
create index resilience_essential_categories_category_idx on public.resilience_essential_categories(category_id);

create table public.annual_provisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  annual_amount numeric(14,2) not null check (annual_amount > 0 and annual_amount <= 9999999999.99),
  reserved_amount numeric(14,2) not null default 0 check (reserved_amount >= 0 and reserved_amount <= 9999999999.99),
  due_month smallint check (due_month is null or due_month between 1 and 12),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id, user_id)
);
create index annual_provisions_user_status_idx on public.annual_provisions(user_id, status);

alter table public.resilience_profiles enable row level security;
alter table public.resilience_essential_categories enable row level security;
alter table public.annual_provisions enable row level security;

create policy resilience_profiles_select_own on public.resilience_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy resilience_profiles_insert_own on public.resilience_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy resilience_profiles_update_own on public.resilience_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy resilience_categories_select_own on public.resilience_essential_categories for select to authenticated using ((select auth.uid()) = user_id);
create policy resilience_categories_insert_own on public.resilience_essential_categories for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists(select 1 from public.categories c where c.id=category_id and c.user_id=(select auth.uid()) and c.kind='expense' and c.is_active=true)
);
create policy resilience_categories_delete_own on public.resilience_essential_categories for delete to authenticated using ((select auth.uid()) = user_id);

create policy annual_provisions_select_own on public.annual_provisions for select to authenticated using ((select auth.uid()) = user_id);
create policy annual_provisions_insert_own on public.annual_provisions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy annual_provisions_update_own on public.annual_provisions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.resilience_profiles,public.resilience_essential_categories,public.annual_provisions from anon,authenticated;
grant select,insert on public.resilience_profiles to authenticated;
grant update(protection_months,baseline_mode,manual_essential_monthly,emergency_reserve_amount,notes,updated_at) on public.resilience_profiles to authenticated;
grant select,insert,delete on public.resilience_essential_categories to authenticated;
grant select,insert on public.annual_provisions to authenticated;
grant update(name,annual_amount,reserved_amount,due_month,notes,status,updated_at) on public.annual_provisions to authenticated;

comment on table public.resilience_profiles is 'User-declared resilience settings. Emergency reserve values are planning inputs and do not move money.';
comment on table public.resilience_essential_categories is 'Expense categories explicitly marked by the user as essential for resilience calculations.';
comment on table public.annual_provisions is 'Predictable annual expenses kept separate from emergency reserve. Suggested monthly provision is annual_amount / 12.';
