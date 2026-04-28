-- ─────────────────────────────────────────────────────────────────────────
-- CoreCity — Database Migration v5
-- Changes:
--   1. Ensure authorization_url column exists on agent_subscriptions.
--      (Already present in init.sql and migrate-v2.sql — this is a safe
--      idempotent guard for any edge-case DB that may be missing it.)
--   2. Add 'DRAFT' to properties.status ENUM
--      (Java entity defaults new properties to DRAFT; DB was missing this value,
--       causing every property creation to fail with a MySQL data truncation error)
--   3. Add 'OVERDUE' to agent_loans.status ENUM
--      (LoanStatus.OVERDUE exists in Java entity but was absent from the DB ENUM)
-- Safe to re-run: MODIFY COLUMN is idempotent; uses information_schema checks.
-- ─────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- ─── 1. agent_subscriptions.authorization_url ────────────────────────────────
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

-- ─── 2. properties.status — add DRAFT ────────────────────────────────────────
ALTER TABLE properties
    MODIFY COLUMN status
        ENUM('DRAFT','PENDING','ACTIVE','ON_NEGOTIATION','SOLD','RENTED','INACTIVE','REJECTED')
        DEFAULT 'DRAFT';

-- ─── 3. agent_loans.status — add OVERDUE ─────────────────────────────────────
ALTER TABLE agent_loans
    MODIFY COLUMN status
        ENUM('PENDING','ACTIVE','REPAID','OVERDUE','DEFAULTED')
        NOT NULL DEFAULT 'PENDING';

-- ─── Verification ─────────────────────────────────────────────────────────────
-- Run these to confirm:
--   SHOW COLUMNS FROM properties LIKE 'status';
--   SHOW COLUMNS FROM agent_loans LIKE 'status';
