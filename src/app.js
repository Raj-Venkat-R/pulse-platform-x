const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import middleware
const { securityHeaders, corsOptions, errorHandler, notFoundHandler, requestLogger } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiting');

// Import routes
const complaintRoutes = require('./routes/complaints');
const vitalsRoutes = require('./routes/mobileVitals');
const appointmentRoutes = require('./routes/appointmentScheduling');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(helmet());

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Rate limiting
app.use(apiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/appointments', appointmentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
});

module.exports = app;