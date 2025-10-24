# Unified Digital Registration & Appointment Scheduler API

A comprehensive Node.js/Express API for managing healthcare appointments, queue management, and offline synchronization.

## Features

- **Appointment Booking**: Online and offline appointment scheduling
- **Availability Management**: Real-time availability checking
- **Queue Management**: Walk-in token generation and queue tracking
- **Offline Sync**: Support for offline devices and kiosks
- **Reminder System**: Automated email/SMS reminders
- **Multi-location Support**: Handle multiple hospital locations and services

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your database and service credentials
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Appointments

#### POST /api/appointments
Book a new appointment (online or offline)

**Request Body:**
```json
{
  "patient_id": 123,
  "provider_id": 456,
  "service_id": 789,
  "location_id": 101,
  "availability_slot_id": 202,
  "scheduled_start": "2025-10-25T10:00:00Z",
  "scheduled_end": "2025-10-25T10:30:00Z",
  "appointment_type": "online",
  "source": "web",
  "reason": "Annual checkup",
  "notes": "Patient prefers morning appointments"
}
```

#### GET /api/appointments/availability
Check available slots for a given date and service

**Query Parameters:**
- `date` (required): Date in ISO format
- `service_id` (optional): Filter by service
- `location_id` (optional): Filter by location
- `provider_id` (optional): Filter by provider

**Example:**
```
GET /api/appointments/availability?date=2025-10-25&service_id=789&location_id=101
```

#### POST /api/appointments/offline
Store an offline appointment (to be synced later)

**Request Body:**
```json
{
  "patient_id": 123,
  "provider_id": 456,
  "service_id": 789,
  "location_id": 101,
  "scheduled_start": "2025-10-25T10:00:00Z",
  "scheduled_end": "2025-10-25T10:30:00Z",
  "reason": "Emergency consultation"
}
```

#### PUT /api/appointments/:id/status
Update appointment status

**Request Body:**
```json
{
  "status": "confirmed",
  "notes": "Patient confirmed via phone"
}
```

**Valid statuses:** `scheduled`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`, `rescheduled`

### Queue Management

#### GET /api/appointments/queue
Get current queue for a given date and location

**Query Parameters:**
- `date` (optional): Date in ISO format (defaults to today)
- `location_id` (optional): Filter by location
- `service_id` (optional): Filter by service

#### POST /api/appointments/queue
Generate a walk-in token

**Request Body:**
```json
{
  "location_id": 101,
  "service_id": 789,
  "provider_id": 456,
  "patient_id": 123,
  "channel": "walk_in",
  "priority": 0,
  "notes": "Patient has high fever"
}
```

### Offline Sync

#### GET /api/appointments/sync
Get sync data for offline devices

**Query Parameters:**
- `device_id` (optional): Device identifier
- `last_sync` (optional): Last sync timestamp

#### POST /api/appointments/sync
Submit offline appointments for synchronization

**Request Body:**
```json
{
  "sync_logs": [
    {
      "id": 1,
      "entity_type": "appointment",
      "operation": "create",
      "payload": {
        "patient_id": 123,
        "provider_id": 456,
        "scheduled_start": "2025-10-25T10:00:00Z",
        "scheduled_end": "2025-10-25T10:30:00Z"
      }
    }
  ]
}
```

## Background Jobs

### Reminder System

The API includes a background job that runs every 5 minutes to process appointment reminders:

- **24 hours before**: Email reminder
- **2 hours before**: SMS reminder  
- **30 minutes before**: SMS reminder

Reminders are automatically scheduled when appointments are confirmed and cancelled when appointments are cancelled.

## Database Schema

The API uses the following main tables:

- `appointments`: Core appointment data
- `appointment_reminders`: Scheduled reminders
- `queue_tokens`: Walk-in queue management
- `availability_slots`: Provider availability
- `offline_sync_logs`: Offline synchronization tracking
- `locations`: Hospital locations
- `services`: Clinical services/specialties

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## Authentication

The API expects authentication middleware (`requireAuth`) to be applied. The authenticated user is available in `req.user` with the following properties:

- `id`: User ID
- `location_id`: User's assigned location
- Other user properties as needed

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

Optional service integrations:

- `SENDGRID_API_KEY`: For email reminders
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`: For SMS reminders
- `FIREBASE_SERVER_KEY`: For push notifications

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run database migrations
npm run migrate
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up service API keys for email/SMS
4. Use a process manager like PM2
5. Set up monitoring and logging

## License

MIT