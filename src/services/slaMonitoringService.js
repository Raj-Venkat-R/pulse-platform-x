const cron = require('node-cron');
const { Pool } = require('pg');

class SLAMonitoringService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.isRunning = false;
    this.jobs = new Map();
  }

  start() {
    if (this.isRunning) {
      console.log('SLA Monitoring Service is already running');
      return;
    }

    console.log('Starting SLA Monitoring Service...');

    // Monitor SLA status every 5 minutes
    this.jobs.set('sla-monitor', cron.schedule('*/5 * * * *', async () => {
      await this.monitorSLAStatus();
    }));

    // Check for SLA breaches every minute
    this.jobs.set('breach-checker', cron.schedule('* * * * *', async () => {
      await this.checkSlaBreaches();
    }));

    // Send SLA reminders every hour
    this.jobs.set('reminder-sender', cron.schedule('0 * * * *', async () => {
      await this.sendSlaReminders();
    }));

    // Process escalations every 10 minutes
    this.jobs.set('escalation-processor', cron.schedule('*/10 * * * *', async () => {
      await this.processEscalations();
    }));

    // Generate SLA reports daily at 9 AM
    this.jobs.set('daily-reports', cron.schedule('0 9 * * *', async () => {
      await this.generateDailyReports();
    }));

    this.isRunning = true;
    console.log('SLA Monitoring Service started successfully');
  }

  stop() {
    if (!this.isRunning) {
      console.log('SLA Monitoring Service is not running');
      return;
    }

    console.log('Stopping SLA Monitoring Service...');
    
    this.jobs.forEach((job, name) => {
      job.destroy();
      console.log(`Stopped job: ${name}`);
    });

    this.jobs.clear();
    this.isRunning = false;
    console.log('SLA Monitoring Service stopped');
  }

  async monitorSLAStatus() {
    try {
      console.log('Monitoring SLA status...');
      
      const query = `
        UPDATE sla_logs 
        SET sla_status = calculate_sla_status(sla_due_time, sla_end_time),
            updated_at = NOW()
        WHERE sla_status IN ('on_track', 'at_risk', 'breached')
          AND sla_end_time IS NULL
      `;

      const result = await this.pool.query(query);
      console.log(`Updated SLA status for ${result.rowCount} records`);
    } catch (error) {
      console.error('Error monitoring SLA status:', error);
    }
  }

  async checkSlaBreaches() {
    try {
      console.log('Checking for SLA breaches...');

      // Find newly breached SLAs
      const breachQuery = `
        SELECT 
          sl.*,
          c.complaint_number,
          c.subject,
          c.urgency,
          c.assigned_to,
          u.first_name || ' ' || u.last_name as assigned_to_name
        FROM sla_logs sl
        JOIN complaints c ON sl.complaint_id = c.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE sl.sla_status = 'breached'
          AND sl.breached_at IS NULL
          AND sl.sla_due_time < NOW()
      `;

      const result = await this.pool.query(breachQuery);
      
      for (const sla of result.rows) {
        await this.handleSlaBreach(sla);
      }

      console.log(`Processed ${result.rows.length} SLA breaches`);
    } catch (error) {
      console.error('Error checking SLA breaches:', error);
    }
  }

  async handleSlaBreach(sla) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Calculate breach duration
      const breachDuration = Math.floor((Date.now() - new Date(sla.sla_due_time).getTime()) / (1000 * 60));

      // Update SLA log with breach information
      await client.query(
        `UPDATE sla_logs 
         SET breached_at = NOW(),
             breach_duration_minutes = $1,
             breach_severity = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          breachDuration,
          this.calculateBreachSeverity(breachDuration),
          sla.id
        ]
      );

      // Create breach notification
      await client.query(
        `INSERT INTO sla_breach_notifications (
          sla_log_id, complaint_id, notification_type, notification_level,
          message, notified_users, notified_roles, delivery_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sla.id,
          sla.complaint_id,
          'breach_alert',
          this.getNotificationLevel(breachDuration),
          `SLA breach detected for complaint ${sla.complaint_number}. Breach duration: ${breachDuration} minutes.`,
          sla.assigned_to ? [sla.assigned_to] : [],
          ['supervisor', 'manager'],
          'email'
        ]
      );

      // Trigger escalation if configured
      await this.triggerBreachEscalation(sla, client);

      await client.query('COMMIT');
      
      console.log(`Handled SLA breach for complaint ${sla.complaint_number}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling SLA breach:', error);
    } finally {
      client.release();
    }
  }

  calculateBreachSeverity(breachDurationMinutes) {
    if (breachDurationMinutes <= 60) return 'minor';
    if (breachDurationMinutes <= 240) return 'moderate'; // 4 hours
    if (breachDurationMinutes <= 1440) return 'severe'; // 24 hours
    return 'critical';
  }

  getNotificationLevel(breachDurationMinutes) {
    if (breachDurationMinutes <= 60) return 'warning';
    if (breachDurationMinutes <= 240) return 'warning';
    return 'critical';
  }

  async triggerBreachEscalation(sla, client) {
    // Find escalation rules for SLA breaches
    const escalationQuery = `
      SELECT * FROM escalation_rules 
      WHERE trigger_type = 'sla_breach'
        AND status = 'active'
        AND (applies_to_urgencies IS NULL OR $1 = ANY(applies_to_urgencies))
      ORDER BY priority DESC
      LIMIT 1
    `;

    const escalationResult = await client.query(escalationQuery, [sla.urgency]);
    
    if (escalationResult.rows.length > 0) {
      const rule = escalationResult.rows[0];
      
      // Execute escalation
      const escalationQuery = `
        INSERT INTO complaint_escalations (
          complaint_id, escalation_rule_id, escalation_level,
          trigger_reason, actions_taken, escalated_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const escalationResult = await client.query(escalationQuery, [
        sla.complaint_id,
        rule.id,
        sla.escalation_level + 1,
        `SLA breach detected (${sla.breach_severity})`,
        rule.escalation_actions,
        1 // System user
      ]);

      console.log(`Triggered escalation for complaint ${sla.complaint_number}`);
    }
  }

  async sendSlaReminders() {
    try {
      console.log('Sending SLA reminders...');

      // Find SLAs approaching due time (within 2 hours)
      const reminderQuery = `
        SELECT 
          sl.*,
          c.complaint_number,
          c.subject,
          c.urgency,
          c.assigned_to,
          u.first_name || ' ' || u.last_name as assigned_to_name,
          u.email as assigned_to_email
        FROM sla_logs sl
        JOIN complaints c ON sl.complaint_id = c.id
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE sl.sla_status IN ('on_track', 'at_risk')
          AND sl.sla_due_time BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
          AND sl.sla_end_time IS NULL
      `;

      const result = await this.pool.query(reminderQuery);
      
      for (const sla of result.rows) {
        await this.sendSlaReminder(sla);
      }

      console.log(`Sent ${result.rows.length} SLA reminders`);
    } catch (error) {
      console.error('Error sending SLA reminders:', error);
    }
  }

  async sendSlaReminder(sla) {
    try {
      const timeRemaining = Math.floor((new Date(sla.sla_due_time).getTime() - Date.now()) / (1000 * 60));
      
      const message = `SLA reminder: Complaint ${sla.complaint_number} is due in ${timeRemaining} minutes. Please take action to resolve within SLA.`;

      // Create reminder notification
      await this.pool.query(
        `INSERT INTO sla_breach_notifications (
          sla_log_id, complaint_id, notification_type, notification_level,
          message, notified_users, notified_roles, delivery_method
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          sla.id,
          sla.complaint_id,
          'reminder',
          'info',
          message,
          sla.assigned_to ? [sla.assigned_to] : [],
          ['supervisor'],
          'email'
        ]
      );

      console.log(`Sent reminder for complaint ${sla.complaint_number}`);
    } catch (error) {
      console.error('Error sending SLA reminder:', error);
    }
  }

  async processEscalations() {
    try {
      console.log('Processing escalations...');

      // Find complaints that need escalation based on time-based rules
      const escalationQuery = `
        SELECT 
          c.*,
          er.id as rule_id,
          er.rule_name,
          er.trigger_delay_hours,
          er.escalation_actions
        FROM complaints c
        JOIN escalation_rules er ON (
          er.trigger_type = 'time_based' 
          AND er.status = 'active'
          AND (er.applies_to_categories IS NULL OR c.category = ANY(er.applies_to_categories))
          AND (er.applies_to_urgencies IS NULL OR c.urgency = ANY(er.applies_to_urgencies))
        )
        WHERE c.status IN ('open', 'in_progress', 'pending_customer')
          AND c.created_at <= NOW() - INTERVAL '1 hour' * er.trigger_delay_hours
          AND NOT EXISTS (
            SELECT 1 FROM complaint_escalations ce 
            WHERE ce.complaint_id = c.id 
              AND ce.escalation_rule_id = er.id
              AND ce.triggered_at > NOW() - INTERVAL '1 hour' * er.cooldown_hours
          )
      `;

      const result = await this.pool.query(escalationQuery);
      
      for (const complaint of result.rows) {
        await this.processTimeBasedEscalation(complaint);
      }

      console.log(`Processed ${result.rows.length} time-based escalations`);
    } catch (error) {
      console.error('Error processing escalations:', error);
    }
  }

  async processTimeBasedEscalation(complaint) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create escalation record
      const escalationQuery = `
        INSERT INTO complaint_escalations (
          complaint_id, escalation_rule_id, escalation_level,
          trigger_reason, actions_taken, escalated_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const escalationResult = await client.query(escalationQuery, [
        complaint.id,
        complaint.rule_id,
        complaint.escalation_level + 1,
        `Time-based escalation triggered after ${complaint.trigger_delay_hours} hours`,
        complaint.escalation_actions,
        1 // System user
      ]);

      // Execute escalation actions
      const actions = typeof complaint.escalation_actions === 'string' 
        ? JSON.parse(complaint.escalation_actions) 
        : complaint.escalation_actions;

      for (const action of actions) {
        await this.executeEscalationAction(complaint.id, action, client);
      }

      // Update complaint escalation level
      await client.query(
        `UPDATE complaints 
         SET escalation_level = $1, escalated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [complaint.escalation_level + 1, complaint.id]
      );

      await client.query('COMMIT');
      
      console.log(`Processed escalation for complaint ${complaint.complaint_number}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error processing escalation:', error);
    } finally {
      client.release();
    }
  }

  async executeEscalationAction(complaintId, action, client) {
    switch (action.action) {
      case 'assign_to_role':
        await this.assignToRole(complaintId, action.role, client);
        break;
      case 'change_status':
        await client.query(
          `UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`,
          [action.status, complaintId]
        );
        break;
      case 'notify_role':
        await this.notifyRole(complaintId, action.role, action.message, client);
        break;
      // Add more action types as needed
    }
  }

  async assignToRole(complaintId, role, client) {
    const userQuery = `
      SELECT id FROM users 
      WHERE role = $1 AND is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const userResult = await client.query(userQuery, [role]);

    if (userResult.rows.length > 0) {
      await client.query(
        `UPDATE complaints 
         SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [userResult.rows[0].id, complaintId]
      );
    }
  }

  async notifyRole(complaintId, role, message, client) {
    // This would integrate with notification service
    console.log(`Notifying role ${role} about complaint ${complaintId}: ${message}`);
  }

  async generateDailyReports() {
    try {
      console.log('Generating daily SLA reports...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get SLA performance statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_slas,
          COUNT(*) FILTER (WHERE sla_status = 'resolved' AND sla_end_time <= sla_due_time) as resolved_on_time,
          COUNT(*) FILTER (WHERE sla_status = 'breached') as breached_slas,
          AVG(resolution_time_minutes) as avg_resolution_time,
          ROUND(
            (COUNT(*) FILTER (WHERE sla_status = 'breached')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
          ) as breach_rate
        FROM sla_logs
        WHERE created_at BETWEEN $1 AND $2
      `;

      const statsResult = await this.pool.query(statsQuery, [yesterday, today]);
      const stats = statsResult.rows[0];

      // Get top categories with breaches
      const categoryQuery = `
        SELECT 
          c.category,
          COUNT(*) as total_complaints,
          COUNT(*) FILTER (WHERE sl.sla_status = 'breached') as breached_complaints,
          ROUND(
            (COUNT(*) FILTER (WHERE sl.sla_status = 'breached')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            2
          ) as breach_rate
        FROM complaints c
        JOIN sla_logs sl ON c.id = sl.complaint_id
        WHERE c.created_at BETWEEN $1 AND $2
        GROUP BY c.category
        ORDER BY breach_rate DESC
        LIMIT 10
      `;

      const categoryResult = await this.pool.query(categoryQuery, [yesterday, today]);

      // Store report
      const reportQuery = `
        INSERT INTO sla_daily_reports (
          report_date, total_slas, resolved_on_time, breached_slas,
          avg_resolution_time, breach_rate, category_breakdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (report_date) DO UPDATE SET
          total_slas = EXCLUDED.total_slas,
          resolved_on_time = EXCLUDED.resolved_on_time,
          breached_slas = EXCLUDED.breached_slas,
          avg_resolution_time = EXCLUDED.avg_resolution_time,
          breach_rate = EXCLUDED.breach_rate,
          category_breakdown = EXCLUDED.category_breakdown,
          updated_at = NOW()
      `;

      await this.pool.query(reportQuery, [
        yesterday,
        stats.total_slas,
        stats.resolved_on_time,
        stats.breached_slas,
        stats.avg_resolution_time,
        stats.breach_rate,
        JSON.stringify(categoryResult.rows)
      ]);

      console.log('Daily SLA report generated successfully');
    } catch (error) {
      console.error('Error generating daily reports:', error);
    }
  }

  async getSlaMetrics(dateRange = {}) {
    const { start_date, end_date } = dateRange;
    
    let whereClause = '';
    const values = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE created_at BETWEEN $1 AND $2';
      values.push(start_date, end_date);
    }

    const query = `
      SELECT 
        COUNT(*) as total_slas,
        COUNT(*) FILTER (WHERE sla_status = 'resolved' AND sla_end_time <= sla_due_time) as resolved_on_time,
        COUNT(*) FILTER (WHERE sla_status = 'breached') as breached_slas,
        COUNT(*) FILTER (WHERE sla_status = 'at_risk') as at_risk_slas,
        AVG(resolution_time_minutes) as avg_resolution_time,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_status = 'breached')::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        ) as breach_rate,
        AVG(confidence) as avg_confidence
      FROM sla_logs
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new SLAMonitoringService();
