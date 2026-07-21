CREATE INDEX IF NOT EXISTS idx_maintenance_logs_firearm_type_date ON maintenance_logs(firearm_id, type, date);
CREATE INDEX IF NOT EXISTS idx_range_sessions_firearm_date        ON range_sessions(firearm_id, date);
