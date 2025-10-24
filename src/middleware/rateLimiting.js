const rateLimit = require('express-rate-limit');

// Rate limiting middleware for API endpoints
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limiting
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many API requests from this IP, please try again later.'
);

// Strict rate limiting for sensitive endpoints
const strictLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many requests to this sensitive endpoint, please try again later.'
);

// Rate limiting for vitals submission
const vitalsLimiter = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 vitals submissions per minute
  'Too many vitals submissions, please slow down.'
);

// Rate limiting for complaint submission
const complaintLimiter = createRateLimit(
  60 * 1000, // 1 minute
  3, // limit each IP to 3 complaint submissions per minute
  'Too many complaint submissions, please slow down.'
);

// Rate limiting for authentication endpoints
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'Too many authentication attempts, please try again later.'
);

// Rate limiting for file uploads
const uploadLimiter = createRateLimit(
  60 * 1000, // 1 minute
  5, // limit each IP to 5 file uploads per minute
  'Too many file uploads, please slow down.'
);

module.exports = {
  apiLimiter,
  strictLimiter,
  vitalsLimiter,
  complaintLimiter,
  authLimiter,
  uploadLimiter
};
