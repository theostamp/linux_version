// lib/api/client.ts

import axios from 'axios';

// Get API base URL
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('.localhost') && !hostname.startsWith('localhost')) {
      return `http://${hostname}:18000/api`;
    }
    return 'http://localhost:18000/api';
  }
  
  // Server-side
  let base = process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:8000/api';
  base = base.replace(/\/$/, '');
  if (!/\/api$/.test(base)) {
    base = `${base}/api`;
  }
  return base;
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access') || localStorage.getItem('accessToken');
      if (token && !config.url?.includes('/login/') && !config.url?.includes('/token/refresh/')) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh');
        if (refreshToken) {
          const response = await axios.post(`${getApiBaseUrl()}/users/token/refresh/`, {
            refresh: refreshToken
          });
          
          const { access } = response.data;
          localStorage.setItem('access', access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
