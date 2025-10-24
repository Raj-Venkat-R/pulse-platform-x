import React, { useState } from 'react';
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
  FileText, 
  Upload, 
  Brain,
  Loader2,
  Eye,
  Trash2,
} from 'lucide-react';
import api from '@/lib/complaintApi';
import { addComplaintFirestore } from '@/lib/firebase';
import { toast } from 'sonner';

interface ComplaintSubmissionFormProps {
  patientId?: number;
  onSuccess?: (complaint: any) => void;
  onCancel?: () => void;
}

interface AIAnalysis {
  category: string;
  urgency_score: number;
  urgency_level: string;
  sentiment_score: number;
  keywords: string[];
  confidence: number;
  sla_deadline: string;
}

const ComplaintSubmissionForm: React.FC<ComplaintSubmissionFormProps> = ({ 
  patientId, 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    urgency_level: 'medium',
    tags: [] as string[],
    attachments: [] as File[]
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiResults, setShowAiResults] = useState(false);

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const analyzeWithAI = async () => {
    if (!formData.description.trim()) {
      toast.error('Please enter a description before AI analysis');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.complaints.aiCategorize({
        complaint_id: null,
        description: formData.description,
      });

      if (response.success) {
        setAiAnalysis(response.data);
        setShowAiResults(true);
        // Auto-apply AI suggestions
        setFormData(prev => ({
          ...prev,
          category: response.data.category,
          urgency_level: response.data.urgency_level
        }));
        toast.success('AI analysis completed');
      }
    } catch {
      toast.error('AI analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate a simple complaint number
      const complaint_number = `CMP-${Date.now().toString().slice(-6)}`;
      const payload: any = {
        complaint_number,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        category: formData.category || 'other',
        urgency_level: formData.urgency_level as any,
        status: 'open' as const,
        patient_name: undefined,
        patient_phone: undefined,
        sla_deadline: undefined,
        sla_status: 'on_track' as const,
        escalation_level: 0,
        ai_confidence: aiAnalysis?.confidence ?? undefined,
        sentiment_score: aiAnalysis?.sentiment_score ?? undefined,
        keywords: aiAnalysis?.keywords ?? undefined,
        ai_insights: aiAnalysis ?? undefined,
      };

      // Note: attachments upload to storage not implemented yet; can be added later.
      const id = await addComplaintFirestore(payload);

      toast.success('Complaint submitted successfully!');
      onSuccess?.({ id, ...payload });
    } catch {
      toast.error('Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const level = urgencyLevels.find(l => l.value === urgency);
    return (
      <Badge className={level?.color || 'bg-gray-100 text-gray-800'}>
        {level?.label || urgency}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submit a Complaint
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Brief description of your complaint"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={analyzeWithAI}
                  disabled={isAnalyzing || !formData.description.trim()}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  AI Analyze
                </Button>
              </div>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Please provide detailed information about your complaint..."
                rows={6}
                required
              />
            </div>

            {/* AI Analysis Results */}
            {aiAnalysis && showAiResults && (
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">AI Analysis Results:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAiResults(false)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Suggested Category:</Label>
                        <Badge variant="outline" className="mt-1">
                          {categories.find(c => c.value === aiAnalysis.category)?.label}
                        </Badge>
                      </div>
                      <div>
                        <Label>Urgency Level:</Label>
                        <div className="mt-1">
                          {getUrgencyBadge(aiAnalysis.urgency_level)}
                        </div>
                      </div>
                      <div>
                        <Label>Confidence:</Label>
                        <div className="mt-1">
                          <Progress value={aiAnalysis.confidence * 100} className="h-2" />
                          <span className="text-sm text-gray-600">
                            {Math.round(aiAnalysis.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            category: aiAnalysis.category,
                            urgency_level: aiAnalysis.urgency_level
                          }));
                          setShowAiResults(false);
                          toast.success('AI suggestions applied');
                        }}
                      >
                        Apply Suggestions
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowAiResults(false)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
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

            {/* Urgency Level */}
            <div className="space-y-2">
              <Label htmlFor="urgency_level">Urgency Level</Label>
              <Select
                value={formData.urgency_level}
                onValueChange={(value) => handleInputChange('urgency_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={level.color}>{level.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label>Attachments (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                      Choose Files
                    </Button>
                    <p className="mt-2 text-sm text-gray-500">Upload supporting documents, images, or other files</p>
                  </div>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              </div>

              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Files:</Label>
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Complaint'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplaintSubmissionForm;