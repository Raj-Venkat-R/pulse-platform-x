-- Migration: Create availability_slots table
-- Tracks bookable time slots per provider/service/location

CREATE TABLE IF NOT EXISTS availability_slots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id BIGINT REFERENCES services(id) ON DELETE SET NULL,
    location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1, -- number of concurrent bookings allowed
    reserved_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    recurrence_rule TEXT, -- optional RRULE (iCal format) for repeating schedules
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_availability_time CHECK (end_time > start_time),
    CONSTRAINT chk_capacity CHECK (capacity >= 1),
    CONSTRAINT chk_reserved_le_capacity CHECK (reserved_count <= capacity)
);

CREATE INDEX IF NOT EXISTS idx_availability_user_time ON availability_slots(user_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_availability_location_time ON availability_slots(location_id, start_time);
CREATE INDEX IF NOT EXISTS idx_availability_service ON availability_slots(service_id);
CREATE INDEX IF NOT EXISTS idx_availability_active ON availability_slots(is_active);


