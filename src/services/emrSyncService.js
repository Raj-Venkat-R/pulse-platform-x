const { Pool } = require('pg');

class EMRSyncService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async syncVitalsToEMR(vitalId) {
    try {
      // Get vital data
      const vitalQuery = `
        SELECT 
          pv.*,
          p.first_name || ' ' || p.last_name as patient_name,
          p.patient_id as emr_patient_id
        FROM patient_vitals pv
        JOIN patients p ON pv.patient_id = p.id
        WHERE pv.id = $1
      `;

      const result = await this.pool.query(vitalQuery, [vitalId]);
      const vital = result.rows[0];

      if (!vital) {
        throw new Error('Vital record not found');
      }

      // Mock EMR sync - in real implementation, this would call EMR API
      const emrData = {
        patient_id: vital.emr_patient_id,
        vital_type: 'vitals',
        data: {
          bp_systolic: vital.bp_systolic,
          bp_diastolic: vital.bp_diastolic,
          heart_rate: vital.heart_rate,
          temperature: vital.temperature,
          spo2: vital.spo2,
          respiratory_rate: vital.respiratory_rate,
          weight: vital.weight,
          height: vital.height,
          bmi: vital.bmi,
          pain_level: vital.pain_level,
          blood_glucose: vital.blood_glucose,
          timestamp: vital.created_at,
          nurse_id: vital.nurse_id,
          status: vital.status,
          anomalies: vital.anomalies
        },
        sync_timestamp: new Date().toISOString()
      };

      // Log EMR sync
      await this.logEMRSync(vitalId, 'success', emrData);

      return {
        success: true,
        emr_data: emrData,
        message: 'Vitals synced to EMR successfully'
      };
    } catch (error) {
      // Log failed sync
      await this.logEMRSync(vitalId, 'failed', null, error.message);
      throw error;
    }
  }

  async syncPatientVitalsToEMR(patientId) {
    try {
      // Get all recent vitals for patient
      const vitalsQuery = `
        SELECT pv.*
        FROM patient_vitals pv
        WHERE pv.patient_id = $1
        AND pv.created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY pv.created_at DESC
      `;

      const result = await this.pool.query(vitalsQuery, [patientId]);
      const vitals = result.rows;

      if (vitals.length === 0) {
        return {
          success: true,
          message: 'No recent vitals to sync',
          synced_count: 0
        };
      }

      // Sync each vital
      const syncPromises = vitals.map(vital => this.syncVitalsToEMR(vital.id));
      const results = await Promise.allSettled(syncPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        message: `Patient vitals sync completed: ${successful} successful, ${failed} failed`,
        synced_count: successful,
        failed_count: failed
      };
    } catch (error) {
      throw error;
    }
  }

  async logEMRSync(vitalId, status, emrData = null, errorMessage = null) {
    const query = `
      INSERT INTO emr_sync_logs (
        vital_id, sync_status, emr_data, error_message, sync_timestamp
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const values = [
      vitalId,
      status,
      emrData ? JSON.stringify(emrData) : null,
      errorMessage
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getEMRSyncStatus(patientId = null) {
    let whereClause = '';
    const values = [];

    if (patientId) {
      whereClause = 'WHERE pv.patient_id = $1';
      values.push(patientId);
    }

    const query = `
      SELECT 
        esl.*,
        pv.patient_id,
        p.first_name || ' ' || p.last_name as patient_name
      FROM emr_sync_logs esl
      JOIN patient_vitals pv ON esl.vital_id = pv.id
      JOIN patients p ON pv.patient_id = p.id
      ${whereClause}
      ORDER BY esl.sync_timestamp DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }
}

module.exports = new EMRSyncService();
