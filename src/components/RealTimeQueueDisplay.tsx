import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Clock, 
  Bell, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Stethoscope,
  Loader2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { api } from '@/lib/api';
import { subscribeQueueEntriesFirestore, addQueueEntryFirestore } from '@/lib/firebase';
import { toast } from 'sonner';

interface QueueDisplayProps {
  doctorId?: number;
  locationId?: number;
  autoRefresh?: boolean;
  showNotifications?: boolean;
}

interface QueueEntry {
  id: number;
  token_number: string;
  patient_name: string;
  patient_phone: string;
  current_status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  priority_score: number;
  queue_position: number;
  estimated_wait_time_minutes: number;
  check_in_time: string;
  called_time?: string;
  consultation_start_time?: string;
  reason_for_visit?: string;
  urgency_level?: string;
  special_requirements?: string;
}

interface DoctorQueue {
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string;
  total_waiting: number;
  total_called: number;
  total_in_consultation: number;
  queue: QueueEntry[];
}

const RealTimeQueueDisplay: React.FC<QueueDisplayProps> = ({
  doctorId,
  locationId,
  autoRefresh = true,
  showNotifications = true
}) => {
  const [queues, setQueues] = useState<DoctorQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const intervalRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Firestore realtime subscription for queue entries
    const unsub = subscribeQueueEntriesFirestore((entries) => {
      const grouped = groupByDoctor(entries);
      setQueues(grouped);
      setLastUpdate(new Date());
      setLoading(false);
    });

    // Optional legacy polling + websocket are no-ops now
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      unsub && unsub();
    };
  }, [doctorId, locationId, autoRefresh]);

  const setupWebSocket = () => {
    const wsUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
    if (!wsUrl) {
      // No websocket configured in Vite env; skip realtime
      return;
    }
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error('WS message parse error:', e);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(setupWebSocket, 5000);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'queue_update':
        setQueues(data.queues);
        setLastUpdate(new Date());
        break;
      case 'patient_called':
        handlePatientCalled(data);
        break;
      case 'queue_position_change':
        handleQueuePositionChange(data);
        break;
      default:
        console.log('Unknown WebSocket message:', data);
    }
  };

  const handlePatientCalled = (data: any) => {
    if (showNotifications && soundEnabled) {
      playNotificationSound();
    }
    
    const notification = `Patient ${data.patient_name} (Token ${data.token_number}) has been called`;
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
    
    toast.info(notification);
  };

  const handleQueuePositionChange = (data: any) => {
    const notification = `Your position in queue has changed to ${data.new_position}`;
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
  };

  const playNotificationSound = () => {
    // Create a simple notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const fetchQueueStatus = async () => {
    // With Firestore realtime, manual refresh just updates timestamp
    setLastUpdate(new Date());
  };

  const groupByDoctor = (entries: Array<any>): DoctorQueue[] => {
    // Optional filter by doctorId/locationId if needed later
    const map = new Map<number, DoctorQueue>();
    for (const e of entries) {
      const did = Number(e.doctor_id ?? 0);
      if (!did) continue;
      if (!map.has(did)) {
        map.set(did, {
          doctor_id: did,
          doctor_name: String(e.doctor_name || 'Doctor'),
          doctor_specialty: String(e.doctor_specialty || 'General'),
          total_waiting: 0,
          total_called: 0,
          total_in_consultation: 0,
          queue: [],
        });
      }
      const q = map.get(did)!;
      const entry = {
        id: e.id || `${e.token_number}-${e.check_in_time}`,
        token_number: String(e.token_number || ''),
        patient_name: String(e.patient_name || ''),
        patient_phone: String(e.patient_phone || ''),
        current_status: (e.current_status || 'waiting') as any,
        priority_score: Number(e.priority_score || 0),
        queue_position: Number(e.queue_position || 0),
        estimated_wait_time_minutes: Number(e.estimated_wait_time_minutes || 0),
        check_in_time: String(e.check_in_time || new Date().toISOString()),
        called_time: e.called_time,
        consultation_start_time: e.consultation_start_time,
        reason_for_visit: e.reason_for_visit,
        urgency_level: e.urgency_level,
        special_requirements: e.special_requirements,
      } as any;
      q.queue.push(entry);
      if (entry.current_status === 'waiting') q.total_waiting++;
      else if (entry.current_status === 'in_consultation') q.total_in_consultation++;
      else if (entry.current_status === 'called') q.total_called++;
    }
    // Sort queues by queue_position or check_in_time
    const result = Array.from(map.values());
    for (const q of result) {
      q.queue.sort((a, b) => {
        const pa = Number(a.queue_position || 0);
        const pb = Number(b.queue_position || 0);
        if (pa !== pb) return pa - pb;
        return new Date(a.check_in_time).getTime() - new Date(b.check_in_time).getTime();
      });
    }
    return result;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      waiting: { label: 'Waiting', color: 'bg-yellow-100 text-yellow-800' },
      called: { label: 'Called', color: 'bg-blue-100 text-blue-800' },
      in_consultation: { label: 'In Consultation', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.waiting;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      low: { label: 'Low', color: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', color: 'bg-red-100 text-red-800' }
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.medium;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Queue Status</h1>
          <p className="text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueueStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {notifications.slice(0, 3).map((notification, index) => (
                <div key={index} className="text-sm">
                  {notification}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Queue Cards */}
      {queues.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Queues</h3>
            <p className="text-gray-600">There are currently no patients in the queue.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {queues.map((queue) => (
            <Card key={queue.doctor_id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  {queue.doctor_name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{queue.doctor_specialty}</span>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {queue.total_waiting} waiting
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      {queue.total_in_consultation} in consultation
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {queue.queue.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No patients in queue
                  </div>
                ) : (
                  <div className="space-y-3">
                    {queue.queue.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`p-4 border rounded-lg ${
                          entry.current_status === 'called' 
                            ? 'bg-blue-50 border-blue-200' 
                            : entry.current_status === 'in_consultation'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {entry.token_number}
                            </Badge>
                            <span className="font-medium">{entry.patient_name}</span>
                            {entry.urgency_level && getUrgencyBadge(entry.urgency_level)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(entry.current_status)}
                            {entry.current_status === 'waiting' && (
                              <span className="text-sm text-gray-600">
                                #{entry.queue_position}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Check-in:</span> {formatTime(entry.check_in_time)}
                          </div>
                          {entry.estimated_wait_time_minutes && (
                            <div>
                              <span className="font-medium">Est. Wait:</span> {formatWaitTime(entry.estimated_wait_time_minutes)}
                            </div>
                          )}
                          {entry.called_time && (
                            <div>
                              <span className="font-medium">Called:</span> {formatTime(entry.called_time)}
                            </div>
                          )}
                          {entry.consultation_start_time && (
                            <div>
                              <span className="font-medium">Started:</span> {formatTime(entry.consultation_start_time)}
                            </div>
                          )}
                        </div>

                        {entry.reason_for_visit && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Reason:</span> {entry.reason_for_visit}
                          </div>
                        )}

                        {entry.special_requirements && (
                          <div className="mt-2 text-sm text-blue-600">
                            <span className="font-medium">Special Requirements:</span> {entry.special_requirements}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Queue Statistics */}
      {queues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Queue Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {queues.reduce((sum, q) => sum + q.total_waiting, 0)}
                </div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {queues.reduce((sum, q) => sum + q.total_called, 0)}
                </div>
                <div className="text-sm text-gray-600">Called</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {queues.reduce((sum, q) => sum + q.total_in_consultation, 0)}
                </div>
                <div className="text-sm text-gray-600">In Consultation</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {queues.reduce((sum, q) => sum + q.queue.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeQueueDisplay;