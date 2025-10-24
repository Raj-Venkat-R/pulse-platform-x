const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const cron = require('node-cron');

class ReminderService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Email configuration
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // SMS configuration (only if credentials are provided)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } else {
      this.twilioClient = null;
      console.log('Twilio credentials not provided - SMS functionality disabled');
    }

    // Start reminder scheduler
    this.startReminderScheduler();
  }

  async scheduleAppointmentReminders(appointmentId) {
    const client = await this.pool.connect();
    try {
      // Get appointment details
      const appointment = await this.getAppointmentById(appointmentId);
      
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Schedule different types of reminders
      const reminders = [
        {
          type: 'email',
          scheduled_time: this.calculateReminderTime(appointment.scheduled_date, 24), // 24 hours before
          message_content: this.generateEmailReminder(appointment)
        },
        {
          type: 'sms',
          scheduled_time: this.calculateReminderTime(appointment.scheduled_date, 2), // 2 hours before
          message_content: this.generateSMSReminder(appointment)
        },
        {
          type: 'email',
          scheduled_time: this.calculateReminderTime(appointment.scheduled_date, 1), // 1 hour before
          message_content: this.generateEmailReminder(appointment, true)
        }
      ];

      // Insert reminders into database
      for (const reminder of reminders) {
        await this.createReminder(appointmentId, reminder);
      }

      return { success: true, reminders_created: reminders.length };
    } finally {
      client.release();
    }
  }

  async getAppointmentById(appointmentId) {
    const query = `
      SELECT 
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.email as patient_email,
        p.phone as patient_phone,
        u.first_name || ' ' || u.last_name as doctor_name,
        u.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1
    `;

    const result = await this.pool.query(query, [appointmentId]);
    return result.rows[0] || null;
  }

  calculateReminderTime(scheduledDate, hoursBefore) {
    const appointmentTime = new Date(scheduledDate);
    const reminderTime = new Date(appointmentTime.getTime() - (hoursBefore * 60 * 60 * 1000));
    return reminderTime;
  }

  generateEmailReminder(appointment, isLastMinute = false) {
    const appointmentTime = new Date(appointment.scheduled_date);
    const dateStr = appointmentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = appointmentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const subject = isLastMinute 
      ? `Final Reminder: Your appointment with Dr. ${appointment.doctor_name} is in 1 hour`
      : `Appointment Reminder: Your appointment with Dr. ${appointment.doctor_name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Appointment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .appointment-details { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
            <p>Hello ${appointment.patient_name},</p>
          </div>
          
          <div class="appointment-details">
            <h2>Your Appointment Details</h2>
            <p><strong>Doctor:</strong> Dr. ${appointment.doctor_name}</p>
            <p><strong>Specialty:</strong> ${appointment.doctor_specialty}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Time:</strong> ${timeStr}</p>
            <p><strong>Appointment Number:</strong> ${appointment.appointment_number}</p>
            ${appointment.reason_for_visit ? `<p><strong>Reason:</strong> ${appointment.reason_for_visit}</p>` : ''}
          </div>

          ${isLastMinute ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #856404; margin: 0;">Important Reminders:</h3>
            <ul style="color: #856404;">
              <li>Please arrive 15 minutes early</li>
              <li>Bring a valid ID and insurance card</li>
              <li>Bring a list of current medications</li>
            </ul>
          </div>
          ` : ''}

          <p>If you need to reschedule or cancel your appointment, please contact us as soon as possible.</p>
          
          <div class="footer">
            <p>Thank you for choosing our healthcare services.</p>
            <p>For any questions, please contact us at (555) 123-4567</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return { subject, html };
  }

  generateSMSReminder(appointment) {
    const appointmentTime = new Date(appointment.scheduled_date);
    const dateStr = appointmentTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    const timeStr = appointmentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `Hi ${appointment.patient_name}, your appointment with Dr. ${appointment.doctor_name} is on ${dateStr} at ${timeStr}. Appointment #${appointment.appointment_number}. Reply STOP to opt out.`;
  }

  async createReminder(appointmentId, reminderData) {
    const query = `
      INSERT INTO appointment_reminders (
        appointment_id, reminder_type, scheduled_time, message_content, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;

    const values = [
      appointmentId,
      reminderData.type,
      reminderData.scheduled_time,
      JSON.stringify(reminderData.message_content)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async sendAppointmentReminder(appointmentId, reminderType = 'sms') {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get appointment and pending reminders
      const appointment = await this.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Find pending reminder
      const reminderQuery = `
        SELECT * FROM appointment_reminders 
        WHERE appointment_id = $1 AND reminder_type = $2 AND status = 'pending'
        ORDER BY scheduled_time ASC
        LIMIT 1
      `;
      
      const reminderResult = await client.query(reminderQuery, [appointmentId, reminderType]);
      const reminder = reminderResult.rows[0];

      if (!reminder) {
        throw new Error('No pending reminder found');
      }

      // Send reminder based on type
      let deliveryStatus = 'delivered';
      let errorMessage = null;

      try {
        if (reminderType === 'email') {
          await this.sendEmailReminder(appointment, reminder);
        } else if (reminderType === 'sms') {
          await this.sendSMSReminder(appointment, reminder);
        }
      } catch (error) {
        deliveryStatus = 'failed';
        errorMessage = error.message;
        throw error;
      }

      // Update reminder status
      const updateQuery = `
        UPDATE appointment_reminders 
        SET sent_time = NOW(), status = 'sent', delivery_status = $1, error_message = $2
        WHERE id = $3
      `;
      
      await client.query(updateQuery, [deliveryStatus, errorMessage, reminder.id]);

      await client.query('COMMIT');
      return { success: true, reminder_id: reminder.id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async sendEmailReminder(appointment, reminder) {
    const messageContent = JSON.parse(reminder.message_content);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@healthcare.com',
      to: appointment.patient_email,
      subject: messageContent.subject,
      html: messageContent.html
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  async sendSMSReminder(appointment, reminder) {
    if (!this.twilioClient) {
      console.log('SMS functionality disabled - Twilio not configured');
      return;
    }

    const messageContent = JSON.parse(reminder.message_content);
    
    await this.twilioClient.messages.create({
      body: messageContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: appointment.patient_phone
    });
  }

  startReminderScheduler() {
    // Run every minute to check for due reminders
    cron.schedule('* * * * *', async () => {
      try {
        await this.processDueReminders();
      } catch (error) {
        console.error('Error processing reminders:', error);
      }
    });

    // Run every hour to clean up old reminders
    cron.schedule('0 * * * *', async () => {
      try {
        await this.cleanupOldReminders();
      } catch (error) {
        console.error('Error cleaning up reminders:', error);
      }
    });
  }

  async processDueReminders() {
    const query = `
      SELECT ar.*, a.scheduled_date, p.email as patient_email, p.phone as patient_phone
      FROM appointment_reminders ar
      JOIN appointments a ON ar.appointment_id = a.id
      JOIN patients p ON a.patient_id = p.id
      WHERE ar.status = 'pending' 
      AND ar.scheduled_time <= NOW()
      AND a.status IN ('scheduled', 'confirmed')
    `;

    const result = await this.pool.query(query);
    const dueReminders = result.rows;

    for (const reminder of dueReminders) {
      try {
        await this.sendAppointmentReminder(reminder.appointment_id, reminder.reminder_type);
        console.log(`Sent ${reminder.reminder_type} reminder for appointment ${reminder.appointment_id}`);
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
        
        // Update reminder with error
        await this.pool.query(
          'UPDATE appointment_reminders SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', error.message, reminder.id]
        );
      }
    }
  }

  async cleanupOldReminders() {
    // Delete reminders older than 30 days
    const query = `
      DELETE FROM appointment_reminders 
      WHERE created_at < NOW() - INTERVAL '30 days'
      AND status IN ('sent', 'failed')
    `;

    const result = await this.pool.query(query);
    console.log(`Cleaned up ${result.rowCount} old reminders`);
  }

  async getReminderStats(startDate, endDate) {
    const query = `
      SELECT 
        reminder_type,
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (sent_time - scheduled_time))/60) as avg_delay_minutes
      FROM appointment_reminders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY reminder_type, status
    `;

    const result = await this.pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  async resendFailedReminders() {
    const query = `
      SELECT * FROM appointment_reminders 
      WHERE status = 'failed' 
      AND retry_count < 3
      AND created_at > NOW() - INTERVAL '24 hours'
    `;

    const result = await this.pool.query(query);
    const failedReminders = result.rows;

    for (const reminder of failedReminders) {
      try {
        await this.sendAppointmentReminder(reminder.appointment_id, reminder.reminder_type);
        
        // Reset retry count on success
        await this.pool.query(
          'UPDATE appointment_reminders SET retry_count = 0 WHERE id = $1',
          [reminder.id]
        );
      } catch (error) {
        // Increment retry count
        await this.pool.query(
          'UPDATE appointment_reminders SET retry_count = retry_count + 1 WHERE id = $1',
          [reminder.id]
        );
      }
    }
  }
}

module.exports = new ReminderService();