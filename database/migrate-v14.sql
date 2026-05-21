-- Migration v14: Email Verification Token
-- Adds email_verified flag and email_verification_token to users table.
-- Existing accounts are treated as email-verified (email_verified = 1)
-- so no disruption to active users.

USE corecity_db;

ALTER TABLE users
    ADD COLUMN email_verified           TINYINT(1)   NOT NULL DEFAULT 1
        COMMENT '1 = email confirmed, 0 = pending verification',
    ADD COLUMN email_verification_token VARCHAR(64)  NULL
        COMMENT 'UUID token sent in the verification link; NULL after verified';

-- All existing users are considered verified
UPDATE users SET email_verified = 1 WHERE email_verified = 1;

-- Index for fast token lookups on the verify endpoint
CREATE INDEX idx_users_verification_token ON users (email_verification_token);
