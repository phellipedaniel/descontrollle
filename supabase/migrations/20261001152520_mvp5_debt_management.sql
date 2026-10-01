create table public.debt_strategy_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  strategy text not null default 'avalanche' check (strategy in ('avalanche','snowball')),
  extra_monthly_payment numeric(14,2) not null default 0 check (extra_monthly_payment >= 0 and extra_monthly_payment <= 9999999999.99),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  creditor text check (creditor is null or char_length(creditor) <= 100),
  debt_type text not null default 'other' check (debt_type in ('credit_card','personal_loan','financing','overdraft','installment','other')),
  current_balance numeric(14,2) not null check (current_balance >= 0 and current_balance <= 9999999999.99),
  annual_interest_rate numeric(7,4) check (annual_interest_rate is null or (annual_interest_rate >= 0 and annual_interest_rate <= 999.9999)),
  minimum_payment numeric(14,2) not null default 0 check (minimum_payment >= 0 and minimum_payment <= 9999999999.99),
  due_day smallint check (due_day is null or due_day between 1 and 31),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'active' check (status in ('active','paid','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  check ((status='paid' and current_balance=0) or status<>'paid')
);
create index debts_user_status_idx on public.debts(user_id,status);

create table public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null,
  amount numeric(14,2) not null check (amount > 0 and amount <= 9999999999.99),
  resulting_balance numeric(14,2) not null check (resulting_balance >= 0 and resulting_balance <= 9999999999.99),
  occurred_on date not null check (occurred_on between date '2000-01-01' and date '2100-12-31'),
  note text check (note is null or char_length(note) <= 160),
  created_at timestamptz not null default now(),
  foreign key(debt_id,user_id) references public.debts(id,user_id) on delete restrict
);
create index debt_payments_debt_owner_date_idx on public.debt_payments(debt_id,user_id,occurred_on desc);
create index debt_payments_user_idx on public.debt_payments(user_id);

alter table public.debt_strategy_profiles enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;

create policy debt_strategy_select_own on public.debt_strategy_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy debt_strategy_insert_own on public.debt_strategy_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy debt_strategy_update_own on public.debt_strategy_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy debts_select_own on public.debts for select to authenticated using ((select auth.uid())=user_id);
create policy debts_insert_own on public.debts for insert to authenticated with check ((select auth.uid())=user_id);
create policy debts_update_own on public.debts for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy debt_payments_select_own on public.debt_payments for select to authenticated using ((select auth.uid())=user_id);

revoke all on public.debt_strategy_profiles,public.debts,public.debt_payments from anon,authenticated;
grant select,insert on public.debt_strategy_profiles to authenticated;
grant update(strategy,extra_monthly_payment,notes,updated_at) on public.debt_strategy_profiles to authenticated;
grant select,insert on public.debts to authenticated;
grant update(name,creditor,debt_type,annual_interest_rate,minimum_payment,due_day,notes,status,updated_at) on public.debts to authenticated;
grant select on public.debt_payments to authenticated;

create or replace function public.record_debt_payment(
  p_debt_id uuid,p_amount numeric,p_resulting_balance numeric,p_occurred_on date,p_note text default null
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user_id uuid:=auth.uid();
  v_debt public.debts%rowtype;
  v_payment_id uuid;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if p_amount is null or p_amount<=0 or p_amount>9999999999.99 then raise exception 'invalid payment amount' using errcode='22023'; end if;
  if p_resulting_balance is null or p_resulting_balance<0 or p_resulting_balance>9999999999.99 then raise exception 'invalid resulting balance' using errcode='22023'; end if;
  if p_occurred_on is null or p_occurred_on>(now() at time zone 'America/Sao_Paulo')::date or p_occurred_on<date '2000-01-01' then raise exception 'invalid payment date' using errcode='22023'; end if;
  if p_note is not null and char_length(p_note)>160 then raise exception 'note too long' using errcode='22023'; end if;

  select * into v_debt from public.debts where id=p_debt_id and user_id=v_user_id for update;
  if not found then raise exception 'debt not found' using errcode='42501'; end if;
  if v_debt.status<>'active' then raise exception 'debt is not active' using errcode='22023'; end if;
  if p_resulting_balance>v_debt.current_balance then raise exception 'resulting balance cannot exceed current balance in a payment' using errcode='22023'; end if;
  if exists(select 1 from public.financial_periods fp where fp.user_id=v_user_id and fp.status='closed' and fp.month=date_trunc('month',p_occurred_on)::date)
  then raise exception 'closed financial period' using errcode='42501'; end if;

  insert into public.debt_payments(user_id,debt_id,amount,resulting_balance,occurred_on,note)
  values(v_user_id,p_debt_id,p_amount,p_resulting_balance,p_occurred_on,nullif(btrim(p_note),''))
  returning id into v_payment_id;

  update public.debts
  set current_balance=p_resulting_balance,status=case when p_resulting_balance=0 then 'paid' else status end,updated_at=now()
  where id=p_debt_id and user_id=v_user_id;

  return v_payment_id;
end;
$$;
revoke all on function public.record_debt_payment(uuid,numeric,numeric,date,text) from public,anon;
grant execute on function public.record_debt_payment(uuid,numeric,numeric,date,text) to authenticated;

comment on table public.debts is 'User-reported debts. Balance is updated only through controlled payment recording or future correction flows.';
comment on table public.debt_payments is 'Debt payment history. Does not create a cash-flow transaction automatically, preventing double counting.';
comment on function public.record_debt_payment(uuid,numeric,numeric,date,text) is 'Atomically records a debt payment and updates the reported balance. Rejects future dates, closed periods and cross-user access.';
