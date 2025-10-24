const { Pool } = require('pg');
const moment = require('moment');

class QueueService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async getCurrentQueueStatus({ doctor_id, location_id }) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT 
          qm.*,
          p.first_name || ' ' || p.last_name as patient_name,
          p.phone as patient_phone,
          p.date_of_birth,
          p.gender,
          u.first_name || ' ' || u.last_name as doctor_name,
          u.specialty as doctor_specialty,
          a.appointment_number,
          a.reason_for_visit,
          a.urgency_level
        FROM queue_management qm
        JOIN patients p ON qm.patient_id = p.id
        JOIN users u ON qm.doctor_id = u.id
        LEFT JOIN appointments a ON qm.appointment_id = a.id
        WHERE qm.current_status IN ('waiting', 'called', 'in_consultation')
      `;

      const values = [];
      let paramCount = 0;

      if (doctor_id) {
        paramCount++;
        query += ` AND qm.doctor_id = $${paramCount}`;
        values.push(doctor_id);
      }

      if (location_id) {
        paramCount++;
        query += ` AND u.location_id = $${paramCount}`;
        values.push(location_id);
      }

      query += ` ORDER BY qm.doctor_id, qm.priority_score DESC, qm.check_in_time ASC`;

      const result = await client.query(query, values);
      
      // Group by doctor
      const queueByDoctor = {};
      for (const row of result.rows) {
        if (!queueByDoctor[row.doctor_id]) {
          queueByDoctor[row.doctor_id] = {
            doctor_id: row.doctor_id,
            doctor_name: row.doctor_name,
            doctor_specialty: row.doctor_specialty,
            total_waiting: 0,
            total_called: 0,
            total_in_consultation: 0,
            queue: []
          };
        }

        queueByDoctor[row.doctor_id].queue.push(row);
        
        // Count by status
        if (row.current_status === 'waiting') {
          queueByDoctor[row.doctor_id].total_waiting++;
        } else if (row.current_status === 'called') {
          queueByDoctor[row.doctor_id].total_called++;
        } else if (row.current_status === 'in_consultation') {
          queueByDoctor[row.doctor_id].total_in_consultation++;
        }
      }

      return Object.values(queueByDoctor);
    } finally {
      client.release();
    }
  }

  async joinQueue(queueData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate priority score using AI algorithm
      const priorityScore = await this.calculatePriorityScore(queueData);

      // Get current queue position
      const positionQuery = `
        SELECT COUNT(*) as position
        FROM queue_management
        WHERE doctor_id = $1 AND current_status = 'waiting'
      `;
      const positionResult = await client.query(positionQuery, [queueData.doctor_id]);
      const queuePosition = parseInt(positionResult.rows[0].position) + 1;

      // Estimate wait time
      const estimatedWaitTime = await this.estimateWaitTime(queueData.doctor_id, priorityScore);

      const insertQuery = `
        INSERT INTO queue_management (
          patient_id, doctor_id, appointment_id, priority_score,
          estimated_wait_time_minutes, queue_position, special_requirements,
          notes, ai_priority_factors, medical_urgency_score,
          wait_time_score, patient_satisfaction_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        queueData.patient_id,
        queueData.doctor_id,
        queueData.appointment_id || null,
        priorityScore,
        estimatedWaitTime,
        queuePosition,
        queueData.special_requirements,
        queueData.notes,
        JSON.stringify(queueData.ai_priority_factors || {}),
        queueData.medical_urgency_score || 0,
        queueData.wait_time_score || 0,
        queueData.patient_satisfaction_score || 0
      ];

      const result = await client.query(insertQuery, values);
      const queueEntry = result.rows[0];

      // Update queue positions for all patients
      await this.updateQueuePositions(queueData.doctor_id);

      await client.query('COMMIT');
      return queueEntry;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async calculatePriorityScore(queueData) {
    let score = 0;

    // Medical urgency factors
    if (queueData.urgency_level === 'critical') score += 100;
    else if (queueData.urgency_level === 'high') score += 75;
    else if (queueData.urgency_level === 'medium') score += 50;
    else score += 25;

    // Age-based priority (elderly patients get slight priority)
    if (queueData.patient_age) {
      if (queueData.patient_age >= 65) score += 10;
      else if (queueData.patient_age <= 5) score += 15; // Children get priority
    }

    // Appointment type priority
    if (queueData.appointment_type === 'emergency') score += 50;
    else if (queueData.appointment_type === 'follow_up') score += 5;

    // Wait time factor (patients who have been waiting longer get slight boost)
    if (queueData.check_in_time) {
      const waitMinutes = moment().diff(moment(queueData.check_in_time), 'minutes');
      score += Math.min(waitMinutes / 10, 20); // Max 20 points for wait time
    }

    // Special requirements (accessibility, interpreter, etc.)
    if (queueData.special_requirements) score += 5;

    // Patient satisfaction history (if available)
    if (queueData.patient_satisfaction_score) {
      score += queueData.patient_satisfaction_score;
    }

    return Math.round(score);
  }

  async estimateWaitTime(doctorId, priorityScore) {
    // Get average consultation time for this doctor
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (consultation_end_time - consultation_start_time))/60) as avg_consultation_minutes
      FROM queue_management
      WHERE doctor_id = $1 AND consultation_end_time IS NOT NULL
      AND consultation_start_time >= NOW() - INTERVAL '7 days'
    `;
    
    const avgTimeResult = await this.pool.query(avgTimeQuery, [doctorId]);
    const avgConsultationTime = avgTimeResult.rows[0].avg_consultation_minutes || 30;

    // Count patients ahead in queue
    const aheadQuery = `
      SELECT COUNT(*) as patients_ahead
      FROM queue_management
      WHERE doctor_id = $1 AND current_status = 'waiting'
      AND (priority_score > $2 OR (priority_score = $2 AND check_in_time < NOW()))
    `;
    
    const aheadResult = await this.pool.query(aheadQuery, [doctorId, priorityScore]);
    const patientsAhead = parseInt(aheadResult.rows[0].patients_ahead);

    return Math.round(patientsAhead * avgConsultationTime);
  }

  async updateQueuePositions(doctorId) {
    const query = `
      UPDATE queue_management 
      SET queue_position = subquery.position
      FROM (
        SELECT id, ROW_NUMBER() OVER (
          ORDER BY priority_score DESC, check_in_time ASC
        ) as position
        FROM queue_management
        WHERE doctor_id = $1 AND current_status = 'waiting'
      ) as subquery
      WHERE queue_management.id = subquery.id
    `;
    
    await this.pool.query(query, [doctorId]);
  }

  async prioritizeQueue({ doctor_id, queue_id, user_id }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (queue_id) {
        // Prioritize specific queue entry
        const priorityQuery = `
          UPDATE queue_management 
          SET priority_score = priority_score + 50,
              notes = COALESCE(notes, '') || $1,
              updated_at = NOW()
          WHERE id = $2 AND doctor_id = $3
          RETURNING *
        `;
        
        const priorityNote = `\nManually prioritized by user ${user_id} on ${new Date().toISOString()}`;
        const result = await client.query(priorityQuery, [priorityNote, queue_id, doctor_id]);
        
        if (result.rows.length === 0) {
          throw new Error('Queue entry not found');
        }

        // Update all queue positions
        await this.updateQueuePositions(doctor_id);

        await client.query('COMMIT');
        return result.rows[0];
      } else {
        // Re-prioritize entire queue using AI algorithm
        const queueQuery = `
          SELECT * FROM queue_management 
          WHERE doctor_id = $1 AND current_status = 'waiting'
          ORDER BY check_in_time ASC
        `;
        
        const queueResult = await client.query(queueQuery, [doctor_id]);
        
        for (const queueEntry of queueResult.rows) {
          const newPriorityScore = await this.calculatePriorityScore({
            urgency_level: queueEntry.urgency_level,
            patient_age: queueEntry.patient_age,
            appointment_type: queueEntry.appointment_type,
            check_in_time: queueEntry.check_in_time,
            special_requirements: queueEntry.special_requirements,
            patient_satisfaction_score: queueEntry.patient_satisfaction_score
          });

          await client.query(
            'UPDATE queue_management SET priority_score = $1, updated_at = NOW() WHERE id = $2',
            [newPriorityScore, queueEntry.id]
          );
        }

        // Update queue positions
        await this.updateQueuePositions(doctor_id);

        await client.query('COMMIT');
        
        return {
          message: 'Queue prioritized successfully',
          total_entries: queueResult.rows.length
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateQueueStatus(queueId, { status, notes, updated_by }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE queue_management 
        SET current_status = $1, 
            notes = COALESCE(notes, '') || $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;

      const statusNote = `\nStatus updated to ${status} by user ${updated_by} on ${new Date().toISOString()}`;
      const result = await client.query(updateQuery, [status, statusNote, queueId]);

      if (result.rows.length === 0) {
        throw new Error('Queue entry not found');
      }

      const queueEntry = result.rows[0];

      // Update timestamps based on status
      if (status === 'called' && !queueEntry.called_time) {
        await client.query(
          'UPDATE queue_management SET called_time = NOW() WHERE id = $1',
          [queueId]
        );
      } else if (status === 'in_consultation' && !queueEntry.consultation_start_time) {
        await client.query(
          'UPDATE queue_management SET consultation_start_time = NOW() WHERE id = $1',
          [queueId]
        );
      } else if (status === 'completed' && !queueEntry.consultation_end_time) {
        await client.query(
          'UPDATE queue_management SET consultation_end_time = NOW(), actual_wait_time_minutes = EXTRACT(EPOCH FROM (NOW() - check_in_time))/60 WHERE id = $1',
          [queueId]
        );
      }

      // Update queue positions for remaining patients
      await this.updateQueuePositions(queueEntry.doctor_id);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getQueueAnalytics({ doctor_id, start_date, end_date }) {
    const query = `
      SELECT 
        COUNT(*) as total_patients,
        AVG(actual_wait_time_minutes) as avg_wait_time,
        AVG(EXTRACT(EPOCH FROM (consultation_end_time - consultation_start_time))/60) as avg_consultation_time,
        COUNT(*) FILTER (WHERE current_status = 'completed') as completed_consultations,
        COUNT(*) FILTER (WHERE current_status = 'cancelled') as cancelled_consultations,
        AVG(priority_score) as avg_priority_score
      FROM queue_management
      WHERE doctor_id = $1 
      AND check_in_time BETWEEN $2 AND $3
    `;

    const result = await this.pool.query(query, [doctor_id, start_date, end_date]);
    return result.rows[0];
  }

  async getQueueHistory({ doctor_id, limit = 50 }) {
    const query = `
      SELECT 
        qm.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone
      FROM queue_management qm
      JOIN patients p ON qm.patient_id = p.id
      WHERE qm.doctor_id = $1
      ORDER BY qm.check_in_time DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [doctor_id, limit]);
    return result.rows;
  }
}

module.exports = new QueueService();