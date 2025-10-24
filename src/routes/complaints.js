const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateComplaintSubmission, validateComplaintUpdate, validateEscalation } = require('../middleware/complaintValidation');
const complaintService = require('../services/complaintService');
const aiCategorizationService = require('../services/aiCategorizationService');
const escalationService = require('../services/escalationService');
const notificationService = require('../services/notificationService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per complaint
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/complaints
 * Submit a new complaint with optional attachments
 */
router.post('/', upload.array('attachments', 5), validateComplaintSubmission, async (req, res) => {
  try {
    const complaintData = {
      ...req.body,
      created_by: req.user.id,
      uploaded_by: req.user.id
    };

    // Process attachments
    const attachments = req.files ? req.files.map(file => ({
      ...file,
      uploaded_by: req.user.id
    })) : [];

    // Create complaint
    const complaint = await complaintService.createComplaint(complaintData, attachments);

    // AI categorization (async, don't wait)
    aiCategorizationService.categorizeComplaint(complaint.id, complaint.description)
      .catch(error => console.error('AI categorization failed:', error));

    // Auto-assignment based on category
    if (!complaintData.assigned_to) {
      escalationService.autoAssignComplaint(complaint.id, complaint.category)
        .catch(error => console.error('Auto-assignment failed:', error));
    }

    // Send notifications
    notificationService.sendComplaintCreatedNotification(complaint)
      .catch(error => console.error('Notification failed:', error));

    res.status(201).json({
      success: true,
      data: complaint,
      message: 'Complaint submitted successfully'
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit complaint'
    });
  }
});

/**
 * GET /api/complaints
 * List complaints with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      urgency: req.query.urgency,
      category: req.query.category,
      assigned_to: req.query.assigned_to,
      source: req.query.source,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      search: req.query.search,
      tags: req.query.tags ? req.query.tags.split(',') : undefined
    };

    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort_by: req.query.sort_by || 'created_at',
      sort_order: req.query.sort_order || 'DESC'
    };

    const result = await complaintService.getComplaints(filters, pagination);

    res.json({
      success: true,
      data: result.complaints,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch complaints'
    });
  }
});

/**
 * GET /api/complaints/:id
 * Get a specific complaint with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await complaintService.getComplaintById(complaintId);

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Complaint not found'
    });
  }
});

/**
 * PUT /api/complaints/:id
 * Update complaint (status, assignment, etc.)
 */
router.put('/:id', validateComplaintUpdate, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const updateData = req.body;
    const updatedComplaint = await complaintService.updateComplaint(
      complaintId, 
      updateData, 
      req.user.id
    );

    // Send notifications for status changes
    if (updateData.status) {
      notificationService.sendComplaintStatusUpdateNotification(complaintId, updateData.status)
        .catch(error => console.error('Status notification failed:', error));
    }

    res.json({
      success: true,
      data: updatedComplaint,
      message: 'Complaint updated successfully'
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update complaint'
    });
  }
});

/**
 * POST /api/complaints/:id/escalate
 * Manually escalate a complaint
 */
router.post('/:id/escalate', validateEscalation, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const escalationData = {
      ...req.body,
      escalated_by: req.user.id,
      escalation_reason: req.body.escalation_reason || 'Manual escalation'
    };

    const escalation = await escalationService.escalateComplaint(complaintId, escalationData);

    res.json({
      success: true,
      data: escalation,
      message: 'Complaint escalated successfully'
    });
  } catch (error) {
    console.error('Error escalating complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to escalate complaint'
    });
  }
});

/**
 * GET /api/complaints/categories
 * Get list of complaint categories for dropdowns
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await complaintService.getComplaintCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
});

/**
 * POST /api/complaints/ai-categorize
 * Internal endpoint for AI categorization (can be called by background jobs)
 */
router.post('/ai-categorize', async (req, res) => {
  try {
    const { complaint_id, description } = req.body;

    if (!complaint_id || !description) {
      return res.status(400).json({
        success: false,
        message: 'complaint_id and description are required'
      });
    }

    const categorization = await aiCategorizationService.categorizeComplaint(complaint_id, description);

    res.json({
      success: true,
      data: categorization
    });
  } catch (error) {
    console.error('Error in AI categorization:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'AI categorization failed'
    });
  }
});

/**
 * GET /api/complaints/stats
 * Get complaint statistics and analytics
 */
router.get('/stats', async (req, res) => {
  try {
    const dateRange = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const stats = await complaintService.getComplaintStats(dateRange);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/complaints/:id/attachments
 * Get attachments for a specific complaint
 */
router.get('/:id/attachments', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const query = `
      SELECT * FROM complaint_attachments 
      WHERE complaint_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;

    const result = await complaintService.pool.query(query, [complaintId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch attachments'
    });
  }
});

/**
 * POST /api/complaints/:id/attachments
 * Upload additional attachments to an existing complaint
 */
router.post('/:id/attachments', upload.array('attachments', 5), async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const attachments = req.files.map(file => ({
      ...file,
      uploaded_by: req.user.id
    }));

    const savedAttachments = [];
    for (const attachment of attachments) {
      const savedAttachment = await complaintService.saveAttachment(complaintId, attachment);
      savedAttachments.push(savedAttachment);
    }

    res.json({
      success: true,
      data: savedAttachments,
      message: 'Attachments uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading attachments:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload attachments'
    });
  }
});

/**
 * GET /api/complaints/:id/sla
 * Get SLA information for a complaint
 */
router.get('/:id/sla', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const query = `
      SELECT * FROM sla_logs 
      WHERE complaint_id = $1
      ORDER BY created_at DESC
    `;

    const result = await complaintService.pool.query(query, [complaintId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching SLA data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch SLA data'
    });
  }
});

/**
 * GET /api/complaints/:id/escalations
 * Get escalation history for a complaint
 */
router.get('/:id/escalations', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const query = `
      SELECT 
        ce.*,
        er.rule_name,
        er.description as rule_description,
        u.first_name || ' ' || u.last_name as escalated_by_name
      FROM complaint_escalations ce
      JOIN escalation_rules er ON ce.escalation_rule_id = er.id
      LEFT JOIN users u ON ce.escalated_by = u.id
      WHERE ce.complaint_id = $1
      ORDER BY ce.triggered_at DESC
    `;

    const result = await complaintService.pool.query(query, [complaintId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching escalation history:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch escalation history'
    });
  }
});

module.exports = router;
