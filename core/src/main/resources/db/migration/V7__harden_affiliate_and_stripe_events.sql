-- Financial and attribution hardening.

ALTER TABLE referral_click ADD COLUMN IF NOT EXISTS visitor_key varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_click_code_visitor
    ON referral_click (code, visitor_key)
    WHERE visitor_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_event (
    event_id      varchar(255) PRIMARY KEY,
    event_type    varchar(100) NOT NULL,
    status        varchar(20)  NOT NULL,
    attempt_count integer      NOT NULL DEFAULT 1,
    received_at   timestamptz  NOT NULL DEFAULT now(),
    processed_at  timestamptz,
    last_error    varchar(1000),
    CONSTRAINT ck_stripe_webhook_event_status
        CHECK (status IN ('processing', 'processed', 'failed'))
);

CREATE TABLE IF NOT EXISTS referral_earning (
    id                 bigserial PRIMARY KEY,
    stripe_invoice_id  varchar(255) NOT NULL UNIQUE,
    stripe_charge_id   varchar(255),
    code               varchar(40)  NOT NULL,
    referred_user_id   varchar(100) NOT NULL,
    currency           varchar(8)   NOT NULL,
    net_revenue_cents  bigint       NOT NULL,
    refunded_cents     bigint       NOT NULL DEFAULT 0,
    commission_cents   bigint       NOT NULL,
    occurred_at        timestamptz   NOT NULL,
    eligible_at        timestamptz   NOT NULL,
    status             varchar(20)   NOT NULL DEFAULT 'earned',
    created_at         timestamptz   NOT NULL DEFAULT now(),
    updated_at         timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT ck_referral_earning_amounts
        CHECK (net_revenue_cents >= 0 AND refunded_cents >= 0 AND commission_cents >= 0),
    CONSTRAINT ck_referral_earning_status
        CHECK (status IN ('earned', 'partially_refunded', 'refunded'))
);
CREATE INDEX IF NOT EXISTS idx_referral_earning_code ON referral_earning (code);
CREATE INDEX IF NOT EXISTS idx_referral_earning_eligible ON referral_earning (eligible_at);
CREATE INDEX IF NOT EXISTS idx_referral_earning_charge ON referral_earning (stripe_charge_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_payout_code_period
    ON referral_payout (code, period_start, period_end)
    WHERE period_start IS NOT NULL AND period_end IS NOT NULL;
ALTER TABLE referral_payout
    ADD CONSTRAINT ck_referral_payout_amount CHECK (amount_cents > 0);
ALTER TABLE referral_payout
    ADD CONSTRAINT ck_referral_payout_status CHECK (status IN ('pending', 'paid'));
ALTER TABLE referral_payout
    ADD CONSTRAINT ck_referral_payout_period
        CHECK (period_start IS NULL OR period_end IS NULL OR period_start <= period_end);
