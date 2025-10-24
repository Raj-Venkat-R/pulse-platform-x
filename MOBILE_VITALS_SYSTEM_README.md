# Mobile-First Vitals Logging System

A comprehensive mobile-first vitals logging system with real-time monitoring, anomaly detection, offline sync, and EMR integration.

## 🏗️ System Architecture

### Database Schema
- **patient_vitals**: Core vitals data with comprehensive validation
- **vital_ranges**: Age/gender-specific normal ranges for anomaly detection
- **anomaly_logs**: Detailed anomaly tracking with severity classification
- **vitals_sync_logs**: Offline sync tracking and conflict resolution
- **vital_trends**: Analytics and trend analysis

### Backend Services
- **VitalsService**: Core vitals management with validation
- **AnomalyService**: Real-time anomaly detection and alerting
- **OfflineSyncService**: Offline data synchronization
- **EMRSyncService**: EMR system integration

### Frontend Components
- **VitalsEntryForm**: Mobile-optimized vitals entry
- **RealTimeVitalsDisplay**: Live monitoring dashboard
- **AnomalyAlerts**: Critical alerts management
- **OfflineIndicator**: Sync status and offline handling

## 🚀 Features

### Core Functionality
- ✅ **Mobile-First Design**: Optimized for mobile devices
- ✅ **Data Validation**: Comprehensive vital sign validation
- ✅ **Anomaly Detection**: AI-powered anomaly detection
- ✅ **Real-Time Monitoring**: WebSocket-based live updates
- ✅ **Offline Sync**: Complete offline functionality
- ✅ **EMR Integration**: Seamless EMR system sync
- ✅ **Bulk Entry**: Multi-patient vitals entry
- ✅ **Trend Analysis**: Vital trends and analytics

### Advanced Features
- ✅ **Anomaly Classification**: Severity-based anomaly categorization
- ✅ **Real-Time Alerts**: Critical anomaly notifications
- ✅ **Offline Storage**: IndexedDB-based offline storage
- ✅ **Background Sync**: Service Worker-based sync
- ✅ **Conflict Resolution**: Smart conflict resolution
- ✅ **Quality Scoring**: Vital measurement quality assessment
- ✅ **Risk Assessment**: AI-powered risk scoring

## 📱 Mobile Components

### VitalsEntryForm
```typescript
interface VitalsEntryFormProps {
  patientId: number;
  patientName?: string;
  onSuccess?: (vitals: any) => void;
  onCancel?: () => void;
  isOffline?: boolean;
}
```

**Features:**
- Mobile-optimized form layout
- Real-time validation
- Offline mode support
- Auto-save functionality
- Touch-friendly interface

### RealTimeVitalsDisplay
```typescript
interface RealTimeVitalsDisplayProps {
  wardId?: number;
  nurseId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
```

**Features:**
- Live vitals monitoring
- WebSocket real-time updates
- Filtering and search
- Status-based color coding
- Responsive grid layout

### AnomalyAlerts
```typescript
interface AnomalyAlertsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showResolved?: boolean;
  maxAlerts?: number;
}
```

**Features:**
- Critical anomaly alerts
- Severity-based classification
- Acknowledge/resolve actions
- Real-time notifications
- Alert history tracking

### OfflineIndicator
```typescript
interface OfflineIndicatorProps {
  deviceId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  onSyncComplete?: (result: any) => void;
}
```

**Features:**
- Connection status monitoring
- Sync progress tracking
- Offline data management
- Manual sync triggers
- Conflict resolution

## 🔧 API Endpoints

### Core Vitals
- `POST /api/vitals` - Submit vitals with validation
- `GET /api/vitals/patient/:id` - Patient vitals history
- `PUT /api/vitals/:id` - Update vitals record
- `POST /api/vitals/bulk` - Bulk vitals entry

### Offline Sync
- `POST /api/vitals/offline` - Store offline vitals
- `GET /api/vitals/sync/status` - Get sync status
- `POST /api/vitals/sync` - Sync offline data

### Anomaly Management
- `GET /api/vitals/anomalies` - Get anomaly alerts
- `POST /api/vitals/anomalies/:id/acknowledge` - Acknowledge alert
- `POST /api/vitals/anomalies/:id/resolve` - Resolve anomaly

### Analytics & Trends
- `GET /api/vitals/trends/:patientId` - Get vital trends
- `GET /api/vitals/dashboard` - Dashboard data
- `GET /api/vitals/emr/sync/:patientId` - EMR sync

## 🗄️ Database Schema

### patient_vitals Table
```sql
CREATE TABLE patient_vitals (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    nurse_id BIGINT NOT NULL REFERENCES users(id),
    
    -- Vital measurements
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(4,1),
    spo2 INTEGER,
    respiratory_rate INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    pain_level INTEGER,
    blood_glucose DECIMAL(5,2),
    
    -- Status and validation
    status vital_status NOT NULL DEFAULT 'pending',
    has_critical_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_count INTEGER DEFAULT 0,
    
    -- Offline sync
    sync_status sync_status NOT NULL DEFAULT 'pending',
    device_id TEXT,
    
    -- Quality indicators
    measurement_quality TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### vital_ranges Table
```sql
CREATE TABLE vital_ranges (
    id BIGSERIAL PRIMARY KEY,
    vital_type TEXT NOT NULL,
    age_group_min INTEGER,
    age_group_max INTEGER,
    gender TEXT,
    
    -- Normal ranges
    min_normal DECIMAL(8,2) NOT NULL,
    max_normal DECIMAL(8,2) NOT NULL,
    
    -- Critical ranges
    critical_min DECIMAL(8,2),
    critical_max DECIMAL(8,2),
    
    -- Alert thresholds
    warning_min DECIMAL(8,2),
    warning_max DECIMAL(8,2),
    
    unit TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
```

### anomaly_logs Table
```sql
CREATE TABLE anomaly_logs (
    id BIGSERIAL PRIMARY KEY,
    vital_id BIGINT NOT NULL REFERENCES patient_vitals(id),
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    
    -- Anomaly details
    detected_anomaly TEXT NOT NULL,
    vital_type TEXT NOT NULL,
    measured_value DECIMAL(8,2) NOT NULL,
    deviation_percentage DECIMAL(5,2),
    
    -- Severity and classification
    severity anomaly_severity NOT NULL,
    clinical_significance TEXT,
    
    -- Alert management
    alert_sent BOOLEAN DEFAULT FALSE,
    alert_acknowledged BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    
    -- AI analysis
    ai_confidence DECIMAL(3,2),
    risk_score DECIMAL(3,2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 🔄 Offline Sync System

### Service Worker
- **Background Sync**: Automatic sync when online
- **Offline Storage**: IndexedDB-based data persistence
- **Conflict Resolution**: Smart conflict handling
- **Push Notifications**: Critical alert notifications

### Offline Data Flow
1. **Store Offline**: Vitals stored in IndexedDB when offline
2. **Background Sync**: Service Worker handles sync when online
3. **Conflict Resolution**: Smart resolution of data conflicts
4. **Status Tracking**: Real-time sync status monitoring

### Sync Status Types
- `pending`: Waiting to sync
- `synced`: Successfully synced
- `failed`: Sync failed
- `conflict`: Data conflict detected

## 🚨 Anomaly Detection

### Detection Algorithm
1. **Range Validation**: Check against age/gender-specific ranges
2. **Deviation Calculation**: Calculate percentage deviation
3. **Severity Classification**: Categorize by severity level
4. **Clinical Significance**: Assess clinical impact
5. **Risk Scoring**: AI-powered risk assessment

### Severity Levels
- **Critical**: Life-threatening values
- **High**: Significant deviation from normal
- **Medium**: Moderate deviation
- **Low**: Minor deviation

### Alert Types
- **Real-Time Alerts**: Immediate critical alerts
- **WebSocket Notifications**: Live updates
- **Push Notifications**: Mobile notifications
- **Email/SMS**: Staff notifications

## 📊 Analytics & Trends

### Vital Trends
- **Daily Aggregates**: Min/max/average values
- **Trend Analysis**: Direction and strength
- **Risk Assessment**: Patient risk scoring
- **Predictive Analytics**: Future trend prediction

### Dashboard Metrics
- **Total Measurements**: Count of vitals recorded
- **Anomaly Rates**: Percentage of abnormal values
- **Critical Alerts**: Number of critical anomalies
- **Sync Status**: Offline sync statistics

## 🔐 Security & Privacy

### Data Protection
- **Encryption**: Sensitive data encryption
- **Access Control**: Role-based access
- **Audit Logging**: Complete audit trail
- **HIPAA Compliance**: Healthcare data protection

### Authentication
- **JWT Tokens**: Secure authentication
- **Device Tracking**: Device-specific access
- **Session Management**: Secure session handling

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (for caching)
- WebSocket server

### Installation
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start the server
npm start
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/vitals_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
WEBSOCKET_PORT=3001
```

## 📱 Mobile Optimization

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets
- **Offline-First**: Works without internet
- **Progressive Web App**: PWA capabilities

### Performance
- **Lazy Loading**: Component-based lazy loading
- **Caching**: Aggressive caching strategy
- **Compression**: Data compression
- **CDN**: Content delivery network

## 🔧 Configuration

### Vital Ranges
Configure normal ranges for different age groups and genders:

```sql
INSERT INTO vital_ranges (vital_type, age_group_min, age_group_max, gender, min_normal, max_normal, critical_min, critical_max, unit) VALUES
('bp_systolic', 18, 65, 'all', 90, 140, 70, 180, 'mmHg'),
('heart_rate', 18, 65, 'all', 60, 100, 40, 150, 'bpm'),
('temperature', 0, 120, 'all', 36.1, 37.2, 35.0, 40.0, '°C');
```

### Alert Thresholds
Configure alert thresholds for different severity levels:

```sql
UPDATE vital_ranges 
SET warning_min = 80, warning_max = 160 
WHERE vital_type = 'bp_systolic' AND age_group_min = 18;
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

## 📈 Monitoring

### Health Checks
- **Database**: Connection status
- **WebSocket**: Real-time connection
- **Sync Status**: Offline sync health
- **Anomaly Detection**: Detection accuracy

### Metrics
- **Response Times**: API response times
- **Error Rates**: Error frequency
- **Sync Success**: Offline sync success rate
- **Alert Accuracy**: Anomaly detection accuracy

## 🔄 Maintenance

### Database Maintenance
- **Index Optimization**: Regular index maintenance
- **Data Archiving**: Old data archiving
- **Performance Tuning**: Query optimization

### System Updates
- **Zero-Downtime**: Rolling updates
- **Backward Compatibility**: API versioning
- **Migration Scripts**: Database migrations

## 📚 Documentation

### API Documentation
- **Swagger/OpenAPI**: Interactive API docs
- **Postman Collection**: API testing
- **Code Examples**: Usage examples

### User Guides
- **Mobile App Guide**: User manual
- **Admin Guide**: Administration guide
- **Developer Guide**: Integration guide

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Standards
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Type safety
- **Jest**: Testing framework

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive docs
- **Issues**: GitHub issues
- **Community**: Discord/Slack
- **Email**: support@example.com

### Troubleshooting
- **Common Issues**: FAQ section
- **Debug Mode**: Detailed logging
- **Performance**: Optimization tips
- **Security**: Security best practices

---

**Built with ❤️ for healthcare professionals**
