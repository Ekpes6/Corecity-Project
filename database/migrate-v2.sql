-- ─────────────────────────────────────────────────────────────────────────
-- CoreCity v2 Migration — Bid Placement Policy
-- Run this ONCE against the live corecity_db.
-- Safe to re-run: IF NOT EXISTS / IF EXISTS guards used throughout.
-- ─────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- ─── 1. Users: add reputation columns ────────────────────────────────────
-- Using INFORMATION_SCHEMA check because MySQL does not support ADD COLUMN IF NOT EXISTS
SET @col1 = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='corecity_db' AND TABLE_NAME='users' AND COLUMN_NAME='reputation_score');
SET @sql1 = IF(@col1=0,
    'ALTER TABLE users ADD COLUMN reputation_score INT NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE s FROM @sql1; EXECUTE s; DEALLOCATE PREPARE s;

SET @col2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='corecity_db' AND TABLE_NAME='users' AND COLUMN_NAME='is_executive_agent');
SET @sql2 = IF(@col2=0,
    'ALTER TABLE users ADD COLUMN is_executive_agent BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1');
PREPARE s FROM @sql2; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 2. Properties: add ON_NEGOTIATION to status ENUM ────────────────────
ALTER TABLE properties
    MODIFY COLUMN status ENUM(
        'PENDING','ACTIVE','ON_NEGOTIATION','SOLD','RENTED','INACTIVE','REJECTED'
    ) DEFAULT 'PENDING';

-- ─── 3. Transactions: add new transaction types ───────────────────────────
ALTER TABLE transactions
    MODIFY COLUMN type ENUM(
        'RENT','PURCHASE','INSPECTION_FEE','AGENT_FEE',
        'RESERVATION_FEE','SUBSCRIPTION','LOAN_REPAYMENT'
    ) NOT NULL;

-- ─── 4. Reservations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id       BIGINT NOT NULL,
    customer_id       BIGINT NOT NULL,
    payment_reference VARCHAR(100) NOT NULL UNIQUE,
    authorization_url VARCHAR(500),
    status            ENUM('PENDING_PAYMENT','ACTIVE','EXPIRED','COMPLETED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    paid_at           TIMESTAMP NULL,
    expires_at        TIMESTAMP NULL,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (customer_id) REFERENCES users(id)
);

-- ─── 5. Agent Subscriptions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id          BIGINT NOT NULL,
    plan              ENUM('BASIC','STANDARD','PREMIUM','EXECUTIVE') NOT NULL,
    amount_paid       DECIMAL(15,2) NOT NULL,
    payment_reference VARCHAR(100) UNIQUE,
    authorization_url VARCHAR(500),
    start_date        DATE,
    end_date          DATE,
    status            ENUM('PENDING_PAYMENT','ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    is_loan           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- ─── 6. Agent Loans ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_loans (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id        BIGINT NOT NULL,
    subscription_id BIGINT,
    plan            ENUM('BASIC','STANDARD','PREMIUM','EXECUTIVE') NOT NULL,
    loan_amount     DECIMAL(15,2) NOT NULL,
    amount_repaid   DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    due_date        DATE NOT NULL,
    status          ENUM('ACTIVE','REPAID','DEFAULTED') NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id),
    FOREIGN KEY (subscription_id) REFERENCES agent_subscriptions(id)
);

-- ─── 7. Reputation Events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reputation_events (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id       BIGINT NOT NULL,
    source_user_id BIGINT,
    source         ENUM('CUSTOMER_FEEDBACK','SYSTEM_VALIDATION') NOT NULL,
    points         INT NOT NULL DEFAULT 0,
    reference_id   BIGINT,
    comment        VARCHAR(500),
    is_negative    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- Rename column if table was created with old name 'negative' instead of 'is_negative'
SET @has_negative = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='corecity_db' AND TABLE_NAME='reputation_events' AND COLUMN_NAME='negative');
SET @fix_negative = IF(@has_negative=1,
    'ALTER TABLE reputation_events CHANGE COLUMN `negative` is_negative BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT 1');
PREPARE s FROM @fix_negative; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── 8. Commissions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    transaction_id      BIGINT NOT NULL UNIQUE,
    property_id         BIGINT NOT NULL,
    agent_id            BIGINT,
    property_value      DECIMAL(15,2) NOT NULL,
    corecity_commission DECIMAL(15,2) NOT NULL,
    agent_commission    DECIMAL(15,2) NOT NULL,
    total_commission    DECIMAL(15,2) NOT NULL,
    overall_cost        DECIMAL(15,2) NOT NULL,
    status              ENUM('PENDING','DISBURSED') NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id),
    FOREIGN KEY (property_id)    REFERENCES properties(id)
);
