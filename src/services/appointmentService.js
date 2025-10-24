const { Pool } = require('pg');
const moment = require('moment');

class AppointmentService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async createOrFindPatient(patientData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Check if patient already exists
      let patient = await this.findPatientByPhone(patientData.phone);
      
      if (!patient) {
        // Create new patient
        const patientQuery = `
          INSERT INTO patients (
            first_name, last_name, date_of_birth, gender, phone, email,
            address, emergency_contact_name, emergency_contact_phone,
            medical_history, insurance_provider, insurance_number
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *
        `;

        const values = [
          patientData.first_name,
          patientData.last_name,
          patientData.date_of_birth,
          patientData.gender,
          patientData.phone,
          patientData.email,
          patientData.address,
          patientData.emergency_contact_name,
          patientData.emergency_contact_phone,
          JSON.stringify(patientData.medical_history || {}),
          patientData.insurance_provider,
          patientData.insurance_number
        ];

        const result = await client.query(patientQuery, values);
        patient = result.rows[0];
      } else {
        // Update existing patient if new information provided
        if (patientData.email && !patient.email) {
          await client.query(
            'UPDATE patients SET email = $1, updated_at = NOW() WHERE id = $2',
            [patientData.email, patient.id]
          );
        }
      }

      await client.query('COMMIT');
      return patient;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findPatientByPhone(phone) {
    const query = 'SELECT * FROM patients WHERE phone = $1';
    const result = await this.pool.query(query, [phone]);
    return result.rows[0] || null;
  }

  async checkAvailability({ doctor_id, date, duration = 30 }) {
    const client = await this.pool.connect();
    try {
      // Get doctor's availability for the date
      const availabilityQuery = `
        SELECT * FROM availability 
        WHERE doctor_id = $1 AND date = $2 AND is_available = true
        ORDER BY start_time
      `;
      
      const availabilityResult = await client.query(availabilityQuery, [doctor_id, date]);
      
      if (availabilityResult.rows.length === 0) {
        return {
          available: false,
          message: 'Doctor is not available on this date'
        };
      }

      // Get existing appointments for the date
      const appointmentsQuery = `
        SELECT scheduled_date, duration_minutes 
        FROM appointments 
        WHERE doctor_id = $1 
        AND DATE(scheduled_date) = $2 
        AND status IN ('scheduled', 'confirmed', 'in_progress')
      `;
      
      const appointmentsResult = await client.query(appointmentsQuery, [doctor_id, date]);
      
      // Calculate available time slots
      const availableSlots = this.calculateAvailableSlots(
        availabilityResult.rows,
        appointmentsResult.rows,
        duration
      );

      return {
        available: availableSlots.length > 0,
        available_slots: availableSlots,
        suggested_times: availableSlots.slice(0, 5) // Top 5 suggestions
      };
    } finally {
      client.release();
    }
  }

  calculateAvailableSlots(availability, appointments, duration) {
    const slots = [];
    
    for (const avail of availability) {
      const startTime = moment(avail.date + ' ' + avail.start_time);
      const endTime = moment(avail.date + ' ' + avail.end_time);
      
      // Generate 30-minute slots
      let currentTime = startTime.clone();
      while (currentTime.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
        const slotStart = currentTime.clone();
        const slotEnd = currentTime.clone().add(duration, 'minutes');
        
        // Check if slot conflicts with existing appointments
        const hasConflict = appointments.some(apt => {
          const aptStart = moment(apt.scheduled_date);
          const aptEnd = aptStart.clone().add(apt.duration_minutes, 'minutes');
          
          return slotStart.isBefore(aptEnd) && slotEnd.isAfter(aptStart);
        });
        
        if (!hasConflict) {
          slots.push({
            start_time: slotStart.format('YYYY-MM-DD HH:mm:ss'),
            end_time: slotEnd.format('YYYY-MM-DD HH:mm:ss'),
            duration_minutes: duration
          });
        }
        
        currentTime.add(30, 'minutes'); // Move to next 30-minute slot
      }
    }
    
    return slots;
  }

  async getAvailability({ doctor_id, date, duration, specialty, location_id }) {
    const client = await this.pool.connect();
    try {
      let query = `
        SELECT 
          u.id as doctor_id,
          u.first_name || ' ' || u.last_name as doctor_name,
          u.specialty,
          a.date,
          a.start_time,
          a.end_time,
          a.slot_duration_minutes,
          a.max_patients_per_slot
        FROM availability a
        JOIN users u ON a.doctor_id = u.id
        WHERE a.date = $1 AND a.is_available = true
      `;
      
      const values = [date];
      let paramCount = 1;

      if (doctor_id) {
        paramCount++;
        query += ` AND u.id = $${paramCount}`;
        values.push(doctor_id);
      }

      if (specialty) {
        paramCount++;
        query += ` AND u.specialty = $${paramCount}`;
        values.push(specialty);
      }

      if (location_id) {
        paramCount++;
        query += ` AND u.location_id = $${paramCount}`;
        values.push(location_id);
      }

      query += ` ORDER BY u.specialty, a.start_time`;

      const result = await client.query(query, values);
      
      // Group by doctor and calculate available slots
      const availabilityByDoctor = {};
      
      for (const row of result.rows) {
        if (!availabilityByDoctor[row.doctor_id]) {
          availabilityByDoctor[row.doctor_id] = {
            doctor_id: row.doctor_id,
            doctor_name: row.doctor_name,
            specialty: row.specialty,
            available_slots: []
          };
        }

        // Calculate available time slots for this doctor
        const slots = await this.calculateDoctorSlots(row, duration);
        availabilityByDoctor[row.doctor_id].available_slots.push(...slots);
      }

      return Object.values(availabilityByDoctor);
    } finally {
      client.release();
    }
  }

  async calculateDoctorSlots(availability, duration) {
    const slots = [];
    const startTime = moment(availability.date + ' ' + availability.start_time);
    const endTime = moment(availability.date + ' ' + availability.end_time);
    
    let currentTime = startTime.clone();
    while (currentTime.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
      slots.push({
        start_time: currentTime.format('YYYY-MM-DD HH:mm:ss'),
        end_time: currentTime.clone().add(duration, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        duration_minutes: duration
      });
      
      currentTime.add(30, 'minutes');
    }
    
    return slots;
  }

  async createAppointment(appointmentData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const appointmentQuery = `
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_type, scheduled_date, duration_minutes,
          status, priority, payment_status, payment_amount, payment_method,
          payment_reference, reason_for_visit, symptoms, urgency_level,
          special_requirements, booking_source, booking_reference,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const values = [
        appointmentData.patient_id,
        appointmentData.doctor_id,
        appointmentData.appointment_type || 'online',
        appointmentData.scheduled_date,
        appointmentData.duration_minutes || 30,
        appointmentData.status || 'scheduled',
        appointmentData.priority || 0,
        appointmentData.payment_status || 'pending',
        appointmentData.payment_amount || 0,
        appointmentData.payment_method,
        appointmentData.payment_reference,
        appointmentData.reason_for_visit,
        appointmentData.symptoms,
        appointmentData.urgency_level || 'medium',
        appointmentData.special_requirements,
        appointmentData.booking_source || 'website',
        appointmentData.booking_reference,
        appointmentData.created_by
      ];

      const result = await client.query(appointmentQuery, values);
      const appointment = result.rows[0];

      await client.query('COMMIT');
      return appointment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAppointmentById(appointmentId) {
    const query = `
      SELECT 
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        p.email as patient_email,
        u.first_name || ' ' || u.last_name as doctor_name,
        u.specialty as doctor_specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.doctor_id = u.id
      WHERE a.id = $1
    `;

    const result = await this.pool.query(query, [appointmentId]);
    
    if (result.rows.length === 0) {
      throw new Error('Appointment not found');
    }

    return result.rows[0];
  }

  async updateAppointment(appointmentId, updateData, updatedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      const allowedFields = [
        'status', 'priority', 'reason_for_visit', 'symptoms', 'urgency_level',
        'special_requirements', 'notes', 'follow_up_required', 'follow_up_date'
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
      updateFields.push(`updated_by = $${paramCount}`);
      values.push(updatedBy);

      paramCount++;
      updateFields.push(`updated_at = NOW()`);

      // Add WHERE clause
      paramCount++;
      values.push(appointmentId);

      const query = `
        UPDATE appointments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Appointment not found');
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

  async cancelAppointment(appointmentId, cancellationData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update appointment status
      const updateQuery = `
        UPDATE appointments 
        SET status = 'cancelled', notes = COALESCE(notes, '') || $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const cancellationNote = `\nCancelled on ${new Date().toISOString()}. Reason: ${cancellationData.reason}`;
      const result = await client.query(updateQuery, [cancellationNote, appointmentId]);

      if (result.rows.length === 0) {
        throw new Error('Appointment not found');
      }

      // Process refund if required
      let refundResult = null;
      if (cancellationData.refund_required && result.rows[0].payment_status === 'paid') {
        refundResult = await this.processRefund(appointmentId, result.rows[0]);
      }

      await client.query('COMMIT');
      
      return {
        appointment: result.rows[0],
        refund: refundResult
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async processRefund(appointmentId, appointment) {
    // Implement refund logic here
    // This would integrate with your payment provider
    return {
      refund_id: `ref_${Date.now()}`,
      amount: appointment.payment_amount,
      status: 'processed'
    };
  }

  async sendBookingConfirmation(appointmentId) {
    const appointment = await this.getAppointmentById(appointmentId);
    
    // Send SMS/Email confirmation
    // This would integrate with your notification service
    console.log(`Sending confirmation for appointment ${appointment.appointment_number}`);
    
    return true;
  }

  async getAppointmentStats({ start_date, end_date, doctor_id }) {
    let whereClause = '';
    const values = [];
    
    if (start_date && end_date) {
      whereClause = 'WHERE scheduled_date BETWEEN $1 AND $2';
      values.push(start_date, end_date);
    }

    if (doctor_id) {
      const paramCount = values.length + 1;
      whereClause += whereClause ? ` AND doctor_id = $${paramCount}` : `WHERE doctor_id = $${paramCount}`;
      values.push(doctor_id);
    }

    const query = `
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show_appointments,
        COUNT(*) FILTER (WHERE appointment_type = 'online') as online_appointments,
        COUNT(*) FILTER (WHERE appointment_type = 'walkin') as walkin_appointments,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_processing_hours
      FROM appointments
      ${whereClause}
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAvailableDoctors({ specialty, location_id, available_date }) {
    let query = `
      SELECT DISTINCT
        u.id,
        u.first_name || ' ' || u.last_name as name,
        u.specialty,
        u.location_id,
        COUNT(a.id) as available_slots
      FROM users u
      LEFT JOIN availability a ON u.id = a.doctor_id 
        AND a.is_available = true
        ${available_date ? 'AND a.date = $1' : ''}
      WHERE u.role = 'doctor' AND u.is_active = true
    `;
    
    const values = [];
    if (available_date) {
      values.push(available_date);
    }

    if (specialty) {
      const paramCount = values.length + 1;
      query += ` AND u.specialty = $${paramCount}`;
      values.push(specialty);
    }

    if (location_id) {
      const paramCount = values.length + 1;
      query += ` AND u.location_id = $${paramCount}`;
      values.push(location_id);
    }

    query += ` GROUP BY u.id, u.first_name, u.last_name, u.specialty, u.location_id
               ORDER BY available_slots DESC, u.first_name`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }
}

module.exports = new AppointmentService();