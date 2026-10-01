create table public.planning_engine_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  horizon_months smallint not null default 12 check (horizon_months between 3 and 24),
  planned_income_mode text not null default 'current_plan' check (planned_income_mode in ('current_plan','trailing_3_closed','manual')),
  planned_expense_mode text not null default 'current_plan' check (planned_expense_mode in ('current_plan','trailing_3_closed','manual')),
  manual_monthly_income numeric(14,2) check (manual_monthly_income is null or (manual_monthly_income >= 0 and manual_monthly_income <= 9999999999.99)),
  manual_monthly_expense numeric(14,2) check (manual_monthly_expense is null or (manual_monthly_expense >= 0 and manual_monthly_expense <= 9999999999.99)),
  probable_window_months smallint not null default 3 check (probable_window_months between 1 and 12),
  reserve_monthly_allocation numeric(14,2) not null default 0 check (reserve_monthly_allocation >= 0 and reserve_monthly_allocation <= 9999999999.99),
  include_goals boolean not null default true,
  include_provisions boolean not null default true,
  include_debt_minimums boolean not null default true,
  include_debt_extra boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (planned_income_mode <> 'manual' or manual_monthly_income is not null),
  check (planned_expense_mode <> 'manual' or manual_monthly_expense is not null)
);

alter table public.planning_engine_profiles enable row level security;

create policy planning_engine_profiles_select_own on public.planning_engine_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy planning_engine_profiles_insert_own on public.planning_engine_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy planning_engine_profiles_update_own on public.planning_engine_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

revoke all on public.planning_engine_profiles from anon,authenticated;
grant select,insert on public.planning_engine_profiles to authenticated;
grant update(
  horizon_months,planned_income_mode,planned_expense_mode,
  manual_monthly_income,manual_monthly_expense,probable_window_months,
  reserve_monthly_allocation,include_goals,include_provisions,
  include_debt_minimums,include_debt_extra,notes,updated_at
) on public.planning_engine_profiles to authenticated;

comment on table public.planning_engine_profiles is
  'User-controlled assumptions for deterministic planned-vs-historical-probable cash-flow projections.';
