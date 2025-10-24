const { Pool } = require('pg');

class ComplaintService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async createComplaint(complaintData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO complaints (
          patient_id, complaint_text, category, urgency, source,
          status, priority, assigned_to, created_by, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        complaintData.patient_id,
        complaintData.complaint_text,
        complaintData.category,
        complaintData.urgency,
        complaintData.source,
        complaintData.status || 'open',
        complaintData.priority || complaintData.urgency,
        complaintData.assigned_to,
        complaintData.created_by,
        complaintData.notes || ''
      ];

      const result = await client.query(query, values);
      const complaint = result.rows[0];

      await client.query('COMMIT');
      return complaint;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getComplaints(filters = {}) {
    const client = await this.pool.connect();
    try {
      let whereClause = 'WHERE 1=1';
      const values = [];
      let paramCount = 0;

      if (filters.status) {
        paramCount++;
        whereClause += ` AND c.status = $${paramCount}`;
        values.push(filters.status);
      }

      if (filters.category) {
        paramCount++;
        whereClause += ` AND c.category = $${paramCount}`;
        values.push(filters.category);
      }

      if (filters.urgency) {
        paramCount++;
        whereClause += ` AND c.urgency = $${paramCount}`;
        values.push(filters.urgency);
      }

      if (filters.assigned_to) {
        paramCount++;
        whereClause += ` AND c.assigned_to = $${paramCount}`;
        values.push(filters.assigned_to);
      }

      if (filters.patient_id) {
        paramCount++;
        whereClause += ` AND c.patient_id = $${paramCount}`;
        values.push(filters.patient_id);
      }

      if (filters.search) {
        paramCount++;
        whereClause += ` AND (c.complaint_text ILIKE $${paramCount} OR p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount})`;
        values.push(`%${filters.search}%`);
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const query = `
        SELECT 
          c.*,
          p.first_name || ' ' || p.last_name as patient_name,
          p.contact as patient_contact,
          u.first_name || ' ' || u.last_name as assigned_staff_name,
          creator.first_name || ' ' || creator.last_name as created_by_name
        FROM complaints c
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u ON c.assigned_to = u.id
        LEFT JOIN users creator ON c.created_by = creator.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      values.push(limit, offset);
      const result = await client.query(query, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM complaints c
        LEFT JOIN patients p ON c.patient_id = p.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      };
    } finally {
      client.release();
    }
  }

  async getComplaintById(id) {
    const query = `
      SELECT 
        c.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.contact as patient_contact,
        u.first_name || ' ' || u.last_name as assigned_staff_name,
        creator.first_name || ' ' || creator.last_name as created_by_name
      FROM complaints c
      LEFT JOIN patients p ON c.patient_id = p.id
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users creator ON c.created_by = creator.id
      WHERE c.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async updateComplaint(id, updateData, updatedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const updateFields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = [
        'status', 'priority', 'assigned_to', 'notes', 'resolution_notes'
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
      values.push(id);

      const query = `
        UPDATE complaints 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Complaint not found');
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

  async escalateComplaint(id, escalationData, escalatedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update complaint status
      const updateQuery = `
        UPDATE complaints 
        SET status = 'escalated', 
            priority = 'high',
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(updateQuery, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      // Log escalation
      const escalationLogQuery = `
        INSERT INTO escalation_logs (
          complaint_id, escalated_by, escalation_reason, 
          escalated_to, escalation_notes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const escalationValues = [
        id,
        escalatedBy,
        escalationData.reason,
        escalationData.escalated_to,
        escalationData.notes
      ];

      await client.query(escalationLogQuery, escalationValues);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getComplaintCategories() {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM complaints
      WHERE status != 'closed'
      GROUP BY category
      ORDER BY count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getComplaintStats() {
    const query = `
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(*) FILTER (WHERE status = 'open') as open_complaints,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_complaints,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_complaints,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_complaints,
        COUNT(*) FILTER (WHERE urgency = 'critical') as critical_complaints,
        COUNT(*) FILTER (WHERE urgency = 'high') as high_priority_complaints,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_time_hours
      FROM complaints
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }
}

module.exports = new ComplaintService();