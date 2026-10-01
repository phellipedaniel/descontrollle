-- Private source review layer; applied through Supabase migration history.
-- Unconfirmed source rows never enter historical_expense_staging automatically.
CREATE TABLE private.historical_source_documents (
  batch_id uuid PRIMARY KEY REFERENCES private.historical_import_batches(id),
  source_sha256 text NOT NULL UNIQUE CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_name text NOT NULL,
  parser_version text NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  expected_row_count integer NOT NULL CHECK (expected_row_count >= 0),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest)='object'),
  loaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.historical_source_rows (
  batch_id uuid NOT NULL REFERENCES private.historical_source_documents(batch_id),
  source_row_id text NOT NULL CHECK (source_row_id ~ '^[0-9a-f]{24}$'),
  sheet_name text NOT NULL,
  source_cell text NOT NULL CHECK (source_cell ~ '^[A-Z]+[1-9][0-9]*$'),
  amount_cell text NOT NULL CHECK (amount_cell ~ '^[A-Z]+[1-9][0-9]*$'),
  block_key text NOT NULL,
  reference_date_candidate date,
  description_original text NOT NULL,
  amount_original numeric,
  amount_candidate numeric(14,2),
  installment_current smallint,
  installment_total smallint,
  selected_version boolean NOT NULL,
  review_state text NOT NULL CHECK (review_state IN ('candidate','holdout','duplicate','alternative')),
  realization_status text NOT NULL DEFAULT 'unknown' CHECK (realization_status IN ('unknown','actual','forecast')),
  review_reasons text[] NOT NULL DEFAULT '{}',
  matched_historical_keys text[] NOT NULL DEFAULT '{}',
  source_payload jsonb NOT NULL CHECK (jsonb_typeof(source_payload)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id,source_row_id),
  UNIQUE (batch_id,sheet_name,source_cell),
  CHECK (amount_original IS NULL OR amount_original > 0),
  CHECK (amount_candidate IS NULL OR amount_candidate > 0),
  CHECK ((installment_current IS NULL AND installment_total IS NULL) OR
    (installment_current IS NOT NULL AND installment_total IS NOT NULL AND
     installment_current > 0 AND installment_total >= installment_current)),
  CHECK (review_state <> 'candidate' OR
    (selected_version AND reference_date_candidate IS NOT NULL AND amount_candidate IS NOT NULL)),
  CHECK (review_state <> 'duplicate' OR cardinality(matched_historical_keys)>0)
);
ALTER TABLE private.historical_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.historical_source_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.historical_source_documents, private.historical_source_rows FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE private.historical_source_documents IS 'Source manifests for private historical review. Batch status remains staging until business review. No automatic promotion.';
COMMENT ON TABLE private.historical_source_rows IS 'Unconfirmed source rows, alternatives, duplicates and holdouts. Amount/date candidates do not establish an actual expense. Admin-only review.';
