BEGIN;

ALTER TABLE users ALTER COLUMN password TYPE TEXT;

CREATE TABLE IF NOT EXISTS context_sources (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  object_version TEXT NOT NULL,
  object_uri TEXT NOT NULL,
  checksum TEXT NOT NULL,
  permission_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  stage TEXT NOT NULL DEFAULT 'received' CHECK (stage IN ('received','parsed','chunked','indexed','review','active','tombstoned','deleted')),
  created_by TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  parser_receipt JSONB,
  index_receipt JSONB,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, source_ref, object_version),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS context_source_acl (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES context_sources(id),
  principal_ref TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('read','review','admin')),
  permission_version TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, principal_ref, permission_version)
);

CREATE TABLE IF NOT EXISTS context_chunks (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES context_sources(id),
  chunk_ref TEXT NOT NULL,
  object_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  locator TEXT NOT NULL,
  parse_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, chunk_ref, object_version),
  UNIQUE (source_id, content_hash, locator)
);

CREATE TABLE IF NOT EXISTS context_answers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  answer_ref TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  abstain BOOLEAN NOT NULL,
  abstention_reason TEXT,
  permission_version TEXT NOT NULL,
  freshness_cutoff TIMESTAMPTZ NOT NULL,
  model_version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, answer_ref),
  CHECK ((abstain AND answer IS NULL AND abstention_reason IS NOT NULL) OR (NOT abstain AND answer IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS context_citations (
  id BIGSERIAL PRIMARY KEY,
  answer_id BIGINT NOT NULL REFERENCES context_answers(id),
  source_id BIGINT NOT NULL REFERENCES context_sources(id),
  source_version TEXT NOT NULL,
  locator TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (answer_id, source_id, source_version, locator)
);

CREATE TABLE IF NOT EXISTS context_evaluations (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  answer_id BIGINT REFERENCES context_answers(id),
  dataset_version TEXT NOT NULL,
  recall_score NUMERIC(7,6),
  faithfulness_score NUMERIC(7,6),
  citation_score NUMERIC(7,6),
  freshness_score NUMERIC(7,6),
  conflict_detected BOOLEAN NOT NULL DEFAULT FALSE,
  injection_resisted BOOLEAN NOT NULL DEFAULT FALSE,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS context_deletion_receipts (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES context_sources(id),
  provider TEXT NOT NULL,
  receipt_ref TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (source_id, provider, receipt_ref)
);

CREATE TABLE IF NOT EXISTS context_workflow_audit (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_id BIGINT NOT NULL REFERENCES context_sources(id),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_context_sources_tenant_stage ON context_sources (tenant_id, stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_acl_principal ON context_source_acl (principal_ref, permission_version);
CREATE INDEX IF NOT EXISTS idx_context_answers_tenant_created ON context_answers (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION reject_context_audit_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'context_workflow_audit is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'context_workflow_audit_append_only') THEN
    CREATE TRIGGER context_workflow_audit_append_only
      BEFORE UPDATE OR DELETE ON context_workflow_audit
      FOR EACH ROW EXECUTE FUNCTION reject_context_audit_mutation();
  END IF;
END;
$$;

COMMIT;
