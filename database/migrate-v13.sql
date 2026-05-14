-- CoreCity Migration v13: Account Suspension & Termination (Section 8.1)
-- Adds status columns to the users table to support admin suspension/termination.

ALTER TABLE users
  ADD COLUMN account_status   VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                               COMMENT 'ACTIVE | SUSPENDED | TERMINATED',
  ADD COLUMN suspension_reason VARCHAR(20)  NULL
                               COMMENT 'BREACH | FRAUD | REGULATORY | INACTIVITY',
  ADD COLUMN suspension_note  TEXT         NULL
                               COMMENT 'Admin-facing note explaining the action',
  ADD COLUMN funds_withheld   TINYINT(1)   NOT NULL DEFAULT 0
                               COMMENT '1 when pending funds are frozen pending investigation',
  ADD COLUMN suspended_at     DATETIME     NULL
                               COMMENT 'Timestamp of suspension/termination',
  ADD COLUMN suspended_by_admin_id BIGINT  NULL
                               COMMENT 'FK to users.id of the admin who performed the action';

-- Index for fast admin queries filtering by status
CREATE INDEX idx_users_account_status ON users (account_status);
