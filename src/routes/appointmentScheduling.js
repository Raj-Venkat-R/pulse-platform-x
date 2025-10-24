const express = require('express');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateAppointmentBooking, validateQueueManagement } = require('../middleware/appointmentValidation');
const appointmentService = require('../services/appointmentService');
const queueService = require('../services/queueService');
const paymentService = require('../services/paymentService');
const reminderService = require('../services/reminderService');
const offlineSyncService = require('../services/offlineSyncService');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/appointments/book
 * Handle online appointment booking with patient details and payment
 */
router.post('/book', validateAppointmentBooking, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      created_by: req.user.id,
      appointment_type: 'online',
      booking_source: 'website'
    };

    // Create or find patient
    let patientId = bookingData.patient_id;
    if (!patientId && bookingData.patient_details) {
      const patient = await appointmentService.createOrFindPatient(bookingData.patient_details);
      patientId = patient.id;
    }

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient information is required'
      });
    }

    // Check availability
    const availability = await appointmentService.checkAvailability({
      doctor_id: bookingData.doctor_id,
      date: bookingData.scheduled_date,
      duration: bookingData.duration_minutes || 30
    });

    if (!availability.available) {
      return res.status(400).json({
        success: false,
        message: 'Selected time slot is not available',
        suggested_times: availability.suggested_times
      });
    }

    // Process payment if required
    let paymentResult = null;
    if (bookingData.payment_required && bookingData.payment_amount > 0) {
      paymentResult = await paymentService.processPayment({
        amount: bookingData.payment_amount,
        payment_method: bookingData.payment_method,
        patient_id: patientId,
        appointment_data: bookingData
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Payment processing failed',
          error: paymentResult.error
        });
      }
    }

    // Create appointment
    const appointment = await appointmentService.createAppointment({
      ...bookingData,
      patient_id: patientId,
      payment_status: paymentResult ? 'paid' : 'pending',
      payment_reference: paymentResult?.transaction_id
    });

    // Schedule reminders
    await reminderService.scheduleAppointmentReminders(appointment.id);

    // Send confirmation
    await appointmentService.sendBookingConfirmation(appointment.id);

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully'
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to book appointment'
    });
  }
});

/**
 * GET /api/appointments/availability
 * Check real-time availability across doctors
 */
router.get('/availability', async (req, res) => {
  try {
    const { 
      doctor_id, 
      date, 
      duration = 30, 
      specialty,
      location_id 
    } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const availability = await appointmentService.getAvailability({
      doctor_id: doctor_id ? parseInt(doctor_id) : null,
      date: new Date(date),
      duration: parseInt(duration),
      specialty,
      location_id: location_id ? parseInt(location_id) : null
    });

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to check availability'
    });
  }
});

/**
 * POST /api/appointments/offline-sync
 * Sync offline/kiosk registrations
 */
router.post('/offline-sync', async (req, res) => {
  try {
    const { device_id, sync_data } = req.body;

    if (!device_id || !sync_data) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and sync data are required'
      });
    }

    const syncResult = await offlineSyncService.processOfflineSync(device_id, sync_data);

    res.json({
      success: true,
      data: syncResult,
      message: 'Offline data synced successfully'
    });
  } catch (error) {
    console.error('Error syncing offline data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to sync offline data'
    });
  }
});

/**
 * GET /api/queue/current
 * Get current queue status with real-time updates
 */
router.get('/queue/current', async (req, res) => {
  try {
    const { doctor_id, location_id } = req.query;

    const queueStatus = await queueService.getCurrentQueueStatus({
      doctor_id: doctor_id ? parseInt(doctor_id) : null,
      location_id: location_id ? parseInt(location_id) : null
    });

    res.json({
      success: true,
      data: queueStatus
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get queue status'
    });
  }
});

/**
 * POST /api/queue/prioritize
 * AI-based queue prioritization algorithm
 */
router.post('/queue/prioritize', validateQueueManagement, async (req, res) => {
  try {
    const { doctor_id, queue_id } = req.body;

    const prioritizationResult = await queueService.prioritizeQueue({
      doctor_id: parseInt(doctor_id),
      queue_id: queue_id ? parseInt(queue_id) : null,
      user_id: req.user.id
    });

    res.json({
      success: true,
      data: prioritizationResult,
      message: 'Queue prioritized successfully'
    });
  } catch (error) {
    console.error('Error prioritizing queue:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to prioritize queue'
    });
  }
});

/**
 * POST /api/queue/join
 * Join the queue (for walk-in patients)
 */
router.post('/queue/join', async (req, res) => {
  try {
    const queueData = {
      ...req.body,
      created_by: req.user.id
    };

    const queueEntry = await queueService.joinQueue(queueData);

    res.status(201).json({
      success: true,
      data: queueEntry,
      message: 'Successfully joined the queue'
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to join queue'
    });
  }
});

/**
 * PUT /api/queue/:id/status
 * Update queue status (called, in_consultation, completed)
 */
router.put('/queue/:id/status', async (req, res) => {
  try {
    const queueId = parseInt(req.params.id);
    const { status, notes } = req.body;

    if (!queueId || isNaN(queueId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid queue ID'
      });
    }

    const updatedQueue = await queueService.updateQueueStatus(queueId, {
      status,
      notes,
      updated_by: req.user.id
    });

    res.json({
      success: true,
      data: updatedQueue,
      message: 'Queue status updated successfully'
    });
  } catch (error) {
    console.error('Error updating queue status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update queue status'
    });
  }
});

/**
 * GET /api/appointments/:id
 * Get appointment details
 */
router.get('/:id', async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    const appointment = await appointmentService.getAppointmentById(appointmentId);

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Appointment not found'
    });
  }
});

/**
 * PUT /api/appointments/:id
 * Update appointment details
 */
router.put('/:id', async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    const updateData = req.body;
    const updatedAppointment = await appointmentService.updateAppointment(
      appointmentId, 
      updateData, 
      req.user.id
    );

    res.json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update appointment'
    });
  }
});

/**
 * POST /api/appointments/:id/cancel
 * Cancel an appointment
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { reason, refund_required } = req.body;
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    const cancellationResult = await appointmentService.cancelAppointment(
      appointmentId, 
      {
        reason,
        refund_required,
        cancelled_by: req.user.id
      }
    );

    res.json({
      success: true,
      data: cancellationResult,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel appointment'
    });
  }
});

/**
 * GET /api/appointments/stats
 * Get appointment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date, doctor_id } = req.query;

    const stats = await appointmentService.getAppointmentStats({
      start_date,
      end_date,
      doctor_id: doctor_id ? parseInt(doctor_id) : null
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
  }
});

/**
 * POST /api/appointments/:id/remind
 * Send appointment reminder
 */
router.post('/:id/remind', async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { reminder_type = 'sms' } = req.body;
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }

    const reminderResult = await reminderService.sendAppointmentReminder(
      appointmentId, 
      reminder_type
    );

    res.json({
      success: true,
      data: reminderResult,
      message: 'Reminder sent successfully'
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send reminder'
    });
  }
});

/**
 * GET /api/doctors
 * Get available doctors
 */
router.get('/doctors', async (req, res) => {
  try {
    const { specialty, location_id, available_date } = req.query;

    const doctors = await appointmentService.getAvailableDoctors({
      specialty,
      location_id: location_id ? parseInt(location_id) : null,
      available_date: available_date ? new Date(available_date) : null
    });

    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch doctors'
    });
  }
});

/**
 * GET /api/offline-sync/status
 * Get offline sync status for a device
 */
router.get('/offline-sync/status', async (req, res) => {
  try {
    const { device_id } = req.query;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const syncStatus = await offlineSyncService.getSyncStatus(device_id);

    res.json({
      success: true,
      data: syncStatus
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get sync status'
    });
  }
});

module.exports = router;
