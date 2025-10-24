import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  Edit,
  Save,
  X,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Calendar,
  FileText,
  Download,
  Eye,
  Loader2,
  MessageSquare,
  TrendingUp,
  Bell
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ComplaintDetailsProps {
  complaintId: number;
  onBack?: () => void;
}

interface Complaint {
  id: number;
  complaint_number: string;
  complainant_name: string;
  complainant_email: string;
  complainant_phone: string;
  complainant_relationship: string;
  subject: string;
  description: string;
  category: string;
  subcategory: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed' | 'cancelled';
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  sla_due_date: string | null;
  escalation_level: number;
  escalation_reason: string | null;
  resolution_notes: string | null;
  resolution_category: string | null;
  internal_notes: string | null;
  tags: string[];
  attachments: Attachment[];
  sla_logs: SlaLog[];
  escalations: Escalation[];
}

interface Attachment {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  attachment_type: string;
  is_public: boolean;
  is_evidence: boolean;
  created_at: string;
}

interface SlaLog {
  id: number;
  sla_category: string;
  metric_type: string;
  target_hours: number;
  sla_start_time: string;
  sla_due_time: string;
  sla_end_time: string | null;
  sla_status: string;
  breached_at: string | null;
  breach_duration_minutes: number | null;
  breach_severity: string | null;
}

interface Escalation {
  id: number;
  escalation_level: number;
  triggered_at: string;
  trigger_reason: string;
  rule_name: string;
  actions_taken: any;
  success: boolean;
}

const ComplaintDetails: React.FC<ComplaintDetailsProps> = ({ 
  complaintId, 
  onBack 
}) => {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: '',
    assigned_to: '',
    urgency: '',
    priority: 0,
    resolution_notes: '',
    internal_notes: '',
    tags: [] as string[]
  });

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const statusOptions = [
    { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'pending_customer', label: 'Pending Customer', color: 'bg-purple-100 text-purple-800' },
    { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
    { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId]);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const response = await api.complaints.getById(complaintId);
      
      if (response.success) {
        setComplaint(response.data);
        setEditData({
          status: response.data.status,
          assigned_to: response.data.assigned_to?.toString() || '',
          urgency: response.data.urgency,
          priority: 0,
          resolution_notes: response.data.resolution_notes || '',
          internal_notes: response.data.internal_notes || '',
          tags: response.data.tags || []
        });
      }
    } catch (error) {
      toast.error('Failed to fetch complaint details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!complaint) return;

    try {
      const updateData: any = {};
      
      if (editData.status !== complaint.status) {
        updateData.status = editData.status;
      }
      if (editData.assigned_to !== complaint.assigned_to?.toString()) {
        updateData.assigned_to = editData.assigned_to ? parseInt(editData.assigned_to) : null;
      }
      if (editData.urgency !== complaint.urgency) {
        updateData.urgency = editData.urgency;
      }
      if (editData.priority !== 0) {
        updateData.priority = editData.priority;
      }
      if (editData.resolution_notes !== complaint.resolution_notes) {
        updateData.resolution_notes = editData.resolution_notes;
      }
      if (editData.internal_notes !== complaint.internal_notes) {
        updateData.internal_notes = editData.internal_notes;
      }
      if (JSON.stringify(editData.tags) !== JSON.stringify(complaint.tags)) {
        updateData.tags = editData.tags;
      }

      const response = await api.complaints.update(complaint.id, updateData);
      
      if (response.success) {
        toast.success('Complaint updated successfully');
        setIsEditing(false);
        fetchComplaintDetails();
      }
    } catch (error) {
      toast.error('Failed to update complaint');
    }
  };

  const handleEscalate = async () => {
    if (!complaint) return;

    try {
      const response = await api.complaints.escalate(complaint.id, {
        escalation_reason: 'Manual escalation by staff',
        escalation_level: complaint.escalation_level + 1
      });
      
      if (response.success) {
        toast.success('Complaint escalated successfully');
        fetchComplaintDetails();
      }
    } catch (error) {
      toast.error('Failed to escalate complaint');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUrgencyBadge = (urgency: string) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return (
      <Badge className={level?.color || 'bg-gray-100 text-gray-800'}>
        {level?.label || urgency}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusOption?.color || 'bg-gray-100 text-gray-800'}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const isSlaBreached = (slaDueDate: string | null) => {
    if (!slaDueDate) return false;
    return new Date(slaDueDate) < new Date();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Complaint not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">{complaint.complaint_number}</h1>
            <p className="text-gray-600">{complaint.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          )}
          {complaint.escalation_level < 3 && (
            <Button variant="destructive" onClick={handleEscalate}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          )}
        </div>
      </div>

      {/* SLA Alert */}
      {complaint.sla_due_date && isSlaBreached(complaint.sla_due_date) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>SLA Breached:</strong> This complaint has exceeded its SLA deadline. 
            Immediate attention required.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({complaint.attachments.length})</TabsTrigger>
          <TabsTrigger value="sla">SLA Status</TabsTrigger>
          <TabsTrigger value="escalations">Escalations ({complaint.escalations.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Complainant</Label>
                    <p className="text-sm">{complaint.complainant_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                    <p className="text-sm">{complaint.complainant_email || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                    <p className="text-sm">{complaint.complainant_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Relationship</Label>
                    <p className="text-sm">{complaint.complainant_relationship}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{complaint.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Status & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Assigned To</Label>
                      <Select
                        value={editData.assigned_to}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, assigned_to: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          <SelectItem value="1">John Doe</SelectItem>
                          <SelectItem value="2">Jane Smith</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Urgency</Label>
                      <Select
                        value={editData.urgency}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, urgency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {urgencyLevels.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Priority (0-10)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={editData.priority}
                        onChange={(e) => setEditData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-500">Status:</Label>
                      {getStatusBadge(complaint.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-500">Urgency:</Label>
                      {getUrgencyBadge(complaint.urgency)}
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Assigned To:</Label>
                      <p className="text-sm">{complaint.assigned_to_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Escalation Level:</Label>
                      <p className="text-sm">{complaint.escalation_level}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resolution Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editData.resolution_notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  placeholder="Enter resolution notes..."
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {complaint.resolution_notes || 'No resolution notes yet.'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editData.internal_notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  placeholder="Enter internal notes..."
                  rows={4}
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {complaint.internal_notes || 'No internal notes yet.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader>
              <CardTitle>Attachments ({complaint.attachments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {complaint.attachments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No attachments</p>
              ) : (
                <div className="space-y-4">
                  {complaint.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium">{attachment.original_filename}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(attachment.file_size)} • {attachment.mime_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.is_evidence && (
                          <Badge variant="outline">Evidence</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Tab */}
        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>SLA Status</CardTitle>
            </CardHeader>
            <CardContent>
              {complaint.sla_logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No SLA information available</p>
              ) : (
                <div className="space-y-4">
                  {complaint.sla_logs.map((sla) => (
                    <div key={sla.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{sla.sla_category}</h3>
                        <Badge className={
                          sla.sla_status === 'breached' ? 'bg-red-100 text-red-800' :
                          sla.sla_status === 'at_risk' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {sla.sla_status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-gray-500">Target:</Label>
                          <p>{sla.target_hours} hours</p>
                        </div>
                        <div>
                          <Label className="text-gray-500">Due:</Label>
                          <p>{formatDate(sla.sla_due_time)}</p>
                        </div>
                        {sla.breached_at && (
                          <>
                            <div>
                              <Label className="text-gray-500">Breached:</Label>
                              <p>{formatDate(sla.breached_at)}</p>
                            </div>
                            <div>
                              <Label className="text-gray-500">Duration:</Label>
                              <p>{sla.breach_duration_minutes} minutes</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations">
          <Card>
            <CardHeader>
              <CardTitle>Escalation History</CardTitle>
            </CardHeader>
            <CardContent>
              {complaint.escalations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No escalations yet</p>
              ) : (
                <div className="space-y-4">
                  {complaint.escalations.map((escalation) => (
                    <div key={escalation.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Level {escalation.escalation_level}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{escalation.rule_name}</Badge>
                          {escalation.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{escalation.trigger_reason}</p>
                      <p className="text-xs text-gray-500">{formatDate(escalation.triggered_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Complaint History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Complaint Created</p>
                    <p className="text-sm text-gray-500">{formatDate(complaint.created_at)}</p>
                  </div>
                </div>
                
                {complaint.updated_at !== complaint.created_at && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <Edit className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-gray-500">{formatDate(complaint.updated_at)}</p>
                    </div>
                  </div>
                )}

                {complaint.resolved_at && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Resolved</p>
                      <p className="text-sm text-gray-500">{formatDate(complaint.resolved_at)}</p>
                    </div>
                  </div>
                )}

                {complaint.closed_at && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <X className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Closed</p>
                      <p className="text-sm text-gray-500">{formatDate(complaint.closed_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplaintDetails;
