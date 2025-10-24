-- Migration: Create complaints table for complaint and query management
-- Assumes existing tables: patients(id BIGINT), users(id BIGINT)

CREATE TYPE complaint_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled');
CREATE TYPE complaint_urgency AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE complaint_source AS ENUM ('phone', 'email', 'web_portal', 'walk_in', 'social_media', 'mobile_app', 'kiosk', 'other');

CREATE TABLE IF NOT EXISTS complaints (
    id BIGSERIAL PRIMARY KEY,
    complaint_number TEXT UNIQUE NOT NULL, -- Human-readable complaint ID (e.g., COMP-2025-001)
    patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
    complainant_name TEXT NOT NULL, -- Name of person filing complaint
    complainant_email TEXT,
    complainant_phone TEXT,
    complainant_relationship TEXT, -- Relationship to patient (self, family, friend, etc.)
    
    -- Complaint Details
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'billing', 'medical_care', 'staff_behavior', 'facilities', 'appointment', 'other'
    subcategory TEXT, -- More specific categorization
    urgency complaint_urgency NOT NULL DEFAULT 'medium',
    priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
    
    -- Source and Channel Information
    source complaint_source NOT NULL DEFAULT 'web_portal',
    channel_details JSONB, -- Additional channel-specific information
    
    -- Status and Assignment
    status complaint_status NOT NULL DEFAULT 'open',
    assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ,
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Resolution Information
    resolution_notes TEXT,
    resolution_category TEXT, -- Type of resolution (refund, apology, service_improvement, etc.)
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    closed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- SLA Tracking
    sla_due_date TIMESTAMPTZ,
    sla_breached_at TIMESTAMPTZ,
    sla_category TEXT, -- Different SLA rules for different complaint types
    
    -- Escalation Information
    escalation_level INTEGER NOT NULL DEFAULT 0,
    escalated_at TIMESTAMPTZ,
    escalated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    escalation_reason TEXT,
    
    -- Additional Metadata
    tags TEXT[], -- Array of tags for categorization and filtering
    internal_notes TEXT, -- Internal notes not visible to complainant
    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date TIMESTAMPTZ,
    
    -- Audit Fields
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_complaint_urgency CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT chk_complaint_status CHECK (status IN ('open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled')),
    CONSTRAINT chk_priority CHECK (priority >= 0),
    CONSTRAINT chk_escalation_level CHECK (escalation_level >= 0),
    CONSTRAINT chk_resolution_dates CHECK (
        (resolved_at IS NULL OR resolved_at >= created_at) AND
        (closed_at IS NULL OR closed_at >= COALESCE(resolved_at, created_at))
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_patient ON complaints(patient_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON complaints(urgency);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_source ON complaints(source);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_date ON complaints(sla_due_date);
CREATE INDEX IF NOT EXISTS idx_complaints_escalation_level ON complaints(escalation_level);
CREATE INDEX IF NOT EXISTS idx_complaints_complaint_number ON complaints(complaint_number);

-- Function to generate complaint numbers
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    new_number TEXT;
BEGIN
    year_part := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(complaint_number FROM 'COMP-' || year_part || '-(.*)') AS INTEGER)), 0) + 1
    INTO sequence_part
    FROM complaints
    WHERE complaint_number LIKE 'COMP-' || year_part || '-%';
    
    new_number := 'COMP-' || year_part || '-' || LPAD(sequence_part, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate complaint numbers
CREATE OR REPLACE FUNCTION set_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
        NEW.complaint_number := generate_complaint_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_complaint_number
    BEFORE INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION set_complaint_number();

-- Function to update SLA due date based on urgency and category
CREATE OR REPLACE FUNCTION calculate_sla_due_date(urgency_level complaint_urgency, complaint_category TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    sla_hours INTEGER;
BEGIN
    -- Default SLA hours based on urgency
    CASE urgency_level
        WHEN 'critical' THEN sla_hours := 4;
        WHEN 'high' THEN sla_hours := 24;
        WHEN 'medium' THEN sla_hours := 72;
        WHEN 'low' THEN sla_hours := 168; -- 7 days
    END CASE;
    
    -- Adjust SLA based on category (can be customized)
    CASE complaint_category
        WHEN 'billing' THEN sla_hours := sla_hours + 24; -- Extra day for billing complaints
        WHEN 'medical_care' THEN sla_hours := sla_hours - 12; -- Faster response for medical care
        ELSE NULL; -- No adjustment
    END CASE;
    
    RETURN NOW() + (sla_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set SLA due date on insert/update
CREATE OR REPLACE FUNCTION set_sla_due_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'open' AND (NEW.sla_due_date IS NULL OR OLD.urgency != NEW.urgency OR OLD.category != NEW.category) THEN
        NEW.sla_due_date := calculate_sla_due_date(NEW.urgency, NEW.category);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_sla_due_date
    BEFORE INSERT OR UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION set_sla_due_date();
