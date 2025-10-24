-- Migration: Create queue_tokens for walk-ins and kiosks

CREATE TYPE queue_channel AS ENUM ('walk_in', 'kiosk', 'reception');
CREATE TYPE queue_status AS ENUM ('waiting', 'called', 'in_service', 'completed', 'skipped', 'cancelled');

CREATE TABLE IF NOT EXISTS queue_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_number INTEGER NOT NULL, -- daily sequence per location/service
    token_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    provider_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
    channel queue_channel NOT NULL DEFAULT 'walk_in',
    status queue_status NOT NULL DEFAULT 'waiting',
    priority INTEGER NOT NULL DEFAULT 0, -- higher means higher priority
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_queue_daily UNIQUE (token_date, location_id, service_id, token_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_location_date ON queue_tokens(location_id, token_date);
CREATE INDEX IF NOT EXISTS idx_queue_status_priority ON queue_tokens(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_provider ON queue_tokens(provider_id);
CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue_tokens(patient_id);

-- Now add FK from appointments.queue_token_id to queue_tokens
ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_queue_token
    FOREIGN KEY (queue_token_id)
    REFERENCES queue_tokens(id)
    ON DELETE SET NULL;


