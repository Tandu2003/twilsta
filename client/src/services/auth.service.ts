import {
  ApiResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
  VerifyEmailRequest,
} from '@/types';

import axiosInstance from '@/lib/axios';

class AuthService {
  async login(
    data: LoginRequest
  ): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>> {
    return axiosInstance.post('/auth/login', data);
  }

  async register(data: RegisterRequest): Promise<ApiResponse> {
    return axiosInstance.post('/auth/register', data);
  }

  async logout(): Promise<ApiResponse> {
    return axiosInstance.post('/auth/logout');
  }

  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return axiosInstance.post('/auth/refresh', { refreshToken });
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    return axiosInstance.post('/auth/forgot-password', data);
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    return axiosInstance.post('/auth/reset-password', data);
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<ApiResponse> {
    return axiosInstance.post('/auth/verify-email', data);
  }
}

export const authService = new AuthService();
