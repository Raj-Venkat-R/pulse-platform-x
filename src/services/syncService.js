const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class SyncService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async createOfflineAppointment(offlineData) {
    const clientTempId = uuidv4();
    
    const query = `
      INSERT INTO offline_sync_logs (
        entity_type, client_temp_id, operation, payload, 
        location_id, performed_by, device_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      'appointment',
      clientTempId,
      'create',
      JSON.stringify(offlineData),
      offlineData.location_id,
      offlineData.performed_by,
      offlineData.device_id
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getSyncData(options) {
    const { device_id, location_id, last_sync } = options;
    
    // Get pending sync logs for this device
    let syncQuery = `
      SELECT * FROM offline_sync_logs 
      WHERE device_id = $1 AND status = 'pending'
    `;
    
    const syncValues = [device_id];
    
    if (last_sync) {
      syncQuery += ' AND created_at > $2';
      syncValues.push(last_sync);
    }
    
    syncQuery += ' ORDER BY created_at ASC';
    
    const syncResult = await this.pool.query(syncQuery, syncValues);
    
    // Get recent appointments for this location (for offline devices to sync)
    let appointmentsQuery = `
      SELECT 
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u.first_name || ' ' || u.last_name as provider_name,
        s.name as service_name,
        l.name as location_name
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.provider_id = u.id
      LEFT JOIN services s ON a.service_id = s.id
      LEFT JOIN locations l ON a.location_id = l.id
      WHERE a.location_id = $1
    `;
    
    const appointmentValues = [location_id];
    
    if (last_sync) {
      appointmentsQuery += ' AND a.updated_at > $2';
      appointmentValues.push(last_sync);
    }
    
    appointmentsQuery += ' ORDER BY a.updated_at DESC LIMIT 100';
    
    const appointmentsResult = await this.pool.query(appointmentsQuery, appointmentValues);
    
    // Get recent queue tokens for this location
    let queueQuery = `
      SELECT 
        qt.*,
        p.first_name || ' ' || p.last_name as patient_name,
        u.first_name || ' ' || u.last_name as provider_name,
        s.name as service_name,
        l.name as location_name
      FROM queue_tokens qt
      LEFT JOIN patients p ON qt.patient_id = p.id
      LEFT JOIN users u ON qt.provider_id = u.id
      LEFT JOIN services s ON qt.service_id = s.id
      LEFT JOIN locations l ON qt.location_id = l.id
      WHERE qt.location_id = $1
    `;
    
    const queueValues = [location_id];
    
    if (last_sync) {
      queueQuery += ' AND qt.updated_at > $2';
      queueValues.push(last_sync);
    }
    
    queueQuery += ' ORDER BY qt.updated_at DESC LIMIT 50';
    
    const queueResult = await this.pool.query(queueQuery, queueValues);
    
    return {
      pending_sync_logs: syncResult.rows,
      recent_appointments: appointmentsResult.rows,
      recent_queue_tokens: queueResult.rows,
      sync_timestamp: new Date().toISOString()
    };
  }

  async processOfflineSync(syncData) {
    const client = await this.pool.connect();
    const results = {
      processed: 0,
      errors: [],
      created_appointments: [],
      created_tokens: []
    };

    try {
      await client.query('BEGIN');

      for (const log of syncData.sync_logs || []) {
        try {
          const payload = typeof log.payload === 'string' 
            ? JSON.parse(log.payload) 
            : log.payload;

          if (log.entity_type === 'appointment' && log.operation === 'create') {
            // Create appointment from offline data
            const appointment = await this.createAppointmentFromOffline(payload, client);
            results.created_appointments.push(appointment);
            
            // Update sync log
            await client.query(
              'UPDATE offline_sync_logs SET status = $1, synced_at = NOW(), entity_id = $2 WHERE id = $3',
              ['synced', appointment.id, log.id]
            );
          } else if (log.entity_type === 'queue_token' && log.operation === 'create') {
            // Create queue token from offline data
            const token = await this.createTokenFromOffline(payload, client);
            results.created_tokens.push(token);
            
            // Update sync log
            await client.query(
              'UPDATE offline_sync_logs SET status = $1, synced_at = NOW(), entity_id = $2 WHERE id = $3',
              ['synced', token.id, log.id]
            );
          }
          
          results.processed++;
        } catch (error) {
          // Mark sync log as failed
          await client.query(
            'UPDATE offline_sync_logs SET status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message, log.id]
          );
          
          results.errors.push({
            log_id: log.id,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createAppointmentFromOffline(payload, client) {
    const appointmentQuery = `
      INSERT INTO appointments (
        patient_id, provider_id, service_id, location_id,
        scheduled_start, scheduled_end, status, appointment_type,
        source, reason, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      payload.patient_id,
      payload.provider_id,
      payload.service_id,
      payload.location_id,
      payload.scheduled_start,
      payload.scheduled_end,
      payload.status || 'scheduled',
      payload.appointment_type || 'offline',
      payload.source || 'offline_sync',
      payload.reason,
      payload.notes,
      payload.performed_by
    ];

    const result = await client.query(appointmentQuery, values);
    return result.rows[0];
  }

  async createTokenFromOffline(payload, client) {
    // Get next token number for the day
    const nextTokenQuery = `
      SELECT COALESCE(MAX(token_number), 0) + 1 as next_token
      FROM queue_tokens 
      WHERE token_date = CURRENT_DATE 
        AND location_id = $1 
        AND service_id = $2
    `;

    const nextTokenResult = await client.query(nextTokenQuery, [
      payload.location_id,
      payload.service_id
    ]);

    const nextToken = nextTokenResult.rows[0].next_token;

    const tokenQuery = `
      INSERT INTO queue_tokens (
        token_number, token_date, location_id, service_id, provider_id,
        patient_id, channel, priority, notes, created_by
      ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      nextToken,
      payload.location_id,
      payload.service_id,
      payload.provider_id,
      payload.patient_id,
      payload.channel || 'offline_sync',
      payload.priority || 0,
      payload.notes,
      payload.performed_by
    ];

    const result = await client.query(tokenQuery, values);
    return result.rows[0];
  }

  async markSyncComplete(deviceId, syncLogIds) {
    const query = `
      UPDATE offline_sync_logs 
      SET status = 'synced', synced_at = NOW()
      WHERE device_id = $1 AND id = ANY($2)
    `;

    await this.pool.query(query, [deviceId, syncLogIds]);
  }
}

module.exports = new SyncService();
