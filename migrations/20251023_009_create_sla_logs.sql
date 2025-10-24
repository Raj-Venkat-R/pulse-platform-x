-- Migration: Create sla_logs table for SLA breach tracking and monitoring
-- Assumes existing tables: complaints(id BIGINT), users(id BIGINT)

CREATE TYPE sla_status AS ENUM ('on_track', 'at_risk', 'breached', 'resolved', 'cancelled');
CREATE TYPE sla_metric AS ENUM ('first_response', 'resolution', 'customer_satisfaction', 'escalation_time');

CREATE TABLE IF NOT EXISTS sla_logs (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    
    -- SLA Configuration
    sla_category TEXT NOT NULL, -- e.g., 'standard', 'priority', 'critical', 'billing'
    metric_type sla_metric NOT NULL,
    target_hours INTEGER NOT NULL, -- Target SLA in hours
    target_minutes INTEGER NOT NULL DEFAULT 0, -- Additional minutes for precision
    
    -- SLA Tracking
    sla_start_time TIMESTAMPTZ NOT NULL, -- When SLA clock started
    sla_due_time TIMESTAMPTZ NOT NULL, -- When SLA is due
    sla_end_time TIMESTAMPTZ, -- When SLA was actually completed
    sla_status sla_status NOT NULL DEFAULT 'on_track',
    
    -- Breach Information
    breached_at TIMESTAMPTZ, -- When SLA was breached
    breach_duration_minutes INTEGER, -- How long it was breached
    breach_severity TEXT, -- 'minor', 'moderate', 'severe', 'critical'
    
    -- Resolution Information
    resolved_at TIMESTAMPTZ, -- When SLA was resolved
    resolution_time_minutes INTEGER, -- Total time taken to resolve
    resolution_method TEXT, -- How it was resolved
    
    -- Performance Metrics
    response_time_minutes INTEGER, -- Time to first response
    resolution_time_minutes INTEGER, -- Time to resolution
    customer_satisfaction_score INTEGER, -- 1-5 rating
    escalation_count INTEGER NOT NULL DEFAULT 0, -- Number of escalations
    
    -- Additional Metadata
    notes TEXT, -- Additional notes about SLA performance
    corrective_actions TEXT[], -- Actions taken to prevent future breaches
    root_cause TEXT, -- Root cause analysis
    
    -- Audit Fields
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_target_hours CHECK (target_hours >= 0),
    CONSTRAINT chk_target_minutes CHECK (target_minutes >= 0 AND target_minutes < 60),
    CONSTRAINT chk_breach_duration CHECK (breach_duration_minutes >= 0),
    CONSTRAINT chk_resolution_time CHECK (resolution_time_minutes >= 0),
    CONSTRAINT chk_response_time CHECK (response_time_minutes >= 0),
    CONSTRAINT chk_satisfaction_score CHECK (customer_satisfaction_score >= 1 AND customer_satisfaction_score <= 5),
    CONSTRAINT chk_escalation_count CHECK (escalation_count >= 0),
    CONSTRAINT chk_sla_times CHECK (
        sla_due_time > sla_start_time AND
        (sla_end_time IS NULL OR sla_end_time >= sla_start_time) AND
        (resolved_at IS NULL OR resolved_at >= sla_start_time)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sla_logs_complaint ON sla_logs(complaint_id);
CREATE INDEX IF NOT EXISTS idx_sla_logs_status ON sla_logs(sla_status);
CREATE INDEX IF NOT EXISTS idx_sla_logs_category ON sla_logs(sla_category);
CREATE INDEX IF NOT EXISTS idx_sla_logs_metric_type ON sla_logs(metric_type);
CREATE INDEX IF NOT EXISTS idx_sla_logs_due_time ON sla_logs(sla_due_time);
CREATE INDEX IF NOT EXISTS idx_sla_logs_breached_at ON sla_logs(breached_at);
CREATE INDEX IF NOT EXISTS idx_sla_logs_breach_severity ON sla_logs(breach_severity);
CREATE INDEX IF NOT EXISTS idx_sla_logs_created_at ON sla_logs(created_at);

-- Table for SLA breach notifications
CREATE TABLE IF NOT EXISTS sla_breach_notifications (
    id BIGSERIAL PRIMARY KEY,
    sla_log_id BIGINT NOT NULL REFERENCES sla_logs(id) ON DELETE CASCADE,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type TEXT NOT NULL, -- 'breach_alert', 'breach_warning', 'resolution_notification'
    notification_level TEXT NOT NULL, -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    
    -- Recipients
    notified_users BIGINT[] NOT NULL, -- Array of user IDs who were notified
    notified_roles TEXT[] NOT NULL, -- Array of roles that were notified
    
    -- Delivery Information
    delivery_method TEXT NOT NULL, -- 'email', 'sms', 'push', 'dashboard'
    delivery_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    delivered_at TIMESTAMPTZ,
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_delivery_attempts CHECK (delivery_attempts >= 0)
);

-- Indexes for breach notifications
CREATE INDEX IF NOT EXISTS idx_breach_notifications_sla_log ON sla_breach_notifications(sla_log_id);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_complaint ON sla_breach_notifications(complaint_id);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_type ON sla_breach_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_status ON sla_breach_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_created_at ON sla_breach_notifications(created_at);

-- Function to calculate SLA status
CREATE OR REPLACE FUNCTION calculate_sla_status(
    sla_due_time TIMESTAMPTZ,
    sla_end_time TIMESTAMPTZ DEFAULT NULL,
    current_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS sla_status AS $$
DECLARE
    time_remaining INTERVAL;
    time_remaining_minutes INTEGER;
BEGIN
    -- If SLA is already completed
    IF sla_end_time IS NOT NULL THEN
        IF sla_end_time <= sla_due_time THEN
            RETURN 'resolved';
        ELSE
            RETURN 'breached';
        END IF;
    END IF;
    
    -- Calculate time remaining
    time_remaining := sla_due_time - current_time;
    time_remaining_minutes := EXTRACT(EPOCH FROM time_remaining) / 60;
    
    -- Determine status based on time remaining
    IF time_remaining_minutes <= 0 THEN
        RETURN 'breached';
    ELSIF time_remaining_minutes <= 60 THEN -- Less than 1 hour remaining
        RETURN 'at_risk';
    ELSE
        RETURN 'on_track';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to create SLA log entry
CREATE OR REPLACE FUNCTION create_sla_log(
    complaint_id_param BIGINT,
    sla_category_param TEXT,
    metric_type_param sla_metric,
    target_hours_param INTEGER,
    target_minutes_param INTEGER DEFAULT 0,
    sla_start_time_param TIMESTAMPTZ DEFAULT NOW()
) RETURNS BIGINT AS $$
DECLARE
    sla_log_id BIGINT;
    sla_due_time TIMESTAMPTZ;
BEGIN
    -- Calculate SLA due time
    sla_due_time := sla_start_time_param + (target_hours_param || ' hours')::INTERVAL + (target_minutes_param || ' minutes')::INTERVAL;
    
    -- Create SLA log entry
    INSERT INTO sla_logs (
        complaint_id,
        sla_category,
        metric_type,
        target_hours,
        target_minutes,
        sla_start_time,
        sla_due_time,
        sla_status
    ) VALUES (
        complaint_id_param,
        sla_category_param,
        metric_type_param,
        target_hours_param,
        target_minutes_param,
        sla_start_time_param,
        sla_due_time,
        calculate_sla_status(sla_due_time)
    ) RETURNING id INTO sla_log_id;
    
    RETURN sla_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update SLA status
CREATE OR REPLACE FUNCTION update_sla_status(sla_log_id_param BIGINT) RETURNS VOID AS $$
DECLARE
    sla_record sla_logs%ROWTYPE;
    new_status sla_status;
    breach_duration INTEGER;
BEGIN
    -- Get SLA record
    SELECT * INTO sla_record FROM sla_logs WHERE id = sla_log_id_param;
    
    -- Calculate new status
    new_status := calculate_sla_status(sla_record.sla_due_time, sla_record.sla_end_time);
    
    -- Calculate breach duration if breached
    IF new_status = 'breached' AND sla_record.sla_status != 'breached' THEN
        breach_duration := EXTRACT(EPOCH FROM (NOW() - sla_record.sla_due_time)) / 60;
        
        -- Update with breach information
        UPDATE sla_logs 
        SET 
            sla_status = new_status,
            breached_at = NOW(),
            breach_duration_minutes = breach_duration,
            breach_severity = CASE 
                WHEN breach_duration <= 60 THEN 'minor'
                WHEN breach_duration <= 240 THEN 'moderate' -- 4 hours
                WHEN breach_duration <= 1440 THEN 'severe' -- 24 hours
                ELSE 'critical'
            END,
            updated_at = NOW()
        WHERE id = sla_log_id_param;
        
        -- Create breach notification
        INSERT INTO sla_breach_notifications (
            sla_log_id,
            complaint_id,
            notification_type,
            notification_level,
            message,
            notified_users,
            notified_roles,
            delivery_method
        ) VALUES (
            sla_log_id_param,
            sla_record.complaint_id,
            'breach_alert',
            CASE 
                WHEN breach_duration <= 60 THEN 'warning'
                WHEN breach_duration <= 240 THEN 'warning'
                ELSE 'critical'
            END,
            'SLA breach detected for complaint ' || sla_record.complaint_id || '. Breach duration: ' || breach_duration || ' minutes.',
            ARRAY[]::BIGINT[],
            ARRAY['supervisor', 'manager'],
            'email'
        );
    ELSE
        -- Update status only
        UPDATE sla_logs 
        SET 
            sla_status = new_status,
            updated_at = NOW()
        WHERE id = sla_log_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve SLA
CREATE OR REPLACE FUNCTION resolve_sla(
    sla_log_id_param BIGINT,
    resolution_method_param TEXT DEFAULT 'manual',
    satisfaction_score_param INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    sla_record sla_logs%ROWTYPE;
    resolution_time INTEGER;
BEGIN
    -- Get SLA record
    SELECT * INTO sla_record FROM sla_logs WHERE id = sla_log_id_param;
    
    -- Calculate resolution time
    resolution_time := EXTRACT(EPOCH FROM (NOW() - sla_record.sla_start_time)) / 60;
    
    -- Update SLA record
    UPDATE sla_logs 
    SET 
        sla_status = CASE 
            WHEN NOW() <= sla_record.sla_due_time THEN 'resolved'
            ELSE 'breached'
        END,
        sla_end_time = NOW(),
        resolved_at = NOW(),
        resolution_time_minutes = resolution_time,
        resolution_method = resolution_method_param,
        customer_satisfaction_score = satisfaction_score_param,
        updated_at = NOW()
    WHERE id = sla_log_id_param;
    
    -- Create resolution notification if it was breached
    IF sla_record.sla_status = 'breached' THEN
        INSERT INTO sla_breach_notifications (
            sla_log_id,
            complaint_id,
            notification_type,
            notification_level,
            message,
            notified_users,
            notified_roles,
            delivery_method,
            delivery_status,
            delivered_at
        ) VALUES (
            sla_log_id_param,
            sla_record.complaint_id,
            'resolution_notification',
            'info',
            'SLA breach resolved for complaint ' || sla_record.complaint_id || '. Resolution time: ' || resolution_time || ' minutes.',
            ARRAY[]::BIGINT[],
            ARRAY['supervisor'],
            'email',
            'sent',
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update SLA status when complaint status changes
CREATE OR REPLACE FUNCTION trigger_update_sla_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update SLA status for all active SLA logs for this complaint
    UPDATE sla_logs 
    SET sla_status = calculate_sla_status(sla_due_time, sla_end_time)
    WHERE complaint_id = NEW.id AND sla_status NOT IN ('resolved', 'cancelled');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_complaint_sla_update
    AFTER UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_sla_status();

-- View for active SLA monitoring
CREATE VIEW active_sla_monitoring AS
SELECT 
    sl.*,
    c.complaint_number,
    c.subject,
    c.urgency,
    c.status as complaint_status,
    c.assigned_to,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    CASE 
        WHEN sl.sla_status = 'breached' THEN 'CRITICAL'
        WHEN sl.sla_status = 'at_risk' THEN 'WARNING'
        ELSE 'OK'
    END as alert_level
FROM sla_logs sl
JOIN complaints c ON sl.complaint_id = c.id
LEFT JOIN users u ON c.assigned_to = u.id
WHERE sl.sla_status IN ('on_track', 'at_risk', 'breached');

-- Function to get SLA performance statistics
CREATE OR REPLACE FUNCTION get_sla_performance_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    total_slas BIGINT,
    resolved_on_time BIGINT,
    breached_slas BIGINT,
    average_resolution_time NUMERIC,
    breach_rate NUMERIC,
    satisfaction_average NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_slas,
        COUNT(*) FILTER (WHERE sla_status = 'resolved' AND sla_end_time <= sla_due_time) as resolved_on_time,
        COUNT(*) FILTER (WHERE sla_status = 'breached') as breached_slas,
        AVG(resolution_time_minutes) as average_resolution_time,
        ROUND(
            (COUNT(*) FILTER (WHERE sla_status = 'breached')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
        ) as breach_rate,
        AVG(customer_satisfaction_score) as satisfaction_average
    FROM sla_logs
    WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;
