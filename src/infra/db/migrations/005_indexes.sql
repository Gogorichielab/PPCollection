CREATE INDEX IF NOT EXISTS idx_firearms_status       ON firearms(status);
CREATE INDEX IF NOT EXISTS idx_firearms_condition    ON firearms(condition);
CREATE INDEX IF NOT EXISTS idx_firearms_firearm_type ON firearms(firearm_type);
CREATE INDEX IF NOT EXISTS idx_firearms_make_model   ON firearms(make, model);
