import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { addAppointmentFirestore, listDoctorsFirestore } from '@/lib/firebase';
import { toast } from 'sonner';

interface AppointmentBookingWizardProps {
  onSuccess?: (appointment: any) => void;
  onCancel?: () => void;
}

interface Doctor {
  id: number;
  name: string;
  specialty: string;
  available_slots: TimeSlot[];
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface PatientDetails {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_history: string;
  insurance_provider: string;
  insurance_number: string;
}

const AppointmentBookingWizard: React.FC<AppointmentBookingWizardProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [patientDetails, setPatientDetails] = useState<PatientDetails>({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history: '',
    insurance_provider: '',
    insurance_number: ''
  });
  const [appointmentDetails, setAppointmentDetails] = useState({
    reason_for_visit: '',
    symptoms: '',
    urgency_level: 'medium',
    special_requirements: '',
    payment_method: 'online',
    payment_amount: 0
  });

  const steps = [
    { id: 1, title: 'Select Doctor', description: 'Choose your preferred doctor' },
    { id: 2, title: 'Pick Time', description: 'Select appointment date and time' },
    { id: 3, title: 'Patient Info', description: 'Enter your details' },
    { id: 4, title: 'Appointment Details', description: 'Reason for visit and preferences' },
    { id: 5, title: 'Payment', description: 'Complete your booking' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const paymentMethods = [
    { value: 'online', label: 'Online Payment', icon: CreditCard },
    { value: 'insurance', label: 'Insurance', icon: CheckCircle },
    { value: 'cash', label: 'Pay at Clinic', icon: User }
  ];

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      // Fetch doctors from Firestore collection 'doctors'.
      // Expected doc fields: { id, name, specialty, available_slots? }
      const list = await listDoctorsFirestore();
      setDoctors(list as any);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorAvailability = async (doctorId: number, date: string) => {
    setLoading(true);
    try {
      // With Firestore only, we either read available_slots from the doctor doc
      // or generate some generic slots for the selected date.
      const doc = doctors.find((d) => d.id === doctorId) as any;
      if (doc?.available_slots && Array.isArray(doc.available_slots)) {
        setSelectedDoctor(doc);
      } else {
        // Generate simple hourly slots for the selected date
        const baseDate = new Date(date + 'T09:00:00');
        const slots: TimeSlot[] = Array.from({ length: 8 }).map((_, i) => {
          const start = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 30 * 60 * 1000);
          return {
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            duration_minutes: 30,
          };
        });
        setSelectedDoctor({ ...(doc || { id: doctorId, name: 'Doctor', specialty: 'General' }), available_slots: slots } as any);
      }
    } catch (error) {
      toast.error('Failed to fetch availability');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSelect = (doctorId: number) => {
    const doctor = doctors.find(d => d.id === doctorId);
    if (doctor) {
      setSelectedDoctor(doctor);
      if (selectedDate) {
        fetchDoctorAvailability(doctorId, selectedDate);
      }
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (selectedDoctor) {
      fetchDoctorAvailability(selectedDoctor.id, date);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleInputChange = (field: string, value: any) => {
    setPatientDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleAppointmentDetailsChange = (field: string, value: any) => {
    setAppointmentDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Please select a doctor and time slot');
      return;
    }
    if (!selectedDate) {
      toast.error('Please pick a date');
      return;
    }

    setLoading(true);
    try {
      // Store appointment in Firestore 'appointments'. Do not include undefined fields.
      const appt = {
        patient_name: `${patientDetails.first_name} ${patientDetails.last_name}`.trim(),
        department: selectedDoctor.specialty,
        doctor: selectedDoctor.name,
        date: selectedDate,
        time: new Date(selectedSlot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        reason: appointmentDetails.reason_for_visit,
        status: 'confirmed' as const,
      };
      await addAppointmentFirestore(appt as any);

      toast.success('Appointment booked successfully!');
      if (onSuccess) {
        onSuccess({ ok: true });
      }
    } catch (error) {
      toast.error(`Failed to book appointment: ${String((error as any)?.message || error)}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Your Doctor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((doctor) => (
                  <Card 
                    key={doctor.id} 
                    className={`cursor-pointer transition-all ${
                      selectedDoctor?.id === doctor.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleDoctorSelect(doctor.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{doctor.name}</h4>
                          <p className="text-sm text-gray-600">{doctor.specialty}</p>
                          <Badge variant="outline" className="mt-1">
                            {doctor.available_slots?.length || 0} slots available
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Date & Time</h3>
              
              {/* Date Picker */}
              <div className="mb-6">
                <Label htmlFor="appointment-date">Select Date</Label>
                <Input
                  id="appointment-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateSelect(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>

              {/* Time Slots */}
              {selectedDoctor && selectedDate && (
                <div>
                  <Label>Available Time Slots</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {selectedDoctor.available_slots?.map((slot, index) => (
                      <Button
                        key={index}
                        variant={selectedSlot === slot ? "default" : "outline"}
                        onClick={() => handleSlotSelect(slot)}
                        className="h-auto p-3 flex flex-col"
                      >
                        <Clock className="h-4 w-4 mb-1" />
                        <span className="text-sm">
                          {new Date(slot.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={patientDetails.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={patientDetails.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={patientDetails.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={patientDetails.gender}
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={patientDetails.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={patientDetails.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={patientDetails.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={patientDetails.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    value={patientDetails.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={patientDetails.medical_history}
                    onChange={(e) => handleInputChange('medical_history', e.target.value)}
                    placeholder="Any relevant medical history, allergies, or current medications..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_provider">Insurance Provider</Label>
                  <Input
                    id="insurance_provider"
                    value={patientDetails.insurance_provider}
                    onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insurance_number">Insurance Number</Label>
                  <Input
                    id="insurance_number"
                    value={patientDetails.insurance_number}
                    onChange={(e) => handleInputChange('insurance_number', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason_for_visit">Reason for Visit *</Label>
                  <Input
                    id="reason_for_visit"
                    value={appointmentDetails.reason_for_visit}
                    onChange={(e) => handleAppointmentDetailsChange('reason_for_visit', e.target.value)}
                    placeholder="Brief description of your visit"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Textarea
                    id="symptoms"
                    value={appointmentDetails.symptoms}
                    onChange={(e) => handleAppointmentDetailsChange('symptoms', e.target.value)}
                    placeholder="Describe any symptoms you're experiencing..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency_level">Urgency Level</Label>
                  <Select
                    value={appointmentDetails.urgency_level}
                    onValueChange={(value) => handleAppointmentDetailsChange('urgency_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={level.color}>
                              {level.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="special_requirements">Special Requirements</Label>
                  <Textarea
                    id="special_requirements"
                    value={appointmentDetails.special_requirements}
                    onChange={(e) => handleAppointmentDetailsChange('special_requirements', e.target.value)}
                    placeholder="Any accessibility needs, interpreter requirements, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Payment & Confirmation</h3>
              
              {/* Appointment Summary */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base">Appointment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Doctor:</span>
                    <span className="font-medium">{selectedDoctor?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span className="font-medium">
                      {selectedSlot && new Date(selectedSlot.start_time).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{selectedSlot?.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reason:</span>
                    <span className="font-medium">{appointmentDetails.reason_for_visit}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <div className="space-y-4">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {paymentMethods.map((method) => {
                    const IconComponent = method.icon;
                    return (
                      <Card
                        key={method.value}
                        className={`cursor-pointer transition-all ${
                          appointmentDetails.payment_method === method.value
                            ? 'ring-2 ring-blue-500 bg-blue-50'
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleAppointmentDetailsChange('payment_method', method.value)}
                      >
                        <CardContent className="p-4 text-center">
                          <IconComponent className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                          <p className="font-medium">{method.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Payment Amount */}
              {appointmentDetails.payment_method === 'online' && (
                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Payment Amount</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    value={appointmentDetails.payment_amount}
                    onChange={(e) => handleAppointmentDetailsChange('payment_amount', parseFloat(e.target.value))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedDoctor !== null;
      case 2:
        return selectedSlot !== null;
      case 3:
        return patientDetails.first_name && patientDetails.last_name && 
               patientDetails.date_of_birth && patientDetails.gender && 
               patientDetails.phone;
      case 4:
        return appointmentDetails.reason_for_visit;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Book an Appointment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
            <div className="mt-2 text-center">
              <h3 className="font-medium">{steps[currentStep - 1].title}</h3>
              <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              renderStepContent()
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 1 ? onCancel : handlePrevious}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStep === 1 ? 'Cancel' : 'Previous'}
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < steps.length ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Book Appointment
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentBookingWizard;