const { body, validationResult } = require('express-validator');

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

module.exports = {
  validateVitalsEntry,
  validateVitalsUpdate
};
