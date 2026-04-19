-- migrate-v5.sql
-- Add authorization_url column to agent_subscriptions so that Paystack redirect URLs
-- are persisted and can be recovered if the gateway times out returning the initial response.
ALTER TABLE agent_subscriptions
  ADD COLUMN IF NOT EXISTS authorization_url VARCHAR(512) NULL AFTER payment_reference;
