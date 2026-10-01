-- Spreadsheet complement staging extensions.
-- Applied to Supabase as migration 20261001142453_spreadsheet_history_staging_extensions.
-- This migration adds source-audit metadata and keeps forecasts/issues separate from realized expenses.

alter table private.historical_import_batches
  add column if not exists forecast_row_count integer not null default 0,
  add column if not exists issue_row_count integer not null default 0;

alter table private.historical_expense_staging
  add column if not exists source_workbook text,
  add column if not exists source_sheet text,
  add column if not exists source_cell text,
  add column if not exists source_amount_raw numeric(14,3),
  add column if not exists source_kind text not null default 'whatsapp';

alter table private.historical_period_staging
  add column if not exists source_expense_total numeric(14,2),
  add column if not exists rounding_adjustment numeric(14,2) not null default 0,
  add column if not exists notes text;

create table if not exists private.historical_forecast_staging (
  id bigserial primary key,
  batch_id uuid not null references private.historical_import_batches(id) on delete cascade,
  forecast_key text not null,
  reference_month date not null check (extract(day from reference_month) = 1),
  amount numeric(14,2) not null check (amount > 0),
  source_amount_raw numeric(14,3),
  description_original text,
  description_clean text,
  merchant_canonical text,
  category_canonical text,
  payment_method_candidate text,
  installment_current smallint,
  installment_total smallint,
  source_workbook text,
  source_sheet text,
  source_cell text,
  status text not null default 'forecast_only' check (status = 'forecast_only'),
  notes text,
  created_at timestamptz not null default now(),
  unique (batch_id, forecast_key)
);

create table if not exists private.historical_import_issues (
  id bigserial primary key,
  batch_id uuid not null references private.historical_import_batches(id) on delete cascade,
  issue_key text not null,
  issue_type text not null,
  reference_date date,
  description text,
  source_workbook text,
  source_sheet text,
  source_cell text,
  status text not null default 'open' check (status in ('open','resolved','ignored')),
  notes text,
  created_at timestamptz not null default now(),
  unique (batch_id, issue_key)
);

create index if not exists historical_forecast_batch_month_idx
  on private.historical_forecast_staging(batch_id, reference_month);

create index if not exists historical_import_issues_batch_status_idx
  on private.historical_import_issues(batch_id, status);

comment on table private.historical_forecast_staging is
  'Forecast-only source rows. These rows must never be promoted as realized expenses without a separate confirmation step.';

comment on table private.historical_import_issues is
  'Open or resolved source-review issues such as missing amounts. Issues are not operational transactions.';
