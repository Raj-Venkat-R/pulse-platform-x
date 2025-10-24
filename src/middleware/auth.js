const jwt = require('jsonwebtoken');

// Authentication middleware
const requireAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions.'
      });
    }

    next();
  };
};

// Admin only middleware
const requireAdmin = requireRole(['admin', 'super_admin']);

// Staff only middleware (nurses, doctors, supervisors)
const requireStaff = requireRole(['nurse', 'doctor', 'supervisor', 'admin', 'super_admin']);

// Patient only middleware
const requirePatient = requireRole(['patient']);

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireStaff,
  requirePatient
};
