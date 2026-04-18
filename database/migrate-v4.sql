-- ─────────────────────────────────────────────────────────────────────────────
-- CoreCity — Database Migration v4
-- Changes:
--   1. Enforce DB-level unique constraint on users.phone (guard against
--      concurrent duplicate registrations that slip through app-layer checks)
-- ─────────────────────────────────────────────────────────────────────────────

USE corecity_db;

-- The init.sql already declares phone as UNIQUE, but if any environment was
-- initialised without that DDL, this migration adds it safely.
ALTER TABLE users
    ADD CONSTRAINT IF NOT EXISTS uq_users_phone UNIQUE (phone);
