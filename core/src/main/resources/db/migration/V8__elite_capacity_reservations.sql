CREATE TABLE IF NOT EXISTS elite_checkout_reservation (
    user_id    varchar(100) PRIMARY KEY,
    expires_at timestamptz  NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_elite_reservation_expires
    ON elite_checkout_reservation (expires_at);
