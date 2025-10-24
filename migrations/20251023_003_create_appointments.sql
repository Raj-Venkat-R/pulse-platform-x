-- Migration: Create appointments and appointment_reminders tables
-- Assumes existing tables: patients(id BIGINT), users(id BIGINT)

CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE appointment_type AS ENUM ('online', 'offline', 'walk_in', 'kiosk');

CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    availability_slot_id BIGINT REFERENCES availability_slots(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    checkin_time TIMESTAMPTZ,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    appointment_type appointment_type NOT NULL DEFAULT 'online',
    source TEXT, -- channel information (web, mobile, kiosk, call-center)
    reason TEXT,
    notes TEXT,
    queue_token_id BIGINT, -- set after token issuance for walk-ins
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_appt_time CHECK (scheduled_end > scheduled_start)
);

-- FK to queue_tokens will be added after queue_tokens table creation to avoid dependency loop

CREATE INDEX IF NOT EXISTS idx_appointments_patient_time ON appointments(patient_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_time ON appointments(provider_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_location ON appointments(location_id);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type);

-- Appointment Reminders (SMS/Email/Push)
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS appointment_reminders (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- sms, email, push, call
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status reminder_status NOT NULL DEFAULT 'pending',
    payload JSONB, -- message body or provider payload
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_status_time ON appointment_reminders(status, scheduled_at);


