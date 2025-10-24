-- Migration: Create mobile-first vitals logging system
-- Assumes existing tables: patients(id BIGINT), users(id BIGINT)

CREATE TYPE vital_status AS ENUM ('normal', 'abnormal', 'critical', 'pending');
CREATE TYPE anomaly_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'failed', 'conflict');

-- Patient vitals table
CREATE TABLE IF NOT EXISTS patient_vitals (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nurse_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Vital signs measurements
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(4,1), -- Celsius
    spo2 INTEGER, -- Oxygen saturation percentage
    respiratory_rate INTEGER,
    weight DECIMAL(5,2), -- kg
    height DECIMAL(5,2), -- cm
    bmi DECIMAL(4,1), -- Calculated BMI
    
    -- Additional measurements
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10), -- 0-10 scale
    blood_glucose DECIMAL(5,2), -- mg/dL
    blood_pressure_position TEXT CHECK (blood_pressure_position IN ('sitting', 'standing', 'lying')),
    
    -- Status and validation
    status vital_status NOT NULL DEFAULT 'pending',
    is_manual_entry BOOLEAN NOT NULL DEFAULT TRUE,
    device_id TEXT, -- For device tracking
    measurement_location TEXT, -- 'ward', 'icu', 'emergency', 'outpatient'
    
    -- Anomaly detection
    anomalies JSONB, -- Detected anomalies
    anomaly_count INTEGER DEFAULT 0,
    has_critical_anomaly BOOLEAN DEFAULT FALSE,
    
    -- Offline sync
    sync_status sync_status NOT NULL DEFAULT 'pending',
    offline_timestamp TIMESTAMPTZ,
    sync_timestamp TIMESTAMPTZ,
    device_sync_id TEXT, -- For offline sync tracking
    
    -- Quality indicators
    measurement_quality TEXT CHECK (measurement_quality IN ('excellent', 'good', 'fair', 'poor')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
    
    -- Notes and observations
    notes TEXT,
    patient_condition TEXT,
    medication_effects TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT chk_bp_systolic CHECK (bp_systolic IS NULL OR (bp_systolic >= 50 AND bp_systolic <= 300)),
    CONSTRAINT chk_bp_diastolic CHECK (bp_diastolic IS NULL OR (bp_diastolic >= 30 AND bp_diastolic <= 200)),
    CONSTRAINT chk_heart_rate CHECK (heart_rate IS NULL OR (heart_rate >= 30 AND heart_rate <= 300)),
    CONSTRAINT chk_temperature CHECK (temperature IS NULL OR (temperature >= 30.0 AND temperature <= 45.0)),
    CONSTRAINT chk_spo2 CHECK (spo2 IS NULL OR (spo2 >= 50 AND spo2 <= 100)),
    CONSTRAINT chk_respiratory_rate CHECK (respiratory_rate IS NULL OR (respiratory_rate >= 5 AND respiratory_rate <= 60)),
    CONSTRAINT chk_weight CHECK (weight IS NULL OR (weight >= 0.5 AND weight <= 500.0)),
    CONSTRAINT chk_height CHECK (height IS NULL OR (height >= 30.0 AND height <= 250.0)),
    CONSTRAINT chk_bmi CHECK (bmi IS NULL OR (bmi >= 10.0 AND bmi <= 100.0)),
    CONSTRAINT chk_blood_glucose CHECK (blood_glucose IS NULL OR (blood_glucose >= 20.0 AND blood_glucose <= 1000.0)),
    CONSTRAINT chk_bp_relationship CHECK (bp_systolic IS NULL OR bp_diastolic IS NULL OR bp_systolic > bp_diastolic)
);

-- Vital ranges table for normal/critical values
CREATE TABLE IF NOT EXISTS vital_ranges (
    id BIGSERIAL PRIMARY KEY,
    vital_type TEXT NOT NULL,
    age_group_min INTEGER,
    age_group_max INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'all')),
    condition TEXT, -- 'normal', 'diabetes', 'hypertension', 'pregnancy'
    
    -- Normal ranges
    min_normal DECIMAL(8,2) NOT NULL,
    max_normal DECIMAL(8,2) NOT NULL,
    
    -- Critical ranges
    critical_min DECIMAL(8,2),
    critical_max DECIMAL(8,2),
    
    -- Alert thresholds
    warning_min DECIMAL(8,2),
    warning_max DECIMAL(8,2),
    
    -- Units and metadata
    unit TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_normal_range CHECK (max_normal > min_normal),
    CONSTRAINT chk_critical_range CHECK (
        critical_min IS NULL OR critical_max IS NULL OR critical_max > critical_min
    ),
    CONSTRAINT chk_warning_range CHECK (
        warning_min IS NULL OR warning_max IS NULL OR warning_max > warning_min
    ),
    CONSTRAINT chk_age_group CHECK (
        age_group_min IS NULL OR age_group_max IS NULL OR age_group_max >= age_group_min
    )
);

-- Anomaly logs table
CREATE TABLE IF NOT EXISTS anomaly_logs (
    id BIGSERIAL PRIMARY KEY,
    vital_id BIGINT NOT NULL REFERENCES patient_vitals(id) ON DELETE CASCADE,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Anomaly details
    detected_anomaly TEXT NOT NULL,
    vital_type TEXT NOT NULL,
    measured_value DECIMAL(8,2) NOT NULL,
    normal_range_min DECIMAL(8,2),
    normal_range_max DECIMAL(8,2),
    deviation_percentage DECIMAL(5,2),
    
    -- Severity and classification
    severity anomaly_severity NOT NULL,
    anomaly_type TEXT, -- 'high', 'low', 'missing', 'inconsistent'
    clinical_significance TEXT, -- 'mild', 'moderate', 'severe', 'life_threatening'
    
    -- Alert management
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ,
    alert_recipients TEXT[], -- Array of user IDs or roles
    alert_acknowledged BOOLEAN DEFAULT FALSE,
    alert_acknowledged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    alert_acknowledged_at TIMESTAMPTZ,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- AI analysis
    ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0.00 AND ai_confidence <= 1.00),
    ai_recommendations TEXT,
    risk_score DECIMAL(3,2) CHECK (risk_score >= 0.00 AND risk_score <= 1.00),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_deviation_percentage CHECK (deviation_percentage IS NULL OR deviation_percentage >= 0),
    CONSTRAINT chk_ai_confidence CHECK (ai_confidence IS NULL OR (ai_confidence >= 0.00 AND ai_confidence <= 1.00)),
    CONSTRAINT chk_risk_score CHECK (risk_score IS NULL OR (risk_score >= 0.00 AND risk_score <= 1.00))
);

-- Offline sync logs for vitals
CREATE TABLE IF NOT EXISTS vitals_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    vital_id BIGINT REFERENCES patient_vitals(id) ON DELETE SET NULL,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('create', 'update', 'delete')),
    sync_data JSONB NOT NULL,
    sync_status sync_status NOT NULL DEFAULT 'pending',
    conflict_resolution TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sync_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    server_timestamp TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT chk_device_id CHECK (device_id != ''),
    CONSTRAINT chk_retry_count CHECK (retry_count >= 0)
);

-- Vital trends table for analytics
CREATE TABLE IF NOT EXISTS vital_trends (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_type TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- Daily aggregates
    min_value DECIMAL(8,2),
    max_value DECIMAL(8,2),
    avg_value DECIMAL(8,2),
    measurement_count INTEGER DEFAULT 0,
    anomaly_count INTEGER DEFAULT 0,
    
    -- Trend indicators
    trend_direction TEXT CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'volatile')),
    trend_strength DECIMAL(3,2) CHECK (trend_strength >= 0.00 AND trend_strength <= 1.00),
    
    -- Risk assessment
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_factors TEXT[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_trend_strength CHECK (trend_strength IS NULL OR (trend_strength >= 0.00 AND trend_strength <= 1.00)),
    CONSTRAINT chk_measurement_count CHECK (measurement_count >= 0),
    CONSTRAINT chk_anomaly_count CHECK (anomaly_count >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_nurse ON patient_vitals(nurse_id);
CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON patient_vitals(created_at);
CREATE INDEX IF NOT EXISTS idx_vitals_status ON patient_vitals(status);
CREATE INDEX IF NOT EXISTS idx_vitals_sync_status ON patient_vitals(sync_status);
CREATE INDEX IF NOT EXISTS idx_vitals_anomaly ON patient_vitals(has_critical_anomaly);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_timestamp ON patient_vitals(patient_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ranges_type ON vital_ranges(vital_type);
CREATE INDEX IF NOT EXISTS idx_ranges_age_gender ON vital_ranges(age_group_min, age_group_max, gender);
CREATE INDEX IF NOT EXISTS idx_ranges_active ON vital_ranges(is_active);

CREATE INDEX IF NOT EXISTS idx_anomalies_vital ON anomaly_logs(vital_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_patient ON anomaly_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomaly_logs(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_alert_sent ON anomaly_logs(alert_sent);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomaly_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomaly_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_sync_device ON vitals_sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON vitals_sync_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_timestamp ON vitals_sync_logs(sync_timestamp);

CREATE INDEX IF NOT EXISTS idx_trends_patient ON vital_trends(patient_id);
CREATE INDEX IF NOT EXISTS idx_trends_type ON vital_trends(vital_type);
CREATE INDEX IF NOT EXISTS idx_trends_date ON vital_trends(date);
CREATE INDEX IF NOT EXISTS idx_trends_risk ON vital_trends(risk_level);

-- Functions for vital calculations
CREATE OR REPLACE FUNCTION calculate_bmi(weight_kg DECIMAL, height_cm DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    IF weight_kg IS NULL OR height_cm IS NULL OR height_cm <= 0 THEN
        RETURN NULL;
    END IF;
    
    RETURN ROUND((weight_kg / POWER(height_cm / 100, 2))::DECIMAL, 1);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_bp_category(systolic INTEGER, diastolic INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF systolic IS NULL OR diastolic IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF systolic < 120 AND diastolic < 80 THEN
        RETURN 'normal';
    ELSIF systolic < 130 AND diastolic < 80 THEN
        RETURN 'elevated';
    ELSIF systolic < 140 OR diastolic < 90 THEN
        RETURN 'stage1_hypertension';
    ELSIF systolic < 180 OR diastolic < 120 THEN
        RETURN 'stage2_hypertension';
    ELSE
        RETURN 'hypertensive_crisis';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION detect_vital_anomaly(
    vital_type TEXT,
    measured_value DECIMAL,
    patient_age INTEGER,
    patient_gender TEXT
)
RETURNS JSONB AS $$
DECLARE
    range_record RECORD;
    anomaly_result JSONB := '{}';
    severity TEXT := 'normal';
    deviation DECIMAL;
BEGIN
    -- Get appropriate vital ranges
    SELECT * INTO range_record
    FROM vital_ranges
    WHERE vital_ranges.vital_type = detect_vital_anomaly.vital_type
    AND (age_group_min IS NULL OR patient_age >= age_group_min)
    AND (age_group_max IS NULL OR patient_age <= age_group_max)
    AND (gender = 'all' OR gender = patient_gender)
    AND is_active = true
    ORDER BY 
        CASE WHEN age_group_min IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN gender != 'all' THEN 1 ELSE 2 END
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN '{"error": "No vital ranges found for this patient"}';
    END IF;
    
    -- Check for critical values
    IF range_record.critical_min IS NOT NULL AND measured_value < range_record.critical_min THEN
        severity := 'critical';
        deviation := ((range_record.critical_min - measured_value) / range_record.critical_min) * 100;
    ELSIF range_record.critical_max IS NOT NULL AND measured_value > range_record.critical_max THEN
        severity := 'critical';
        deviation := ((measured_value - range_record.critical_max) / range_record.critical_max) * 100;
    -- Check for abnormal values
    ELSIF measured_value < range_record.min_normal THEN
        severity := 'abnormal';
        deviation := ((range_record.min_normal - measured_value) / range_record.min_normal) * 100;
    ELSIF measured_value > range_record.max_normal THEN
        severity := 'abnormal';
        deviation := ((measured_value - range_record.max_normal) / range_record.max_normal) * 100;
    ELSE
        severity := 'normal';
        deviation := 0;
    END IF;
    
    anomaly_result := jsonb_build_object(
        'severity', severity,
        'deviation_percentage', deviation,
        'normal_range', jsonb_build_object(
            'min', range_record.min_normal,
            'max', range_record.max_normal
        ),
        'critical_range', jsonb_build_object(
            'min', range_record.critical_min,
            'max', range_record.critical_max
        ),
        'unit', range_record.unit
    );
    
    RETURN anomaly_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate BMI automatically
CREATE OR REPLACE FUNCTION trigger_calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.weight IS NOT NULL AND NEW.height IS NOT NULL THEN
        NEW.bmi := calculate_bmi(NEW.weight, NEW.height);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bmi
    BEFORE INSERT OR UPDATE ON patient_vitals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_bmi();

-- Trigger to detect anomalies
CREATE OR REPLACE FUNCTION trigger_detect_anomalies()
RETURNS TRIGGER AS $$
DECLARE
    patient_record RECORD;
    anomaly_result JSONB;
    vital_types TEXT[] := ARRAY['bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'spo2', 'respiratory_rate'];
    vital_type TEXT;
    measured_value DECIMAL;
    anomaly_count INTEGER := 0;
    has_critical BOOLEAN := FALSE;
BEGIN
    -- Get patient information
    SELECT date_of_birth, gender INTO patient_record
    FROM patients
    WHERE id = NEW.patient_id;
    
    -- Calculate patient age
    DECLARE
        patient_age INTEGER := EXTRACT(YEAR FROM AGE(patient_record.date_of_birth));
    BEGIN
        -- Check each vital sign for anomalies
        FOREACH vital_type IN ARRAY vital_types
        LOOP
            CASE vital_type
                WHEN 'bp_systolic' THEN measured_value := NEW.bp_systolic;
                WHEN 'bp_diastolic' THEN measured_value := NEW.bp_diastolic;
                WHEN 'heart_rate' THEN measured_value := NEW.heart_rate;
                WHEN 'temperature' THEN measured_value := NEW.temperature;
                WHEN 'spo2' THEN measured_value := NEW.spo2;
                WHEN 'respiratory_rate' THEN measured_value := NEW.respiratory_rate;
            END CASE;
            
            IF measured_value IS NOT NULL THEN
                anomaly_result := detect_vital_anomaly(vital_type, measured_value, patient_age, patient_record.gender);
                
                IF (anomaly_result->>'severity') != 'normal' THEN
                    anomaly_count := anomaly_count + 1;
                    
                    -- Log the anomaly
                    INSERT INTO anomaly_logs (
                        vital_id, patient_id, detected_anomaly, vital_type,
                        measured_value, normal_range_min, normal_range_max,
                        deviation_percentage, severity, alert_sent
                    ) VALUES (
                        NEW.id, NEW.patient_id,
                        vital_type || ' anomaly: ' || (anomaly_result->>'severity'),
                        vital_type, measured_value,
                        (anomaly_result->'normal_range'->>'min')::DECIMAL,
                        (anomaly_result->'normal_range'->>'max')::DECIMAL,
                        (anomaly_result->>'deviation_percentage')::DECIMAL,
                        (anomaly_result->>'severity')::anomaly_severity,
                        (anomaly_result->>'severity') = 'critical'
                    );
                    
                    -- Set critical flag
                    IF (anomaly_result->>'severity') = 'critical' THEN
                        has_critical := TRUE;
                    END IF;
                END IF;
            END IF;
        END LOOP;
        
        -- Update anomaly information
        NEW.anomaly_count := anomaly_count;
        NEW.has_critical_anomaly := has_critical;
        NEW.status := CASE 
            WHEN has_critical THEN 'critical'::vital_status
            WHEN anomaly_count > 0 THEN 'abnormal'::vital_status
            ELSE 'normal'::vital_status
        END;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_detect_anomalies
    AFTER INSERT OR UPDATE ON patient_vitals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_detect_anomalies();

-- Insert default vital ranges
INSERT INTO vital_ranges (vital_type, age_group_min, age_group_max, gender, min_normal, max_normal, critical_min, critical_max, warning_min, warning_max, unit, description) VALUES
-- Blood Pressure (mmHg)
('bp_systolic', 18, 65, 'all', 90, 140, 70, 180, 80, 160, 'mmHg', 'Systolic Blood Pressure'),
('bp_diastolic', 18, 65, 'all', 60, 90, 40, 110, 50, 100, 'mmHg', 'Diastolic Blood Pressure'),

-- Heart Rate (bpm)
('heart_rate', 18, 65, 'all', 60, 100, 40, 150, 50, 120, 'bpm', 'Heart Rate'),
('heart_rate', 0, 17, 'all', 70, 120, 50, 180, 60, 150, 'bpm', 'Heart Rate (Pediatric)'),

-- Temperature (°C)
('temperature', 0, 120, 'all', 36.1, 37.2, 35.0, 40.0, 35.5, 38.5, '°C', 'Body Temperature'),

-- Oxygen Saturation (%)
('spo2', 0, 120, 'all', 95, 100, 90, 100, 92, 100, '%', 'Oxygen Saturation'),

-- Respiratory Rate (breaths/min)
('respiratory_rate', 18, 65, 'all', 12, 20, 8, 30, 10, 25, 'breaths/min', 'Respiratory Rate'),
('respiratory_rate', 0, 17, 'all', 16, 30, 12, 40, 14, 35, 'breaths/min', 'Respiratory Rate (Pediatric)');

-- Views for common queries
CREATE VIEW current_vital_status AS
SELECT 
    pv.*,
    p.first_name || ' ' || p.last_name as patient_name,
    p.date_of_birth,
    u.first_name || ' ' || u.last_name as nurse_name,
    EXTRACT(YEAR FROM AGE(p.date_of_birth)) as patient_age,
    calculate_bp_category(pv.bp_systolic, pv.bp_diastolic) as bp_category
FROM patient_vitals pv
JOIN patients p ON pv.patient_id = p.id
JOIN users u ON pv.nurse_id = u.id
WHERE pv.created_at >= CURRENT_DATE
ORDER BY pv.created_at DESC;

CREATE VIEW critical_anomalies AS
SELECT 
    al.*,
    p.first_name || ' ' || p.last_name as patient_name,
    pv.created_at as vital_timestamp,
    pv.bp_systolic, pv.bp_diastolic, pv.heart_rate, pv.temperature, pv.spo2
FROM anomaly_logs al
JOIN patients p ON al.patient_id = p.id
JOIN patient_vitals pv ON al.vital_id = pv.id
WHERE al.severity IN ('high', 'critical')
AND al.resolved = false
ORDER BY al.created_at DESC;

CREATE VIEW vital_trends_summary AS
SELECT 
    patient_id,
    vital_type,
    DATE(created_at) as date,
    COUNT(*) as measurement_count,
    AVG(CASE vital_type 
        WHEN 'bp_systolic' THEN bp_systolic
        WHEN 'bp_diastolic' THEN bp_diastolic
        WHEN 'heart_rate' THEN heart_rate
        WHEN 'temperature' THEN temperature
        WHEN 'spo2' THEN spo2
        WHEN 'respiratory_rate' THEN respiratory_rate
    END) as avg_value,
    MIN(CASE vital_type 
        WHEN 'bp_systolic' THEN bp_systolic
        WHEN 'bp_diastolic' THEN bp_diastolic
        WHEN 'heart_rate' THEN heart_rate
        WHEN 'temperature' THEN temperature
        WHEN 'spo2' THEN spo2
        WHEN 'respiratory_rate' THEN respiratory_rate
    END) as min_value,
    MAX(CASE vital_type 
        WHEN 'bp_systolic' THEN bp_systolic
        WHEN 'bp_diastolic' THEN bp_diastolic
        WHEN 'heart_rate' THEN heart_rate
        WHEN 'temperature' THEN temperature
        WHEN 'spo2' THEN spo2
        WHEN 'respiratory_rate' THEN respiratory_rate
    END) as max_value,
    COUNT(*) FILTER (WHERE has_critical_anomaly = true) as critical_count
FROM patient_vitals
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY patient_id, vital_type, DATE(created_at)
ORDER BY date DESC;
