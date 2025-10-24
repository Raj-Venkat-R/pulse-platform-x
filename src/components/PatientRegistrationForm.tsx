import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PatientData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  emergency_contact: string;
  blood_group: string;
  medical_history?: string;
  allergies?: string;
  medications?: string;
}

interface PatientRegistrationFormProps {
  onPatientRegistered?: (patient: any) => void;
  onCancel?: () => void;
  initialData?: Partial<PatientData>;
  mode?: 'standalone' | 'embedded';
}

const PatientRegistrationForm: React.FC<PatientRegistrationFormProps> = ({
  onPatientRegistered,
  onCancel,
  initialData = {},
  mode = 'standalone'
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<PatientData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    emergency_contact: '',
    blood_group: '',
    medical_history: '',
    allergies: '',
    medications: '',
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (birthDate >= today) {
        newErrors.date_of_birth = 'Date of birth must be in the past';
      }
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.emergency_contact.trim()) {
      newErrors.emergency_contact = 'Emergency contact is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSubmitted(true);
        toast({
          title: "Success",
          description: "Patient registered successfully"
        });
        
        if (onPatientRegistered) {
          onPatientRegistered(data.data);
        }
      } else {
        throw new Error(data.message || 'Failed to register patient');
      }
    } catch (error) {
      console.error('Error registering patient:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to register patient",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      address: '',
      emergency_contact: '',
      blood_group: '',
      medical_history: '',
      allergies: '',
      medications: '',
      ...initialData
    });
    setErrors({});
    setIsSubmitted(false);
  };

  const FormField: React.FC<{
    label: string;
    field: keyof PatientData;
    type?: string;
    required?: boolean;
    placeholder?: string;
    children?: React.ReactNode;
  }> = ({ label, field, type = 'text', required = false, placeholder, children }) => (
    <div className="space-y-2">
      <Label htmlFor={field}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children || (
        <Input
          id={field}
          type={type}
          placeholder={placeholder}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={errors[field] ? 'border-destructive' : ''}
        />
      )}
      {errors[field] && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errors[field]}
        </p>
      )}
    </div>
  );

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold">Patient Registered Successfully!</h3>
              <p className="text-muted-foreground">
                {formData.first_name} {formData.last_name} has been added to the system.
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={resetForm} variant="outline">
                Register Another Patient
              </Button>
              {onCancel && (
                <Button onClick={onCancel}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="First Name"
            field="first_name"
            required
            placeholder="Enter first name"
          />
          
          <FormField
            label="Last Name"
            field="last_name"
            required
            placeholder="Enter last name"
          />
          
          <FormField
            label="Email"
            field="email"
            type="email"
            required
            placeholder="Enter email address"
          />
          
          <FormField
            label="Phone Number"
            field="phone"
            type="tel"
            required
            placeholder="Enter phone number"
          />
          
          <FormField
            label="Date of Birth"
            field="date_of_birth"
            type="date"
            required
          />
          
          <FormField
            label="Gender"
            field="gender"
            required
          >
            <Select 
              value={formData.gender} 
              onValueChange={(value) => handleInputChange('gender', value)}
            >
              <SelectTrigger className={errors.gender ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        
        <FormField
          label="Address"
          field="address"
          placeholder="Enter full address"
        />
      </div>

      {/* Emergency Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Emergency Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Emergency Contact"
            field="emergency_contact"
            type="tel"
            required
            placeholder="Emergency contact phone number"
          />
          
          <FormField
            label="Blood Group"
            field="blood_group"
          >
            <Select 
              value={formData.blood_group} 
              onValueChange={(value) => handleInputChange('blood_group', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Medical Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Medical Information</h3>
        
        <div className="space-y-4">
          <FormField
            label="Medical History"
            field="medical_history"
          >
            <Textarea
              placeholder="Any relevant medical history"
              value={formData.medical_history}
              onChange={(e) => handleInputChange('medical_history', e.target.value)}
              rows={3}
            />
          </FormField>
          
          <FormField
            label="Allergies"
            field="allergies"
          >
            <Textarea
              placeholder="List any known allergies"
              value={formData.allergies}
              onChange={(e) => handleInputChange('allergies', e.target.value)}
              rows={2}
            />
          </FormField>
          
          <FormField
            label="Current Medications"
            field="medications"
          >
            <Textarea
              placeholder="List current medications"
              value={formData.medications}
              onChange={(e) => handleInputChange('medications', e.target.value)}
              rows={2}
            />
          </FormField>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Registering...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Register Patient
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (mode === 'embedded') {
    return cardContent;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            Patient Registration
          </CardTitle>
          <CardDescription>
            Register a new patient in the system
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {cardContent}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientRegistrationForm;
