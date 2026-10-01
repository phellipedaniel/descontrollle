-- Indexes added after Supabase performance advisor review.
-- Applied as migration 20261001020359_historical_import_indexes.

create index if not exists historical_import_batches_owner_user_idx
  on private.historical_import_batches(owner_user_id);

create index if not exists merchant_aliases_merchant_idx
  on public.merchant_aliases(merchant_id);

create index if not exists recurring_expenses_user_idx
  on public.recurring_expenses(user_id);

create index if not exists recurring_versions_category_idx
  on public.recurring_expense_versions(category_id);

create index if not exists recurring_versions_merchant_idx
  on public.recurring_expense_versions(merchant_id);

create index if not exists recurring_versions_payment_method_idx
  on public.recurring_expense_versions(payment_method_id);

create index if not exists transactions_merchant_idx
  on public.transactions(merchant_id);

create index if not exists transactions_payment_method_idx
  on public.transactions(payment_method_id);

create index if not exists transactions_recurring_version_idx
  on public.transactions(recurring_expense_version_id);
