-- Migration: Create offline_sync_logs for offline caching and synchronization

CREATE TYPE sync_entity AS ENUM ('appointment', 'queue_token', 'availability_slot');
CREATE TYPE sync_operation AS ENUM ('create', 'update', 'delete');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed');

CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type sync_entity NOT NULL,
    entity_id BIGINT, -- nullable until server assigns ID; use client_temp_id otherwise
    client_temp_id TEXT, -- UUID or temp ID used offline
    operation sync_operation NOT NULL,
    payload JSONB NOT NULL, -- the data captured offline
    location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    performed_by BIGINT REFERENCES users(id) ON DELETE SET NULL, -- staff user on device
    device_id TEXT, -- identifier for the offline device/browser
    status sync_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_entity ON offline_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_location ON offline_sync_logs(location_id);


