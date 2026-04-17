-- ─────────────────────────────────────────────────────────────────────────
-- CoreCity v3 Migration — Subscription/Loan Spec Implementation
-- Run ONCE on VPS before redeploying user-service and property-service.
-- Safe to re-run: MODIFY COLUMN is idempotent; CREATE TABLE IF NOT EXISTS.
-- ─────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- ─── 1. agent_subscriptions: add FAILED status ───────────────────────────
ALTER TABLE agent_subscriptions
    MODIFY COLUMN status
        ENUM('PENDING_PAYMENT','ACTIVE','EXPIRED','CANCELLED','FAILED')
        NOT NULL DEFAULT 'PENDING_PAYMENT';

-- ─── 2. agent_loans: add PENDING status (new default), add trial columns ─
ALTER TABLE agent_loans
    MODIFY COLUMN status
        ENUM('PENDING','ACTIVE','REPAID','DEFAULTED')
        NOT NULL DEFAULT 'PENDING';

-- Add trial_number if it doesn't exist
SET @col_trial = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='corecity_db' AND TABLE_NAME='agent_loans' AND COLUMN_NAME='trial_number');
SET @sql_trial = IF(@col_trial=0,
    'ALTER TABLE agent_loans ADD COLUMN trial_number INT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql_trial; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add loan_program_id if it doesn't exist
SET @col_prog = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='corecity_db' AND TABLE_NAME='agent_loans' AND COLUMN_NAME='loan_program_id');
SET @sql_prog = IF(@col_prog=0,
    'ALTER TABLE agent_loans ADD COLUMN loan_program_id BIGINT NULL',
    'SELECT 1');
PREPARE stmt FROM @sql_prog; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ─── 3. Create loan_programs table (13-trial cycle tracker) ──────────────
CREATE TABLE IF NOT EXISTS loan_programs (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id                    BIGINT NOT NULL UNIQUE,
    current_level               ENUM('BASIC','STANDARD','PREMIUM','COMPLETED') NOT NULL DEFAULT 'BASIC',
    basic_trials_completed      INT NOT NULL DEFAULT 0,
    standard_trials_completed   INT NOT NULL DEFAULT 0,
    premium_trials_completed    INT NOT NULL DEFAULT 0,
    program_status              ENUM('ACTIVE','COMPLETED') NOT NULL DEFAULT 'ACTIVE',
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- ─── Verification ─────────────────────────────────────────────────────────
-- SELECT COUNT(*) FROM loan_programs;        -- should be 0 (empty new table)
-- DESCRIBE agent_loans;                      -- should show trial_number, loan_program_id
-- DESCRIBE agent_subscriptions;             -- status should include FAILED
