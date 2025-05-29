import { ApiResponse } from '@/types';
import axios from 'axios';
import { any } from 'zod';

const baseURL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: any) => {
    return response.data;
  },
  async error => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh token endpoint
        const response = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken: string }>
        >(`${baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data!;

        // Update tokens in localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the failed request's authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh token fails, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Create a custom type for our Axios instance
type CustomAxiosInstance = {
  get: <T>(url: string, config?: any) => Promise<ApiResponse<T>>;
  post: <T>(url: string, data?: any, config?: any) => Promise<ApiResponse<T>>;
  put: <T>(url: string, data?: any, config?: any) => Promise<ApiResponse<T>>;
  delete: <T>(url: string, config?: any) => Promise<ApiResponse<T>>;
};

export default axiosInstance as unknown as CustomAxiosInstance;
