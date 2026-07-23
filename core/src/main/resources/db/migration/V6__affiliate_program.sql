-- Affiliate program infrastructure: click tracking (for CTR), a payout ledger
-- (owed / paid, with due dates), and a last-seen signal on subscriptions so we
-- can tell whether referred users actually stick around and use the product.

CREATE TABLE IF NOT EXISTS referral_click (
    id         bigserial   PRIMARY KEY,
    code       varchar(40) NOT NULL,
    clicked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_click_code ON referral_click (code);
CREATE INDEX IF NOT EXISTS idx_referral_click_time ON referral_click (clicked_at);

CREATE TABLE IF NOT EXISTS referral_payout (
    id           bigserial   PRIMARY KEY,
    code         varchar(40) NOT NULL,
    amount_cents bigint      NOT NULL,
    period_start date,
    period_end   date,
    status       varchar(20) NOT NULL DEFAULT 'pending',  -- pending | paid
    note         varchar(500),
    created_at   timestamptz NOT NULL DEFAULT now(),
    paid_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_referral_payout_code ON referral_payout (code);

ALTER TABLE user_subscription ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
