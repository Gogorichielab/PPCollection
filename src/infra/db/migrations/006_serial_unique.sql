CREATE UNIQUE INDEX IF NOT EXISTS idx_firearms_serial
  ON firearms(serial)
  WHERE serial IS NOT NULL AND serial != '';
