import {
  ApiResponse,
  CreatePostRequest,
  MediaType,
  PaginatedResponse,
  PaginationQuery,
  Post,
} from '@/types';

import axiosInstance from '@/lib/axios';

class PostService {
  private baseUrl = '/api/posts';

  private getAuthHeader() {
    return {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
  }

  async createPost(data: CreatePostRequest): Promise<ApiResponse<Post>> {
    return axiosInstance.post('/posts', data);
  }

  async getPost(id: string): Promise<ApiResponse<Post>> {
    return axiosInstance.get(`/posts/${id}`);
  }

  async deletePost(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/posts/${id}`);
  }

  async getUserPosts(
    userId: string,
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<Post>>> {
    return axiosInstance.get(`/posts/user/${userId}`, { params: query });
  }

  async getCurrentUserPosts(
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<Post>>> {
    return axiosInstance.get('/posts/me', { params: query });
  }

  async uploadMedia(
    file: File
  ): Promise<ApiResponse<{ url: string; type: MediaType; width?: number; height?: number }>> {
    const formData = new FormData();
    formData.append('media', file);
    return axiosInstance.post('/posts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async likePost(id: string): Promise<ApiResponse> {
    return axiosInstance.post(`/posts/${id}/like`);
  }

  async unlikePost(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/posts/${id}/like`);
  }

  async getPostLikes(id: string): Promise<ApiResponse<{ likesCount: number }>> {
    return axiosInstance.get(`/posts/${id}/likes`);
  }
}

export const postService = new PostService();
