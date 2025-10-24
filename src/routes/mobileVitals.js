const express = require('express');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateVitalsEntry, validateVitalsUpdate } = require('../middleware/vitalsValidation');
const vitalsService = require('../services/vitalsService');
const anomalyService = require('../services/anomalyService');
const offlineSyncService = require('../services/offlineSyncService');
const emrSyncService = require('../services/emrSyncService');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/vitals
 * Log patient vitals with data validation and anomaly detection
 */
router.post('/', validateVitalsEntry, async (req, res) => {
  try {
    const vitalsData = {
      ...req.body,
      nurse_id: req.user.id,
      device_id: req.headers['x-device-id'] || null
    };

    // Validate vital ranges and detect anomalies
    const validationResult = await vitalsService.validateVitals(vitalsData);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vital signs data',
        errors: validationResult.errors
      });
    }

    // Create vitals record
    const vitals = await vitalsService.createVitals(vitalsData);

    // Detect and log anomalies
    const anomalies = await anomalyService.detectAnomalies(vitals.id, vitalsData);
    
    if (anomalies.length > 0) {
      // Send real-time alerts for critical anomalies
      await anomalyService.sendAnomalyAlerts(vitals.id, anomalies);
    }

    // Sync with EMR if online
    if (req.headers['x-online'] === 'true') {
      await emrSyncService.syncVitalsToEMR(vitals.id);
    }

    res.status(201).json({
      success: true,
      data: {
        ...vitals,
        anomalies: anomalies,
        validation: validationResult
      },
      message: 'Vitals logged successfully'
    });
  } catch (error) {
    console.error('Error logging vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to log vitals'
    });
  }
});

/**
 * GET /api/vitals/patient/:id
 * Get patient vitals history with filtering and pagination
 */
router.get('/patient/:id', async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const { 
      start_date, 
      end_date, 
      vital_type, 
      limit = 50, 
      offset = 0,
      include_anomalies = false 
    } = req.query;

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID'
      });
    }

    const vitals = await vitalsService.getPatientVitals(patientId, {
      start_date,
      end_date,
      vital_type,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include_anomalies: include_anomalies === 'true'
    });

    // Get vital trends
    const trends = await vitalsService.getVitalTrends(patientId, {
      start_date,
      end_date,
      vital_type
    });

    res.json({
      success: true,
      data: {
        vitals: vitals.data,
        trends: trends,
        pagination: vitals.pagination
      }
    });
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch patient vitals'
    });
  }
});

/**
 * POST /api/vitals/offline
 * Cache vitals when offline for later sync
 */
router.post('/offline', async (req, res) => {
  try {
    const { device_id, vitals_data } = req.body;

    if (!device_id || !vitals_data) {
      return res.status(400).json({
        success: false,
        message: 'Device ID and vitals data are required'
      });
    }

    // Store offline vitals
    const offlineVitals = await offlineSyncService.storeOfflineVitals(device_id, vitals_data);

    res.status(201).json({
      success: true,
      data: offlineVitals,
      message: 'Vitals cached offline successfully'
    });
  } catch (error) {
    console.error('Error caching offline vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cache offline vitals'
    });
  }
});

/**
 * GET /api/vitals/anomalies
 * Get critical vitals needing attention
 */
router.get('/anomalies', async (req, res) => {
  try {
    const { 
      severity = 'critical',
      limit = 100,
      include_resolved = false,
      patient_id,
      nurse_id 
    } = req.query;

    const anomalies = await anomalyService.getAnomalies({
      severity,
      limit: parseInt(limit),
      include_resolved: include_resolved === 'true',
      patient_id: patient_id ? parseInt(patient_id) : null,
      nurse_id: nurse_id ? parseInt(nurse_id) : null
    });

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch anomalies'
    });
  }
});

/**
 * PUT /api/vitals/:id
 * Update vitals record
 */
router.put('/:id', validateVitalsUpdate, async (req, res) => {
  try {
    const vitalId = parseInt(req.params.id);
    const updateData = req.body;

    if (isNaN(vitalId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vital ID'
      });
    }

    const updatedVitals = await vitalsService.updateVitals(vitalId, updateData, req.user.id);

    // Re-analyze for anomalies if vitals were updated
    if (Object.keys(updateData).some(key => 
      ['bp_systolic', 'bp_diastolic', 'heart_rate', 'temperature', 'spo2', 'respiratory_rate'].includes(key)
    )) {
      await anomalyService.reanalyzeAnomalies(vitalId);
    }

    res.json({
      success: true,
      data: updatedVitals,
      message: 'Vitals updated successfully'
    });
  } catch (error) {
    console.error('Error updating vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update vitals'
    });
  }
});

/**
 * GET /api/vitals/sync/status
 * Get offline sync status
 */
router.get('/sync/status', async (req, res) => {
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

/**
 * POST /api/vitals/sync
 * Sync offline vitals when back online
 */
router.post('/sync', async (req, res) => {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    const syncResult = await offlineSyncService.syncOfflineVitals(device_id);

    res.json({
      success: true,
      data: syncResult,
      message: 'Offline vitals synced successfully'
    });
  } catch (error) {
    console.error('Error syncing offline vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to sync offline vitals'
    });
  }
});

/**
 * GET /api/vitals/trends/:patientId
 * Get vital trends for a patient
 */
router.get('/trends/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const { 
      vital_type, 
      days = 30,
      include_predictions = false 
    } = req.query;

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID'
      });
    }

    const trends = await vitalsService.getVitalTrends(patientId, {
      vital_type,
      days: parseInt(days),
      include_predictions: include_predictions === 'true'
    });

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching vital trends:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch vital trends'
    });
  }
});

/**
 * POST /api/vitals/bulk
 * Bulk entry for multiple patients
 */
router.post('/bulk', async (req, res) => {
  try {
    const { vitals_data } = req.body;

    if (!Array.isArray(vitals_data) || vitals_data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vitals data array is required'
      });
    }

    const results = await vitalsService.bulkCreateVitals(vitals_data, req.user.id);

    res.status(201).json({
      success: true,
      data: results,
      message: `Bulk vitals created: ${results.successful}/${vitals_data.length} successful`
    });
  } catch (error) {
    console.error('Error creating bulk vitals:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create bulk vitals'
    });
  }
});

/**
 * GET /api/vitals/emr/sync/:patientId
 * Sync patient vitals with EMR system
 */
router.get('/emr/sync/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);

    if (isNaN(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID'
      });
    }

    const syncResult = await emrSyncService.syncPatientVitalsToEMR(patientId);

    res.json({
      success: true,
      data: syncResult,
      message: 'Vitals synced with EMR successfully'
    });
  } catch (error) {
    console.error('Error syncing with EMR:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to sync with EMR'
    });
  }
});

/**
 * POST /api/vitals/anomalies/:id/acknowledge
 * Acknowledge an anomaly alert
 */
router.post('/anomalies/:id/acknowledge', async (req, res) => {
  try {
    const anomalyId = parseInt(req.params.id);
    const { notes } = req.body;

    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid anomaly ID'
      });
    }

    const result = await anomalyService.acknowledgeAnomaly(anomalyId, req.user.id, notes);

    res.json({
      success: true,
      data: result,
      message: 'Anomaly acknowledged successfully'
    });
  } catch (error) {
    console.error('Error acknowledging anomaly:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to acknowledge anomaly'
    });
  }
});

/**
 * POST /api/vitals/anomalies/:id/resolve
 * Resolve an anomaly
 */
router.post('/anomalies/:id/resolve', async (req, res) => {
  try {
    const anomalyId = parseInt(req.params.id);
    const { resolution_notes, action_taken } = req.body;

    if (isNaN(anomalyId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid anomaly ID'
      });
    }

    const result = await anomalyService.resolveAnomaly(anomalyId, req.user.id, {
      resolution_notes,
      action_taken
    });

    res.json({
      success: true,
      data: result,
      message: 'Anomaly resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving anomaly:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to resolve anomaly'
    });
  }
});

/**
 * GET /api/vitals/dashboard
 * Get vitals dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { 
      ward_id,
      nurse_id,
      time_period = '24h' 
    } = req.query;

    const dashboardData = await vitalsService.getDashboardData({
      ward_id: ward_id ? parseInt(ward_id) : null,
      nurse_id: nurse_id ? parseInt(nurse_id) : null,
      time_period
    });

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard data'
    });
  }
});

module.exports = router;
