-- ─────────────────────────────────────────
-- CPI TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cpi_data (
    id           SERIAL PRIMARY KEY,
    category     VARCHAR(100) NOT NULL,
    segment      VARCHAR(50)  NOT NULL DEFAULT 'combined',
    state        VARCHAR(100) NOT NULL DEFAULT 'National',
    month        INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year         INT NOT NULL CHECK (year BETWEEN 2010 AND 2100),
    value        DECIMAL(10, 2),
    mom_change   DECIMAL(10, 2),
    yoy_change   DECIMAL(10, 2),
    moving_avg   DECIMAL(10, 2),
    created_at   TIMESTAMP DEFAULT NOW(),

    -- Prevents duplicate rows when scraper runs multiple times
    UNIQUE(category, segment, state, month, year)
);

-- ─────────────────────────────────────────
-- WRI TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wri_data (
    id                 SERIAL PRIMARY KEY,
    sector             VARCHAR(100) NOT NULL,
    month              INT CHECK (month BETWEEN 1 AND 12),
    year               INT NOT NULL,
    quarter            INT CHECK (quarter BETWEEN 1 AND 4),
    wri_value          DECIMAL(10, 2),
    real_wage_growth   DECIMAL(10, 2),
    status             VARCHAR(20)
                       CHECK (status IN ('improving', 'declining', 'neutral')),
    created_at         TIMESTAMP DEFAULT NOW(),

    UNIQUE(sector, year, quarter)
);

-- ─────────────────────────────────────────
-- PRICE TRACKER TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_tracker (
    id           SERIAL PRIMARY KEY,
    product      VARCHAR(100) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    price        DECIMAL(10, 2) NOT NULL,
    recorded_at  DATE NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW(),

    UNIQUE(product, city, recorded_at)
);

-- ─────────────────────────────────────────
-- INDEXES for faster queries from the API
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cpi_year_month
    ON cpi_data(year, month);

CREATE INDEX IF NOT EXISTS idx_cpi_category
    ON cpi_data(category, segment, state);

CREATE INDEX IF NOT EXISTS idx_wri_year
    ON wri_data(year, sector);

CREATE INDEX IF NOT EXISTS idx_prices_product
    ON price_tracker(product, city, recorded_at);