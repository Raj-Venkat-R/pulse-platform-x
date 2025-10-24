# Complaint & Query Management Portal - Frontend Components

A comprehensive React frontend for managing healthcare complaints with AI-powered categorization, automated escalation workflows, and real-time SLA monitoring.

## 🚀 Features

### Core Components
- **ComplaintSubmissionForm**: Multi-step complaint submission with file uploads and AI categorization
- **ComplaintDashboard**: Staff dashboard for managing complaints with filtering and assignment
- **ComplaintDetails**: Detailed complaint view with status updates and history tracking
- **EscalationWorkflow**: Automated escalation management with rule-based triggers

### Advanced Features
- **AI Categorization**: Automatic complaint categorization and urgency scoring
- **File Management**: Secure file uploads with preview and integrity checking
- **Real-time Updates**: Live status updates and SLA monitoring
- **Multi-channel Notifications**: Email, SMS, and dashboard notifications
- **Audit Trails**: Complete history tracking and compliance logging

## 📁 Component Structure

```
src/
├── components/
│   ├── ComplaintSubmissionForm.tsx    # Complaint submission with AI
│   ├── ComplaintDashboard.tsx         # Staff management dashboard
│   ├── ComplaintDetails.tsx           # Detailed complaint view
│   └── EscalationWorkflow.tsx         # Escalation management
├── pages/
│   ├── ComplaintSubmit.tsx            # Submit complaint page
│   ├── ComplaintDashboard.tsx         # Dashboard page
│   └── ComplaintDetails.tsx           # Details page
└── lib/
    ├── api.ts                         # Main API client
    └── complaintApi.ts                # Complaint-specific API wrapper
```

## 🎯 Component Details

### ComplaintSubmissionForm

**Purpose**: Allows patients to submit complaints with AI-powered categorization.

**Key Features**:
- Multi-step form with validation
- File upload with preview (images, documents)
- AI categorization with confidence scoring
- Urgency override capabilities
- Real-time form validation

**Props**:
```typescript
interface ComplaintSubmissionFormProps {
  patientId?: number;
  onSuccess?: (complaint: any) => void;
}
```

**Usage**:
```tsx
<ComplaintSubmissionForm 
  patientId={123}
  onSuccess={(complaint) => console.log('Complaint submitted:', complaint)}
/>
```

### ComplaintDashboard

**Purpose**: Staff dashboard for managing and tracking complaints.

**Key Features**:
- Advanced filtering and search
- Sortable columns with pagination
- Bulk assignment capabilities
- SLA breach indicators
- Real-time status updates

**Props**:
```typescript
interface ComplaintDashboardProps {
  userRole?: string;
  userId?: number;
}
```

**Usage**:
```tsx
<ComplaintDashboard 
  userRole="staff"
  userId={456}
/>
```

### ComplaintDetails

**Purpose**: Comprehensive complaint view with editing and escalation capabilities.

**Key Features**:
- Tabbed interface (Overview, Attachments, SLA, Escalations, History)
- Inline editing with validation
- File attachment management
- SLA monitoring and breach alerts
- Escalation workflow integration

**Props**:
```typescript
interface ComplaintDetailsProps {
  complaintId: number;
  onBack?: () => void;
}
```

**Usage**:
```tsx
<ComplaintDetails 
  complaintId={789}
  onBack={() => navigate('/complaints/dashboard')}
/>
```

### EscalationWorkflow

**Purpose**: Manages automated and manual escalation processes.

**Key Features**:
- Rule-based escalation triggers
- Manual escalation with reason tracking
- Escalation history and audit trail
- Action preview and execution
- Cooldown period management

**Props**:
```typescript
interface EscalationWorkflowProps {
  complaintId: number;
  currentLevel: number;
  onEscalationComplete?: () => void;
}
```

**Usage**:
```tsx
<EscalationWorkflow 
  complaintId={789}
  currentLevel={2}
  onEscalationComplete={() => refreshComplaint()}
/>
```

## 🛣️ Routing

The application includes the following routes:

```tsx
// Complaint routes
<Route path="/complaints/submit" element={<ComplaintSubmit />} />
<Route path="/complaints/dashboard" element={<ComplaintDashboard />} />
<Route path="/complaints/:id" element={<ComplaintDetails />} />
```

## 🔌 API Integration

### API Client

The `api.ts` file provides a comprehensive API client with the following complaint endpoints:

```typescript
// Complaint operations
api.complaints.submit(formData)           // Submit new complaint
api.complaints.list(queryParams)          // List complaints with filters
api.complaints.getById(id)                // Get complaint details
api.complaints.update(id, data)           // Update complaint
api.complaints.escalate(id, data)         // Escalate complaint
api.complaints.aiCategorize(data)         // AI categorization
api.complaints.getCategories()            // Get complaint categories
api.complaints.getStats(params)           // Get statistics
api.complaints.getAttachments(id)         // Get attachments
api.complaints.uploadAttachments(id, data) // Upload attachments
api.complaints.getSLA(id)                 // Get SLA information
api.complaints.getEscalations(id)         // Get escalation history

// Escalation operations
api.escalation.getRules()                 // Get escalation rules
api.escalation.getStats(params)           // Get escalation statistics
```

### File Upload Handling

File uploads are handled using FormData for multipart requests:

```typescript
const formData = new FormData();
formData.append('complainant_name', 'John Doe');
formData.append('subject', 'Billing Issue');
formData.append('description', 'I was charged incorrectly');
formData.append('attachments', file1);
formData.append('attachments', file2);

const response = await api.complaints.submit(formData);
```

## 🎨 UI Components

### Design System

The components use a consistent design system with:

- **Tailwind CSS** for styling
- **shadcn/ui** components for UI elements
- **Lucide React** for icons
- **Sonner** for toast notifications

### Key UI Patterns

**Cards**: Used for grouping related information
```tsx
<Card>
  <CardHeader>
    <CardTitle>Complaint Details</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Badges**: For status indicators and categorization
```tsx
<Badge className="bg-red-100 text-red-800">Critical</Badge>
<Badge className="bg-green-100 text-green-800">Resolved</Badge>
```

**Tables**: For data display with sorting and pagination
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Complaint #</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {/* Rows */}
  </TableBody>
</Table>
```

## 🤖 AI Integration

### Mock AI Service

The frontend includes a mock AI categorization service that can be easily replaced:

```typescript
// Current mock implementation
const categorization = await api.complaints.aiCategorize({
  complaint_id: null,
  description: "The doctor was very rude and unprofessional"
});

// Returns:
{
  category: "staff_behavior",
  subcategory: "unprofessional_conduct", 
  urgency: "medium",
  confidence: 0.8,
  sentiment: "negative",
  suggested_tags: ["staff", "behavior"]
}
```

### AI Features

- **Automatic Categorization**: Detects complaint categories based on keywords
- **Urgency Scoring**: Adjusts urgency based on sentiment and keywords
- **Entity Extraction**: Identifies names, dates, amounts, and locations
- **Confidence Scoring**: Provides confidence levels for AI suggestions
- **Override Capabilities**: Allows manual adjustment of AI suggestions

## 📊 State Management

### Local State

Components use React hooks for local state management:

```typescript
const [complaints, setComplaints] = useState<Complaint[]>([]);
const [loading, setLoading] = useState(true);
const [filters, setFilters] = useState({
  search: '',
  status: '',
  urgency: '',
  category: ''
});
```

### Form State

Forms use controlled components with validation:

```typescript
const [formData, setFormData] = useState({
  complainant_name: '',
  subject: '',
  description: '',
  category: '',
  urgency: 'medium'
});

const handleInputChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```

## 🔒 Security Features

### Input Validation

All forms include comprehensive validation:

```typescript
// Required field validation
if (!formData.complainant_name || !formData.subject) {
  toast.error('Please fill in all required fields');
  return;
}

// File size validation
if (file.size > 10 * 1024 * 1024) {
  toast.error('File is too large. Maximum size is 10MB.');
  return;
}
```

### File Upload Security

- File type validation
- Size limits (10MB per file, 5 files max)
- Secure filename generation
- Integrity checking

## 📱 Responsive Design

### Mobile Optimization

All components are fully responsive with:

- Mobile-first design approach
- Collapsible navigation
- Touch-friendly interfaces
- Optimized table layouts for small screens

### Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .grid-cols-1 { /* Single column layout */ }
}

/* Tablet */
@media (min-width: 768px) {
  .md:grid-cols-2 { /* Two column layout */ }
}

/* Desktop */
@media (min-width: 1024px) {
  .lg:grid-cols-3 { /* Three column layout */ }
}
```

## 🧪 Testing

### Component Testing

Components can be tested using React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ComplaintSubmissionForm from './ComplaintSubmissionForm';

test('submits complaint successfully', async () => {
  render(<ComplaintSubmissionForm />);
  
  fireEvent.change(screen.getByLabelText('Your Name'), {
    target: { value: 'John Doe' }
  });
  
  fireEvent.click(screen.getByText('Submit Complaint'));
  
  await waitFor(() => {
    expect(screen.getByText('Complaint submitted successfully!')).toBeInTheDocument();
  });
});
```

## 🚀 Deployment

### Build Process

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start development server
npm run dev
```

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_UPLOAD_URL=http://localhost:3000/uploads
```

## 📈 Performance Optimization

### Code Splitting

Components are lazy-loaded for better performance:

```typescript
const ComplaintDetails = lazy(() => import('./pages/ComplaintDetails'));
const ComplaintDashboard = lazy(() => import('./pages/ComplaintDashboard'));
```

### Memoization

Expensive operations are memoized:

```typescript
const memoizedComplaints = useMemo(() => {
  return complaints.filter(complaint => 
    complaint.status === filters.status
  );
}, [complaints, filters.status]);
```

## 🔧 Customization

### Theming

The design system supports easy theming through CSS variables:

```css
:root {
  --primary: 222.2 84% 4.9%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
}
```

### Component Variants

Components support multiple variants:

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

## 📞 Support

For technical support or questions:
- Check the component documentation
- Review the API integration guide
- Contact the development team

---

**Built with ❤️ for Healthcare Excellence**
