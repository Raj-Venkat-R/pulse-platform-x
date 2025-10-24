const { Pool } = require('pg');
const WebSocket = require('ws');

class AnomalyService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // WebSocket server for real-time alerts
    this.wss = null;
    this.clients = new Map();
  }

  async detectAnomalies(vitalId, vitalsData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get patient information for age-based analysis
      const patientQuery = `
        SELECT date_of_birth, gender 
        FROM patients 
        WHERE id = $1
      `;
      const patientResult = await client.query(patientQuery, [vitalsData.patient_id]);
      
      if (patientResult.rows.length === 0) {
        throw new Error('Patient not found');
      }

      const patient = patientResult.rows[0];
      const patientAge = this.calculateAge(patient.date_of_birth);
      const anomalies = [];

      // Check each vital sign for anomalies
      const vitalTypes = [
        { field: 'bp_systolic', type: 'bp_systolic' },
        { field: 'bp_diastolic', type: 'bp_diastolic' },
        { field: 'heart_rate', type: 'heart_rate' },
        { field: 'temperature', type: 'temperature' },
        { field: 'spo2', type: 'spo2' },
        { field: 'respiratory_rate', type: 'respiratory_rate' }
      ];

      for (const vitalType of vitalTypes) {
        const value = vitalsData[vitalType.field];
        if (value !== null && value !== undefined) {
          const anomaly = await this.checkVitalAnomaly(
            vitalType.type, 
            value, 
            patientAge, 
            patient.gender
          );

          if (anomaly && anomaly.severity !== 'normal') {
            // Log the anomaly
            const anomalyLog = await this.logAnomaly(vitalId, {
              vital_type: vitalType.type,
              measured_value: value,
              severity: anomaly.severity,
              deviation_percentage: anomaly.deviation_percentage,
              normal_range_min: anomaly.normal_range.min,
              normal_range_max: anomaly.normal_range.max,
              clinical_significance: anomaly.clinical_significance
            });

            anomalies.push(anomalyLog);
          }
        }
      }

      await client.query('COMMIT');
      return anomalies;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkVitalAnomaly(vitalType, measuredValue, patientAge, patientGender) {
    // Get appropriate vital ranges
    const ranges = await this.getVitalRanges(vitalType, patientAge, patientGender);
    
    if (!ranges) {
      return null;
    }

    let severity = 'normal';
    let deviationPercentage = 0;
    let clinicalSignificance = 'normal';

    // Check for critical values
    if (ranges.critical_min !== null && measuredValue < ranges.critical_min) {
      severity = 'critical';
      deviationPercentage = ((ranges.critical_min - measuredValue) / ranges.critical_min) * 100;
      clinicalSignificance = 'life_threatening';
    } else if (ranges.critical_max !== null && measuredValue > ranges.critical_max) {
      severity = 'critical';
      deviationPercentage = ((measuredValue - ranges.critical_max) / ranges.critical_max) * 100;
      clinicalSignificance = 'life_threatening';
    }
    // Check for abnormal values
    else if (measuredValue < ranges.min_normal) {
      severity = 'abnormal';
      deviationPercentage = ((ranges.min_normal - measuredValue) / ranges.min_normal) * 100;
      clinicalSignificance = this.getClinicalSignificance(deviationPercentage);
    } else if (measuredValue > ranges.max_normal) {
      severity = 'abnormal';
      deviationPercentage = ((measuredValue - ranges.max_normal) / ranges.max_normal) * 100;
      clinicalSignificance = this.getClinicalSignificance(deviationPercentage);
    }

    if (severity === 'normal') {
      return null;
    }

    return {
      severity,
      deviation_percentage: deviationPercentage,
      normal_range: {
        min: ranges.min_normal,
        max: ranges.max_normal
      },
      critical_range: {
        min: ranges.critical_min,
        max: ranges.critical_max
      },
      clinical_significance: clinicalSignificance,
      unit: ranges.unit
    };
  }

  getClinicalSignificance(deviationPercentage) {
    if (deviationPercentage >= 50) return 'severe';
    if (deviationPercentage >= 25) return 'moderate';
    return 'mild';
  }

  async logAnomaly(vitalId, anomalyData) {
    const query = `
      INSERT INTO anomaly_logs (
        vital_id, patient_id, detected_anomaly, vital_type,
        measured_value, normal_range_min, normal_range_max,
        deviation_percentage, severity, clinical_significance,
        alert_sent, ai_confidence, risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      vitalId,
      anomalyData.patient_id,
      `${anomalyData.vital_type} anomaly: ${anomalyData.severity}`,
      anomalyData.vital_type,
      anomalyData.measured_value,
      anomalyData.normal_range_min,
      anomalyData.normal_range_max,
      anomalyData.deviation_percentage,
      anomalyData.severity,
      anomalyData.clinical_significance,
      anomalyData.severity === 'critical', // Auto-send alerts for critical anomalies
      this.calculateAIConfidence(anomalyData),
      this.calculateRiskScore(anomalyData)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  calculateAIConfidence(anomalyData) {
    // Simple confidence calculation based on deviation
    const deviation = anomalyData.deviation_percentage;
    if (deviation >= 50) return 0.95;
    if (deviation >= 25) return 0.85;
    if (deviation >= 10) return 0.75;
    return 0.65;
  }

  calculateRiskScore(anomalyData) {
    // Risk score based on severity and clinical significance
    let riskScore = 0.1; // Base risk

    if (anomalyData.severity === 'critical') riskScore += 0.6;
    else if (anomalyData.severity === 'abnormal') riskScore += 0.3;

    if (anomalyData.clinical_significance === 'life_threatening') riskScore += 0.3;
    else if (anomalyData.clinical_significance === 'severe') riskScore += 0.2;
    else if (anomalyData.clinical_significance === 'moderate') riskScore += 0.1;

    return Math.min(1.0, riskScore);
  }

  async sendAnomalyAlerts(vitalId, anomalies) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    
    if (criticalAnomalies.length === 0) {
      return;
    }

    // Get vital details for alert
    const vitalQuery = `
      SELECT pv.*, p.first_name || ' ' || p.last_name as patient_name
      FROM patient_vitals pv
      JOIN patients p ON pv.patient_id = p.id
      WHERE pv.id = $1
    `;
    const vitalResult = await this.pool.query(vitalQuery, [vitalId]);
    const vital = vitalResult.rows[0];

    // Send real-time WebSocket alerts
    await this.broadcastAnomalyAlert({
      type: 'critical_vital_anomaly',
      vital_id: vitalId,
      patient_name: vital.patient_name,
      patient_id: vital.patient_id,
      anomalies: criticalAnomalies,
      timestamp: new Date().toISOString()
    });

    // Send notifications to relevant staff
    await this.sendStaffNotifications(vital, criticalAnomalies);
  }

  async broadcastAnomalyAlert(alertData) {
    if (this.wss) {
      const message = JSON.stringify(alertData);
      
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  async sendStaffNotifications(vital, anomalies) {
    // Get staff who should be notified
    const staffQuery = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone
      FROM users u
      WHERE u.role IN ('nurse', 'doctor', 'supervisor')
      AND u.is_active = true
    `;
    const staffResult = await this.pool.query(staffQuery);
    const staff = staffResult.rows;

    // Send notifications (implement based on your notification system)
    for (const member of staff) {
      await this.sendNotification(member, {
        type: 'critical_vital_alert',
        patient_name: vital.patient_name,
        anomalies: anomalies,
        vital_id: vital.id
      });
    }
  }

  async sendNotification(staff, notificationData) {
    // Implement notification sending logic
    // This could be email, SMS, push notification, etc.
    console.log(`Sending notification to ${staff.first_name} ${staff.last_name}:`, notificationData);
  }

  async getAnomalies(options = {}) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (options.severity) {
      paramCount++;
      whereClause += ` AND severity = $${paramCount}`;
      values.push(options.severity);
    }

    if (options.patient_id) {
      paramCount++;
      whereClause += ` AND patient_id = $${paramCount}`;
      values.push(options.patient_id);
    }

    if (options.nurse_id) {
      paramCount++;
      whereClause += ` AND pv.nurse_id = $${paramCount}`;
      values.push(options.nurse_id);
    }

    if (!options.include_resolved) {
      whereClause += ` AND resolved = false`;
    }

    const query = `
      SELECT 
        al.*,
        p.first_name || ' ' || p.last_name as patient_name,
        pv.created_at as vital_timestamp,
        pv.bp_systolic, pv.bp_diastolic, pv.heart_rate, pv.temperature, pv.spo2,
        u.first_name || ' ' || u.last_name as nurse_name
      FROM anomaly_logs al
      JOIN patients p ON al.patient_id = p.id
      JOIN patient_vitals pv ON al.vital_id = pv.id
      JOIN users u ON pv.nurse_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramCount + 1}
    `;

    values.push(options.limit || 100);
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async acknowledgeAnomaly(anomalyId, acknowledgedBy, notes) {
    const query = `
      UPDATE anomaly_logs 
      SET alert_acknowledged = true, 
          alert_acknowledged_by = $1, 
          alert_acknowledged_at = NOW(),
          notes = COALESCE(notes, '') || $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await this.pool.query(query, [acknowledgedBy, notes || '', anomalyId]);
    return result.rows[0];
  }

  async resolveAnomaly(anomalyId, resolvedBy, resolutionData) {
    const query = `
      UPDATE anomaly_logs 
      SET resolved = true, 
          resolved_at = NOW(), 
          resolved_by = $1,
          resolution_notes = $2,
          notes = COALESCE(notes, '') || $3
      WHERE id = $4
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      resolvedBy, 
      resolutionData.resolution_notes,
      `\nResolution: ${resolutionData.action_taken || 'Anomaly resolved'}`,
      anomalyId
    ]);
    return result.rows[0];
  }

  async reanalyzeAnomalies(vitalId) {
    // Get the vital record
    const vitalQuery = `
      SELECT pv.*, p.date_of_birth, p.gender
      FROM patient_vitals pv
      JOIN patients p ON pv.patient_id = p.id
      WHERE pv.id = $1
    `;
    const vitalResult = await this.pool.query(vitalQuery, [vitalId]);
    const vital = vitalResult.rows[0];

    if (!vital) {
      throw new Error('Vital record not found');
    }

    // Delete existing anomalies for this vital
    await this.pool.query('DELETE FROM anomaly_logs WHERE vital_id = $1', [vitalId]);

    // Re-analyze for anomalies
    const patientAge = this.calculateAge(vital.date_of_birth);
    const vitalsData = {
      patient_id: vital.patient_id,
      bp_systolic: vital.bp_systolic,
      bp_diastolic: vital.bp_diastolic,
      heart_rate: vital.heart_rate,
      temperature: vital.temperature,
      spo2: vital.spo2,
      respiratory_rate: vital.respiratory_rate
    };

    return await this.detectAnomalies(vitalId, vitalsData);
  }

  async getVitalRanges(vitalType, patientAge, patientGender) {
    const query = `
      SELECT * FROM vital_ranges
      WHERE vital_type = $1
      AND (age_group_min IS NULL OR $2 >= age_group_min)
      AND (age_group_max IS NULL OR $2 <= age_group_max)
      AND (gender = 'all' OR gender = $3)
      AND is_active = true
      ORDER BY 
        CASE WHEN age_group_min IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN gender != 'all' THEN 1 ELSE 2 END
      LIMIT 1
    `;

    const result = await this.pool.query(query, [vitalType, patientAge, patientGender]);
    return result.rows[0];
  }

  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // WebSocket setup for real-time alerts
  setupWebSocketServer(server) {
    this.wss = new WebSocket.Server({ server, path: '/vitals-updates' });
    
    this.wss.on('connection', (ws, req) => {
      console.log('New vitals WebSocket connection');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('Vitals WebSocket connection closed');
      });
    });
  }

  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        // Subscribe to specific patient or ward updates
        ws.patientId = data.patient_id;
        ws.wardId = data.ward_id;
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }
}

module.exports = new AnomalyService();
