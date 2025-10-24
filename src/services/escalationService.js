const { Pool } = require('pg');

class EscalationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async escalateComplaint(complaintId, escalationData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get complaint details
      const complaintQuery = `
        SELECT * FROM complaints WHERE id = $1
      `;
      const complaintResult = await client.query(complaintQuery, [complaintId]);
      
      if (complaintResult.rows.length === 0) {
        throw new Error('Complaint not found');
      }

      const complaint = complaintResult.rows[0];

      // Determine escalation level
      const newEscalationLevel = complaint.escalation_level + 1;

      // Find appropriate escalation rule
      const escalationRule = await this.findApplicableEscalationRule(complaint, client);

      if (!escalationRule) {
        throw new Error('No applicable escalation rule found');
      }

      // Execute escalation
      const escalationResult = await this.executeEscalationRule(
        complaintId, 
        escalationRule.id, 
        newEscalationLevel, 
        escalationData.escalation_reason,
        escalationData.escalated_by,
        client
      );

      await client.query('COMMIT');
      return escalationResult;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findApplicableEscalationRule(complaint, client = this.pool) {
    const query = `
      SELECT * FROM escalation_rules 
      WHERE status = 'active'
        AND (applies_to_categories IS NULL OR $1 = ANY(applies_to_categories))
        AND (applies_to_urgencies IS NULL OR $2 = ANY(applies_to_urgencies))
        AND (applies_to_sources IS NULL OR $3 = ANY(applies_to_sources))
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `;

    const result = await client.query(query, [
      complaint.category,
      complaint.urgency,
      complaint.source
    ]);

    return result.rows[0];
  }

  async executeEscalationRule(complaintId, ruleId, escalationLevel, reason, escalatedBy, client = this.pool) {
    // Check if escalation conditions are met
    const conditionsMet = await this.checkEscalationConditions(complaintId, ruleId, client);
    if (!conditionsMet) {
      throw new Error('Escalation conditions not met');
    }

    // Check cooldown period
    const cooldownPassed = await this.checkEscalationCooldown(complaintId, ruleId, client);
    if (!cooldownPassed) {
      throw new Error('Escalation is in cooldown period');
    }

    // Check maximum escalations
    const maxEscalationsNotReached = await this.checkMaxEscalations(complaintId, ruleId, client);
    if (!maxEscalationsNotReached) {
      throw new Error('Maximum escalations reached for this rule');
    }

    // Get escalation rule details
    const ruleQuery = `
      SELECT * FROM escalation_rules WHERE id = $1
    `;
    const ruleResult = await client.query(ruleQuery, [ruleId]);
    const rule = ruleResult.rows[0];

    // Create escalation record
    const escalationQuery = `
      INSERT INTO complaint_escalations (
        complaint_id, escalation_rule_id, escalation_level,
        trigger_reason, actions_taken, escalated_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const escalationResult = await client.query(escalationQuery, [
      complaintId,
      ruleId,
      escalationLevel,
      reason,
      rule.escalation_actions,
      escalatedBy
    ]);

    const escalation = escalationResult.rows[0];

    // Execute escalation actions
    await this.executeEscalationActions(complaintId, rule.escalation_actions, client);

    // Update complaint escalation level
    await client.query(
      `UPDATE complaints 
       SET escalation_level = $1, escalated_at = NOW(), escalated_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [escalationLevel, escalatedBy, complaintId]
    );

    return escalation;
  }

  async executeEscalationActions(complaintId, actions, client = this.pool) {
    const actionsData = typeof actions === 'string' ? JSON.parse(actions) : actions;

    for (const action of actionsData) {
      switch (action.action) {
        case 'assign_to_role':
          await this.assignToRole(complaintId, action.role, client);
          break;
        case 'assign_to_user':
          await this.assignToUser(complaintId, action.user_id, client);
          break;
        case 'change_status':
          await this.changeStatus(complaintId, action.status, client);
          break;
        case 'change_priority':
          await this.changePriority(complaintId, action.priority_increase, client);
          break;
        case 'notify_role':
          await this.notifyRole(complaintId, action.role, action.message, client);
          break;
        case 'notify_user':
          await this.notifyUser(complaintId, action.user_id, action.message, client);
          break;
        case 'create_task':
          await this.createTask(complaintId, action.task_data, client);
          break;
        case 'send_email':
          await this.sendEmail(complaintId, action.email_data, client);
          break;
        case 'create_alert':
          await this.createAlert(complaintId, action.alert_data, client);
          break;
      }
    }
  }

  async assignToRole(complaintId, role, client = this.pool) {
    // Find user with the specified role
    const userQuery = `
      SELECT id FROM users 
      WHERE role = $1 AND is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const userResult = await client.query(userQuery, [role]);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      await client.query(
        `UPDATE complaints 
         SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [userId, complaintId]
      );
    }
  }

  async assignToUser(complaintId, userId, client = this.pool) {
    await client.query(
      `UPDATE complaints 
       SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [userId, complaintId]
    );
  }

  async changeStatus(complaintId, status, client = this.pool) {
    await client.query(
      `UPDATE complaints 
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, complaintId]
    );
  }

  async changePriority(complaintId, priorityIncrease, client = this.pool) {
    await client.query(
      `UPDATE complaints 
       SET priority = priority + $1, updated_at = NOW()
       WHERE id = $2`,
      [priorityIncrease, complaintId]
    );
  }

  async notifyRole(complaintId, role, message, client = this.pool) {
    // This would integrate with notification service
    console.log(`Notifying role ${role} about complaint ${complaintId}: ${message}`);
  }

  async notifyUser(complaintId, userId, message, client = this.pool) {
    // This would integrate with notification service
    console.log(`Notifying user ${userId} about complaint ${complaintId}: ${message}`);
  }

  async createTask(complaintId, taskData, client = this.pool) {
    // Create a follow-up task
    const taskQuery = `
      INSERT INTO tasks (
        complaint_id, title, description, priority, assigned_to, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(taskQuery, [
      complaintId,
      taskData.title || 'Escalated Complaint Follow-up',
      taskData.description || 'Follow up on escalated complaint',
      taskData.priority || 'high',
      taskData.assigned_to,
      taskData.due_date || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    ]);
  }

  async sendEmail(complaintId, emailData, client = this.pool) {
    // This would integrate with email service
    console.log(`Sending email for complaint ${complaintId}:`, emailData);
  }

  async createAlert(complaintId, alertData, client = this.pool) {
    // Create system alert
    const alertQuery = `
      INSERT INTO system_alerts (
        complaint_id, alert_type, title, message, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(alertQuery, [
      complaintId,
      alertData.type || 'escalation',
      alertData.title || 'Complaint Escalated',
      alertData.message || `Complaint ${complaintId} has been escalated`,
      alertData.priority || 'high',
      alertData.created_by || 1 // System user
    ]);
  }

  async checkEscalationConditions(complaintId, ruleId, client = this.pool) {
    const query = `
      SELECT check_escalation_conditions($1, $2) as conditions_met
    `;
    const result = await client.query(query, [complaintId, ruleId]);
    return result.rows[0].conditions_met;
  }

  async checkEscalationCooldown(complaintId, ruleId, client = this.pool) {
    const query = `
      SELECT check_escalation_cooldown($1, $2) as cooldown_passed
    `;
    const result = await client.query(query, [complaintId, ruleId]);
    return result.rows[0].cooldown_passed;
  }

  async checkMaxEscalations(complaintId, ruleId, client = this.pool) {
    const query = `
      SELECT check_max_escalations($1, $2) as max_not_reached
    `;
    const result = await client.query(query, [complaintId, ruleId]);
    return result.rows[0].max_not_reached;
  }

  async autoAssignComplaint(complaintId, category) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get auto-assignment rules based on category
      const assignmentRules = await this.getAutoAssignmentRules(category, client);

      if (assignmentRules.length === 0) {
        // No auto-assignment rules, assign to default user/role
        await this.assignToDefaultUser(complaintId, client);
        return;
      }

      // Find the best assignment based on workload and expertise
      const bestAssignment = await this.findBestAssignment(assignmentRules, client);

      if (bestAssignment) {
        await client.query(
          `UPDATE complaints 
           SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [bestAssignment.user_id, complaintId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAutoAssignmentRules(category, client = this.pool) {
    const query = `
      SELECT * FROM auto_assignment_rules 
      WHERE category = $1 AND is_active = true
      ORDER BY priority DESC
    `;
    const result = await client.query(query, [category]);
    return result.rows;
  }

  async findBestAssignment(assignmentRules, client = this.pool) {
    // Simple assignment logic - find user with least active complaints
    const query = `
      SELECT 
        u.id as user_id,
        u.first_name,
        u.last_name,
        COUNT(c.id) as active_complaints
      FROM users u
      LEFT JOIN complaints c ON u.id = c.assigned_to 
        AND c.status IN ('open', 'in_progress')
      WHERE u.is_active = true
        AND u.role IN (${assignmentRules.map(rule => `'${rule.assigned_role}'`).join(',')})
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY active_complaints ASC, RANDOM()
      LIMIT 1
    `;

    const result = await client.query(query);
    return result.rows[0];
  }

  async assignToDefaultUser(complaintId, client = this.pool) {
    // Assign to a default user or supervisor
    const query = `
      SELECT id FROM users 
      WHERE role = 'supervisor' AND is_active = true
      ORDER BY RANDOM()
      LIMIT 1
    `;
    const result = await client.query(query);

    if (result.rows.length > 0) {
      await client.query(
        `UPDATE complaints 
         SET assigned_to = $1, assigned_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [result.rows[0].id, complaintId]
      );
    }
  }

  async getEscalationHistory(complaintId) {
    const query = `
      SELECT 
        ce.*,
        er.rule_name,
        er.description as rule_description,
        u.first_name || ' ' || u.last_name as escalated_by_name
      FROM complaint_escalations ce
      JOIN escalation_rules er ON ce.escalation_rule_id = er.id
      LEFT JOIN users u ON ce.escalated_by = u.id
      WHERE ce.complaint_id = $1
      ORDER BY ce.triggered_at DESC
    `;

    const result = await this.pool.query(query, [complaintId]);
    return result.rows;
  }

  async getEscalationStats(dateRange = {}) {
    const { start_date, end_date } = dateRange;
    
    let whereClause = '';
    const values = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE ce.triggered_at BETWEEN $1 AND $2';
      values.push(start_date, end_date);
    }

    const query = `
      SELECT 
        COUNT(*) as total_escalations,
        COUNT(*) FILTER (WHERE ce.success = true) as successful_escalations,
        COUNT(*) FILTER (WHERE ce.success = false) as failed_escalations,
        AVG(ce.escalation_level) as avg_escalation_level,
        COUNT(DISTINCT ce.complaint_id) as unique_complaints_escalated,
        COUNT(DISTINCT ce.escalation_rule_id) as unique_rules_used
      FROM complaint_escalations ce
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new EscalationService();
