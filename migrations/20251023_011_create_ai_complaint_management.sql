-- Migration: Create AI-driven complaint management system
-- Assumes existing tables: patients(id BIGINT), users(id BIGINT)

CREATE TYPE complaint_category AS ENUM (
    'billing', 'service_quality', 'medical_care', 'staff_behavior', 
    'facilities', 'appointment', 'communication', 'other'
);

CREATE TYPE complaint_status AS ENUM (
    'open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled'
);

CREATE TYPE urgency_level AS ENUM (
    'low', 'medium', 'high', 'critical'
);

CREATE TYPE escalation_status AS ENUM (
    'pending', 'in_progress', 'escalated', 'resolved', 'cancelled'
);

CREATE TYPE sla_status AS ENUM (
    'on_track', 'at_risk', 'breached', 'resolved'
);

-- Complaints table with AI-powered features
CREATE TABLE IF NOT EXISTS complaints (
    id BIGSERIAL PRIMARY KEY,
    complaint_number TEXT UNIQUE NOT NULL, -- Auto-generated complaint ID
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Basic complaint information
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category complaint_category NOT NULL,
    subcategory TEXT,
    
    -- AI-powered analysis
    urgency_score DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- 0.00 to 1.00
    urgency_level urgency_level NOT NULL DEFAULT 'medium',
    ai_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- AI confidence score
    sentiment_score DECIMAL(3,2), -- -1.00 to 1.00 (negative to positive)
    keywords TEXT[], -- AI-extracted keywords
    entities JSONB, -- Named entities (people, places, amounts, dates)
    
    -- Assignment and workflow
    status complaint_status NOT NULL DEFAULT 'open',
    assigned_staff_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_role TEXT, -- 'supervisor', 'manager', 'specialist'
    priority INTEGER NOT NULL DEFAULT 0, -- 0-10 scale
    
    -- SLA tracking
    sla_deadline TIMESTAMPTZ,
    sla_category TEXT, -- 'response', 'resolution', 'follow_up'
    sla_status sla_status NOT NULL DEFAULT 'on_track',
    
    -- Escalation tracking
    escalation_level INTEGER NOT NULL DEFAULT 0,
    escalation_reason TEXT,
    escalated_at TIMESTAMPTZ,
    escalated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Resolution tracking
    resolution_notes TEXT,
    resolution_category TEXT, -- 'resolved', 'partially_resolved', 'unresolved'
    customer_satisfaction_score INTEGER, -- 1-5 scale
    resolution_time_hours DECIMAL(5,2),
    
    -- Source and tracking
    source_channel TEXT NOT NULL DEFAULT 'web_portal', -- 'web', 'phone', 'email', 'walk_in'
    source_reference TEXT, -- External reference number
    tags TEXT[], -- User-defined tags
    
    -- Audit fields
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT chk_urgency_score CHECK (urgency_score >= 0.00 AND urgency_score <= 1.00),
    CONSTRAINT chk_ai_confidence CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00),
    CONSTRAINT chk_sentiment_score CHECK (sentiment_score >= -1.00 AND sentiment_score <= 1.00),
    CONSTRAINT chk_priority CHECK (priority >= 0 AND priority <= 10),
    CONSTRAINT chk_satisfaction_score CHECK (customer_satisfaction_score IS NULL OR (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5)),
    CONSTRAINT chk_resolution_time CHECK (resolution_time_hours IS NULL OR resolution_time_hours >= 0)
);

-- Complaint attachments table
CREATE TABLE IF NOT EXISTS complaint_attachments (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'document', 'audio', 'video'
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT, -- For duplicate detection
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_evidence BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_file_size CHECK (file_size > 0),
    CONSTRAINT chk_file_path CHECK (file_path != '')
);

-- Escalation workflows table
CREATE TABLE IF NOT EXISTS escalation_workflows (
    id BIGSERIAL PRIMARY KEY,
    workflow_name TEXT NOT NULL,
    complaint_type complaint_category NOT NULL,
    escalation_level INTEGER NOT NULL,
    assigned_role TEXT NOT NULL, -- 'supervisor', 'manager', 'director', 'specialist'
    time_limit_hours INTEGER NOT NULL,
    auto_escalate BOOLEAN NOT NULL DEFAULT TRUE,
    escalation_conditions JSONB, -- Conditions for auto-escalation
    notification_template TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_escalation_level CHECK (escalation_level > 0),
    CONSTRAINT chk_time_limit CHECK (time_limit_hours > 0),
    CONSTRAINT chk_workflow_name CHECK (workflow_name != '')
);

-- SLA tracking table
CREATE TABLE IF NOT EXISTS sla_tracking (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    sla_category TEXT NOT NULL, -- 'response', 'resolution', 'follow_up'
    start_time TIMESTAMPTZ NOT NULL,
    target_time TIMESTAMPTZ NOT NULL,
    actual_time TIMESTAMPTZ,
    status sla_status NOT NULL DEFAULT 'on_track',
    breach_reason TEXT,
    breach_duration_minutes INTEGER,
    severity_level TEXT, -- 'minor', 'major', 'critical'
    corrective_actions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_target_time CHECK (target_time > start_time),
    CONSTRAINT chk_breach_duration CHECK (breach_duration_minutes IS NULL OR breach_duration_minutes >= 0)
);

-- AI analysis history table
CREATE TABLE IF NOT EXISTS ai_analysis_history (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL, -- 'categorization', 'urgency_scoring', 'sentiment_analysis'
    input_text TEXT NOT NULL,
    ai_model_version TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    analysis_result JSONB NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    CONSTRAINT chk_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0)
);

-- Staff workload tracking table
CREATE TABLE IF NOT EXISTS staff_workload (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_complaints INTEGER NOT NULL DEFAULT 0,
    open_complaints INTEGER NOT NULL DEFAULT 0,
    resolved_complaints INTEGER NOT NULL DEFAULT 0,
    avg_resolution_time_hours DECIMAL(5,2),
    workload_score DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- 0.00 to 1.00
    expertise_areas TEXT[], -- Areas of expertise
    max_daily_capacity INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_workload_score CHECK (workload_score >= 0.00 AND workload_score <= 1.00),
    CONSTRAINT chk_max_capacity CHECK (max_daily_capacity > 0),
    CONSTRAINT chk_resolution_time CHECK (avg_resolution_time_hours IS NULL OR avg_resolution_time_hours >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_patient ON complaints(patient_id);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_urgency ON complaints(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_staff ON complaints(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_deadline ON complaints(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_complaints_escalation_level ON complaints(escalation_level);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_urgency_level ON complaints(urgency_level);

CREATE INDEX IF NOT EXISTS idx_attachments_complaint ON complaint_attachments(complaint_id);
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON complaint_attachments(file_type);

CREATE INDEX IF NOT EXISTS idx_workflows_type_level ON escalation_workflows(complaint_type, escalation_level);
CREATE INDEX IF NOT EXISTS idx_workflows_active ON escalation_workflows(is_active);

CREATE INDEX IF NOT EXISTS idx_sla_complaint ON sla_tracking(complaint_id);
CREATE INDEX IF NOT EXISTS idx_sla_status ON sla_tracking(status);
CREATE INDEX IF NOT EXISTS idx_sla_target_time ON sla_tracking(target_time);

CREATE INDEX IF NOT EXISTS idx_ai_history_complaint ON ai_analysis_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_ai_history_type ON ai_analysis_history(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_history_created_at ON ai_analysis_history(created_at);

CREATE INDEX IF NOT EXISTS idx_workload_staff_date ON staff_workload(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_workload_score ON staff_workload(workload_score);

-- Functions for auto-generating IDs
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
    
    new_number := 'COMP-' || year_part || '-' || LPAD(sequence_part, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-generating complaint numbers
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

-- Function to calculate urgency score based on AI analysis
CREATE OR REPLACE FUNCTION calculate_urgency_score(
    description_text TEXT,
    patient_history JSONB DEFAULT NULL,
    keywords TEXT[] DEFAULT NULL
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 0.00;
    urgent_keywords TEXT[] := ARRAY['emergency', 'urgent', 'critical', 'immediate', 'asap', 'stat'];
    high_priority_keywords TEXT[] := ARRAY['serious', 'important', 'priority', 'escalate', 'manager'];
    medium_priority_keywords TEXT[] := ARRAY['concern', 'issue', 'problem', 'complaint'];
    keyword_count INTEGER;
    history_score DECIMAL(3,2) := 0.00;
BEGIN
    -- Base score from keywords
    IF keywords IS NOT NULL THEN
        -- Check for urgent keywords
        SELECT COUNT(*) INTO keyword_count
        FROM unnest(keywords) AS keyword
        WHERE keyword ILIKE ANY(urgent_keywords);
        
        IF keyword_count > 0 THEN
            score := GREATEST(score, 0.9);
        END IF;
        
        -- Check for high priority keywords
        SELECT COUNT(*) INTO keyword_count
        FROM unnest(keywords) AS keyword
        WHERE keyword ILIKE ANY(high_priority_keywords);
        
        IF keyword_count > 0 THEN
            score := GREATEST(score, 0.7);
        END IF;
        
        -- Check for medium priority keywords
        SELECT COUNT(*) INTO keyword_count
        FROM unnest(keywords) AS keyword
        WHERE keyword ILIKE ANY(medium_priority_keywords);
        
        IF keyword_count > 0 THEN
            score := GREATEST(score, 0.5);
        END IF;
    END IF;
    
    -- Adjust based on patient history
    IF patient_history IS NOT NULL THEN
        -- If patient has history of urgent complaints, increase score
        IF (patient_history->>'urgent_complaints_count')::INTEGER > 2 THEN
            history_score := 0.2;
        ELSIF (patient_history->>'urgent_complaints_count')::INTEGER > 0 THEN
            history_score := 0.1;
        END IF;
        
        score := LEAST(1.00, score + history_score);
    END IF;
    
    -- Ensure score is between 0.00 and 1.00
    score := GREATEST(0.00, LEAST(1.00, score));
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to determine urgency level from score
CREATE OR REPLACE FUNCTION determine_urgency_level(score DECIMAL(3,2))
RETURNS urgency_level AS $$
BEGIN
    IF score >= 0.8 THEN
        RETURN 'critical';
    ELSIF score >= 0.6 THEN
        RETURN 'high';
    ELSIF score >= 0.4 THEN
        RETURN 'medium';
    ELSE
        RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate SLA deadline based on urgency and category
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
    urgency_level urgency_level,
    category complaint_category,
    created_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    hours_to_add INTEGER;
BEGIN
    -- Base hours by urgency level
    CASE urgency_level
        WHEN 'critical' THEN hours_to_add := 2;
        WHEN 'high' THEN hours_to_add := 4;
        WHEN 'medium' THEN hours_to_add := 24;
        WHEN 'low' THEN hours_to_add := 72;
    END CASE;
    
    -- Adjust by category
    CASE category
        WHEN 'medical_care' THEN hours_to_add := hours_to_add / 2; -- Medical complaints get faster response
        WHEN 'billing' THEN hours_to_add := hours_to_add * 2; -- Billing complaints can wait longer
        WHEN 'staff_behavior' THEN hours_to_add := hours_to_add / 2; -- Staff issues need quick response
    END CASE;
    
    RETURN created_at + (hours_to_add || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to update SLA status
CREATE OR REPLACE FUNCTION update_sla_status()
RETURNS TRIGGER AS $$
DECLARE
    current_time TIMESTAMPTZ := NOW();
    time_remaining INTERVAL;
    hours_remaining DECIMAL(5,2);
BEGIN
    -- Only update if SLA deadline exists
    IF NEW.sla_deadline IS NOT NULL THEN
        time_remaining := NEW.sla_deadline - current_time;
        hours_remaining := EXTRACT(EPOCH FROM time_remaining) / 3600;
        
        -- Update SLA status based on time remaining
        IF hours_remaining <= 0 THEN
            NEW.sla_status := 'breached';
        ELSIF hours_remaining <= 2 THEN
            NEW.sla_status := 'at_risk';
        ELSE
            NEW.sla_status := 'on_track';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update SLA status
CREATE TRIGGER trigger_update_sla_status
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_sla_status();

-- View for urgent complaints
CREATE VIEW urgent_complaints AS
SELECT 
    c.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.phone as patient_phone,
    u.first_name || ' ' || u.last_name as assigned_staff_name,
    EXTRACT(EPOCH FROM (c.sla_deadline - NOW())) / 3600 as hours_until_deadline
FROM complaints c
JOIN patients p ON c.patient_id = p.id
LEFT JOIN users u ON c.assigned_staff_id = u.id
WHERE c.urgency_level IN ('high', 'critical')
AND c.status IN ('open', 'in_progress')
ORDER BY c.urgency_score DESC, c.sla_deadline ASC;

-- View for SLA monitoring
CREATE VIEW sla_monitoring AS
SELECT 
    c.id,
    c.complaint_number,
    c.urgency_level,
    c.sla_deadline,
    c.sla_status,
    c.assigned_staff_id,
    u.first_name || ' ' || u.last_name as assigned_staff_name,
    EXTRACT(EPOCH FROM (c.sla_deadline - NOW())) / 3600 as hours_remaining,
    CASE 
        WHEN c.sla_deadline < NOW() THEN 'breached'
        WHEN c.sla_deadline < NOW() + INTERVAL '2 hours' THEN 'at_risk'
        ELSE 'on_track'
    END as calculated_sla_status
FROM complaints c
LEFT JOIN users u ON c.assigned_staff_id = u.id
WHERE c.status IN ('open', 'in_progress')
AND c.sla_deadline IS NOT NULL
ORDER BY c.sla_deadline ASC;

-- View for complaint analytics
CREATE VIEW complaint_analytics AS
SELECT 
    DATE(created_at) as complaint_date,
    category,
    urgency_level,
    status,
    COUNT(*) as total_complaints,
    AVG(urgency_score) as avg_urgency_score,
    AVG(resolution_time_hours) as avg_resolution_time,
    AVG(customer_satisfaction_score) as avg_satisfaction_score,
    COUNT(*) FILTER (WHERE sla_status = 'breached') as sla_breaches,
    COUNT(*) FILTER (WHERE escalation_level > 0) as escalated_complaints
FROM complaints
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), category, urgency_level, status
ORDER BY complaint_date DESC;
