const { body, validationResult } = require('express-validator');

// Validation middleware for complaint submission
const validateComplaintSubmission = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
  body('complaint_text').isLength({ min: 10, max: 2000 }).withMessage('Complaint text must be between 10 and 2000 characters'),
  body('category').isIn(['service_quality', 'billing', 'appointment', 'staff_behavior', 'facility', 'medical_care', 'other']).withMessage('Invalid category'),
  body('urgency').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid urgency level'),
  body('source').isIn(['web', 'mobile', 'phone', 'email', 'walk_in']).withMessage('Invalid source'),
  
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

// Validation middleware for complaint update
const validateComplaintUpdate = [
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
  body('assigned_to').optional().isInt({ min: 1 }).withMessage('Valid assigned user ID required'),
  
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

// Validation middleware for vitals entry
const validateVitalsEntry = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
  body('bp_systolic').optional().isInt({ min: 50, max: 300 }).withMessage('Systolic BP must be between 50-300 mmHg'),
  body('bp_diastolic').optional().isInt({ min: 30, max: 200 }).withMessage('Diastolic BP must be between 30-200 mmHg'),
  body('heart_rate').optional().isInt({ min: 30, max: 300 }).withMessage('Heart rate must be between 30-300 bpm'),
  body('temperature').optional().isFloat({ min: 30.0, max: 45.0 }).withMessage('Temperature must be between 30.0-45.0°C'),
  body('spo2').optional().isInt({ min: 50, max: 100 }).withMessage('Oxygen saturation must be between 50-100%'),
  body('respiratory_rate').optional().isInt({ min: 5, max: 60 }).withMessage('Respiratory rate must be between 5-60 breaths/min'),
  body('weight').optional().isFloat({ min: 0.5, max: 500.0 }).withMessage('Weight must be between 0.5-500.0 kg'),
  body('height').optional().isFloat({ min: 30.0, max: 250.0 }).withMessage('Height must be between 30.0-250.0 cm'),
  body('pain_level').optional().isInt({ min: 0, max: 10 }).withMessage('Pain level must be between 0-10'),
  body('blood_glucose').optional().isFloat({ min: 20.0, max: 1000.0 }).withMessage('Blood glucose must be between 20.0-1000.0 mg/dL'),
  
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

// Validation middleware for vitals update
const validateVitalsUpdate = [
  body('bp_systolic').optional().isInt({ min: 50, max: 300 }).withMessage('Systolic BP must be between 50-300 mmHg'),
  body('bp_diastolic').optional().isInt({ min: 30, max: 200 }).withMessage('Diastolic BP must be between 30-200 mmHg'),
  body('heart_rate').optional().isInt({ min: 30, max: 300 }).withMessage('Heart rate must be between 30-300 bpm'),
  body('temperature').optional().isFloat({ min: 30.0, max: 45.0 }).withMessage('Temperature must be between 30.0-45.0°C'),
  body('spo2').optional().isInt({ min: 50, max: 100 }).withMessage('Oxygen saturation must be between 50-100%'),
  body('respiratory_rate').optional().isInt({ min: 5, max: 60 }).withMessage('Respiratory rate must be between 5-60 breaths/min'),
  body('weight').optional().isFloat({ min: 0.5, max: 500.0 }).withMessage('Weight must be between 0.5-500.0 kg'),
  body('height').optional().isFloat({ min: 30.0, max: 250.0 }).withMessage('Height must be between 30.0-250.0 cm'),
  body('pain_level').optional().isInt({ min: 0, max: 10 }).withMessage('Pain level must be between 0-10'),
  body('blood_glucose').optional().isFloat({ min: 20.0, max: 1000.0 }).withMessage('Blood glucose must be between 20.0-1000.0 mg/dL'),
  
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
  body('device_id').isLength({ min: 1 }).withMessage('Device ID is required'),
  body('vitals_data').isArray({ min: 1 }).withMessage('Vitals data array is required'),
  
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

module.exports = {
  validateComplaintSubmission,
  validateComplaintUpdate,
  validateVitalsEntry,
  validateVitalsUpdate,
  validateOfflineSync,
  validateQueuePrioritization
};