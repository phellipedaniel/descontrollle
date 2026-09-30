create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  account_type text not null default 'checking'
    check (account_type in ('checking','savings','cash','investment','other')),
  initial_balance numeric(14,2) not null default 0,
  currency char(3) not null default 'BRL',
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  kind text not null check (kind in ('income','expense')),
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  kind text not null check (kind in ('income','expense')),
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  description text check (description is null or char_length(description) <= 160),
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists categories_user_kind_idx on public.categories(user_id, kind);
create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists accounts_select_own on public.accounts;
drop policy if exists accounts_insert_own on public.accounts;
drop policy if exists accounts_update_own on public.accounts;
drop policy if exists accounts_delete_own on public.accounts;

create policy accounts_select_own on public.accounts for select to authenticated
using ((select auth.uid()) = user_id);
create policy accounts_insert_own on public.accounts for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy accounts_update_own on public.accounts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy accounts_delete_own on public.accounts for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists categories_delete_own on public.categories;

create policy categories_select_own on public.categories for select to authenticated
using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.categories for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.categories for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists transactions_delete_own on public.transactions;

create policy transactions_select_own on public.transactions for select to authenticated
using ((select auth.uid()) = user_id);

create policy transactions_insert_own on public.transactions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id
        and c.user_id = (select auth.uid())
        and c.kind = transactions.kind
    )
  )
);

create policy transactions_update_own on public.transactions for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = category_id
        and c.user_id = (select auth.uid())
        and c.kind = transactions.kind
    )
  )
);

create policy transactions_delete_own on public.transactions for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.accounts, public.categories, public.transactions from anon, authenticated;
grant select, insert, update, delete on table public.accounts, public.categories, public.transactions to authenticated;

notify pgrst, 'reload schema';
