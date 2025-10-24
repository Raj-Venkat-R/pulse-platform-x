const express = require('express');
const { Pool } = require('pg');
const { requireAuth } = require('../middleware/auth');
const { validateComplaintSubmission, validateComplaintUpdate } = require('../middleware/complaintValidation');
const complaintService = require('../services/complaintService');
const aiAnalysisService = require('../services/aiAnalysisService');
const slaMonitoringService = require('../services/slaMonitoringService');
const escalationService = require('../services/escalationService');
const analyticsService = require('../services/analyticsService');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * POST /api/complaints
 * AI-powered complaint submission with automatic categorization
 */
router.post('/', validateComplaintSubmission, async (req, res) => {
  try {
    const complaintData = {
      ...req.body,
      created_by: req.user.id
    };

    // AI-powered analysis
    const aiAnalysis = await aiAnalysisService.analyzeComplaint({
      description: complaintData.description,
      subject: complaintData.subject,
      patient_id: complaintData.patient_id
    });

    // Create complaint with AI insights
    const complaint = await complaintService.createComplaint({
      ...complaintData,
      urgency_score: aiAnalysis.urgency_score,
      urgency_level: aiAnalysis.urgency_level,
      category: aiAnalysis.category,
      subcategory: aiAnalysis.subcategory,
      sentiment_score: aiAnalysis.sentiment_score,
      keywords: aiAnalysis.keywords,
      entities: aiAnalysis.entities,
      ai_confidence: aiAnalysis.confidence,
      sla_deadline: aiAnalysis.sla_deadline
    });

    // Auto-assign based on AI analysis and staff workload
    const assignment = await complaintService.autoAssignComplaint(complaint.id, {
      category: aiAnalysis.category,
      urgency_level: aiAnalysis.urgency_level,
      expertise_required: aiAnalysis.expertise_areas
    });

    // Set up SLA tracking
    await slaMonitoringService.createSlaTracking(complaint.id, {
      sla_category: 'response',
      target_time: aiAnalysis.sla_deadline
    });

    // Log AI analysis for learning
    await aiAnalysisService.logAnalysis({
      complaint_id: complaint.id,
      analysis_type: 'categorization',
      input_text: complaintData.description,
      ai_model_version: 'v1.0',
      confidence_score: aiAnalysis.confidence,
      analysis_result: aiAnalysis,
      processing_time_ms: aiAnalysis.processing_time
    });

    res.status(201).json({
      success: true,
      data: {
        ...complaint,
        assignment,
        ai_analysis: aiAnalysis
      },
      message: 'Complaint submitted successfully with AI analysis'
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create complaint'
    });
  }
});

/**
 * GET /api/complaints/urgent
 * Get high-urgency complaints with AI prioritization
 */
router.get('/urgent', async (req, res) => {
  try {
    const { limit = 50, include_ai_insights = true } = req.query;

    const urgentComplaints = await complaintService.getUrgentComplaints({
      limit: parseInt(limit),
      include_ai_insights: include_ai_insights === 'true'
    });

    // Add AI-powered prioritization
    const prioritizedComplaints = await aiAnalysisService.prioritizeComplaints(urgentComplaints);

    res.json({
      success: true,
      data: prioritizedComplaints,
      total: prioritizedComplaints.length
    });
  } catch (error) {
    console.error('Error fetching urgent complaints:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch urgent complaints'
    });
  }
});

/**
 * POST /api/complaints/:id/assign
 * Auto-assign complaint to staff based on AI workload analysis
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const { staff_id, assignment_reason } = req.body;

    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    let assignment;

    if (staff_id) {
      // Manual assignment
      assignment = await complaintService.assignComplaint(complaintId, {
        staff_id: parseInt(staff_id),
        assigned_by: req.user.id,
        assignment_reason: assignment_reason || 'Manual assignment'
      });
    } else {
      // AI-powered auto-assignment
      const complaint = await complaintService.getComplaintById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found'
        });
      }

      assignment = await complaintService.autoAssignComplaint(complaintId, {
        category: complaint.category,
        urgency_level: complaint.urgency_level,
        expertise_required: complaint.entities?.expertise_areas || [],
        current_workload: true
      });
    }

    res.json({
      success: true,
      data: assignment,
      message: 'Complaint assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to assign complaint'
    });
  }
});

/**
 * GET /api/complaints/analytics
 * Generate AI-powered resolution analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      category, 
      urgency_level,
      include_ai_insights = true 
    } = req.query;

    const analytics = await analyticsService.generateComplaintAnalytics({
      start_date,
      end_date,
      category,
      urgency_level,
      include_ai_insights: include_ai_insights === 'true'
    });

    // Add AI-powered insights
    if (include_ai_insights === 'true') {
      analytics.ai_insights = await aiAnalysisService.generateInsights(analytics);
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate analytics'
    });
  }
});

/**
 * POST /api/complaints/:id/escalate
 * Automatic escalation when SLA breached
 */
router.post('/:id/escalate', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const { escalation_reason, escalation_level, manual_escalation = false } = req.body;

    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    const complaint = await complaintService.getComplaintById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    let escalation;

    if (manual_escalation) {
      // Manual escalation
      escalation = await escalationService.manualEscalate(complaintId, {
        escalation_reason: escalation_reason,
        escalation_level: escalation_level || complaint.escalation_level + 1,
        escalated_by: req.user.id
      });
    } else {
      // AI-powered automatic escalation
      escalation = await escalationService.autoEscalate(complaintId, {
        sla_breach: complaint.sla_status === 'breached',
        urgency_increase: complaint.urgency_score > 0.8,
        time_since_creation: Date.now() - new Date(complaint.created_at).getTime()
      });
    }

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
 * GET /api/complaints
 * Get complaints with AI-powered filtering and search
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      urgency_level,
      status,
      assigned_staff_id,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC',
      include_ai_insights = false
    } = req.query;

    const filters = {
      category,
      urgency_level,
      status,
      assigned_staff_id: assigned_staff_id ? parseInt(assigned_staff_id) : null,
      search
    };

    const complaints = await complaintService.getComplaints({
      page: parseInt(page),
      limit: parseInt(limit),
      filters,
      sort_by,
      sort_order,
      include_ai_insights: include_ai_insights === 'true'
    });

    res.json({
      success: true,
      data: complaints.data,
      pagination: complaints.pagination
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
 * Get complaint details with AI analysis
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

    const complaint = await complaintService.getComplaintById(complaintId, {
      include_ai_analysis: true,
      include_attachments: true,
      include_sla_tracking: true
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      data: complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch complaint'
    });
  }
});

/**
 * PUT /api/complaints/:id
 * Update complaint with AI-powered status tracking
 */
router.put('/:id', validateComplaintUpdate, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const updateData = req.body;

    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    // AI-powered status analysis
    if (updateData.status === 'resolved') {
      const resolutionAnalysis = await aiAnalysisService.analyzeResolution({
        complaint_id: complaintId,
        resolution_notes: updateData.resolution_notes,
        customer_feedback: updateData.customer_feedback
      });

      updateData.resolution_analysis = resolutionAnalysis;
    }

    const updatedComplaint = await complaintService.updateComplaint(
      complaintId, 
      updateData, 
      req.user.id
    );

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
 * GET /api/complaints/sla/monitoring
 * Real-time SLA monitoring dashboard
 */
router.get('/sla/monitoring', async (req, res) => {
  try {
    const slaData = await slaMonitoringService.getSlaMonitoringData({
      include_breached: true,
      include_at_risk: true,
      include_predictions: true
    });

    res.json({
      success: true,
      data: slaData
    });
  } catch (error) {
    console.error('Error fetching SLA monitoring data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch SLA monitoring data'
    });
  }
});

/**
 * POST /api/complaints/:id/attachments
 * Upload complaint attachments
 */
router.post('/:id/attachments', async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    
    if (isNaN(complaintId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid complaint ID'
      });
    }

    // Handle file upload (implementation depends on your file upload middleware)
    const attachments = await complaintService.addAttachments(complaintId, {
      files: req.files,
      uploaded_by: req.user.id
    });

    res.json({
      success: true,
      data: attachments,
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
 * GET /api/complaints/ai/insights
 * Get AI-powered insights and recommendations
 */
router.get('/ai/insights', async (req, res) => {
  try {
    const { 
      time_period = '30d',
      category,
      include_predictions = true 
    } = req.query;

    const insights = await aiAnalysisService.generateInsights({
      time_period,
      category,
      include_predictions: include_predictions === 'true'
    });

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate AI insights'
    });
  }
});

module.exports = router;
