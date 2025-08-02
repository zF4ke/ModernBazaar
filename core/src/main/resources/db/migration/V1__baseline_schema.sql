-- V1__baseline_schema.sql
-- Baseline schema for ModernBazaar v1

CREATE TABLE public.bazaar_item (
                                    product_id         VARCHAR(255)    NOT NULL,
                                    `PRIMAR`Y KEY (product_id)
);

CREATE TABLE public.skyblock_item (
                                      id                 VARCHAR(255)    NOT NULL,
                                      category           VARCHAR(64),
                                      color              VARCHAR(32),
                                      last_refreshed     TIMESTAMP WITH TIME ZONE NOT NULL,
                                      material           VARCHAR(255),
                                      name               VARCHAR(255)    NOT NULL,
                                      npc_sell_price     DOUBLE PRECISION,
                                      stats_json         TEXT,
                                      tier               VARCHAR(32),
                                      PRIMARY KEY (id)
);

CREATE TABLE public.bazaar_product_snapshot (
                                                id                         BIGINT    NOT NULL PRIMARY KEY,
                                                product_id                 VARCHAR(255) NOT NULL,
                                                last_updated               TIMESTAMP WITH TIME ZONE NOT NULL,
                                                fetched_at                 TIMESTAMP WITH TIME ZONE NOT NULL,
                                                active_buy_orders_count    INTEGER,
                                                active_sell_orders_count   INTEGER,
                                                buy_moving_week            BIGINT,
                                                sell_moving_week           BIGINT,
                                                buy_volume                 BIGINT,
                                                sell_volume                BIGINT,
                                                weighted_two_percent_buy_price  DOUBLE PRECISION,
                                                weighted_two_percent_sell_price DOUBLE PRECISION,
                                                instant_buy_price          DOUBLE PRECISION,
                                                instant_sell_price         DOUBLE PRECISION,
                                                CONSTRAINT fk_snapshot_item FOREIGN KEY (product_id) REFERENCES public.bazaar_item(product_id)
);

CREATE TABLE public.bazaar_order_entry (
                                           id             BIGINT    NOT NULL PRIMARY KEY,
                                           side           VARCHAR(31)    NOT NULL,
                                           snapshot_id    BIGINT,
                                           hour_point_id  BIGINT,
                                           order_index    INTEGER    NOT NULL,
                                           price_per_unit DOUBLE PRECISION NOT NULL,
                                           amount         BIGINT    NOT NULL,
                                           orders         INTEGER    NOT NULL,
                                           CONSTRAINT fk_order_snapshot   FOREIGN KEY (snapshot_id)   REFERENCES public.bazaar_product_snapshot(id),
                                           CONSTRAINT fk_order_hour_point FOREIGN KEY (hour_point_id)   REFERENCES public.bazaar_hour_point(id)
);

CREATE TABLE public.bazaar_hour_summary (
                                            id                         BIGINT    NOT NULL PRIMARY KEY,
                                            product_id                 VARCHAR(255) NOT NULL,
                                            hour_start                 TIMESTAMP WITH TIME ZONE NOT NULL,
                                            open_instant_buy_price     DOUBLE PRECISION NOT NULL,
                                            close_instant_buy_price    DOUBLE PRECISION NOT NULL,
                                            min_instant_buy_price      DOUBLE PRECISION NOT NULL,
                                            max_instant_buy_price      DOUBLE PRECISION NOT NULL,
                                            open_instant_sell_price    DOUBLE PRECISION NOT NULL,
                                            close_instant_sell_price   DOUBLE PRECISION NOT NULL,
                                            min_instant_sell_price     DOUBLE PRECISION NOT NULL,
                                            max_instant_sell_price     DOUBLE PRECISION NOT NULL,
                                            new_buy_orders             BIGINT    NOT NULL,
                                            new_sell_orders            BIGINT    NOT NULL,
                                            delta_new_buy_orders       BIGINT    NOT NULL,
                                            delta_new_sell_orders      BIGINT    NOT NULL,
                                            items_listed_buy_orders    BIGINT    NOT NULL,
                                            items_listed_sell_orders   BIGINT    NOT NULL,
                                            insta_bought_items         BIGINT    NOT NULL,
                                            insta_sold_items           BIGINT    NOT NULL,
                                            CONSTRAINT fk_summary_item  FOREIGN KEY (product_id)      REFERENCES public.bazaar_item(product_id)
);

CREATE TABLE public.bazaar_hour_point (
                                          id                         BIGINT    NOT NULL PRIMARY KEY,
                                          bazaar_hour_summary        BIGINT    NOT NULL,
                                          product_id                 VARCHAR(255) NOT NULL,
                                          snapshot_time              TIMESTAMP WITH TIME ZONE NOT NULL,
                                          api_last_updated           TIMESTAMP WITH TIME ZONE NOT NULL,
                                          active_buy_orders_count    INTEGER,
                                          active_sell_orders_count   INTEGER,
                                          buy_moving_week            BIGINT,
                                          sell_moving_week           BIGINT,
                                          buy_volume                 BIGINT,
                                          sell_volume                BIGINT,
                                          weighted_two_percent_buy_price  DOUBLE PRECISION,
                                          weighted_two_percent_sell_price DOUBLE PRECISION,
                                          instant_buy_price          DOUBLE PRECISION,
                                          instant_sell_price         DOUBLE PRECISION,
                                          volatility_spike           BOOLEAN   NOT NULL,
                                          CONSTRAINT fk_hour_point_summary FOREIGN KEY (bazaar_hour_summary) REFERENCES public.bazaar_hour_summary(id),
                                          CONSTRAINT fk_hour_point_item    FOREIGN KEY (product_id)           REFERENCES public.bazaar_item(product_id)
);

-- Indexes
CREATE INDEX idx_snapshot_product ON public.bazaar_product_snapshot(product_id);
CREATE INDEX idx_snapshot_last_updated ON public.bazaar_product_snapshot(last_updated);
CREATE INDEX idx_order_snapshot ON public.bazaar_order_entry(snapshot_id);
CREATE INDEX idx_hour_summary_product ON public.bazaar_hour_summary(product_id);
CREATE INDEX idx_hour_summary_hour_start ON public.bazaar_hour_summary(hour_start);
CREATE INDEX idx_hour_point_product ON public.bazaar_hour_point(product_id);
CREATE INDEX idx_hour_point_snapshot_time ON public.bazaar_hour_point(snapshot_time);
CREATE INDEX idx_order_hour_point_id ON public.bazaar_order_entry(hour_point_id);
CREATE INDEX idx_order_side       ON public.bazaar_order_entry(side);
CREATE INDEX idx_skyblock_name   ON public.skyblock_item(name);
CREATE INDEX idx_skyblock_category ON public.skyblock_item(category);
CREATE INDEX idx_skyblock_tier     ON public.skyblock_item(tier);
