-- Credora FP&A Engine Database Schema
-- Migration 001: Initial Schema
-- Requirements: 1.1

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- TOKENS TABLE (OAuth tokens - encrypted)
-- ============================================
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT[],
    platform_user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_tokens_user_platform ON tokens(user_id, platform);

-- ============================================
-- PRODUCTS TABLE (SKUs)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_product_id VARCHAR(255),
    sku VARCHAR(255),
    name VARCHAR(500),
    unit_cost DECIMAL(15, 2),
    selling_price DECIMAL(15, 2),
    inventory_quantity INTEGER DEFAULT 0,
    category VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, platform_product_id)
);

CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(user_id, sku);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(user_id, platform);

-- ============================================
-- CAMPAIGNS TABLE (Ad campaigns)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_campaign_id VARCHAR(255),
    name VARCHAR(500),
    status VARCHAR(50),
    budget DECIMAL(15, 2),
    spend DECIMAL(15, 2) DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(15, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform, platform_campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform ON campaigns(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(user_id, status);

-- ============================================
-- TRANSACTIONS TABLE (Normalized transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    platform_id VARCHAR(255),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    amount_usd DECIMAL(15, 2),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER,
    cost_per_unit DECIMAL(15, 2),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    customer_id VARCHAR(255),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_platform ON transactions(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign ON transactions(campaign_id);

-- ============================================
-- PNL_REPORTS TABLE (Cached P&L calculations)
-- ============================================
CREATE TABLE IF NOT EXISTS pnl_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    revenue DECIMAL(15, 2),
    refunds DECIMAL(15, 2),
    net_revenue DECIMAL(15, 2),
    cogs DECIMAL(15, 2),
    gross_profit DECIMAL(15, 2),
    ad_spend DECIMAL(15, 2),
    other_expenses DECIMAL(15, 2),
    operating_costs DECIMAL(15, 2),
    net_profit DECIMAL(15, 2),
    gross_margin DECIMAL(5, 4),
    net_margin DECIMAL(5, 4),
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_pnl_user_dates ON pnl_reports(user_id, start_date, end_date);

-- ============================================
-- FORECASTS TABLE (Cash flow forecasts)
-- ============================================
CREATE TABLE IF NOT EXISTS forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    forecast_date DATE NOT NULL,
    forecast_days INTEGER NOT NULL,
    current_cash DECIMAL(15, 2),
    burn_rate DECIMAL(15, 2),
    runway_days INTEGER,
    low_scenario DECIMAL(15, 2),
    mid_scenario DECIMAL(15, 2),
    high_scenario DECIMAL(15, 2),
    forecast_points JSONB,
    confidence_level DECIMAL(3, 2),
    data_days_used INTEGER,
    warning_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecasts_user ON forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(user_id, forecast_date);

-- ============================================
-- EXCHANGE_RATES TABLE (Currency conversion)
-- ============================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_from VARCHAR(3) NOT NULL,
    currency_to VARCHAR(3) NOT NULL DEFAULT 'USD',
    rate DECIMAL(15, 6) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(currency_from, currency_to, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(currency_from, currency_to, effective_date);

-- ============================================
-- CAMPAIGN_PRODUCT_LINKS TABLE (Ad attribution)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_product_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attributed_spend DECIMAL(15, 2) DEFAULT 0,
    attributed_conversions INTEGER DEFAULT 0,
    attributed_revenue DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_product_campaign ON campaign_product_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_product_product ON campaign_product_links(product_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tokens_updated_at ON tokens;
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaign_product_links_updated_at ON campaign_product_links;
CREATE TRIGGER update_campaign_product_links_updated_at BEFORE UPDATE ON campaign_product_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRANSACTION TYPE ENUM VALUES (for reference)
-- ============================================
-- Valid transaction types:
-- 'order'           - Revenue from sales
-- 'refund'          - Refunded orders
-- 'ad_spend'        - Advertising expenses (Meta, Google)
-- 'expense'         - Other operating expenses
-- 'payout'          - Platform payouts received
-- 'inventory_cost'  - Inventory purchase costs
