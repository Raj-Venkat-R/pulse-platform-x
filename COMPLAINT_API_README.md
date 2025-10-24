# Complaint & Query Management Portal - Backend API

A comprehensive backend API for managing healthcare complaints, queries, and customer service operations with automated workflows, SLA monitoring, and AI-powered categorization.

## 🚀 Features

### Core Functionality
- **Complaint Submission**: Multi-channel complaint intake with file attachments
- **AI Categorization**: Automatic complaint categorization and urgency scoring
- **Smart Assignment**: Auto-assignment based on category and workload
- **Escalation Workflows**: Automated escalation based on SLA breaches and time rules
- **SLA Monitoring**: Real-time SLA tracking with breach alerts
- **Multi-channel Notifications**: Email, SMS, push, and dashboard notifications

### Advanced Features
- **File Management**: Secure attachment handling with integrity checking
- **Audit Trails**: Complete audit logs for compliance
- **Performance Analytics**: Comprehensive reporting and analytics
- **Background Jobs**: Automated SLA monitoring and escalation processing
- **Role-based Access**: Granular permissions and access control

## 📋 API Endpoints

### Complaints

#### Submit Complaint
```http
POST /api/complaints
Content-Type: multipart/form-data

{
  "complainant_name": "John Doe",
  "complainant_email": "john@example.com",
  "complainant_phone": "+1234567890",
  "subject": "Billing Issue",
  "description": "I was charged incorrectly for my visit",
  "category": "billing",
  "urgency": "medium",
  "patient_id": 123,
  "attachments": [file1, file2]
}
```

#### List Complaints
```http
GET /api/complaints?page=1&limit=20&status=open&urgency=high&category=billing
```

#### Get Complaint Details
```http
GET /api/complaints/123
```

#### Update Complaint
```http
PUT /api/complaints/123
{
  "status": "in_progress",
  "assigned_to": 456,
  "resolution_notes": "Issue resolved"
}
```

#### Escalate Complaint
```http
POST /api/complaints/123/escalate
{
  "escalation_reason": "Customer not satisfied with resolution",
  "escalation_level": 2
}
```

#### Get Categories
```http
GET /api/complaints/categories
```

#### AI Categorization
```http
POST /api/complaints/ai-categorize
{
  "complaint_id": 123,
  "description": "The doctor was very rude and unprofessional"
}
```

### Attachments

#### Upload Attachments
```http
POST /api/complaints/123/attachments
Content-Type: multipart/form-data
```

#### Get Attachments
```http
GET /api/complaints/123/attachments
```

### SLA & Analytics

#### Get SLA Information
```http
GET /api/complaints/123/sla
```

#### Get Escalation History
```http
GET /api/complaints/123/escalations
```

#### Get Statistics
```http
GET /api/complaints/stats?start_date=2025-01-01&end_date=2025-12-31
```

## 🗄️ Database Schema

### Core Tables

#### `complaints`
- Comprehensive complaint tracking with audit trails
- Auto-generated complaint numbers (COMP-2025-001)
- SLA integration and escalation tracking
- Flexible categorization and tagging

#### `complaint_attachments`
- Secure file management with integrity checking
- Access control and usage tracking
- Soft delete functionality

#### `escalation_rules`
- Configurable escalation workflows
- Time-based, status-based, and SLA breach triggers
- JSON-based action definitions

#### `sla_logs`
- Real-time SLA monitoring
- Breach detection and severity calculation
- Performance analytics

#### `notifications`
- Multi-channel notification system
- Delivery status tracking
- Template management

## 🔧 Installation & Setup

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Redis (optional, for caching)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd complaint-management-api
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
```

Update `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/complaint_db

# Server
PORT=3000
NODE_ENV=development

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@healthcare.com

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Frontend
FRONTEND_URL=http://localhost:5173
```

3. **Database Setup**
```bash
# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

4. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## 🤖 AI Integration

### Mock AI Service
The system includes a mock AI categorization service that can be easily replaced with real AI services:

```javascript
// Current mock implementation
const categorization = await aiCategorizationService.categorizeComplaint(complaintId, description);

// Replace with real AI service
const categorization = await aiCategorizationService.integrateWithRealAIService(description);
```

### Supported AI Services
- OpenAI GPT models
- Azure Cognitive Services
- AWS Comprehend
- Custom ML models

## 📊 Background Jobs

### SLA Monitoring Service
Automated background jobs for:
- **SLA Status Updates**: Every 5 minutes
- **Breach Detection**: Every minute
- **Reminder Notifications**: Every hour
- **Escalation Processing**: Every 10 minutes
- **Daily Reports**: Daily at 9 AM

### Job Management
```javascript
// Start monitoring service
slaMonitoringService.start();

// Stop monitoring service
slaMonitoringService.stop();

// Get SLA metrics
const metrics = await slaMonitoringService.getSlaMetrics({
  start_date: '2025-01-01',
  end_date: '2025-12-31'
});
```

## 🔔 Notification System

### Multi-channel Notifications
- **Email**: HTML templates with complaint details
- **SMS**: Critical alerts and reminders
- **Push**: Mobile app notifications
- **Dashboard**: In-app notification center

### Notification Types
- Complaint assigned
- Status updates
- SLA breaches
- Escalation alerts
- Reminders

## 📈 Analytics & Reporting

### Key Metrics
- Total complaints by category
- SLA performance (breach rates, resolution times)
- Escalation patterns
- Staff workload distribution
- Customer satisfaction scores

### Reports
- Daily SLA performance reports
- Monthly complaint analytics
- Escalation effectiveness analysis
- Staff performance metrics

## 🔒 Security Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- API rate limiting
- Input validation and sanitization

### Data Protection
- File upload security
- SQL injection prevention
- XSS protection
- CORS configuration

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📝 API Documentation

### Response Format
All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Handling
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables
- `NODE_ENV`: production/development
- `DATABASE_URL`: PostgreSQL connection string
- `SMTP_*`: Email configuration
- `UPLOAD_DIR`: File upload directory
- `FRONTEND_URL`: Frontend application URL

## 📞 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the API documentation

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for Healthcare Excellence**
