const express = require('express');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateAppointmentBooking, validateAvailabilityQuery, validateQueueToken } = require('../middleware/validation');
const appointmentService = require('../services/appointmentService');
const queueService = require('../services/queueService');
const syncService = require('../services/syncService');
const reminderService = require('../services/reminderService');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/appointments
 * Book a new appointment (online or offline)
 */
router.post('/', validateAppointmentBooking, async (req, res) => {
  try {
    const appointmentData = {
      ...req.body,
      created_by: req.user.id,
      appointment_type: req.body.appointment_type || 'online'
    };

    const appointment = await appointmentService.createAppointment(appointmentData);
    
    // Schedule reminders if appointment is confirmed
    if (appointment.status === 'confirmed') {
      await reminderService.scheduleReminders(appointment.id);
    }

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
 * Check available slots for a given date and service
 */
router.get('/availability', validateAvailabilityQuery, async (req, res) => {
  try {
    const { date, service_id, location_id, provider_id } = req.query;
    
    const availability = await appointmentService.getAvailability({
      date: new Date(date),
      service_id: service_id ? parseInt(service_id) : null,
      location_id: location_id ? parseInt(location_id) : null,
      provider_id: provider_id ? parseInt(provider_id) : null
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
 * POST /api/appointments/offline
 * Store an offline appointment (to be synced later)
 */
router.post('/offline', async (req, res) => {
  try {
    const offlineData = {
      ...req.body,
      performed_by: req.user.id,
      device_id: req.headers['x-device-id'] || 'unknown',
      location_id: req.user.location_id || null
    };

    const syncLog = await syncService.createOfflineAppointment(offlineData);

    res.status(201).json({
      success: true,
      data: {
        client_temp_id: syncLog.client_temp_id,
        sync_log_id: syncLog.id
      },
      message: 'Offline appointment stored successfully'
    });
  } catch (error) {
    console.error('Error storing offline appointment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to store offline appointment'
    });
  }
});

/**
 * GET /api/appointments/queue
 * Get current queue for a given date and location
 */
router.get('/queue', async (req, res) => {
  try {
    const { date, location_id, service_id } = req.query;
    
    const queue = await queueService.getCurrentQueue({
      date: date ? new Date(date) : new Date(),
      location_id: location_id ? parseInt(location_id) : req.user.location_id,
      service_id: service_id ? parseInt(service_id) : null
    });

    res.json({
      success: true,
      data: queue
    });
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get queue'
    });
  }
});

/**
 * POST /api/appointments/queue
 * Generate a walk-in token
 */
router.post('/queue', validateQueueToken, async (req, res) => {
  try {
    const tokenData = {
      ...req.body,
      location_id: req.body.location_id || req.user.location_id,
      created_by: req.user.id,
      channel: req.body.channel || 'walk_in'
    };

    const token = await queueService.generateToken(tokenData);

    res.status(201).json({
      success: true,
      data: token,
      message: 'Queue token generated successfully'
    });
  } catch (error) {
    console.error('Error generating queue token:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate queue token'
    });
  }
});

/**
 * PUT /api/appointments/:id/status
 * Update appointment status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const appointment = await appointmentService.updateAppointmentStatus(
      parseInt(id),
      status,
      req.user.id,
      notes
    );

    // Handle status-specific actions
    if (status === 'confirmed') {
      await reminderService.scheduleReminders(parseInt(id));
    } else if (status === 'cancelled') {
      await reminderService.cancelReminders(parseInt(id));
    }

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment status updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update appointment status'
    });
  }
});

/**
 * GET /api/appointments/sync
 * For offline devices to get pending appointments and submit offline ones
 */
router.get('/sync', async (req, res) => {
  try {
    const { device_id, last_sync } = req.query;
    
    const syncData = await syncService.getSyncData({
      device_id: device_id || req.headers['x-device-id'],
      location_id: req.user.location_id,
      last_sync: last_sync ? new Date(last_sync) : null
    });

    res.json({
      success: true,
      data: syncData
    });
  } catch (error) {
    console.error('Error getting sync data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get sync data'
    });
  }
});

/**
 * POST /api/appointments/sync
 * Submit offline appointments for synchronization
 */
router.post('/sync', async (req, res) => {
  try {
    const syncData = {
      ...req.body,
      device_id: req.headers['x-device-id'] || 'unknown',
      performed_by: req.user.id,
      location_id: req.user.location_id
    };

    const result = await syncService.processOfflineSync(syncData);

    res.json({
      success: true,
      data: result,
      message: 'Offline data synchronized successfully'
    });
  } catch (error) {
    console.error('Error processing offline sync:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process offline sync'
    });
  }
});

module.exports = router;
