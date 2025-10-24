-- Migration: Create comprehensive appointment scheduling system
-- Assumes existing tables: users(id BIGINT), locations(id BIGINT)

CREATE TYPE appointment_type AS ENUM ('online', 'walkin', 'kiosk', 'emergency', 'follow_up');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partial');
CREATE TYPE queue_status AS ENUM ('waiting', 'called', 'in_consultation', 'completed', 'cancelled');

-- Patients table (extended for appointment system)
CREATE TABLE IF NOT EXISTS patients (
    id BIGSERIAL PRIMARY KEY,
    patient_number TEXT UNIQUE NOT NULL, -- Auto-generated patient ID
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    medical_history JSONB, -- Store medical conditions, allergies, medications
    insurance_provider TEXT,
    insurance_number TEXT,
    preferred_language TEXT DEFAULT 'english',
    communication_preferences JSONB, -- SMS, email, phone preferences
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_patient_number CHECK (patient_number != ''),
    CONSTRAINT chk_phone_format CHECK (phone ~ '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT chk_email_format CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id BIGSERIAL PRIMARY KEY,
    appointment_number TEXT UNIQUE NOT NULL, -- Auto-generated appointment ID
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    appointment_type appointment_type NOT NULL DEFAULT 'online',
    scheduled_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
    queue_token TEXT, -- For walk-in appointments
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_method TEXT, -- 'cash', 'card', 'insurance', 'online'
    payment_reference TEXT, -- Transaction ID or reference
    
    -- Appointment details
    reason_for_visit TEXT,
    symptoms TEXT,
    urgency_level TEXT CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
    special_requirements TEXT, -- Accessibility needs, interpreter, etc.
    notes TEXT, -- Doctor's notes
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date TIMESTAMPTZ,
    
    -- Online booking specific
    booking_source TEXT, -- 'website', 'mobile_app', 'phone', 'kiosk'
    booking_reference TEXT, -- Reference from booking system
    confirmation_sent BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_appointment_number CHECK (appointment_number != ''),
    CONSTRAINT chk_duration CHECK (duration_minutes > 0),
    CONSTRAINT chk_priority CHECK (priority >= 0),
    CONSTRAINT chk_payment_amount CHECK (payment_amount >= 0),
    CONSTRAINT chk_scheduled_date CHECK (scheduled_date > created_at)
);

-- Doctor availability table
CREATE TABLE IF NOT EXISTS availability (
    id BIGSERIAL PRIMARY KEY,
    doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_patients_per_slot INTEGER NOT NULL DEFAULT 1,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    break_start_time TIME,
    break_end_time TIME,
    notes TEXT, -- Reason for unavailability
    
    -- Recurring availability
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly'
    recurrence_end_date DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_time_slots CHECK (end_time > start_time),
    CONSTRAINT chk_slot_duration CHECK (slot_duration_minutes > 0),
    CONSTRAINT chk_max_patients CHECK (max_patients_per_slot > 0),
    CONSTRAINT chk_break_times CHECK (
        (break_start_time IS NULL AND break_end_time IS NULL) OR
        (break_start_time IS NOT NULL AND break_end_time IS NOT NULL AND break_end_time > break_start_time)
    )
);

-- Queue management table
CREATE TABLE IF NOT EXISTS queue_management (
    id BIGSERIAL PRIMARY KEY,
    token_number TEXT UNIQUE NOT NULL,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    current_status queue_status NOT NULL DEFAULT 'waiting',
    priority_score INTEGER NOT NULL DEFAULT 0, -- AI-calculated priority
    estimated_wait_time_minutes INTEGER,
    actual_wait_time_minutes INTEGER,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_time TIMESTAMPTZ,
    consultation_start_time TIMESTAMPTZ,
    consultation_end_time TIMESTAMPTZ,
    
    -- Queue position and management
    queue_position INTEGER,
    estimated_consultation_time TIMESTAMPTZ,
    special_requirements TEXT,
    notes TEXT,
    
    -- AI prioritization data
    ai_priority_factors JSONB, -- Factors used for AI prioritization
    medical_urgency_score INTEGER DEFAULT 0,
    wait_time_score INTEGER DEFAULT 0,
    patient_satisfaction_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_token_number CHECK (token_number != ''),
    CONSTRAINT chk_priority_score CHECK (priority_score >= 0),
    CONSTRAINT chk_wait_time CHECK (estimated_wait_time_minutes IS NULL OR estimated_wait_time_minutes >= 0),
    CONSTRAINT chk_actual_wait_time CHECK (actual_wait_time_minutes IS NULL OR actual_wait_time_minutes >= 0),
    CONSTRAINT chk_queue_position CHECK (queue_position IS NULL OR queue_position > 0)
);

-- Appointment reminders table
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('sms', 'email', 'call', 'push')),
    scheduled_time TIMESTAMPTZ NOT NULL,
    sent_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    message_content TEXT,
    delivery_status TEXT, -- 'delivered', 'failed', 'pending'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_retry_count CHECK (retry_count >= 0)
);

-- Offline sync log table
CREATE TABLE IF NOT EXISTS offline_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('appointment', 'patient', 'queue')),
    record_id BIGINT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    data JSONB NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
    conflict_resolution TEXT,
    sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    server_timestamp TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT chk_device_id CHECK (device_id != ''),
    CONSTRAINT chk_record_id CHECK (record_id > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(appointment_type);
CREATE INDEX IF NOT EXISTS idx_appointments_queue_token ON appointments(queue_token);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_number ON appointments(appointment_number);

CREATE INDEX IF NOT EXISTS idx_availability_doctor_date ON availability(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON availability(is_available);

CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue_management(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue_management(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_management(current_status);
CREATE INDEX IF NOT EXISTS idx_queue_priority ON queue_management(priority_score);
CREATE INDEX IF NOT EXISTS idx_queue_token ON queue_management(token_number);
CREATE INDEX IF NOT EXISTS idx_queue_check_in ON queue_management(check_in_time);

CREATE INDEX IF NOT EXISTS idx_reminders_appointment ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON appointment_reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON appointment_reminders(status);

CREATE INDEX IF NOT EXISTS idx_sync_device ON offline_sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_type ON offline_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_status ON offline_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON offline_sync_logs(sync_timestamp);

-- Functions for auto-generating IDs
CREATE OR REPLACE FUNCTION generate_patient_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    new_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(patient_number FROM 'PAT-' || year_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM patients
    WHERE patient_number LIKE 'PAT-' || year_part || '-%';
    
    new_number := 'PAT-' || year_part || '-' || LPAD(sequence_part, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_appointment_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    new_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(appointment_number FROM 'APT-' || year_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM appointments
    WHERE appointment_number LIKE 'APT-' || year_part || '-%';
    
    new_number := 'APT-' || year_part || '-' || LPAD(sequence_part, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_queue_token()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_part TEXT;
    new_token TEXT;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get next sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(token_number FROM date_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM queue_management
    WHERE token_number LIKE date_part || '-%';
    
    new_token := date_part || '-' || LPAD(sequence_part, 3, '0');
    
    RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- Triggers for auto-generating IDs
CREATE OR REPLACE FUNCTION set_patient_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.patient_number IS NULL OR NEW.patient_number = '' THEN
        NEW.patient_number := generate_patient_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_appointment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.appointment_number IS NULL OR NEW.appointment_number = '' THEN
        NEW.appointment_number := generate_appointment_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_queue_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.token_number IS NULL OR NEW.token_number = '' THEN
        NEW.token_number := generate_queue_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_patient_number
    BEFORE INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION set_patient_number();

CREATE TRIGGER trigger_set_appointment_number
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION set_appointment_number();

CREATE TRIGGER trigger_set_queue_token
    BEFORE INSERT ON queue_management
    FOR EACH ROW
    EXECUTE FUNCTION set_queue_token();

-- Function to calculate queue position
CREATE OR REPLACE FUNCTION calculate_queue_position(doctor_id_param BIGINT)
RETURNS VOID AS $$
DECLARE
    queue_record RECORD;
    position INTEGER := 1;
BEGIN
    -- Update queue positions for a specific doctor
    FOR queue_record IN 
        SELECT id FROM queue_management 
        WHERE doctor_id = doctor_id_param 
        AND current_status = 'waiting'
        ORDER BY priority_score DESC, check_in_time ASC
    LOOP
        UPDATE queue_management 
        SET queue_position = position
        WHERE id = queue_record.id;
        
        position := position + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to estimate wait time
CREATE OR REPLACE FUNCTION estimate_wait_time(queue_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
    queue_record queue_management%ROWTYPE;
    avg_consultation_time INTEGER := 30; -- Default 30 minutes
    people_ahead INTEGER;
    estimated_minutes INTEGER;
BEGIN
    -- Get queue record
    SELECT * INTO queue_record FROM queue_management WHERE id = queue_id;
    
    -- Count people ahead in queue
    SELECT COUNT(*) INTO people_ahead
    FROM queue_management
    WHERE doctor_id = queue_record.doctor_id
    AND current_status = 'waiting'
    AND (priority_score > queue_record.priority_score OR 
         (priority_score = queue_record.priority_score AND check_in_time < queue_record.check_in_time));
    
    -- Calculate estimated wait time
    estimated_minutes := people_ahead * avg_consultation_time;
    
    -- Update the record
    UPDATE queue_management 
    SET estimated_wait_time_minutes = estimated_minutes
    WHERE id = queue_id;
    
    RETURN estimated_minutes;
END;
$$ LANGUAGE plpgsql;

-- View for current queue status
CREATE VIEW current_queue_status AS
SELECT 
    qm.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    u.first_name || ' ' || u.last_name as doctor_name,
    a.appointment_number,
    a.reason_for_visit
FROM queue_management qm
JOIN patients p ON qm.patient_id = p.id
JOIN users u ON qm.doctor_id = u.id
LEFT JOIN appointments a ON qm.appointment_id = a.id
WHERE qm.current_status IN ('waiting', 'called', 'in_consultation')
ORDER BY qm.doctor_id, qm.priority_score DESC, qm.check_in_time ASC;

-- View for appointment statistics
CREATE VIEW appointment_stats AS
SELECT 
    DATE(scheduled_date) as appointment_date,
    doctor_id,
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_show_appointments,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
FROM appointments
WHERE scheduled_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(scheduled_date), doctor_id
ORDER BY appointment_date DESC;
