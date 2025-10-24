import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle,
  TrendingUp,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Bell,
  MessageSquare,
  Settings,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface EscalationWorkflowProps {
  complaintId: number;
  currentLevel: number;
  onEscalationComplete?: () => void;
}

interface EscalationRule {
  id: number;
  rule_name: string;
  description: string;
  trigger_type: 'time_based' | 'status_based' | 'manual' | 'sla_breach' | 'priority_based';
  trigger_conditions: any;
  escalation_actions: any;
  applies_to_categories: string[];
  applies_to_urgencies: string[];
  trigger_delay_hours: number;
  cooldown_hours: number;
  max_escalations: number;
  priority: number;
}

interface EscalationHistory {
  id: number;
  escalation_level: number;
  triggered_at: string;
  trigger_reason: string;
  rule_name: string;
  actions_taken: any;
  success: boolean;
  error_message: string | null;
  escalated_by: number | null;
}

const EscalationWorkflow: React.FC<EscalationWorkflowProps> = ({ 
  complaintId, 
  currentLevel,
  onEscalationComplete 
}) => {
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [escalationHistory, setEscalationHistory] = useState<EscalationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEscalationDialog, setShowEscalationDialog] = useState(false);
  const [escalationData, setEscalationData] = useState({
    escalation_reason: '',
    escalation_level: currentLevel + 1,
    assigned_to: '',
    priority_increase: 0,
    notify_users: [] as string[],
    notify_roles: [] as string[]
  });
  const [isEscalating, setIsEscalating] = useState(false);

  const triggerTypes = [
    { value: 'time_based', label: 'Time-based', icon: Clock },
    { value: 'status_based', label: 'Status-based', icon: CheckCircle },
    { value: 'manual', label: 'Manual', icon: User },
    { value: 'sla_breach', label: 'SLA Breach', icon: AlertTriangle },
    { value: 'priority_based', label: 'Priority-based', icon: TrendingUp }
  ];

  const escalationActions = [
    { value: 'assign_to_role', label: 'Assign to Role' },
    { value: 'assign_to_user', label: 'Assign to User' },
    { value: 'notify_role', label: 'Notify Role' },
    { value: 'notify_user', label: 'Notify User' },
    { value: 'change_status', label: 'Change Status' },
    { value: 'change_priority', label: 'Change Priority' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'send_email', label: 'Send Email' },
    { value: 'create_alert', label: 'Create Alert' }
  ];

  const roles = [
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'manager', label: 'Manager' },
    { value: 'director', label: 'Director' },
    { value: 'admin', label: 'Administrator' }
  ];

  const statusOptions = [
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending_customer', label: 'Pending Customer' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  useEffect(() => {
    fetchEscalationData();
  }, [complaintId]);

  const fetchEscalationData = async () => {
    setLoading(true);
    try {
      // Fetch escalation rules
      const rulesResponse = await api.escalation.getRules();
      if (rulesResponse.success) {
        setEscalationRules(rulesResponse.data);
      }

      // Fetch escalation history
      const historyResponse = await api.complaints.getEscalations(complaintId);
      if (historyResponse.success) {
        setEscalationHistory(historyResponse.data);
      }
    } catch (error) {
      toast.error('Failed to fetch escalation data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEscalation = async () => {
    if (!escalationData.escalation_reason.trim()) {
      toast.error('Please provide an escalation reason');
      return;
    }

    setIsEscalating(true);
    try {
      const response = await api.complaints.escalate(complaintId, {
        escalation_reason: escalationData.escalation_reason,
        escalation_level: escalationData.escalation_level,
        assigned_to: escalationData.assigned_to ? parseInt(escalationData.assigned_to) : undefined,
        priority_increase: escalationData.priority_increase,
        notify_users: escalationData.notify_users,
        notify_roles: escalationData.notify_roles
      });

      if (response.success) {
        toast.success('Complaint escalated successfully');
        setShowEscalationDialog(false);
        setEscalationData({
          escalation_reason: '',
          escalation_level: currentLevel + 1,
          assigned_to: '',
          priority_increase: 0,
          notify_users: [],
          notify_roles: []
        });
        fetchEscalationData();
        if (onEscalationComplete) {
          onEscalationComplete();
        }
      }
    } catch (error) {
      toast.error('Failed to escalate complaint');
    } finally {
      setIsEscalating(false);
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

  const getTriggerTypeIcon = (triggerType: string) => {
    const type = triggerTypes.find(t => t.value === triggerType);
    return type ? type.icon : Clock;
  };

  const getEscalationLevelColor = (level: number) => {
    if (level <= 1) return 'bg-green-100 text-green-800';
    if (level <= 2) return 'bg-yellow-100 text-yellow-800';
    if (level <= 3) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Escalation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Escalation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">Level {currentLevel}</div>
                <div className="text-sm text-gray-500">Current Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{escalationHistory.length}</div>
                <div className="text-sm text-gray-500">Total Escalations</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getEscalationLevelColor(currentLevel)}>
                {currentLevel <= 1 ? 'Normal' : 
                 currentLevel <= 2 ? 'Elevated' : 
                 currentLevel <= 3 ? 'High' : 'Critical'}
              </Badge>
              {currentLevel < 5 && (
                <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Escalate Complaint</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Escalation Reason *</Label>
                        <Textarea
                          value={escalationData.escalation_reason}
                          onChange={(e) => setEscalationData(prev => ({ ...prev, escalation_reason: e.target.value }))}
                          placeholder="Explain why this complaint needs to be escalated..."
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Escalation Level</Label>
                          <Select
                            value={escalationData.escalation_level.toString()}
                            onValueChange={(value) => setEscalationData(prev => ({ ...prev, escalation_level: parseInt(value) }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 - currentLevel }, (_, i) => currentLevel + i + 1).map(level => (
                                <SelectItem key={level} value={level.toString()}>
                                  Level {level}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Priority Increase</Label>
                          <Input
                            type="number"
                            min="0"
                            max="5"
                            value={escalationData.priority_increase}
                            onChange={(e) => setEscalationData(prev => ({ ...prev, priority_increase: parseInt(e.target.value) || 0 }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Assign To</Label>
                        <Select
                          value={escalationData.assigned_to}
                          onValueChange={(value) => setEscalationData(prev => ({ ...prev, assigned_to: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Keep current assignment</SelectItem>
                            {roles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Notify Roles</Label>
                        <Select
                          value={escalationData.notify_roles[0] || ''}
                          onValueChange={(value) => setEscalationData(prev => ({ ...prev, notify_roles: value ? [value] : [] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role to notify" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No additional notifications</SelectItem>
                            {roles.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowEscalationDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleManualEscalation}
                          disabled={isEscalating}
                        >
                          {isEscalating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Escalating...
                            </>
                          ) : (
                            'Escalate Complaint'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escalation Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Available Escalation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escalationRules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No escalation rules configured</p>
          ) : (
            <div className="space-y-4">
              {escalationRules.map((rule) => {
                const IconComponent = getTriggerTypeIcon(rule.trigger_type);
                return (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-gray-400" />
                        <h3 className="font-medium">{rule.rule_name}</h3>
                        <Badge variant="outline">Priority {rule.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{rule.trigger_type}</Badge>
                        <Badge variant="outline">Max {rule.max_escalations}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-500">Trigger Delay:</Label>
                        <p>{rule.trigger_delay_hours} hours</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">Cooldown:</Label>
                        <p>{rule.cooldown_hours} hours</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escalation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Escalation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escalationHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No escalations yet</p>
          ) : (
            <div className="space-y-4">
              {escalationHistory.map((escalation) => (
                <div key={escalation.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <ArrowUp className="h-5 w-5 text-orange-500" />
                      <h3 className="font-medium">Level {escalation.escalation_level}</h3>
                      <Badge className={getEscalationLevelColor(escalation.escalation_level)}>
                        {escalation.escalation_level <= 1 ? 'Normal' : 
                         escalation.escalation_level <= 2 ? 'Elevated' : 
                         escalation.escalation_level <= 3 ? 'High' : 'Critical'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{escalation.rule_name}</Badge>
                      {escalation.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{escalation.trigger_reason}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{formatDate(escalation.triggered_at)}</p>
                    {escalation.error_message && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {escalation.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Escalation Actions Preview */}
      {escalationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Escalation Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {escalationHistory.slice(0, 3).map((escalation) => (
                <div key={escalation.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Level {escalation.escalation_level}</span>
                    <span className="text-xs text-gray-500">{formatDate(escalation.triggered_at)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Actions: {Object.keys(escalation.actions_taken || {}).join(', ') || 'No actions taken'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EscalationWorkflow;
