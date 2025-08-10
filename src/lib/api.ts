import axios, { AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Create axios instance
export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from cookie or localStorage (fallback)
    const token = Cookies.get('accessToken') || localStorage.getItem('accessToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config;
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      
      try {
        // Attempt to refresh token
        const refreshToken = Cookies.get('refreshToken') || localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          const response = await axios.post(
            `${API_URL}/api/auth/refresh`,
            { refreshToken },
            { 
              withCredentials: true,
              headers: { 'Content-Type': 'application/json' }
            }
          );
          
          const { tokens } = response.data;
          
          // Update stored tokens
          if (tokens.accessToken) {
            localStorage.setItem('accessToken', tokens.accessToken);
          }
          if (tokens.refreshToken) {
            localStorage.setItem('refreshToken', tokens.refreshToken);
          }
          
          // Retry original request with new token
          if (original.headers) {
            original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          
          return api(original);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Dispatch event to notify app of logout
        window.dispatchEvent(new CustomEvent('auth:logout'));
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) => 
    api.post('/auth/login', credentials),
    
  register: (data: { email: string; password: string; name: string }) => 
    api.post('/auth/register', data),
    
  logout: () => api.post('/auth/logout'),
  
  refreshToken: (refreshToken?: string) => 
    api.post('/auth/refresh', refreshToken ? { refreshToken } : undefined),
    
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (updates: any) => api.put('/auth/profile', updates),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/auth/change-password', data),
};

// Files API endpoints
export const filesAPI = {
  list: (params?: any) => api.get('/files', { params }),
  
  upload: (formData: FormData, onUploadProgress?: (progressEvent: any) => void) => 
    api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
    
  download: (fileId: string) => api.get(`/files/${fileId}/download`, {
    responseType: 'blob',
  }),
  
  delete: (fileId: string) => api.delete(`/files/${fileId}`),
  
  update: (fileId: string, updates: any) => api.put(`/files/${fileId}`, updates),
};

export default api;