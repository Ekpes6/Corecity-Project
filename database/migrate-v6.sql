-- migrate-v6.sql
-- Loan flow redesign: add repayment tracking columns and OVERDUE loan status.
-- Safe to run multiple times (uses information_schema checks).

-- ── 1. Add repayment_status column to agent_loans ──────────────────────────
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'agent_loans'
      AND COLUMN_NAME  = 'repayment_status'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE agent_loans ADD COLUMN repayment_status ENUM('PENDING','SUCCESS','FAILED') NOT NULL DEFAULT 'PENDING' AFTER status",
    "SELECT 'repayment_status already exists' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 2. Add repayment_reference column to agent_loans ───────────────────────
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'agent_loans'
      AND COLUMN_NAME  = 'repayment_reference'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE agent_loans ADD COLUMN repayment_reference VARCHAR(100) NULL AFTER repayment_status",
    "SELECT 'repayment_reference already exists' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 3. Add repayment_authorization_url column to agent_loans ───────────────
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'agent_loans'
      AND COLUMN_NAME  = 'repayment_authorization_url'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE agent_loans ADD COLUMN repayment_authorization_url VARCHAR(512) NULL AFTER repayment_reference",
    "SELECT 'repayment_authorization_url already exists' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 4. Add OVERDUE to agent_loans status ENUM ─────────────────────────────
-- Check if OVERDUE is already in the ENUM
SET @has_overdue = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA  = DATABASE()
      AND TABLE_NAME    = 'agent_loans'
      AND COLUMN_NAME   = 'status'
      AND COLUMN_TYPE LIKE '%OVERDUE%'
);
SET @sql = IF(@has_overdue = 0,
    "ALTER TABLE agent_loans MODIFY COLUMN status ENUM('PENDING','ACTIVE','REPAID','OVERDUE','DEFAULTED') NOT NULL DEFAULT 'PENDING'",
    "SELECT 'OVERDUE already in agent_loans.status ENUM' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── 5. Clean up orphaned PENDING subscriptions and loans (pre-redesign rows) ─
-- Mark old PENDING_PAYMENT loan-based subs as CANCELLED (no Paystack URL = never completed)
UPDATE agent_subscriptions
SET status = 'CANCELLED'
WHERE status = 'PENDING_PAYMENT'
  AND loan = 1
  AND (authorization_url IS NULL OR authorization_url = '');

-- Mark legacy PENDING loans as DEFAULTED (loan program not started)
UPDATE agent_loans
SET status = 'DEFAULTED'
WHERE status = 'PENDING';
