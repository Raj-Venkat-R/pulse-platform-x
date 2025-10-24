const { body, param, query, validationResult } = require('express-validator');

// Validation middleware for complaint submission
const validateComplaintSubmission = [
  body('complainant_name')
    .notEmpty()
    .withMessage('Complainant name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Complainant name must be between 2 and 100 characters'),
  
  body('complainant_email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('complainant_phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number format'),
  
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['billing', 'medical_care', 'staff_behavior', 'facilities', 'appointment', 'other'])
    .withMessage('Invalid category'),
  
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level'),
  
  body('source')
    .optional()
    .isIn(['phone', 'email', 'web_portal', 'walk_in', 'social_media', 'mobile_app', 'kiosk', 'other'])
    .withMessage('Invalid source'),
  
  body('patient_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid patient ID'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('follow_up_required')
    .optional()
    .isBoolean()
    .withMessage('Follow up required must be a boolean'),
  
  body('follow_up_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow up date format'),

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

// Validation middleware for complaint updates
const validateComplaintUpdate = [
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency level'),
  
  body('priority')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('Priority must be between 0 and 10'),
  
  body('assigned_to')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user ID'),
  
  body('category')
    .optional()
    .isIn(['billing', 'medical_care', 'staff_behavior', 'facilities', 'appointment', 'other'])
    .withMessage('Invalid category'),
  
  body('resolution_notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Resolution notes must not exceed 2000 characters'),
  
  body('internal_notes')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Internal notes must not exceed 2000 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('follow_up_required')
    .optional()
    .isBoolean()
    .withMessage('Follow up required must be a boolean'),
  
  body('follow_up_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow up date format'),

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

// Validation middleware for escalation
const validateEscalation = [
  body('escalation_reason')
    .notEmpty()
    .withMessage('Escalation reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Escalation reason must be between 10 and 500 characters'),
  
  body('escalation_level')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Escalation level must be between 1 and 5'),
  
  body('assigned_to')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user ID'),

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

// Validation middleware for complaint ID parameter
const validateComplaintId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid complaint ID'),

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

// Validation middleware for query parameters
const validateComplaintQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['open', 'in_progress', 'pending_customer', 'resolved', 'closed', 'cancelled'])
    .withMessage('Invalid status filter'),
  
  query('urgency')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid urgency filter'),
  
  query('category')
    .optional()
    .isIn(['billing', 'medical_care', 'staff_behavior', 'facilities', 'appointment', 'other'])
    .withMessage('Invalid category filter'),
  
  query('source')
    .optional()
    .isIn(['phone', 'email', 'web_portal', 'walk_in', 'social_media', 'mobile_app', 'kiosk', 'other'])
    .withMessage('Invalid source filter'),
  
  query('sort_by')
    .optional()
    .isIn(['created_at', 'updated_at', 'urgency', 'priority', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('Invalid sort order'),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for date_from'),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for date_to'),

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

// Validation middleware for AI categorization
const validateAICategorization = [
  body('complaint_id')
    .isInt({ min: 1 })
    .withMessage('Invalid complaint ID'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),

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

// Validation middleware for attachment upload
const validateAttachmentUpload = [
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('is_public')
    .optional()
    .isBoolean()
    .withMessage('is_public must be a boolean'),
  
  body('is_evidence')
    .optional()
    .isBoolean()
    .withMessage('is_evidence must be a boolean'),

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
  validateEscalation,
  validateComplaintId,
  validateComplaintQuery,
  validateAICategorization,
  validateAttachmentUpload
};
