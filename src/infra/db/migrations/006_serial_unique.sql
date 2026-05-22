-- Remove duplicate serials within the same user scope, keeping the row with the lowest id
DELETE FROM firearms
WHERE serial IS NOT NULL
  AND TRIM(serial) != ''
  AND id NOT IN (
    SELECT MIN(id)
    FROM firearms
    WHERE serial IS NOT NULL AND TRIM(serial) != ''
    GROUP BY user_id, serial
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_firearms_serial
  ON firearms(user_id, serial)
  WHERE serial IS NOT NULL AND serial != '';
