-- Migration: Create escalation_rules table for automated escalation workflows
-- Assumes existing tables: complaints(id BIGINT), users(id BIGINT)

CREATE TYPE escalation_trigger AS ENUM ('time_based', 'status_based', 'manual', 'sla_breach', 'priority_based');
CREATE TYPE escalation_action AS ENUM ('assign_to_user', 'assign_to_role', 'notify_user', 'notify_role', 'change_status', 'change_priority', 'create_task', 'send_email', 'create_alert');
CREATE TYPE rule_status AS ENUM ('active', 'inactive', 'draft');

CREATE TABLE IF NOT EXISTS escalation_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_name TEXT NOT NULL,
    description TEXT,
    
    -- Rule Configuration
    trigger_type escalation_trigger NOT NULL,
    trigger_conditions JSONB NOT NULL, -- Conditions that must be met for escalation
    escalation_actions JSONB NOT NULL, -- Actions to take when escalated
    
    -- Rule Scope
    applies_to_categories TEXT[], -- Which complaint categories this rule applies to
    applies_to_urgencies complaint_urgency[], -- Which urgency levels this rule applies to
    applies_to_sources complaint_source[], -- Which sources this rule applies to
    
    -- Timing Configuration
    trigger_delay_hours INTEGER NOT NULL DEFAULT 0, -- Hours to wait before triggering
    cooldown_hours INTEGER NOT NULL DEFAULT 24, -- Hours to wait before re-escalating same complaint
    max_escalations INTEGER NOT NULL DEFAULT 3, -- Maximum number of escalations per complaint
    
    -- Rule Status and Metadata
    status rule_status NOT NULL DEFAULT 'active',
    priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
    is_system_rule BOOLEAN NOT NULL DEFAULT FALSE, -- System-generated vs user-created
    
    -- Audit Fields
    created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_trigger_delay CHECK (trigger_delay_hours >= 0),
    CONSTRAINT chk_cooldown CHECK (cooldown_hours >= 0),
    CONSTRAINT chk_max_escalations CHECK (max_escalations > 0),
    CONSTRAINT chk_priority CHECK (priority >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_status ON escalation_rules(status);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_trigger_type ON escalation_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_priority ON escalation_rules(priority);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_categories ON escalation_rules USING GIN(applies_to_categories);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_urgencies ON escalation_rules USING GIN(applies_to_urgencies);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_sources ON escalation_rules USING GIN(applies_to_sources);

-- Table to track escalation history
CREATE TABLE IF NOT EXISTS complaint_escalations (
    id BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    escalation_rule_id BIGINT NOT NULL REFERENCES escalation_rules(id) ON DELETE CASCADE,
    
    -- Escalation Details
    escalation_level INTEGER NOT NULL, -- Level of escalation (1, 2, 3, etc.)
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger_reason TEXT NOT NULL, -- Why this escalation was triggered
    
    -- Actions Taken
    actions_taken JSONB NOT NULL, -- Details of actions that were executed
    success BOOLEAN NOT NULL DEFAULT TRUE, -- Whether escalation was successful
    error_message TEXT, -- Error message if escalation failed
    
    -- Assignment Information
    previous_assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    new_assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Audit Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_escalation_level CHECK (escalation_level > 0)
);

-- Indexes for escalation history
CREATE INDEX IF NOT EXISTS idx_escalations_complaint ON complaint_escalations(complaint_id);
CREATE INDEX IF NOT EXISTS idx_escalations_rule ON complaint_escalations(escalation_rule_id);
CREATE INDEX IF NOT EXISTS idx_escalations_triggered_at ON complaint_escalations(triggered_at);
CREATE INDEX IF NOT EXISTS idx_escalations_level ON complaint_escalations(escalation_level);
CREATE INDEX IF NOT EXISTS idx_escalations_success ON complaint_escalations(success);

-- Function to check if escalation conditions are met
CREATE OR REPLACE FUNCTION check_escalation_conditions(
    complaint_id_param BIGINT,
    rule_id_param BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    complaint_record complaints%ROWTYPE;
    rule_record escalation_rules%ROWTYPE;
    conditions_met BOOLEAN := TRUE;
    category_match BOOLEAN := FALSE;
    urgency_match BOOLEAN := FALSE;
    source_match BOOLEAN := FALSE;
BEGIN
    -- Get complaint and rule details
    SELECT * INTO complaint_record FROM complaints WHERE id = complaint_id_param;
    SELECT * INTO rule_record FROM escalation_rules WHERE id = rule_id_param;
    
    -- Check if rule is active
    IF rule_record.status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    -- Check category match
    IF rule_record.applies_to_categories IS NULL OR array_length(rule_record.applies_to_categories, 1) IS NULL THEN
        category_match := TRUE;
    ELSE
        category_match := complaint_record.category = ANY(rule_record.applies_to_categories);
    END IF;
    
    -- Check urgency match
    IF rule_record.applies_to_urgencies IS NULL OR array_length(rule_record.applies_to_urgencies, 1) IS NULL THEN
        urgency_match := TRUE;
    ELSE
        urgency_match := complaint_record.urgency = ANY(rule_record.applies_to_urgencies);
    END IF;
    
    -- Check source match
    IF rule_record.applies_to_sources IS NULL OR array_length(rule_record.applies_to_sources, 1) IS NULL THEN
        source_match := TRUE;
    ELSE
        source_match := complaint_record.source = ANY(rule_record.applies_to_sources);
    END IF;
    
    -- All conditions must be met
    conditions_met := category_match AND urgency_match AND source_match;
    
    RETURN conditions_met;
END;
$$ LANGUAGE plpgsql;

-- Function to check cooldown period
CREATE OR REPLACE FUNCTION check_escalation_cooldown(
    complaint_id_param BIGINT,
    rule_id_param BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    rule_record escalation_rules%ROWTYPE;
    last_escalation TIMESTAMPTZ;
    cooldown_end TIMESTAMPTZ;
BEGIN
    -- Get rule details
    SELECT * INTO rule_record FROM escalation_rules WHERE id = rule_id_param;
    
    -- Get last escalation for this complaint and rule
    SELECT MAX(triggered_at) INTO last_escalation
    FROM complaint_escalations
    WHERE complaint_id = complaint_id_param AND escalation_rule_id = rule_id_param;
    
    -- If no previous escalation, cooldown is not active
    IF last_escalation IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Calculate cooldown end time
    cooldown_end := last_escalation + (rule_record.cooldown_hours || ' hours')::INTERVAL;
    
    -- Check if cooldown period has passed
    RETURN NOW() >= cooldown_end;
END;
$$ LANGUAGE plpgsql;

-- Function to check maximum escalations
CREATE OR REPLACE FUNCTION check_max_escalations(
    complaint_id_param BIGINT,
    rule_id_param BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
    rule_record escalation_rules%ROWTYPE;
    escalation_count INTEGER;
BEGIN
    -- Get rule details
    SELECT * INTO rule_record FROM escalation_rules WHERE id = rule_id_param;
    
    -- Count existing escalations for this complaint and rule
    SELECT COUNT(*) INTO escalation_count
    FROM complaint_escalations
    WHERE complaint_id = complaint_id_param AND escalation_rule_id = rule_id_param;
    
    -- Check if we've reached the maximum
    RETURN escalation_count < rule_record.max_escalations;
END;
$$ LANGUAGE plpgsql;

-- Function to execute escalation
CREATE OR REPLACE FUNCTION execute_escalation(
    complaint_id_param BIGINT,
    rule_id_param BIGINT,
    escalation_level_param INTEGER,
    trigger_reason_param TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    complaint_record complaints%ROWTYPE;
    rule_record escalation_rules%ROWTYPE;
    escalation_id BIGINT;
    action_result BOOLEAN := TRUE;
BEGIN
    -- Get complaint and rule details
    SELECT * INTO complaint_record FROM complaints WHERE id = complaint_id_param;
    SELECT * INTO rule_record FROM escalation_rules WHERE id = rule_id_param;
    
    -- Check all conditions
    IF NOT check_escalation_conditions(complaint_id_param, rule_id_param) THEN
        RETURN FALSE;
    END IF;
    
    IF NOT check_escalation_cooldown(complaint_id_param, rule_id_param) THEN
        RETURN FALSE;
    END IF;
    
    IF NOT check_max_escalations(complaint_id_param, rule_id_param) THEN
        RETURN FALSE;
    END IF;
    
    -- Create escalation record
    INSERT INTO complaint_escalations (
        complaint_id,
        escalation_rule_id,
        escalation_level,
        trigger_reason,
        previous_assigned_to,
        actions_taken
    ) VALUES (
        complaint_id_param,
        rule_id_param,
        escalation_level_param,
        trigger_reason_param,
        complaint_record.assigned_to,
        rule_record.escalation_actions
    ) RETURNING id INTO escalation_id;
    
    -- Update complaint escalation level
    UPDATE complaints 
    SET 
        escalation_level = escalation_level_param,
        escalated_at = NOW(),
        escalated_by = rule_record.created_by,
        escalation_reason = trigger_reason_param,
        updated_at = NOW()
    WHERE id = complaint_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert default escalation rules
INSERT INTO escalation_rules (rule_name, description, trigger_type, trigger_conditions, escalation_actions, applies_to_categories, applies_to_urgencies, trigger_delay_hours, is_system_rule) VALUES
(
    'Critical Urgency Auto-Escalation',
    'Automatically escalate critical urgency complaints after 2 hours',
    'time_based',
    '{"hours": 2, "status": "open"}',
    '{"action": "assign_to_role", "role": "supervisor", "notify": true}',
    ARRAY['medical_care', 'staff_behavior'],
    ARRAY['critical'],
    2,
    TRUE
),
(
    'High Priority SLA Breach Escalation',
    'Escalate when SLA is breached for high priority complaints',
    'sla_breach',
    '{"breach_threshold_minutes": 30}',
    '{"action": "assign_to_role", "role": "manager", "notify": true, "change_priority": 1}',
    NULL,
    ARRAY['high', 'critical'],
    0,
    TRUE
),
(
    'Unassigned Complaint Escalation',
    'Escalate unassigned complaints after 4 hours',
    'time_based',
    '{"hours": 4, "assigned_to": null}',
    '{"action": "assign_to_role", "role": "supervisor", "notify": true}',
    NULL,
    NULL,
    4,
    TRUE
),
(
    'Pending Customer Response Escalation',
    'Escalate complaints pending customer response after 48 hours',
    'time_based',
    '{"hours": 48, "status": "pending_customer"}',
    '{"action": "notify_role", "role": "supervisor", "send_email": true}',
    NULL,
    NULL,
    48,
    TRUE
);
