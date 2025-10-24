// Complaint API wrapper for easier usage in components
import { apiClient } from './api';

export const api = {
  complaints: {
    submit: (formData: FormData) => apiClient.submitComplaint(formData),
    list: (queryParams: string) => apiClient.getComplaints(queryParams),
    getById: (id: number) => apiClient.getComplaintById(id),
    update: (id: number, data: any) => apiClient.updateComplaint(id, data),
    escalate: (id: number, data: any) => apiClient.escalateComplaint(id, data),
    getCategories: () => apiClient.getComplaintCategories(),
    aiCategorize: (data: { complaint_id: number | null; description: string }) => 
      apiClient.aiCategorizeComplaint(data),
    getStats: (params: { start_date?: string; end_date?: string }) => 
      apiClient.getComplaintStats(params),
    getAttachments: (id: number) => apiClient.getComplaintAttachments(id),
    uploadAttachments: (id: number, formData: FormData) => 
      apiClient.uploadComplaintAttachments(id, formData),
    getSLA: (id: number) => apiClient.getComplaintSLA(id),
    getEscalations: (id: number) => apiClient.getComplaintEscalations(id)
  },
  escalation: {
    getRules: () => apiClient.getEscalationRules(),
    getStats: (params: { start_date?: string; end_date?: string }) => 
      apiClient.getEscalationStats(params)
  }
};

export default api;
