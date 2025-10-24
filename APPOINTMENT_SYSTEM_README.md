# Comprehensive Appointment Scheduling System

A complete healthcare appointment management solution with real-time queue management, offline capabilities, payment integration, and automated reminders.

## 🚀 System Overview

This appointment scheduling system provides a comprehensive solution for healthcare providers to manage patient appointments, queue management, and real-time updates. The system supports both online and offline operations with seamless synchronization.

## 📊 Database Schema

### Core Tables

#### **Patients Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- patient_number (TEXT UNIQUE) - Auto-generated patient ID
- first_name, last_name (TEXT)
- date_of_birth (DATE)
- gender (TEXT CHECK)
- phone, email (TEXT)
- address (TEXT)
- emergency_contact_name, emergency_contact_phone (TEXT)
- medical_history (JSONB)
- insurance_provider, insurance_number (TEXT)
- communication_preferences (JSONB)
```

#### **Appointments Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- appointment_number (TEXT UNIQUE) - Auto-generated appointment ID
- patient_id (BIGINT REFERENCES patients)
- doctor_id (BIGINT REFERENCES users)
- appointment_type (ENUM: online, walkin, kiosk, emergency, follow_up)
- scheduled_date (TIMESTAMPTZ)
- duration_minutes (INTEGER DEFAULT 30)
- status (ENUM: scheduled, confirmed, in_progress, completed, cancelled, no_show, rescheduled)
- priority (INTEGER DEFAULT 0)
- queue_token (TEXT)
- payment_status (ENUM: pending, paid, failed, refunded, partial)
- payment_amount (DECIMAL)
- reason_for_visit, symptoms (TEXT)
- urgency_level (TEXT CHECK)
- special_requirements (TEXT)
- booking_source (TEXT)
- confirmation_sent, reminder_sent (BOOLEAN)
```

#### **Availability Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- doctor_id (BIGINT REFERENCES users)
- date (DATE)
- start_time, end_time (TIME)
- slot_duration_minutes (INTEGER DEFAULT 30)
- max_patients_per_slot (INTEGER DEFAULT 1)
- is_available (BOOLEAN DEFAULT TRUE)
- break_start_time, break_end_time (TIME)
- is_recurring (BOOLEAN DEFAULT FALSE)
- recurrence_pattern (TEXT)
```

#### **Queue Management Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- token_number (TEXT UNIQUE) - Auto-generated queue token
- patient_id (BIGINT REFERENCES patients)
- appointment_id (BIGINT REFERENCES appointments)
- doctor_id (BIGINT REFERENCES users)
- current_status (ENUM: waiting, called, in_consultation, completed, cancelled)
- priority_score (INTEGER DEFAULT 0) - AI-calculated priority
- estimated_wait_time_minutes (INTEGER)
- actual_wait_time_minutes (INTEGER)
- check_in_time (TIMESTAMPTZ)
- called_time, consultation_start_time, consultation_end_time (TIMESTAMPTZ)
- queue_position (INTEGER)
- ai_priority_factors (JSONB)
- medical_urgency_score (INTEGER)
- wait_time_score (INTEGER)
- patient_satisfaction_score (INTEGER)
```

#### **Appointment Reminders Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- appointment_id (BIGINT REFERENCES appointments)
- reminder_type (TEXT CHECK: sms, email, call, push)
- scheduled_time (TIMESTAMPTZ)
- sent_time (TIMESTAMPTZ)
- status (TEXT CHECK: pending, sent, failed, cancelled)
- message_content (TEXT)
- delivery_status (TEXT)
- error_message (TEXT)
- retry_count (INTEGER DEFAULT 0)
```

#### **Offline Sync Logs Table**
```sql
- id (BIGSERIAL PRIMARY KEY)
- device_id (TEXT)
- sync_type (TEXT CHECK: appointment, patient, queue)
- record_id (BIGINT)
- action (TEXT CHECK: create, update, delete)
- data (JSONB)
- sync_status (TEXT CHECK: pending, synced, failed, conflict)
- conflict_resolution (TEXT)
- sync_timestamp (TIMESTAMPTZ)
- server_timestamp (TIMESTAMPTZ)
```

## 🔧 Backend API Endpoints

### **Appointment Management**

#### **POST /api/appointments/book**
- **Purpose**: Handle online appointment booking with patient details and payment
- **Request Body**:
  ```json
  {
    "doctor_id": 123,
    "scheduled_date": "2024-01-15T10:00:00Z",
    "duration_minutes": 30,
    "patient_details": {
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "reason_for_visit": "Regular checkup",
    "urgency_level": "medium",
    "payment_method": "online",
    "payment_amount": 100.00
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": 456,
      "appointment_number": "APT-2024-0001",
      "status": "scheduled"
    }
  }
  ```

#### **GET /api/appointments/availability**
- **Purpose**: Check real-time availability across doctors
- **Query Parameters**:
  - `doctor_id`: Filter by specific doctor
  - `date`: Check availability for specific date
  - `duration`: Appointment duration in minutes
  - `specialty`: Filter by medical specialty
  - `location_id`: Filter by location
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "doctor_id": 123,
        "doctor_name": "Dr. Smith",
        "specialty": "Cardiology",
        "available_slots": [
          {
            "start_time": "2024-01-15 10:00:00",
            "end_time": "2024-01-15 10:30:00",
            "duration_minutes": 30
          }
        ]
      }
    ]
  }
  ```

#### **POST /api/appointments/offline-sync**
- **Purpose**: Sync offline/kiosk registrations
- **Request Body**:
  ```json
  {
    "device_id": "device_123456",
    "sync_data": [
      {
        "type": "appointment",
        "action": "create",
        "data": { /* appointment data */ }
      }
    ]
  }
  ```

### **Queue Management**

#### **GET /api/queue/current**
- **Purpose**: Get current queue status with real-time updates
- **Query Parameters**:
  - `doctor_id`: Filter by specific doctor
  - `location_id`: Filter by location
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "doctor_id": 123,
        "doctor_name": "Dr. Smith",
        "total_waiting": 5,
        "total_called": 2,
        "total_in_consultation": 1,
        "queue": [
          {
            "token_number": "20240115-001",
            "patient_name": "John Doe",
            "current_status": "waiting",
            "queue_position": 1,
            "estimated_wait_time_minutes": 15
          }
        ]
      }
    ]
  }
  ```

#### **POST /api/queue/prioritize**
- **Purpose**: AI-based queue prioritization algorithm
- **Request Body**:
  ```json
  {
    "doctor_id": 123,
    "queue_id": 456,
    "priority_factors": {
      "medical_urgency": "high",
      "wait_time": 30,
      "patient_age": 65
    }
  }
  ```

#### **POST /api/queue/join**
- **Purpose**: Join the queue (for walk-in patients)
- **Request Body**:
  ```json
  {
    "patient_id": 789,
    "doctor_id": 123,
    "reason_for_visit": "Emergency",
    "urgency_level": "high",
    "special_requirements": "Wheelchair access"
  }
  ```

#### **PUT /api/queue/:id/status**
- **Purpose**: Update queue status
- **Request Body**:
  ```json
  {
    "status": "called",
    "notes": "Patient called to consultation room"
  }
  ```

## 🎨 Frontend Components

### **AppointmentBookingWizard**
- **Purpose**: Multi-step form for online appointment booking
- **Features**:
  - Doctor selection with availability checking
  - Date and time slot selection
  - Patient information form
  - Appointment details and preferences
  - Payment integration
  - Form validation and error handling

### **RealTimeQueueDisplay**
- **Purpose**: Live queue status dashboard
- **Features**:
  - Real-time queue updates via WebSocket
  - Doctor-wise queue organization
  - Patient status tracking
  - Wait time estimation
  - Audio notifications for patient calls
  - Queue statistics and analytics

### **OfflineSyncHandler**
- **Purpose**: Manage offline data synchronization
- **Features**:
  - Offline data storage in IndexedDB
  - Automatic sync when online
  - Conflict resolution
  - Sync status monitoring
  - Manual sync triggers
  - Device identification

### **PaymentIntegration**
- **Purpose**: Secure payment processing
- **Features**:
  - Multiple payment methods (Card, UPI, Bank Transfer)
  - Card validation and security
  - Payment amount calculation
  - Transaction confirmation
  - Error handling and retry logic

## 🔄 Real-time Features

### **WebSocket Integration**
- **Connection**: `ws://localhost:3000/ws/queue`
- **Message Types**:
  - `queue_update`: Real-time queue status changes
  - `patient_called`: Notification when patient is called
  - `queue_position_change`: Position updates
  - `appointment_update`: Appointment status changes

### **Service Worker**
- **Offline Support**: Caches essential files and API responses
- **Background Sync**: Automatically syncs data when online
- **Push Notifications**: Appointment reminders and updates
- **Data Storage**: IndexedDB for offline data persistence

## 📱 Offline Functionality

### **Offline Capabilities**
- **Appointment Booking**: Store appointments locally when offline
- **Queue Management**: Join queue and track status offline
- **Data Sync**: Automatic synchronization when connection restored
- **Conflict Resolution**: Handle data conflicts intelligently

### **Service Worker Features**
- **Cache Strategy**: Network-first with cache fallback
- **Background Sync**: Sync offline data when connection available
- **Push Notifications**: Real-time updates even when app closed
- **Data Persistence**: IndexedDB for complex data storage

## 💳 Payment Integration

### **Supported Payment Methods**
- **Credit/Debit Cards**: Visa, Mastercard, American Express
- **UPI Payments**: Indian payment system integration
- **Bank Transfers**: Direct bank account transfers
- **Digital Wallets**: Future integration support

### **Security Features**
- **Card Validation**: Luhn algorithm validation
- **Encryption**: Secure data transmission
- **PCI Compliance**: Payment card industry standards
- **Fraud Detection**: Basic fraud prevention measures

## 📧 Reminder System

### **Automated Reminders**
- **Email Reminders**: 24 hours and 1 hour before appointment
- **SMS Reminders**: 2 hours before appointment
- **Push Notifications**: Real-time updates
- **Customizable Timing**: Configurable reminder schedules

### **Reminder Types**
- **Appointment Confirmations**: Booking confirmation emails
- **Pre-appointment Reminders**: Multiple reminder intervals
- **Rescheduling Notifications**: Change notifications
- **Cancellation Confirmations**: Cancellation confirmations

## 🚀 Deployment

### **Environment Variables**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/appointments

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@healthcare.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# WebSocket
WS_PORT=3001

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3001/ws/queue
```

### **Database Setup**
```bash
# Run migrations
psql -d appointments -f migrations/20251023_010_create_appointment_scheduling.sql

# Create indexes for performance
psql -d appointments -c "CREATE INDEX CONCURRENTLY idx_appointments_scheduled_date ON appointments(scheduled_date);"
psql -d appointments -c "CREATE INDEX CONCURRENTLY idx_queue_management_doctor_status ON queue_management(doctor_id, current_status);"
```

### **Backend Setup**
```bash
# Install dependencies
npm install express pg nodemailer twilio node-cron ws

# Start server
npm start
```

### **Frontend Setup**
```bash
# Install dependencies
npm install react react-dom @tanstack/react-query

# Build for production
npm run build

# Start development server
npm run dev
```

## 📊 Performance Optimization

### **Database Optimization**
- **Indexes**: Optimized indexes for common queries
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized SQL queries
- **Caching**: Redis caching for frequently accessed data

### **Frontend Optimization**
- **Code Splitting**: Lazy loading of components
- **Memoization**: React.memo for expensive components
- **Service Worker**: Offline caching and background sync
- **WebSocket**: Real-time updates without polling

## 🔒 Security Features

### **Data Protection**
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **CSRF Protection**: Cross-site request forgery prevention

### **Authentication & Authorization**
- **JWT Tokens**: Secure authentication
- **Role-based Access**: Different access levels
- **Session Management**: Secure session handling
- **API Rate Limiting**: Prevent abuse

## 📈 Monitoring & Analytics

### **Queue Analytics**
- **Wait Time Tracking**: Average wait times per doctor
- **Patient Flow**: Queue movement patterns
- **Peak Hours**: Busiest times identification
- **Doctor Efficiency**: Consultation time analysis

### **Appointment Analytics**
- **Booking Patterns**: Popular time slots
- **Cancellation Rates**: No-show analysis
- **Revenue Tracking**: Payment analytics
- **Patient Satisfaction**: Feedback analysis

## 🛠️ Customization

### **Configurable Settings**
- **Appointment Durations**: Customizable slot durations
- **Reminder Intervals**: Flexible reminder timing
- **Queue Priorities**: Customizable priority algorithms
- **Payment Methods**: Configurable payment options

### **Integration Points**
- **EHR Systems**: Electronic Health Records integration
- **Calendar Systems**: Google Calendar, Outlook integration
- **Communication**: SMS, Email, Push notification services
- **Analytics**: Google Analytics, custom analytics

## 📞 Support & Maintenance

### **Error Handling**
- **Graceful Degradation**: System continues with reduced functionality
- **Error Logging**: Comprehensive error tracking
- **User Feedback**: Clear error messages
- **Recovery Procedures**: Automatic error recovery

### **Monitoring**
- **Health Checks**: System health monitoring
- **Performance Metrics**: Response time tracking
- **Error Rates**: Error frequency monitoring
- **Uptime Monitoring**: System availability tracking

---

**Built with ❤️ for Healthcare Excellence**

This comprehensive appointment scheduling system provides a complete solution for healthcare providers to manage patient appointments efficiently with real-time updates, offline capabilities, and automated reminders.
