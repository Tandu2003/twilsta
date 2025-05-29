import { ApiResponse, PaginatedResponse, PaginationQuery, User } from '@/types';

import axiosInstance from '@/lib/axios';

class UserService {
  private baseUrl = '/api/users';

  private getAuthHeader() {
    return {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return axiosInstance.get('/users/me');
  }

  async updateCurrentUser(data: Partial<User>): Promise<ApiResponse<User>> {
    return axiosInstance.put('/users/me', data);
  }

  async deleteCurrentUser(): Promise<ApiResponse> {
    return axiosInstance.delete('/users/me');
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return axiosInstance.get(`/users/${id}`);
  }

  async getUserByUsername(username: string): Promise<ApiResponse<User>> {
    return axiosInstance.get(`/users/username/${username}`);
  }

  async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return axiosInstance.post('/users/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async removeAvatar(): Promise<ApiResponse> {
    return axiosInstance.delete('/users/avatar');
  }

  async followUser(userId: string): Promise<ApiResponse> {
    return axiosInstance.post(`/users/${userId}/follow`);
  }

  async unfollowUser(userId: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/users/${userId}/follow`);
  }

  async getFollowers(
    userId: string,
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return axiosInstance.get(`/users/${userId}/followers`, { params: query });
  }

  async getFollowing(
    userId: string,
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<User>>> {
    return axiosInstance.get(`/users/${userId}/following`, { params: query });
  }
}

export const userService = new UserService();
