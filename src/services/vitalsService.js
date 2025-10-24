const { Pool } = require('pg');
const moment = require('moment');

class VitalsService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async validateVitals(vitalsData) {
    const errors = [];
    const warnings = [];

    // Basic range validation
    if (vitalsData.bp_systolic && (vitalsData.bp_systolic < 50 || vitalsData.bp_systolic > 300)) {
      errors.push('Systolic blood pressure must be between 50-300 mmHg');
    }

    if (vitalsData.bp_diastolic && (vitalsData.bp_diastolic < 30 || vitalsData.bp_diastolic > 200)) {
      errors.push('Diastolic blood pressure must be between 30-200 mmHg');
    }

    if (vitalsData.heart_rate && (vitalsData.heart_rate < 30 || vitalsData.heart_rate > 300)) {
      errors.push('Heart rate must be between 30-300 bpm');
    }

    if (vitalsData.temperature && (vitalsData.temperature < 30.0 || vitalsData.temperature > 45.0)) {
      errors.push('Temperature must be between 30.0-45.0°C');
    }

    if (vitalsData.spo2 && (vitalsData.spo2 < 50 || vitalsData.spo2 > 100)) {
      errors.push('Oxygen saturation must be between 50-100%');
    }

    if (vitalsData.respiratory_rate && (vitalsData.respiratory_rate < 5 || vitalsData.respiratory_rate > 60)) {
      errors.push('Respiratory rate must be between 5-60 breaths/min');
    }

    // Blood pressure relationship validation
    if (vitalsData.bp_systolic && vitalsData.bp_diastolic && vitalsData.bp_systolic <= vitalsData.bp_diastolic) {
      errors.push('Systolic blood pressure must be higher than diastolic');
    }

    // Pain level validation
    if (vitalsData.pain_level && (vitalsData.pain_level < 0 || vitalsData.pain_level > 10)) {
      errors.push('Pain level must be between 0-10');
    }

    // Weight and height validation
    if (vitalsData.weight && (vitalsData.weight < 0.5 || vitalsData.weight > 500.0)) {
      errors.push('Weight must be between 0.5-500.0 kg');
    }

    if (vitalsData.height && (vitalsData.height < 30.0 || vitalsData.height > 250.0)) {
      errors.push('Height must be between 30.0-250.0 cm');
    }

    // Blood glucose validation
    if (vitalsData.blood_glucose && (vitalsData.blood_glucose < 20.0 || vitalsData.blood_glucose > 1000.0)) {
      errors.push('Blood glucose must be between 20.0-1000.0 mg/dL');
    }

    // Check for missing critical vitals
    const criticalVitals = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature'];
    const missingCritical = criticalVitals.filter(vital => !vitalsData[vital]);
    
    if (missingCritical.length > 0) {
      warnings.push(`Missing critical vitals: ${missingCritical.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedData: vitalsData
    };
  }

  async createVitals(vitalsData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO patient_vitals (
          patient_id, nurse_id, bp_systolic, bp_diastolic, heart_rate,
          temperature, spo2, respiratory_rate, weight, height,
          pain_level, blood_glucose, blood_pressure_position,
          is_manual_entry, device_id, measurement_location,
          notes, patient_condition, medication_effects,
          measurement_quality, confidence_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `;

      const values = [
        vitalsData.patient_id,
        vitalsData.nurse_id,
        vitalsData.bp_systolic,
        vitalsData.bp_diastolic,
        vitalsData.heart_rate,
        vitalsData.temperature,
        vitalsData.spo2,
        vitalsData.respiratory_rate,
        vitalsData.weight,
        vitalsData.height,
        vitalsData.pain_level,
        vitalsData.blood_glucose,
        vitalsData.blood_pressure_position,
        vitalsData.is_manual_entry !== false,
        vitalsData.device_id,
        vitalsData.measurement_location,
        vitalsData.notes,
        vitalsData.patient_condition,
        vitalsData.medication_effects,
        vitalsData.measurement_quality || 'good',
        vitalsData.confidence_score || 1.0
      ];

      const result = await client.query(query, values);
      const vitals = result.rows[0];

      await client.query('COMMIT');
      return vitals;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPatientVitals(patientId, options = {}) {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE pv.patient_id = $1';
      const values = [patientId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND pv.created_at >= $${paramCount}`;
        values.push(options.start_date);
      }

      if (options.end_date) {
        paramCount++;
        whereClause += ` AND pv.created_at <= $${paramCount}`;
        values.push(options.end_date);
      }

      if (options.vital_type) {
        paramCount++;
        whereClause += ` AND pv.${options.vital_type} IS NOT NULL`;
      }

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM patient_vitals pv
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get vitals with pagination
      const dataQuery = `
        SELECT 
          pv.*,
          p.first_name || ' ' || p.last_name as patient_name,
          u.first_name || ' ' || u.last_name as nurse_name,
          calculate_bp_category(pv.bp_systolic, pv.bp_diastolic) as bp_category
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        JOIN users u ON pv.nurse_id = u.id
        ${whereClause}
        ORDER BY pv.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      values.push(options.limit || 50, options.offset || 0);
      const dataResult = await client.query(dataQuery, values);

      const vitals = dataResult.rows;

      // Include anomalies if requested
      if (options.include_anomalies) {
        for (const vital of vitals) {
          vital.anomalies = await this.getVitalAnomalies(vital.id);
        }
      }

      return {
        data: vitals,
        pagination: {
          total,
          limit: options.limit || 50,
          offset: options.offset || 0,
          pages: Math.ceil(total / (options.limit || 50))
        }
      };
    } finally {
      client.release();
    }
  }

  async getVitalTrends(patientId, options = {}) {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE patient_id = $1';
      const values = [patientId];
      let paramCount = 1;

      if (options.start_date) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        values.push(options.start_date);
      } else if (options.days) {
        whereClause += ` AND created_at >= NOW() - INTERVAL '${options.days} days'`;
      }

      if (options.vital_type) {
        paramCount++;
        whereClause += ` AND ${options.vital_type} IS NOT NULL`;
      }

      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as measurement_count,
          AVG(bp_systolic) as avg_bp_systolic,
          AVG(bp_diastolic) as avg_bp_diastolic,
          AVG(heart_rate) as avg_heart_rate,
          AVG(temperature) as avg_temperature,
          AVG(spo2) as avg_spo2,
          AVG(respiratory_rate) as avg_respiratory_rate,
          COUNT(*) FILTER (WHERE has_critical_anomaly = true) as critical_count,
          COUNT(*) FILTER (WHERE anomaly_count > 0) as anomaly_count
        FROM patient_vitals
        ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateVitals(vitalId, updateData, updatedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = [
        'bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'spo2',
        'respiratory_rate', 'weight', 'height', 'pain_level', 'blood_glucose',
        'blood_pressure_position', 'notes', 'patient_condition', 'medication_effects',
        'measurement_quality', 'confidence_score'
      ];

      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field) && value !== undefined) {
          paramCount++;
          updateFields.push(`${field} = $${paramCount}`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add audit fields
      paramCount++;
      updateFields.push(`updated_at = NOW()`);

      // Add WHERE clause
      paramCount++;
      values.push(vitalId);

      const query = `
        UPDATE patient_vitals 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Vital record not found');
      }

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkCreateVitals(vitalsDataArray, nurseId) {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const vitalsData of vitalsDataArray) {
      try {
        vitalsData.nurse_id = nurseId;
        const validation = await this.validateVitals(vitalsData);
        
        if (!validation.isValid) {
          results.failed++;
          results.errors.push({
            patient_id: vitalsData.patient_id,
            errors: validation.errors
          });
          continue;
        }

        await this.createVitals(vitalsData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          patient_id: vitalsData.patient_id,
          error: error.message
        });
      }
    }

    return results;
  }

  async getVitalAnomalies(vitalId) {
    const query = `
      SELECT * FROM anomaly_logs 
      WHERE vital_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [vitalId]);
    return result.rows;
  }

  async getDashboardData(options = {}) {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let paramCount = 0;

      if (options.ward_id) {
        paramCount++;
        whereClause += ` AND p.ward_id = $${paramCount}`;
        values.push(options.ward_id);
      }

      if (options.nurse_id) {
        paramCount++;
        whereClause += ` AND pv.nurse_id = $${paramCount}`;
        values.push(options.nurse_id);
      }

      // Time period filter
      if (options.time_period === '24h') {
        whereClause += ` AND pv.created_at >= NOW() - INTERVAL '24 hours'`;
      } else if (options.time_period === '7d') {
        whereClause += ` AND pv.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (options.time_period === '30d') {
        whereClause += ` AND pv.created_at >= NOW() - INTERVAL '30 days'`;
      }

      // Get dashboard statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_measurements,
          COUNT(*) FILTER (WHERE pv.status = 'normal') as normal_count,
          COUNT(*) FILTER (WHERE pv.status = 'abnormal') as abnormal_count,
          COUNT(*) FILTER (WHERE pv.status = 'critical') as critical_count,
          COUNT(*) FILTER (WHERE pv.has_critical_anomaly = true) as critical_anomalies,
          AVG(pv.bp_systolic) as avg_bp_systolic,
          AVG(pv.bp_diastolic) as avg_bp_diastolic,
          AVG(pv.heart_rate) as avg_heart_rate,
          AVG(pv.temperature) as avg_temperature,
          AVG(pv.spo2) as avg_spo2
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        ${whereClause}
      `;

      const statsResult = await client.query(statsQuery, values);
      const stats = statsResult.rows[0];

      // Get recent critical vitals
      const criticalQuery = `
        SELECT 
          pv.*,
          p.first_name || ' ' || p.last_name as patient_name,
          u.first_name || ' ' || u.last_name as nurse_name
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        JOIN users u ON pv.nurse_id = u.id
        ${whereClause}
        AND pv.has_critical_anomaly = true
        ORDER BY pv.created_at DESC
        LIMIT 10
      `;

      const criticalResult = await client.query(criticalQuery, values);

      // Get vital trends by hour
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('hour', pv.created_at) as hour,
          COUNT(*) as measurement_count,
          COUNT(*) FILTER (WHERE pv.has_critical_anomaly = true) as critical_count
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        ${whereClause}
        GROUP BY DATE_TRUNC('hour', pv.created_at)
        ORDER BY hour DESC
        LIMIT 24
      `;

      const trendsResult = await client.query(trendsQuery, values);

      return {
        statistics: stats,
        critical_vitals: criticalResult.rows,
        trends: trendsResult.rows
      };
    } finally {
      client.release();
    }
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

  async calculateVitalScore(vitals) {
    let score = 100; // Start with perfect score

    // Blood pressure scoring
    if (vitals.bp_systolic && vitals.bp_diastolic) {
      if (vitals.bp_systolic < 90 || vitals.bp_systolic > 140) score -= 20;
      if (vitals.bp_diastolic < 60 || vitals.bp_diastolic > 90) score -= 20;
    }

    // Heart rate scoring
    if (vitals.heart_rate) {
      if (vitals.heart_rate < 60 || vitals.heart_rate > 100) score -= 15;
    }

    // Temperature scoring
    if (vitals.temperature) {
      if (vitals.temperature < 36.1 || vitals.temperature > 37.2) score -= 15;
    }

    // Oxygen saturation scoring
    if (vitals.spo2) {
      if (vitals.spo2 < 95) score -= 25;
    }

    // Respiratory rate scoring
    if (vitals.respiratory_rate) {
      if (vitals.respiratory_rate < 12 || vitals.respiratory_rate > 20) score -= 10;
    }

    return Math.max(0, score);
  }
}

module.exports = new VitalsService();
