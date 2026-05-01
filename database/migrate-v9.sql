-- ─────────────────────────────────────────────────────────────────────────────
-- Migration v9: Property lifecycle tracking + SHORTLET status
-- Run BEFORE deploying the new property-service and transaction-service builds.
-- ─────────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- 1. Add SHORTLET to the properties.status ENUM column
SET @has_shortlet = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'properties'
      AND COLUMN_NAME  = 'status'
      AND COLUMN_TYPE LIKE '%SHORTLET%'
);
SET @sql = IF(@has_shortlet = 0,
    "ALTER TABLE properties MODIFY COLUMN status ENUM('DRAFT','PENDING','ACTIVE','ON_NEGOTIATION','SOLD','RENTED','SHORTLET','INACTIVE','REJECTED') DEFAULT 'DRAFT'",
    "SELECT 'SHORTLET already in properties.status ENUM' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Create the property_lifecycle table (post-transaction occupancy timer)
CREATE TABLE IF NOT EXISTS property_lifecycle (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  property_id  BIGINT       NOT NULL,
  user_id      BIGINT       NOT NULL,
  type         VARCHAR(20)  NOT NULL,                   -- PURCHASE | RENT | SHORTLET
  start_time   DATETIME     NOT NULL,
  end_time     DATETIME     NULL,                       -- NULL for PURCHASE (no expiry)
  status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | EXPIRED
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lifecycle_property FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- 3. Add optional lease_days column to transactions (rental duration stored at payment time)
SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'transactions'
      AND COLUMN_NAME  = 'lease_days'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE transactions ADD COLUMN lease_days INT NULL",
    "SELECT 'lease_days already exists' AS info"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
