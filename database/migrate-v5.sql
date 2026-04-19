-- ─────────────────────────────────────────────────────────────────────────
-- CoreCity — Database Migration v5
-- Changes:
--   1. Ensure authorization_url column exists on agent_subscriptions.
--      (Already present in init.sql and migrate-v2.sql — this is a safe
--      idempotent guard for any edge-case DB that may be missing it.)
-- Safe to re-run: uses information_schema check.
-- ─────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- Add authorization_url only if it is missing (MySQL 8.0-safe approach)
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'corecity_db'
    AND TABLE_NAME   = 'agent_subscriptions'
    AND COLUMN_NAME  = 'authorization_url'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE agent_subscriptions ADD COLUMN authorization_url VARCHAR(512) NULL AFTER payment_reference',
  'SELECT ''authorization_url already exists, skipping''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
