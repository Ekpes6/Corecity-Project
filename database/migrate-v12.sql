-- migrate-v12.sql
-- Adds seller_role to commissions so we know whether to apply agent (7%/3%)
-- or seller/owner (5%/5%) commission rates when computing disbursement amounts.
-- Existing rows default to 'AGENT' which matches the original 7%/3% behavior.

ALTER TABLE commissions
    ADD COLUMN seller_role VARCHAR(20) NOT NULL DEFAULT 'AGENT' AFTER agent_commission;
