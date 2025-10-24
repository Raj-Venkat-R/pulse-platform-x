# Unified Digital Registration & Appointment Scheduler - Frontend

This frontend implementation provides a comprehensive React-based interface for the Unified Digital Registration & Appointment Scheduler system.

## Features

### 🎯 Core Components

1. **AppointmentBookingWizard** - Multi-step appointment booking form
2. **RealTimeQueueDisplay** - Live queue management and token system
3. **OfflineSyncIndicator** - Offline mode detection and sync management
4. **PatientRegistrationForm** - Complete patient registration system

### 📱 Pages & Routes

- `/appointment/book` - Appointment booking wizard
- `/appointment/queue` - Real-time queue display
- `/appointment/offline` - Offline sync management

## Components Overview

### AppointmentBookingWizard

A comprehensive multi-step form for booking appointments with the following features:

- **Step 1**: Service and location selection
- **Step 2**: Date and time slot selection with real-time availability
- **Step 3**: Patient details (search existing or register new)
- **Step 4**: Confirmation and submission

**Key Features:**
- Online/offline mode detection
- Real-time availability checking
- Patient search and registration
- Form validation and error handling
- Progress indicator

### RealTimeQueueDisplay

Real-time queue management system for walk-ins and kiosks:

- Live queue status updates
- Token generation and management
- Service-wise queue organization
- Status updates (waiting, called, in-service, completed)
- Auto-refresh functionality
- Location and service filtering

**Key Features:**
- Real-time updates every 30 seconds
- Manual refresh capability
- Token generation for walk-ins
- Queue position tracking
- Wait time calculations

### OfflineSyncIndicator

Comprehensive offline mode management:

- Connection status monitoring
- Offline data storage
- Automatic sync when online
- Manual sync triggers
- Sync progress tracking
- Error handling and retry logic

**Key Features:**
- Automatic online/offline detection
- Local storage management
- Sync status visualization
- Error reporting
- Device identification

### PatientRegistrationForm

Complete patient registration system:

- Personal information collection
- Emergency contact details
- Medical history and allergies
- Form validation
- Success confirmation
- Embedded or standalone modes

**Key Features:**
- Comprehensive form validation
- Medical information collection
- Success/error feedback
- Flexible display modes

## API Integration

The frontend integrates with the backend API through a centralized `ApiClient` class:

```typescript
import { apiClient } from '@/lib/api';

// Create appointment
const appointment = await apiClient.createAppointment(appointmentData);

// Get availability
const availability = await apiClient.getAvailability({
  date: '2025-10-25',
  service_id: 123
});

// Generate queue token
const token = await apiClient.generateQueueToken(tokenData);
```

## Offline Support

The system provides comprehensive offline support:

1. **Automatic Detection**: Detects online/offline status
2. **Local Storage**: Saves appointments locally when offline
3. **Sync Management**: Automatically syncs when back online
4. **Conflict Resolution**: Handles sync conflicts gracefully
5. **Progress Tracking**: Shows sync progress and status

## Usage Examples

### Basic Appointment Booking

```tsx
import AppointmentBookingWizard from '@/components/AppointmentBookingWizard';

function BookingPage() {
  return (
    <div>
      <AppointmentBookingWizard />
    </div>
  );
}
```

### Queue Management

```tsx
import RealTimeQueueDisplay from '@/components/RealTimeQueueDisplay';

function QueuePage() {
  return (
    <div>
      <RealTimeQueueDisplay />
    </div>
  );
}
```

### Offline Sync Management

```tsx
import OfflineSyncIndicator from '@/components/OfflineSyncIndicator';

function SyncPage() {
  return (
    <div>
      <OfflineSyncIndicator />
    </div>
  );
}
```

## Styling & Design System

The components use the existing design system:

- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **Lucide React** for icons
- **Consistent color scheme** with CSS variables
- **Responsive design** for mobile and desktop

## State Management

The components use React hooks for state management:

- `useState` for local component state
- `useEffect` for side effects and API calls
- `useToast` for user notifications
- Local storage for offline data persistence

## Error Handling

Comprehensive error handling throughout:

- API error responses
- Network connectivity issues
- Form validation errors
- Offline sync failures
- User-friendly error messages

## Performance Optimizations

- **Lazy loading** for large components
- **Debounced search** for patient lookup
- **Memoized calculations** for queue positions
- **Efficient re-renders** with proper dependency arrays
- **Local storage caching** for offline data

## Browser Support

- Modern browsers with ES6+ support
- Local storage API support
- Fetch API support
- Service worker support (for future PWA features)

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# .env
REACT_APP_API_URL=http://localhost:3000/api
```

3. Start development server:
```bash
npm start
```

## Testing

The components are designed to be easily testable:

- Pure functions where possible
- Clear prop interfaces
- Mockable API calls
- Isolated component logic

## Future Enhancements

- **PWA Support**: Service worker for offline functionality
- **Push Notifications**: Real-time updates
- **Voice Input**: Accessibility improvements
- **Multi-language**: Internationalization
- **Advanced Analytics**: Usage tracking and insights

## Contributing

When adding new features:

1. Follow the existing component patterns
2. Use the established design system
3. Add proper TypeScript types
4. Include error handling
5. Test offline functionality
6. Update documentation

## License

MIT License - see LICENSE file for details.
