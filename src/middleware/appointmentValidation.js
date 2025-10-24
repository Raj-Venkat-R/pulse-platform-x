const { body, validationResult } = require('express-validator');

// Validation middleware for appointment booking
const validateAppointmentBooking = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
  body('appointment_type').isIn(['online', 'walkin', 'kiosk']).withMessage('Invalid appointment type'),
  body('scheduled_date').isISO8601().withMessage('Valid scheduled date is required'),
  body('service_id').optional().isInt({ min: 1 }).withMessage('Valid service ID required'),
  body('doctor_id').optional().isInt({ min: 1 }).withMessage('Valid doctor ID required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for offline sync
const validateOfflineSync = [
  body('offlineAppointments').isArray({ min: 1 }).withMessage('Offline appointments array is required'),
  body('offlineAppointments.*.patient_id').isInt({ min: 1 }).withMessage('Valid patient ID required for each appointment'),
  body('offlineAppointments.*.scheduled_date').isISO8601().withMessage('Valid scheduled date required for each appointment'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for queue prioritization
const validateQueuePrioritization = [
  body('queue_id').isInt({ min: 1 }).withMessage('Valid queue ID is required'),
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
  body('priority_score').isFloat({ min: 0, max: 1 }).withMessage('Priority score must be between 0-1'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for queue management
const validateQueueManagement = [
  body('doctor_id').isInt({ min: 1 }).withMessage('Valid doctor ID is required'),
  body('queue_id').optional().isInt({ min: 1 }).withMessage('Valid queue ID required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateAppointmentBooking,
  validateOfflineSync,
  validateQueuePrioritization,
  validateQueueManagement
};
