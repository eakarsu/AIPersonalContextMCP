-- Apply pass 7 (full backlog implementation)
-- New tables for DP-budget tracking and recall-and-forget engine.

CREATE TABLE IF NOT EXISTS dp_budgets (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL,
  scope VARCHAR(255),
  epsilon_total NUMERIC(10, 4) DEFAULT 1.0000,
  epsilon_spent NUMERIC(10, 4) DEFAULT 0.0000,
  epsilon_remaining NUMERIC(10, 4) DEFAULT 1.0000,
  last_spent_at TIMESTAMPTZ,
  status VARCHAR(40) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dp_budgets_app_scope ON dp_budgets (app_name, scope);

CREATE TABLE IF NOT EXISTS dp_budget_spends (
  id SERIAL PRIMARY KEY,
  budget_id INTEGER REFERENCES dp_budgets(id) ON DELETE CASCADE,
  app_name VARCHAR(255),
  amount NUMERIC(10, 4) NOT NULL,
  reason VARCHAR(255),
  disclosure_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dp_budget_spends_budget ON dp_budget_spends (budget_id, created_at DESC);

CREATE TABLE IF NOT EXISTS forget_requests (
  id SERIAL PRIMARY KEY,
  app_name VARCHAR(255) NOT NULL,
  consent_id INTEGER,
  fields_to_purge TEXT,
  reason VARCHAR(255),
  status VARCHAR(40) DEFAULT 'pending',
  requested_by VARCHAR(150),
  webhook_fired BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_forget_requests_app ON forget_requests (app_name, status);
