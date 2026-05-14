-- Migration v11: Seller Disbursement Tracking
-- Adds three columns to `commissions` so admin can record that the
-- property-value portion (90% of the buyer's payment) has been
-- manually transferred to the seller's bank account.
--
-- seller_paid    — 0 = pending disbursement, 1 = bank transfer sent
-- seller_paid_at — timestamp when admin marked it paid
-- seller_note    — optional reference / memo added by admin (e.g. bank transfer ref)
--
-- Run against corecity_db

USE corecity_db;

ALTER TABLE commissions
    ADD COLUMN seller_paid     TINYINT(1)   NOT NULL DEFAULT 0    AFTER status,
    ADD COLUMN seller_paid_at  DATETIME     DEFAULT NULL          AFTER seller_paid,
    ADD COLUMN seller_note     VARCHAR(500) DEFAULT NULL          AFTER seller_paid_at;
