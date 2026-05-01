-- Migration v10: Bank Accounts, Wallets, Wallet Transactions, Property Owner Details
-- Run against corecity_db

USE corecity_db;

-- ─────────────────────────────────────────────────────────────────────────────
-- bank_accounts
-- account_number is stored AES-256-GCM encrypted at the application layer.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT       NOT NULL,
    bank_name      VARCHAR(100) NOT NULL,
    account_number VARCHAR(500) NOT NULL, -- encrypted ciphertext
    account_name   VARCHAR(200) NOT NULL,
    is_primary     TINYINT(1)   NOT NULL DEFAULT 0,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bank_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- wallets — one wallet per user (enforced by UNIQUE on user_id)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id         BIGINT         AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT         NOT NULL UNIQUE,
    balance    DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency   VARCHAR(5)     NOT NULL DEFAULT 'NGN',
    created_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- wallet_transactions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          BIGINT         AUTO_INCREMENT PRIMARY KEY,
    wallet_id   BIGINT         NOT NULL,
    type        ENUM('CREDIT', 'DEBIT') NOT NULL,
    amount      DECIMAL(15, 2) NOT NULL,
    reference   VARCHAR(100)   NOT NULL UNIQUE,
    description VARCHAR(255),
    status      ENUM('PENDING', 'SUCCESSFUL', 'FAILED') NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_transactions_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Owner detail columns on the properties table (idempotent via IF NOT EXISTS guard)
-- ─────────────────────────────────────────────────────────────────────────────
SET @col_owner_name = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_name'
);
SET @sql_owner_name = IF(@col_owner_name = 0,
    'ALTER TABLE properties ADD COLUMN owner_name VARCHAR(200) NULL',
    'SELECT 1');
PREPARE stmt_owner_name FROM @sql_owner_name;
EXECUTE stmt_owner_name;
DEALLOCATE PREPARE stmt_owner_name;

SET @col_owner_phone = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_phone'
);
SET @sql_owner_phone = IF(@col_owner_phone = 0,
    'ALTER TABLE properties ADD COLUMN owner_phone VARCHAR(30) NULL',
    'SELECT 1');
PREPARE stmt_owner_phone FROM @sql_owner_phone;
EXECUTE stmt_owner_phone;
DEALLOCATE PREPARE stmt_owner_phone;

SET @col_owner_email = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_email'
);
SET @sql_owner_email = IF(@col_owner_email = 0,
    'ALTER TABLE properties ADD COLUMN owner_email VARCHAR(200) NULL',
    'SELECT 1');
PREPARE stmt_owner_email FROM @sql_owner_email;
EXECUTE stmt_owner_email;
DEALLOCATE PREPARE stmt_owner_email;

SET @col_owner_bank_name = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_bank_name'
);
SET @sql_owner_bank_name = IF(@col_owner_bank_name = 0,
    'ALTER TABLE properties ADD COLUMN owner_bank_name VARCHAR(100) NULL',
    'SELECT 1');
PREPARE stmt_owner_bank_name FROM @sql_owner_bank_name;
EXECUTE stmt_owner_bank_name;
DEALLOCATE PREPARE stmt_owner_bank_name;

SET @col_owner_acct_num = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_account_number'
);
SET @sql_owner_acct_num = IF(@col_owner_acct_num = 0,
    'ALTER TABLE properties ADD COLUMN owner_account_number VARCHAR(30) NULL',
    'SELECT 1');
PREPARE stmt_owner_acct_num FROM @sql_owner_acct_num;
EXECUTE stmt_owner_acct_num;
DEALLOCATE PREPARE stmt_owner_acct_num;

SET @col_owner_acct_name = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'corecity_db' AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'owner_account_name'
);
SET @sql_owner_acct_name = IF(@col_owner_acct_name = 0,
    'ALTER TABLE properties ADD COLUMN owner_account_name VARCHAR(200) NULL',
    'SELECT 1');
PREPARE stmt_owner_acct_name FROM @sql_owner_acct_name;
EXECUTE stmt_owner_acct_name;
DEALLOCATE PREPARE stmt_owner_acct_name;
