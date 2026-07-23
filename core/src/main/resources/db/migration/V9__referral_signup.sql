-- Attributed free-account signups: the funnel step between a click and a paid
-- conversion (clicks -> signups -> paid subscribers). One row per user, ever:
-- the first code that brought them in keeps the attribution.
CREATE TABLE IF NOT EXISTS referral_signup (
    id         bigserial PRIMARY KEY,
    code       varchar(40)  NOT NULL,
    user_id    varchar(100) NOT NULL UNIQUE,
    created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_signup_code ON referral_signup (code);
