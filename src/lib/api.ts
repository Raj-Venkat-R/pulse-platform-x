// API utility functions for the appointment scheduler
// In Vite, use import.meta.env for env variables (process.env is undefined in the browser)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DEFAULT_TIMEOUT_MS = 15000; // 15s timeout per attempt
const MAX_RETRIES = 2; // total attempts = MAX_RETRIES + 1
const BASE_BACKOFF_MS = 600; // base backoff for retries

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const baseConfig: RequestInit = {
      // keepalive can help with flaky network/TLS teardown on navigation
      keepalive: true,
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers as Record<string, string> | undefined),
      },
    };

    let lastError: unknown = undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const response = await fetch(url, { ...baseConfig, signal: controller.signal });
        clearTimeout(timeout);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || `HTTP error! status: ${response.status}`);
        }
        return data;
      } catch (error: any) {
        clearTimeout(timeout);
        lastError = error;
        const isAbort = error?.name === 'AbortError';
        const message = String(error?.message || error);
        const isTransient = isAbort || /timeout|network|TLS|ECONN|ENOTFOUND|EAI_AGAIN/i.test(message);

        // Only retry on transient failures
        if (attempt < MAX_RETRIES && isTransient) {
          const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        // Non-transient or out of retries
        console.error(`API request failed for ${endpoint} (attempt ${attempt + 1}):`, error);
        throw new Error(
          isTransient
            ? `Network error. Please retry. Details: ${message}`
            : message,
        );
      }
    }

    // Should not reach here, but for type completeness
    throw lastError instanceof Error ? lastError : new Error('Unknown network error');
  }

  // Appointment endpoints
  async createAppointment(appointmentData: any): Promise<ApiResponse> {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async createOfflineAppointment(appointmentData: any): Promise<ApiResponse> {
    return this.request('/appointments/offline', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async getAvailability(params: {
    date: string;
    service_id?: number;
    location_id?: number;
    provider_id?: number;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('date', params.date);
    
    if (params.service_id) queryParams.append('service_id', params.service_id.toString());
    if (params.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params.provider_id) queryParams.append('provider_id', params.provider_id.toString());

    return this.request(`/appointments/availability?${queryParams}`);
  }

  async updateAppointmentStatus(
    appointmentId: number,
    status: string,
    notes?: string
  ): Promise<ApiResponse> {
    return this.request(`/appointments/${appointmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Queue endpoints
  async getQueue(params: {
    date?: string;
    location_id?: number;
    service_id?: number;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.date) queryParams.append('date', params.date);
    if (params.location_id) queryParams.append('location_id', params.location_id.toString());
    if (params.service_id) queryParams.append('service_id', params.service_id.toString());

    return this.request(`/appointments/queue?${queryParams}`);
  }

  async generateQueueToken(tokenData: any): Promise<ApiResponse> {
    return this.request('/appointments/queue', {
      method: 'POST',
      body: JSON.stringify(tokenData),
    });
  }

  async updateTokenStatus(tokenId: number, status: string): Promise<ApiResponse> {
    return this.request(`/appointments/tokens/${tokenId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Sync endpoints
  async getSyncData(params: {
    device_id?: string;
    last_sync?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.device_id) queryParams.append('device_id', params.device_id);
    if (params.last_sync) queryParams.append('last_sync', params.last_sync);

    return this.request(`/appointments/sync?${queryParams}`);
  }

  async processOfflineSync(syncData: any): Promise<ApiResponse> {
    return this.request('/appointments/sync', {
      method: 'POST',
      body: JSON.stringify(syncData),
    });
  }

  // Patient endpoints
  async searchPatients(query: string): Promise<ApiResponse> {
    return this.request(`/patients/search?q=${encodeURIComponent(query)}`);
  }

  async createPatient(patientData: any): Promise<ApiResponse> {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

  async getPatientById(patientId: number): Promise<ApiResponse> {
    return this.request(`/patients/${patientId}`);
  }

  // Service and location endpoints
  async getServices(): Promise<ApiResponse> {
    return this.request('/services');
  }

  async getLocations(): Promise<ApiResponse> {
    return this.request('/locations');
  }

  async getProviders(serviceId?: number): Promise<ApiResponse> {
    const endpoint = serviceId ? `/providers?service_id=${serviceId}` : '/providers';
    return this.request(endpoint);
  }

  // Complaint endpoints
  async submitComplaint(formData: FormData): Promise<ApiResponse> {
    const url = `${this.baseURL}/complaints`;
    
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed for complaints:', error);
      throw error;
    }
  }

  async getComplaints(queryParams: string = ''): Promise<ApiResponse> {
    return this.request(`/complaints?${queryParams}`);
  }

  async getComplaintById(complaintId: number): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}`);
  }

  async updateComplaint(complaintId: number, updateData: any): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  async escalateComplaint(complaintId: number, escalationData: any): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}/escalate`, {
      method: 'POST',
      body: JSON.stringify(escalationData),
    });
  }

  async getComplaintCategories(): Promise<ApiResponse> {
    return this.request('/complaints/categories');
  }

  async aiCategorizeComplaint(data: { complaint_id: number | null; description: string }): Promise<ApiResponse> {
    return this.request('/complaints/ai-categorize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getComplaintStats(params: { start_date?: string; end_date?: string } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    return this.request(`/complaints/stats?${queryParams}`);
  }

  async getComplaintAttachments(complaintId: number): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}/attachments`);
  }

  async uploadComplaintAttachments(complaintId: number, formData: FormData): Promise<ApiResponse> {
    const url = `${this.baseURL}/complaints/${complaintId}/attachments`;
    
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed for complaint attachments:', error);
      throw error;
    }
  }

  async getComplaintSLA(complaintId: number): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}/sla`);
  }

  async getComplaintEscalations(complaintId: number): Promise<ApiResponse> {
    return this.request(`/complaints/${complaintId}/escalations`);
  }

  // Escalation endpoints
  async getEscalationRules(): Promise<ApiResponse> {
    return this.request('/escalation/rules');
  }

  async getEscalationStats(params: { start_date?: string; end_date?: string } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    return this.request(`/escalation/stats?${queryParams}`);
  }

  // Utility methods
  async checkConnection(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Offline storage utilities
  saveOfflineAppointment(appointmentData: any): void {
    try {
      const offlineData = this.getOfflineAppointments();
      const appointment = {
        id: `temp_${Date.now()}`,
        ...appointmentData,
        created_at: new Date().toISOString(),
        status: 'pending'
      };
      
      offlineData.push(appointment);
      localStorage.setItem('offline_appointments', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving offline appointment:', error);
    }
  }

  getOfflineAppointments(): any[] {
    try {
      const data = localStorage.getItem('offline_appointments');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading offline appointments:', error);
      return [];
    }
  }

  clearOfflineAppointments(): void {
    localStorage.removeItem('offline_appointments');
  }

  // Device ID management
  getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const {
  createAppointment,
  createOfflineAppointment,
  getAvailability,
  updateAppointmentStatus,
  getQueue,
  generateQueueToken,
  updateTokenStatus,
  getSyncData,
  processOfflineSync,
  searchPatients,
  createPatient,
  getPatientById,
  getServices,
  getLocations,
  getProviders,
  checkConnection,
  saveOfflineAppointment,
  getOfflineAppointments,
  clearOfflineAppointments,
  getDeviceId,
  // Complaint methods
  submitComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  escalateComplaint,
  getComplaintCategories,
  aiCategorizeComplaint,
  getComplaintStats,
  getComplaintAttachments,
  uploadComplaintAttachments,
  getComplaintSLA,
  getComplaintEscalations,
  getEscalationRules,
  getEscalationStats
} = apiClient;

// Common named alias used across components
export { apiClient as api };

export default apiClient;
