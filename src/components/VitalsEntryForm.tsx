import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets, 
  Wind, 
  Weight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  Save,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface VitalsEntryFormProps {
  patientId: number;
  patientName?: string;
  onSuccess?: (vitals: any) => void;
  onCancel?: () => void;
  isOffline?: boolean;
}

interface VitalsData {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  height: number | null;
  pain_level: number | null;
  blood_glucose: number | null;
  blood_pressure_position: string;
  notes: string;
  patient_condition: string;
}

const VitalsEntryForm: React.FC<VitalsEntryFormProps> = ({
  patientId,
  patientName,
  onSuccess,
  onCancel,
  isOffline = false
}) => {
  const [vitalsData, setVitalsData] = useState<VitalsData>({
    bp_systolic: null,
    bp_diastolic: null,
    heart_rate: null,
    temperature: null,
    spo2: null,
    respiratory_rate: null,
    weight: null,
    height: null,
    pain_level: null,
    blood_glucose: null,
    blood_pressure_position: 'sitting',
    notes: '',
    patient_condition: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const bloodPressurePositions = [
    { value: 'sitting', label: 'Sitting' },
    { value: 'standing', label: 'Standing' },
    { value: 'lying', label: 'Lying Down' }
  ];

  const painLevels = Array.from({ length: 11 }, (_, i) => ({
    value: i,
    label: `${i} - ${i === 0 ? 'No Pain' : i <= 3 ? 'Mild' : i <= 6 ? 'Moderate' : i <= 8 ? 'Severe' : 'Unbearable'}`
  }));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInputChange = (field: keyof VitalsData, value: any) => {
    setVitalsData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateVitals = () => {
    const errors: Record<string, string> = {};

    // Blood pressure validation
    if (vitalsData.bp_systolic && (vitalsData.bp_systolic < 50 || vitalsData.bp_systolic > 300)) {
      errors.bp_systolic = 'Systolic BP must be between 50-300 mmHg';
    }

    if (vitalsData.bp_diastolic && (vitalsData.bp_diastolic < 30 || vitalsData.bp_diastolic > 200)) {
      errors.bp_diastolic = 'Diastolic BP must be between 30-200 mmHg';
    }

    if (vitalsData.bp_systolic && vitalsData.bp_diastolic && vitalsData.bp_systolic <= vitalsData.bp_diastolic) {
      errors.bp_diastolic = 'Diastolic must be lower than systolic';
    }

    // Heart rate validation
    if (vitalsData.heart_rate && (vitalsData.heart_rate < 30 || vitalsData.heart_rate > 300)) {
      errors.heart_rate = 'Heart rate must be between 30-300 bpm';
    }

    // Temperature validation
    if (vitalsData.temperature && (vitalsData.temperature < 30.0 || vitalsData.temperature > 45.0)) {
      errors.temperature = 'Temperature must be between 30.0-45.0°C';
    }

    // Oxygen saturation validation
    if (vitalsData.spo2 && (vitalsData.spo2 < 50 || vitalsData.spo2 > 100)) {
      errors.spo2 = 'Oxygen saturation must be between 50-100%';
    }

    // Respiratory rate validation
    if (vitalsData.respiratory_rate && (vitalsData.respiratory_rate < 5 || vitalsData.respiratory_rate > 60)) {
      errors.respiratory_rate = 'Respiratory rate must be between 5-60 breaths/min';
    }

    // Weight validation
    if (vitalsData.weight && (vitalsData.weight < 0.5 || vitalsData.weight > 500.0)) {
      errors.weight = 'Weight must be between 0.5-500.0 kg';
    }

    // Height validation
    if (vitalsData.height && (vitalsData.height < 30.0 || vitalsData.height > 250.0)) {
      errors.height = 'Height must be between 30.0-250.0 cm';
    }

    // Blood glucose validation
    if (vitalsData.blood_glucose && (vitalsData.blood_glucose < 20.0 || vitalsData.blood_glucose > 1000.0)) {
      errors.blood_glucose = 'Blood glucose must be between 20.0-1000.0 mg/dL';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateVitals()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = {
        patient_id: patientId,
        ...vitalsData
      };

      let response;
      if (isOffline || !isOnline) {
        // Store offline
        response = await api.vitals.storeOffline({
          device_id: localStorage.getItem('device_id') || 'mobile_device',
          vitals_data: submissionData
        });
        toast.success('Vitals saved offline - will sync when online');
      } else {
        // Submit online
        response = await api.vitals.submit(submissionData);
        toast.success('Vitals logged successfully');
      }

      if (response.success && onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      toast.error('Failed to save vitals');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVitalIcon = (vitalType: string) => {
    const icons = {
      bp_systolic: Heart,
      bp_diastolic: Heart,
      heart_rate: Activity,
      temperature: Thermometer,
      spo2: Droplets,
      respiratory_rate: Wind,
      weight: Weight
    };
    return icons[vitalType as keyof typeof icons] || Activity;
  };

  const getVitalUnit = (vitalType: string) => {
    const units = {
      bp_systolic: 'mmHg',
      bp_diastolic: 'mmHg',
      heart_rate: 'bpm',
      temperature: '°C',
      spo2: '%',
      respiratory_rate: 'breaths/min',
      weight: 'kg',
      height: 'cm',
      blood_glucose: 'mg/dL'
    };
    return units[vitalType as keyof typeof units] || '';
  };

  const renderVitalInput = (
    field: keyof VitalsData,
    label: string,
    placeholder: string,
    vitalType: string
  ) => {
    const IconComponent = getVitalIcon(vitalType);
    const unit = getVitalUnit(vitalType);
    const value = vitalsData[field] as number | null;

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-2">
          <IconComponent className="h-4 w-4" />
          {label}
        </Label>
        <div className="relative">
          <Input
            id={field}
            type="number"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => handleInputChange(field, e.target.value ? parseFloat(e.target.value) : null)}
            className={`pr-12 ${validationErrors[field] ? 'border-red-500' : ''}`}
            step="0.1"
          />
          <div className="absolute right-3 top-3 text-sm text-gray-500">
            {unit}
          </div>
        </div>
        {validationErrors[field] && (
          <p className="text-sm text-red-500">{validationErrors[field]}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vitals Entry
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </CardTitle>
          {patientName && (
            <p className="text-sm text-gray-600">Patient: {patientName}</p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Offline Warning */}
            {!isOnline && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  You are offline. Vitals will be saved locally and synced when you reconnect.
                </AlertDescription>
              </Alert>
            )}

            {/* Blood Pressure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderVitalInput('bp_systolic', 'Systolic BP', '120', 'bp_systolic')}
              {renderVitalInput('bp_diastolic', 'Diastolic BP', '80', 'bp_diastolic')}
              <div className="space-y-2">
                <Label>Position</Label>
                <Select
                  value={vitalsData.blood_pressure_position}
                  onValueChange={(value) => handleInputChange('blood_pressure_position', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodPressurePositions.map(pos => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Heart Rate and Temperature */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderVitalInput('heart_rate', 'Heart Rate', '72', 'heart_rate')}
              {renderVitalInput('temperature', 'Temperature', '36.5', 'temperature')}
            </div>

            {/* Oxygen Saturation and Respiratory Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderVitalInput('spo2', 'Oxygen Saturation', '98', 'spo2')}
              {renderVitalInput('respiratory_rate', 'Respiratory Rate', '16', 'respiratory_rate')}
            </div>

            {/* Weight and Height */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderVitalInput('weight', 'Weight', '70', 'weight')}
              {renderVitalInput('height', 'Height', '170', 'height')}
            </div>

            {/* Pain Level */}
            <div className="space-y-2">
              <Label>Pain Level (0-10)</Label>
              <Select
                value={vitalsData.pain_level?.toString() || ''}
                onValueChange={(value) => handleInputChange('pain_level', value ? parseInt(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pain level" />
                </SelectTrigger>
                <SelectContent>
                  {painLevels.map(level => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Blood Glucose */}
            {renderVitalInput('blood_glucose', 'Blood Glucose', '100', 'blood_glucose')}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                value={vitalsData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional observations or notes..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                rows={3}
              />
            </div>

            {/* Patient Condition */}
            <div className="space-y-2">
              <Label htmlFor="patient_condition">Patient Condition</Label>
              <Input
                id="patient_condition"
                value={vitalsData.patient_condition}
                onChange={(e) => handleInputChange('patient_condition', e.target.value)}
                placeholder="Describe patient's current condition..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isOffline || !isOnline ? 'Save Offline' : 'Save Vitals'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VitalsEntryForm;
