import {
  ApiResponse,
  Message,
  PaginatedResponse,
  PaginationQuery,
  ReactionType,
  SendMessageRequest,
} from '@/types';

import axiosInstance from '@/lib/axios';

class MessageService {
  private baseUrl = '/api/messages';

  private getAuthHeader() {
    return {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
  }

  async getConversationMessages(
    conversationId: string,
    query?: PaginationQuery
  ): Promise<ApiResponse<PaginatedResponse<Message>>> {
    return axiosInstance.get(`/messages/conversations/${conversationId}`, { params: query });
  }

  async sendMessage(
    conversationId: string,
    data: SendMessageRequest
  ): Promise<ApiResponse<Message>> {
    return axiosInstance.post(`/messages/conversations/${conversationId}`, data);
  }

  async deleteMessage(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/messages/${id}`);
  }

  async addReaction(messageId: string, type: ReactionType): Promise<ApiResponse> {
    return axiosInstance.post(`/messages/${messageId}/react`, { type });
  }

  async removeReaction(messageId: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/messages/${messageId}/react`);
  }

  async markAsRead(messageId: string): Promise<ApiResponse> {
    return axiosInstance.post(`/messages/${messageId}/read`);
  }
}

export const messageService = new MessageService();
