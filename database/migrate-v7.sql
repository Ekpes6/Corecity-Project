-- migrate-v7.sql
-- Add DRAFT status to property workflow.
-- DRAFT properties are invisible to admin until the owner completes the
-- full listing flow (upload + registerFiles + publish).  This prevents
-- orphaned PENDING rows appearing in the admin panel when any step fails.

ALTER TABLE properties
  MODIFY COLUMN status
    ENUM('DRAFT','PENDING','ACTIVE','ON_NEGOTIATION','SOLD','RENTED','INACTIVE','REJECTED')
    NOT NULL DEFAULT 'DRAFT';
