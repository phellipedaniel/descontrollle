create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  planned_income numeric(14,2) not null default 0 check (planned_income >= 0),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.monthly_plans(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  planned_amount numeric(14,2) not null default 0 check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, category_id)
);

create index if not exists monthly_plans_user_month_idx on public.monthly_plans(user_id, month);
create index if not exists category_budgets_user_plan_idx on public.category_budgets(user_id, plan_id);
create index if not exists category_budgets_category_idx on public.category_budgets(category_id);

alter table public.monthly_plans enable row level security;
alter table public.category_budgets enable row level security;

drop policy if exists monthly_plans_select_own on public.monthly_plans;
drop policy if exists monthly_plans_insert_own on public.monthly_plans;
drop policy if exists monthly_plans_update_own on public.monthly_plans;
drop policy if exists monthly_plans_delete_own on public.monthly_plans;

create policy monthly_plans_select_own on public.monthly_plans for select to authenticated
using ((select auth.uid()) = user_id);
create policy monthly_plans_insert_own on public.monthly_plans for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy monthly_plans_update_own on public.monthly_plans for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy monthly_plans_delete_own on public.monthly_plans for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists category_budgets_select_own on public.category_budgets;
drop policy if exists category_budgets_insert_own on public.category_budgets;
drop policy if exists category_budgets_update_own on public.category_budgets;
drop policy if exists category_budgets_delete_own on public.category_budgets;

create policy category_budgets_select_own on public.category_budgets for select to authenticated
using ((select auth.uid()) = user_id);

create policy category_budgets_insert_own on public.category_budgets for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.monthly_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
      and c.kind = 'expense'
  )
);

create policy category_budgets_update_own on public.category_budgets for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.monthly_plans p
    where p.id = plan_id and p.user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.categories c
    where c.id = category_id
      and c.user_id = (select auth.uid())
      and c.kind = 'expense'
  )
);

create policy category_budgets_delete_own on public.category_budgets for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.monthly_plans, public.category_budgets from anon, authenticated;
grant select, insert, update, delete on table public.monthly_plans, public.category_budgets to authenticated;

notify pgrst, 'reload schema';
