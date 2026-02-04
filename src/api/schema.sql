-- Single rules and decision tables
CREATE TABLE business_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  mode        VARCHAR(20) NOT NULL CHECK (mode IN ('condition', 'table', 'pipeline')),
  json_logic  JSONB NOT NULL,         -- executable JSONLogic (or pipeline steps)
  table_def   JSONB,                  -- DecisionTable JSON (UI persistence, null for conditions)
  category    VARCHAR(100),           -- e.g., "pricing", "eligibility"
  entity_type VARCHAR(100),           -- e.g., "order", "customer"
  entity_id   UUID,                   -- link to specific entity if needed
  version     INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  VARCHAR(255),
  updated_by  VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Version history (copy-on-write on every save)
CREATE TABLE business_rules_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     UUID NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  json_logic  JSONB NOT NULL,
  table_def   JSONB,
  changed_by  VARCHAR(255),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Useful indexes
CREATE INDEX idx_rules_category ON business_rules(category) WHERE is_active = true;
CREATE INDEX idx_rules_entity ON business_rules(entity_type, entity_id) WHERE is_active = true;
CREATE INDEX idx_rules_history_rule ON business_rules_history(rule_id, version DESC);
