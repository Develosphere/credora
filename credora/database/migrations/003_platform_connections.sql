-- Credora FP&A Engine Database Schema
-- Migration 003: Platform Connections State
-- Requirements: Platform connection state tracking for RAG context

-- ============================================
-- PLATFORM_CONNECTIONS TABLE
-- Tracks which platforms each user has connected
-- This is separate from tokens - represents the logical connection state
-- ============================================
CREATE TABLE IF NOT EXISTS platform_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,  -- 'shopify', 'meta', 'google'
    status VARCHAR(50) NOT NULL DEFAULT 'connected',  -- 'connected', 'disconnected', 'expired', 'error'
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status VARCHAR(50),  -- 'success', 'failed', 'in_progress'
    sync_error TEXT,
    platform_account_id VARCHAR(255),  -- e.g., shop domain, ad account ID
    platform_account_name VARCHAR(255),  -- human-readable name
    data_summary JSONB,  -- summary of synced data (counts, date ranges, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_connections_user ON platform_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_status ON platform_connections(user_id, status);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_platform_connections_updated_at ON platform_connections;
CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON platform_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE platform_connections IS 'Tracks platform connection state per user for RAG context';
COMMENT ON COLUMN platform_connections.status IS 'Connection status: connected, disconnected, expired, error';
COMMENT ON COLUMN platform_connections.data_summary IS 'JSON summary of synced data for quick RAG access';
