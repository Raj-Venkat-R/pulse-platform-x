const { Pool } = require('pg');

class OfflineSyncService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async storeOfflineVitals(deviceId, vitalsData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO vitals_sync_logs (
          device_id, sync_type, sync_data, sync_status, sync_timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;

      const values = [
        deviceId,
        'create',
        JSON.stringify(vitalsData),
        'pending'
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getSyncStatus(deviceId) {
    const query = `
      SELECT 
        device_id,
        COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_sync_count,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_sync_count,
        MAX(sync_timestamp) as last_sync_time,
        CASE 
          WHEN COUNT(*) FILTER (WHERE sync_status = 'pending') > 0 THEN 'pending'
          WHEN COUNT(*) FILTER (WHERE sync_status = 'failed') > 0 THEN 'failed'
          ELSE 'synced'
        END as sync_status
      FROM vitals_sync_logs
      WHERE device_id = $1
      GROUP BY device_id
    `;

    const result = await this.pool.query(query, [deviceId]);
    return result.rows[0] || {
      device_id: deviceId,
      pending_sync_count: 0,
      failed_sync_count: 0,
      last_sync_time: null,
      sync_status: 'synced'
    };
  }

  async syncOfflineVitals(deviceId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get pending sync logs
      const pendingQuery = `
        SELECT * FROM vitals_sync_logs
        WHERE device_id = $1 AND sync_status = 'pending'
        ORDER BY sync_timestamp ASC
      `;

      const pendingResult = await client.query(pendingQuery, [deviceId]);
      const pendingLogs = pendingResult.rows;

      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const log of pendingLogs) {
        try {
          const vitalsData = JSON.parse(log.sync_data);
          
          // Process the vitals data (this would integrate with your vitals service)
          // For now, we'll just mark as synced
          await client.query(
            'UPDATE vitals_sync_logs SET sync_status = $1, server_timestamp = NOW() WHERE id = $2',
            ['synced', log.id]
          );
          
          results.successful++;
        } catch (error) {
          await client.query(
            'UPDATE vitals_sync_logs SET sync_status = $1, error_message = $2 WHERE id = $3',
            ['failed', error.message, log.id]
          );
          
          results.failed++;
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
}

module.exports = new OfflineSyncService();
