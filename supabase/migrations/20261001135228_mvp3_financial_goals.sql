create table public.financial_goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 2 and 80),
 target_amount numeric(14,2) not null check (target_amount > 0 and target_amount <= 9999999999.99),
 initial_amount numeric(14,2) not null default 0 check (initial_amount >= 0 and initial_amount <= 9999999999.99),
 target_date date not null check (target_date between date '2000-01-01' and date '2100-12-31'),
 notes text check (char_length(notes) <= 300),
 status text not null default 'active' check (status in ('active','archived')),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
create index financial_goals_user_idx on public.financial_goals(user_id);
create table public.goal_contributions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 goal_id uuid not null,
 amount numeric(14,2) not null check (amount > 0 and amount <= 9999999999.99),
 occurred_on date not null check (occurred_on between date '2000-01-01' and date '2100-12-31'),
 note text check (char_length(note) <= 160),
 created_at timestamptz not null default now(),
 foreign key(goal_id,user_id) references public.financial_goals(id,user_id) on delete restrict
);
create index goal_contributions_goal_owner_idx on public.goal_contributions(goal_id,user_id);
create index goal_contributions_user_idx on public.goal_contributions(user_id);
alter table public.financial_goals enable row level security;
alter table public.goal_contributions enable row level security;
create policy financial_goals_select_own on public.financial_goals for select to authenticated using ((select auth.uid())=user_id);
create policy financial_goals_insert_own on public.financial_goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy financial_goals_update_own on public.financial_goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy goal_contributions_select_own on public.goal_contributions for select to authenticated using ((select auth.uid())=user_id);
create policy goal_contributions_insert_own on public.goal_contributions for insert to authenticated with check (
 (select auth.uid())=user_id and occurred_on <= (now() at time zone 'America/Sao_Paulo')::date
 and exists(select 1 from public.financial_goals g where g.id=goal_id and g.user_id=(select auth.uid()) and g.status='active')
);
create policy goal_contributions_delete_own on public.goal_contributions for delete to authenticated using (
 (select auth.uid())=user_id and exists(select 1 from public.financial_goals g where g.id=goal_id and g.user_id=(select auth.uid()) and g.status='active')
);
revoke all on public.financial_goals,public.goal_contributions from anon,authenticated;
grant select,insert on public.financial_goals to authenticated;
grant update(name,target_amount,target_date,notes,status) on public.financial_goals to authenticated;
grant select,insert,delete on public.goal_contributions to authenticated;
create view public.financial_goal_progress with (security_invoker=true) as
 select g.id,g.user_id,g.name,g.target_amount,g.initial_amount,g.target_date,g.notes,g.status,g.created_at,
 g.initial_amount+coalesce(sum(c.amount),0) as saved_amount,count(c.id) as contribution_count
 from public.financial_goals g left join public.goal_contributions c on c.goal_id=g.id and c.user_id=g.user_id
 group by g.id;
revoke all on public.financial_goal_progress from anon,authenticated;
grant select on public.financial_goal_progress to authenticated;
comment on table public.goal_contributions is 'User-reported amounts reserved for a goal. Does not move money or create income/expense transactions.';
