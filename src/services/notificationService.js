const { Pool } = require('pg');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Configure email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendComplaintCreatedNotification(complaint) {
    try {
      const notifications = [];

      // Notify assigned staff member
      if (complaint.assigned_to) {
        const staffNotification = await this.createNotification({
          type: 'complaint_assigned',
          recipient_type: 'user',
          recipient_id: complaint.assigned_to,
          title: 'New Complaint Assigned',
          message: `You have been assigned a new complaint: ${complaint.complaint_number}`,
          data: {
            complaint_id: complaint.id,
            complaint_number: complaint.complaint_number,
            urgency: complaint.urgency,
            category: complaint.category
          },
          channels: ['email', 'dashboard']
        });
        notifications.push(staffNotification);
      }

      // Notify supervisors for high/critical urgency
      if (complaint.urgency === 'high' || complaint.urgency === 'critical') {
        const supervisorNotification = await this.createNotification({
          type: 'high_priority_complaint',
          recipient_type: 'role',
          recipient_role: 'supervisor',
          title: 'High Priority Complaint Created',
          message: `A ${complaint.urgency} priority complaint has been created: ${complaint.complaint_number}`,
          data: {
            complaint_id: complaint.id,
            complaint_number: complaint.complaint_number,
            urgency: complaint.urgency,
            category: complaint.category
          },
          channels: ['email', 'dashboard']
        });
        notifications.push(supervisorNotification);
      }

      // Send email to complainant
      if (complaint.complainant_email) {
        await this.sendComplainantEmail(complaint);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending complaint created notification:', error);
      throw error;
    }
  }

  async sendComplaintStatusUpdateNotification(complaintId, newStatus) {
    try {
      const complaint = await this.getComplaintDetails(complaintId);
      if (!complaint) return;

      const notifications = [];

      // Notify assigned staff
      if (complaint.assigned_to) {
        const staffNotification = await this.createNotification({
          type: 'status_update',
          recipient_type: 'user',
          recipient_id: complaint.assigned_to,
          title: 'Complaint Status Updated',
          message: `Complaint ${complaint.complaint_number} status changed to ${newStatus}`,
          data: {
            complaint_id: complaint.id,
            complaint_number: complaint.complaint_number,
            old_status: complaint.status,
            new_status: newStatus
          },
          channels: ['dashboard']
        });
        notifications.push(staffNotification);
      }

      // Notify complainant
      if (complaint.complainant_email) {
        await this.sendComplainantStatusEmail(complaint, newStatus);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending status update notification:', error);
      throw error;
    }
  }

  async sendSlaBreachNotification(slaLog) {
    try {
      const complaint = await this.getComplaintDetails(slaLog.complaint_id);
      if (!complaint) return;

      const notifications = [];

      // Notify assigned staff
      if (complaint.assigned_to) {
        const staffNotification = await this.createNotification({
          type: 'sla_breach',
          recipient_type: 'user',
          recipient_id: complaint.assigned_to,
          title: 'SLA Breach Alert',
          message: `SLA breached for complaint ${complaint.complaint_number}. Breach duration: ${slaLog.breach_duration_minutes} minutes`,
          data: {
            complaint_id: complaint.id,
            complaint_number: complaint.complaint_number,
            breach_duration: slaLog.breach_duration_minutes,
            breach_severity: slaLog.breach_severity
          },
          channels: ['email', 'dashboard', 'sms'],
          priority: 'high'
        });
        notifications.push(staffNotification);
      }

      // Notify supervisors and managers
      const supervisorNotification = await this.createNotification({
        type: 'sla_breach',
        recipient_type: 'role',
        recipient_role: 'supervisor',
        title: 'SLA Breach Alert',
        message: `SLA breached for complaint ${complaint.complaint_number}. Immediate attention required.`,
        data: {
          complaint_id: complaint.id,
          complaint_number: complaint.complaint_number,
          breach_duration: slaLog.breach_duration_minutes,
          breach_severity: slaLog.breach_severity
        },
        channels: ['email', 'dashboard'],
        priority: 'critical'
      });
      notifications.push(supervisorNotification);

      return notifications;
    } catch (error) {
      console.error('Error sending SLA breach notification:', error);
      throw error;
    }
  }

  async sendEscalationNotification(escalation) {
    try {
      const complaint = await this.getComplaintDetails(escalation.complaint_id);
      if (!complaint) return;

      const notifications = [];

      // Notify escalated staff
      if (complaint.assigned_to) {
        const staffNotification = await this.createNotification({
          type: 'complaint_escalated',
          recipient_type: 'user',
          recipient_id: complaint.assigned_to,
          title: 'Complaint Escalated',
          message: `Complaint ${complaint.complaint_number} has been escalated to level ${escalation.escalation_level}`,
          data: {
            complaint_id: complaint.id,
            complaint_number: complaint.complaint_number,
            escalation_level: escalation.escalation_level,
            escalation_reason: escalation.trigger_reason
          },
          channels: ['email', 'dashboard'],
          priority: 'high'
        });
        notifications.push(staffNotification);
      }

      // Notify management
      const managementNotification = await this.createNotification({
        type: 'complaint_escalated',
        recipient_type: 'role',
        recipient_role: 'manager',
        title: 'Complaint Escalated',
        message: `Complaint ${complaint.complaint_number} has been escalated and requires management attention`,
        data: {
          complaint_id: complaint.id,
          complaint_number: complaint.complaint_number,
          escalation_level: escalation.escalation_level,
          escalation_reason: escalation.trigger_reason
        },
        channels: ['email', 'dashboard'],
        priority: 'high'
      });
      notifications.push(managementNotification);

      return notifications;
    } catch (error) {
      console.error('Error sending escalation notification:', error);
      throw error;
    }
  }

  async createNotification(notificationData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Create notification record
      const notificationQuery = `
        INSERT INTO notifications (
          type, recipient_type, recipient_id, recipient_role,
          title, message, data, channels, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        notificationData.type,
        notificationData.recipient_type,
        notificationData.recipient_id,
        notificationData.recipient_role,
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {}),
        notificationData.channels,
        notificationData.priority || 'medium',
        'pending'
      ];

      const result = await client.query(notificationQuery, values);
      const notification = result.rows[0];

      // Process notification through channels
      await this.processNotificationChannels(notification, client);

      await client.query('COMMIT');
      return notification;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processNotificationChannels(notification, client) {
    const channels = notification.channels || ['dashboard'];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(notification, client);
            break;
          case 'sms':
            await this.sendSmsNotification(notification, client);
            break;
          case 'push':
            await this.sendPushNotification(notification, client);
            break;
          case 'dashboard':
            await this.createDashboardNotification(notification, client);
            break;
        }
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
        // Continue with other channels even if one fails
      }
    }
  }

  async sendEmailNotification(notification, client) {
    try {
      const recipients = await this.getNotificationRecipients(notification, client);
      
      for (const recipient of recipients) {
        if (recipient.email) {
          const mailOptions = {
            from: process.env.FROM_EMAIL || 'noreply@healthcare.com',
            to: recipient.email,
            subject: notification.title,
            html: this.generateEmailTemplate(notification, recipient)
          };

          await this.emailTransporter.sendMail(mailOptions);
          
          // Update notification status
          await client.query(
            `UPDATE notifications 
             SET status = 'sent', sent_at = NOW() 
             WHERE id = $1`,
            [notification.id]
          );
        }
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
      await client.query(
        `UPDATE notifications 
         SET status = 'failed', error_message = $1 
         WHERE id = $2`,
        [error.message, notification.id]
      );
    }
  }

  async sendSmsNotification(notification, client) {
    try {
      const recipients = await this.getNotificationRecipients(notification, client);
      
      for (const recipient of recipients) {
        if (recipient.phone) {
          // Integrate with SMS service (Twilio, AWS SNS, etc.)
          console.log(`SMS to ${recipient.phone}: ${notification.message}`);
          
          // Update notification status
          await client.query(
            `UPDATE notifications 
             SET status = 'sent', sent_at = NOW() 
             WHERE id = $1`,
            [notification.id]
          );
        }
      }
    } catch (error) {
      console.error('Error sending SMS notification:', error);
    }
  }

  async sendPushNotification(notification, client) {
    try {
      const recipients = await this.getNotificationRecipients(notification, client);
      
      for (const recipient of recipients) {
        if (recipient.device_token) {
          // Integrate with push notification service (FCM, APNS, etc.)
          console.log(`Push notification to ${recipient.device_token}: ${notification.message}`);
          
          // Update notification status
          await client.query(
            `UPDATE notifications 
             SET status = 'sent', sent_at = NOW() 
             WHERE id = $1`,
            [notification.id]
          );
        }
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async createDashboardNotification(notification, client) {
    try {
      const recipients = await this.getNotificationRecipients(notification, client);
      
      for (const recipient of recipients) {
        // Create dashboard notification record
        await client.query(
          `INSERT INTO dashboard_notifications (
            user_id, notification_id, title, message, data, is_read
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            recipient.id,
            notification.id,
            notification.title,
            notification.message,
            notification.data,
            false
          ]
        );
      }
      
      // Update notification status
      await client.query(
        `UPDATE notifications 
         SET status = 'sent', sent_at = NOW() 
         WHERE id = $1`,
        [notification.id]
      );
    } catch (error) {
      console.error('Error creating dashboard notification:', error);
    }
  }

  async getNotificationRecipients(notification, client) {
    if (notification.recipient_type === 'user') {
      const query = `SELECT id, email, phone, device_token FROM users WHERE id = $1`;
      const result = await client.query(query, [notification.recipient_id]);
      return result.rows;
    } else if (notification.recipient_type === 'role') {
      const query = `SELECT id, email, phone, device_token FROM users WHERE role = $1 AND is_active = true`;
      const result = await client.query(query, [notification.recipient_role]);
      return result.rows;
    }
    return [];
  }

  generateEmailTemplate(notification, recipient) {
    const data = typeof notification.data === 'string' 
      ? JSON.parse(notification.data) 
      : notification.data;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">${notification.title}</h2>
          <p>Hello ${recipient.first_name || 'User'},</p>
          <p>${notification.message}</p>
          
          ${data.complaint_number ? `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Complaint Details:</h3>
              <p><strong>Complaint Number:</strong> ${data.complaint_number}</p>
              ${data.urgency ? `<p><strong>Urgency:</strong> ${data.urgency}</p>` : ''}
              ${data.category ? `<p><strong>Category:</strong> ${data.category}</p>` : ''}
            </div>
          ` : ''}
          
          <p>Please log in to the complaint management system to view full details and take appropriate action.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendComplainantEmail(complaint) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@healthcare.com',
        to: complaint.complainant_email,
        subject: `Complaint Received - ${complaint.complaint_number}`,
        html: this.generateComplainantEmailTemplate(complaint)
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending complainant email:', error);
    }
  }

  async sendComplainantStatusEmail(complaint, newStatus) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@healthcare.com',
        to: complaint.complainant_email,
        subject: `Complaint Status Update - ${complaint.complaint_number}`,
        html: this.generateStatusUpdateEmailTemplate(complaint, newStatus)
      };

      await this.emailTransporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending status update email:', error);
    }
  }

  generateComplainantEmailTemplate(complaint) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Complaint Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Complaint Received</h2>
          <p>Dear ${complaint.complainant_name},</p>
          <p>Thank you for contacting us. We have received your complaint and it has been assigned the following reference number:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Complaint Reference: ${complaint.complaint_number}</h3>
            <p><strong>Subject:</strong> ${complaint.subject}</p>
            <p><strong>Priority:</strong> ${complaint.urgency}</p>
            <p><strong>Status:</strong> ${complaint.status}</p>
          </div>
          
          <p>We will investigate your complaint and provide a response within our standard timeframes. You will receive updates on the progress of your complaint.</p>
          
          <p>If you have any questions or need to provide additional information, please reference your complaint number: <strong>${complaint.complaint_number}</strong></p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is an automated confirmation. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateStatusUpdateEmailTemplate(complaint, newStatus) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Complaint Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Complaint Status Update</h2>
          <p>Dear ${complaint.complainant_name},</p>
          <p>We would like to inform you that there has been an update to your complaint:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Complaint Reference: ${complaint.complaint_number}</h3>
            <p><strong>Previous Status:</strong> ${complaint.status}</p>
            <p><strong>New Status:</strong> ${newStatus}</p>
          </div>
          
          <p>We will continue to work on resolving your complaint and will keep you updated on any further progress.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              This is an automated update. Please do not reply to this email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getComplaintDetails(complaintId) {
    const query = `
      SELECT 
        c.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone
      FROM complaints c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE c.id = $1
    `;

    const result = await this.pool.query(query, [complaintId]);
    return result.rows[0];
  }

  async getNotificationStats(dateRange = {}) {
    const { start_date, end_date } = dateRange;
    
    let whereClause = '';
    const values = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE created_at BETWEEN $1 AND $2';
      values.push(start_date, end_date);
    }

    const query = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_notifications,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_notifications,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_notifications,
        COUNT(*) FILTER (WHERE channels @> '["email"]') as email_notifications,
        COUNT(*) FILTER (WHERE channels @> '["sms"]') as sms_notifications,
        COUNT(*) FILTER (WHERE channels @> '["push"]') as push_notifications
      FROM notifications
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new NotificationService();
