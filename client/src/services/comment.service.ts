import {
  ApiResponse,
  Comment,
  CreateCommentRequest,
  PaginatedResponse,
  PaginationQuery,
} from '@/types';

import axiosInstance from '@/lib/axios';

class CommentService {
  private baseUrl = '/api/comments';

  private getAuthHeader() {
    return {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
  }

  async createComment(postId: string, data: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    return axiosInstance.post(`/comments/posts/${postId}`, data);
  }

  async getPostComments(
    postId: string,
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> {
    return axiosInstance.get(`/comments/posts/${postId}`, { params: query });
  }

  async updateComment(id: string, content: string): Promise<ApiResponse<Comment>> {
    return axiosInstance.put(`/comments/${id}`, { content });
  }

  async deleteComment(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/comments/${id}`);
  }

  async likeComment(id: string): Promise<ApiResponse> {
    return axiosInstance.post(`/comments/${id}/like`);
  }

  async unlikeComment(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/comments/${id}/like`);
  }
}

export const commentService = new CommentService();
