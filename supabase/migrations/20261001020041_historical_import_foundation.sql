-- Historical import foundation
-- Applied to Supabase as migration 20261001020041_historical_import_foundation

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

alter table public.categories
  add column if not exists icon text,
  add column if not exists is_active boolean not null default true;

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists merchants_user_name_uq
  on public.merchants (user_id, lower(name));

create table if not exists public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 160),
  created_at timestamptz not null default now()
);
create unique index if not exists merchant_aliases_user_alias_uq
  on public.merchant_aliases (user_id, lower(alias));

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('pix','credit_card','debit_card','cash','bank_transfer','other')),
  name text not null check (char_length(name) between 1 and 100),
  card_brand text check (card_brand is null or char_length(card_brand) <= 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists payment_methods_user_name_uq
  on public.payment_methods (user_id, lower(name));

create table if not exists public.financial_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  status text not null default 'open' check (status in ('open','closed')),
  reconciliation_status text not null default 'reconciled'
    check (reconciliation_status in ('reconciled','unreconciled','incomplete')),
  closed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);
create index if not exists financial_periods_user_status_idx
  on public.financial_periods (user_id, status, month desc);

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_expense_versions (
  id uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null check (extract(day from effective_from) = 1),
  description text not null check (char_length(description) between 1 and 160),
  amount numeric(14,2) not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  category_id uuid references public.categories(id) on delete restrict,
  merchant_id uuid references public.merchants(id) on delete restrict,
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (recurring_expense_id, effective_from)
);
create index if not exists recurring_versions_user_effective_idx
  on public.recurring_expense_versions (user_id, effective_from desc);

alter table public.transactions
  add column if not exists merchant_id uuid references public.merchants(id) on delete restrict,
  add column if not exists payment_method_id uuid references public.payment_methods(id) on delete restrict,
  add column if not exists installment_current smallint,
  add column if not exists installment_total smallint,
  add column if not exists source_type text not null default 'manual'
    check (source_type in ('manual','historical_import','recurring','bank_import')),
  add column if not exists historical_expense_key text,
  add column if not exists source_description text,
  add column if not exists recurring_expense_version_id uuid references public.recurring_expense_versions(id) on delete restrict,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.transactions
  drop constraint if exists transactions_installment_range_chk;
alter table public.transactions
  add constraint transactions_installment_range_chk
  check (
    (installment_current is null and installment_total is null)
    or (
      installment_current is not null
      and installment_total is not null
      and installment_current >= 1
      and installment_total >= installment_current
    )
  );

create unique index if not exists transactions_historical_expense_key_uq
  on public.transactions (historical_expense_key)
  where historical_expense_key is not null;

alter table public.transactions
  drop constraint if exists transactions_category_id_fkey;
alter table public.transactions
  add constraint transactions_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete restrict;

create table if not exists private.historical_import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  label text not null,
  source_name text,
  status text not null default 'staging'
    check (status in ('staging','validated','promoted','failed')),
  expense_row_count integer not null default 0,
  settlement_row_count integer not null default 0,
  period_row_count integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  promoted_at timestamptz
);

create table if not exists private.historical_expense_staging (
  id bigserial primary key,
  batch_id uuid not null references private.historical_import_batches(id) on delete cascade,
  historical_expense_key text not null,
  reference_date date not null,
  reference_year_month text not null,
  amount numeric(14,2) not null check (amount > 0),
  description_original text,
  description_clean text,
  merchant_canonical text,
  merchant_confidence text,
  merchant_resolution_source text,
  category_canonical text,
  category_confidence text,
  category_resolution_source text,
  payment_method_candidate text,
  card_name_candidate text,
  card_brand_candidate text,
  installment_current smallint,
  installment_total smallint,
  installment_remaining smallint,
  installment_end_month_estimated text,
  future_installment_commitment numeric(14,2),
  source_message_index bigint,
  source_expense_version_id text,
  curation_decision text,
  curation_note text,
  historical_period_locked boolean not null default true,
  imported_transaction_id uuid,
  created_at timestamptz not null default now(),
  unique (batch_id, historical_expense_key)
);

create table if not exists private.historical_settlement_staging (
  id bigserial primary key,
  batch_id uuid not null references private.historical_import_batches(id) on delete cascade,
  settlement_event_id text not null,
  source_message_index bigint,
  source_message_datetime timestamptz,
  reference_date date not null,
  reference_year_month text not null,
  event_sequence integer,
  event_type text,
  amount numeric(14,2) not null,
  note text,
  payment_date_candidate date,
  opening_balance numeric(14,2),
  balance_before numeric(14,2),
  balance_after_calculated numeric(14,2),
  balance_after_declared numeric(14,2),
  arithmetic_difference numeric(14,2),
  arithmetic_ok boolean,
  needs_review boolean,
  review_reasons text,
  is_selected_settlement_version boolean,
  import_decision text,
  created_at timestamptz not null default now(),
  unique (batch_id, settlement_event_id)
);

create table if not exists private.historical_period_staging (
  id bigserial primary key,
  batch_id uuid not null references private.historical_import_batches(id) on delete cascade,
  month date not null,
  expense_count integer not null,
  expense_total numeric(14,2) not null,
  reconciliation_status text not null
    check (reconciliation_status in ('reconciled','unreconciled','incomplete')),
  target_period_status text not null check (target_period_status in ('open','closed')),
  close_after_import boolean not null default false,
  created_at timestamptz not null default now(),
  unique (batch_id, month)
);

alter table public.merchants enable row level security;
alter table public.merchant_aliases enable row level security;
alter table public.payment_methods enable row level security;
alter table public.financial_periods enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_versions enable row level security;

create policy merchants_select_own on public.merchants for select to authenticated
using ((select auth.uid()) = user_id);
create policy merchants_insert_own on public.merchants for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy merchants_update_own on public.merchants for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy merchants_delete_own on public.merchants for delete to authenticated
using ((select auth.uid()) = user_id);

create policy merchant_aliases_select_own on public.merchant_aliases for select to authenticated
using ((select auth.uid()) = user_id);
create policy merchant_aliases_insert_own on public.merchant_aliases for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = (select auth.uid()))
);
create policy merchant_aliases_update_own on public.merchant_aliases for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = (select auth.uid()))
);
create policy merchant_aliases_delete_own on public.merchant_aliases for delete to authenticated
using ((select auth.uid()) = user_id);

create policy payment_methods_select_own on public.payment_methods for select to authenticated
using ((select auth.uid()) = user_id);
create policy payment_methods_insert_own on public.payment_methods for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy payment_methods_update_own on public.payment_methods for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy payment_methods_delete_own on public.payment_methods for delete to authenticated
using ((select auth.uid()) = user_id);

create policy financial_periods_select_own on public.financial_periods for select to authenticated
using ((select auth.uid()) = user_id);
create policy financial_periods_insert_own on public.financial_periods for insert to authenticated
with check ((select auth.uid()) = user_id and status = 'open');
create policy financial_periods_update_own on public.financial_periods for update to authenticated
using ((select auth.uid()) = user_id and status = 'open')
with check ((select auth.uid()) = user_id and status in ('open','closed'));
create policy financial_periods_delete_own on public.financial_periods for delete to authenticated
using ((select auth.uid()) = user_id and status = 'open');

create policy recurring_expenses_select_own on public.recurring_expenses for select to authenticated
using ((select auth.uid()) = user_id);
create policy recurring_expenses_insert_own on public.recurring_expenses for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy recurring_versions_select_own on public.recurring_expense_versions for select to authenticated
using ((select auth.uid()) = user_id);
create policy recurring_versions_insert_future on public.recurring_expense_versions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.recurring_expenses r
    where r.id = recurring_expense_id and r.user_id = (select auth.uid())
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = (select auth.uid()) and c.kind = 'expense'
    )
  )
  and (
    merchant_id is null
    or exists (
      select 1 from public.merchants m
      where m.id = merchant_id and m.user_id = (select auth.uid())
    )
  )
  and (
    payment_method_id is null
    or exists (
      select 1 from public.payment_methods p
      where p.id = payment_method_id and p.user_id = (select auth.uid())
    )
  )
  and effective_from > coalesce(
    (select max(fp.month) from public.financial_periods fp
     where fp.user_id = (select auth.uid()) and fp.status = 'closed'),
    date '1900-01-01'
  )
);

revoke all privileges on table
  public.merchants, public.merchant_aliases, public.payment_methods,
  public.financial_periods, public.recurring_expenses, public.recurring_expense_versions
from anon, authenticated;

grant select, insert, update, delete on table
  public.merchants, public.merchant_aliases, public.payment_methods, public.financial_periods
to authenticated;

grant select, insert on table
  public.recurring_expenses, public.recurring_expense_versions
to authenticated;

drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists transactions_delete_own on public.transactions;

create policy transactions_select_own on public.transactions for select to authenticated
using ((select auth.uid()) = user_id);

create policy transactions_insert_own on public.transactions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid())
      and fp.status = 'closed'
      and fp.month = date_trunc('month', transactions.occurred_on)::date
  )
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = (select auth.uid()) and c.kind = transactions.kind
    )
  )
  and (
    merchant_id is null
    or exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = (select auth.uid()))
  )
  and (
    payment_method_id is null
    or exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  )
);

create policy transactions_update_own on public.transactions for update to authenticated
using (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid())
      and fp.status = 'closed'
      and fp.month = date_trunc('month', transactions.occurred_on)::date
  )
)
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid())
      and fp.status = 'closed'
      and fp.month = date_trunc('month', transactions.occurred_on)::date
  )
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = (select auth.uid()) and c.kind = transactions.kind
    )
  )
  and (
    merchant_id is null
    or exists (select 1 from public.merchants m where m.id = merchant_id and m.user_id = (select auth.uid()))
  )
  and (
    payment_method_id is null
    or exists (select 1 from public.payment_methods p where p.id = payment_method_id and p.user_id = (select auth.uid()))
  )
);

create policy transactions_delete_own on public.transactions for delete to authenticated
using (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid())
      and fp.status = 'closed'
      and fp.month = date_trunc('month', transactions.occurred_on)::date
  )
);

drop policy if exists monthly_plans_select_own on public.monthly_plans;
drop policy if exists monthly_plans_insert_own on public.monthly_plans;
drop policy if exists monthly_plans_update_own on public.monthly_plans;
drop policy if exists monthly_plans_delete_own on public.monthly_plans;

create policy monthly_plans_select_own on public.monthly_plans for select to authenticated
using ((select auth.uid()) = user_id);
create policy monthly_plans_insert_own on public.monthly_plans for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid()) and fp.status='closed' and fp.month=monthly_plans.month
  )
);
create policy monthly_plans_update_own on public.monthly_plans for update to authenticated
using (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid()) and fp.status='closed' and fp.month=monthly_plans.month
  )
)
with check (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid()) and fp.status='closed' and fp.month=monthly_plans.month
  )
);
create policy monthly_plans_delete_own on public.monthly_plans for delete to authenticated
using (
  (select auth.uid()) = user_id
  and not exists (
    select 1 from public.financial_periods fp
    where fp.user_id = (select auth.uid()) and fp.status='closed' and fp.month=monthly_plans.month
  )
);

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
    where p.id=plan_id and p.user_id=(select auth.uid())
      and not exists (
        select 1 from public.financial_periods fp
        where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=p.month
      )
  )
  and exists (
    select 1 from public.categories c
    where c.id=category_id and c.user_id=(select auth.uid()) and c.kind='expense'
  )
);

create policy category_budgets_update_own on public.category_budgets for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.monthly_plans p
    where p.id=plan_id and p.user_id=(select auth.uid())
      and not exists (
        select 1 from public.financial_periods fp
        where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=p.month
      )
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.monthly_plans p
    where p.id=plan_id and p.user_id=(select auth.uid())
      and not exists (
        select 1 from public.financial_periods fp
        where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=p.month
      )
  )
  and exists (
    select 1 from public.categories c
    where c.id=category_id and c.user_id=(select auth.uid()) and c.kind='expense'
  )
);

create policy category_budgets_delete_own on public.category_budgets for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.monthly_plans p
    where p.id=plan_id and p.user_id=(select auth.uid())
      and not exists (
        select 1 from public.financial_periods fp
        where fp.user_id=(select auth.uid()) and fp.status='closed' and fp.month=p.month
      )
  )
);

notify pgrst, 'reload schema';
