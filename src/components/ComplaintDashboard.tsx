import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  User,
  Brain,
  Loader2,
  RefreshCw,
  Download,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import api from '@/lib/complaintApi';
import { subscribeComplaintsFirestore } from '@/lib/firebase';
import { toast } from 'sonner';

interface ComplaintDashboardProps {
  userRole?: string;
  userId?: number;
}

interface Complaint {
  id: number;
  complaint_number: string;
  subject: string;
  description: string;
  category: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  urgency_score: number;
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed' | 'cancelled';
  assigned_staff_id: number | null;
  assigned_staff_name: string | null;
  patient_name: string;
  patient_phone: string;
  created_at: string;
  sla_deadline: string;
  sla_status: 'on_track' | 'at_risk' | 'breached';
  escalation_level: number;
  ai_confidence: number;
  sentiment_score: number;
  keywords: string[];
  ai_insights?: any;
}

const ComplaintDashboard: React.FC<ComplaintDashboardProps> = ({ 
  userRole = 'staff', 
  userId 
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    urgency_level: '',
    status: '',
    assigned_staff_id: '',
    sla_status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedComplaints, setSelectedComplaints] = useState<number[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);

  const categories = [
    { value: 'billing', label: 'Billing & Payment', icon: '💳' },
    { value: 'service_quality', label: 'Service Quality', icon: '⭐' },
    { value: 'medical_care', label: 'Medical Care', icon: '🏥' },
    { value: 'staff_behavior', label: 'Staff Behavior', icon: '👥' },
    { value: 'facilities', label: 'Facilities', icon: '🏢' },
    { value: 'appointment', label: 'Appointment', icon: '📅' },
    { value: 'communication', label: 'Communication', icon: '📞' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

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

  const slaStatusOptions = [
    { value: 'on_track', label: 'On Track', color: 'bg-green-100 text-green-800' },
    { value: 'at_risk', label: 'At Risk', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'breached', label: 'Breached', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    // Realtime Firestore subscription; we filter and sort client-side
    setLoading(true);
    const unsub = subscribeComplaintsFirestore((items) => {
      const list = Array.isArray(items) ? items : [];
      setComplaints(applyClientFilters(list));
      setPagination((prev) => {
        const total = list.length;
        const pages = Math.max(1, Math.ceil(total / prev.limit));
        return { ...prev, total, pages };
      });
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    // Re-apply filters and sorting when dependencies change
    setComplaints((prev) => applyClientFilters(prev, true));
  }, [filters, sortBy, sortOrder, pagination.limit, pagination.page]);

  const fetchComplaints = async () => {
    // With Firestore realtime, manual refresh just confirms current state
    setComplaints((prev) => applyClientFilters(prev, true));
    setLastToast();
  };

  const applyClientFilters = (list: any[], assumeRaw?: boolean) => {
    // If assumeRaw, treat input as raw Firestore set; else use existing list
    const data = assumeRaw ? list : list;
    const s = filters.search.trim().toLowerCase();
    let filtered = data.filter((c) =>
      (!filters.category || c.category === filters.category) &&
      (!filters.urgency_level || c.urgency_level === filters.urgency_level) &&
      (!filters.status || c.status === filters.status) &&
      (!s ||
        String(c.subject || '').toLowerCase().includes(s) ||
        String(c.description || '').toLowerCase().includes(s) ||
        String(c.complaint_number || '').toLowerCase().includes(s))
    );
    // Sorting
    filtered.sort((a, b) => {
      const dir = sortOrder === 'ASC' ? 1 : -1;
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return filtered;
  };

  const setLastToast = () => {
    // placeholder to keep button behavior; no-op
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const handleSelectComplaint = (complaintId: number) => {
    setSelectedComplaints(prev => 
      prev.includes(complaintId) 
        ? prev.filter(id => id !== complaintId)
        : [...prev, complaintId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComplaints.length === complaints.length) {
      setSelectedComplaints([]);
    } else {
      setSelectedComplaints(complaints.map(c => c.id));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedComplaints.length === 0) {
      toast.error('Please select complaints to assign');
      return;
    }

    try {
      // Implement bulk assignment logic
      toast.success(`Assigned ${selectedComplaints.length} complaints`);
      setSelectedComplaints([]);
      fetchComplaints();
    } catch (error) {
      toast.error('Failed to assign complaints');
    }
  };

  // Auto-assign feature is not available on the current API; button removed to avoid errors

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

  const getSlaBadge = (slaStatus: string) => {
    const slaOption = slaStatusOptions.find(s => s.value === slaStatus);
    return (
      <Badge className={slaOption?.color || 'bg-gray-100 text-gray-800'}>
        {slaOption?.label || slaStatus}
      </Badge>
    );
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

  const getHoursUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hours = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return hours;
  };

  const isSlaBreached = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Complaint Dashboard</h1>
          <p className="text-gray-600">AI-powered complaint management system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchComplaints}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Insights
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Complaint
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showAIInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {complaints.filter(c => c.urgency_level === 'critical').length}
                </div>
                <div className="text-sm text-blue-600">Critical Complaints</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {complaints.filter(c => c.sla_status === 'at_risk').length}
                </div>
                <div className="text-sm text-yellow-600">At Risk SLA</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {complaints.filter(c => c.sla_status === 'breached').length}
                </div>
                <div className="text-sm text-red-600">Breached SLA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search complaints..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={filters.urgency_level}
                onValueChange={(value) => handleFilterChange('urgency_level', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All urgencies" />
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
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
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
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedComplaints.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedComplaints.length} complaint(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAssign}
                >
                  <User className="h-4 w-4 mr-2" />
                  Assign Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedComplaints([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complaints Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <input
                        type="checkbox"
                        checked={selectedComplaints.length === complaints.length && complaints.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('complaint_number')}
                    >
                      Complaint #
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('subject')}
                    >
                      Subject
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('category')}
                    >
                      Category
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('urgency_level')}
                    >
                      Urgency
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('assigned_staff_name')}
                    >
                      Assigned To
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('created_at')}
                    >
                      Created
                    </TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedComplaints.includes(complaint.id)}
                          onChange={() => handleSelectComplaint(complaint.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {complaint.complaint_number}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {complaint.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categories.find(c => c.value === complaint.category)?.icon} {' '}
                          {categories.find(c => c.value === complaint.category)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(complaint.urgency_level)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(complaint.status)}
                      </TableCell>
                      <TableCell>
                        {complaint.assigned_staff_name || (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(complaint.created_at)}
                      </TableCell>
                      <TableCell>
                        {complaint.sla_deadline && (
                          <div className="flex items-center gap-1">
                            {isSlaBreached(complaint.sla_deadline) ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-green-500" />
                            )}
                            <span className={`text-xs ${
                              isSlaBreached(complaint.sla_deadline) ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {getHoursUntilDeadline(complaint.sla_deadline)}h
                            </span>
                            {getSlaBadge(complaint.sla_status)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${complaint.ai_confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">
                            {Math.round(complaint.ai_confidence * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => window.location.href = `/complaints/${complaint.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {/* Handle edit */}}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintDashboard;