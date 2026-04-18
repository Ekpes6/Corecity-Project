-- ─────────────────────────────────────────────────────────────────────────────
-- CoreCity — Database Migration v4
-- Changes:
--   1. Enforce DB-level unique constraint on users.phone (guard against
--      concurrent duplicate registrations that slip through app-layer checks)
-- ─────────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- MySQL 8.0 does not support ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS.
-- Use a prepared statement that checks information_schema first.
SET @exist := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = 'corecity_db'
    AND table_name   = 'users'
    AND index_name   = 'uq_users_phone'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE users ADD CONSTRAINT uq_users_phone UNIQUE (phone)',
  'SELECT ''uq_users_phone already exists, skipping''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
