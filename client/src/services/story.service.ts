import {
  ApiResponse,
  CreateStoryRequest,
  MediaType,
  PaginatedResponse,
  PaginationQuery,
  Story,
} from '@/types';

import axiosInstance from '@/lib/axios';

class StoryService {
  private baseUrl = '/api/stories';

  private getAuthHeader() {
    return {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    };
  }

  async createStory(data: CreateStoryRequest): Promise<ApiResponse<Story>> {
    return axiosInstance.post('/stories', data);
  }

  async getCurrentUserStories(): Promise<ApiResponse<{ stories: Story[] }>> {
    return axiosInstance.get('/stories/me');
  }

  async getUserStories(userId: string): Promise<ApiResponse<{ stories: Story[] }>> {
    return axiosInstance.get(`/stories/user/${userId}`);
  }

  async getStoriesFeed(): Promise<ApiResponse<{ stories: Story[] }>> {
    return axiosInstance.get('/stories/feed');
  }

  async deleteStory(id: string): Promise<ApiResponse> {
    return axiosInstance.delete(`/stories/${id}`);
  }

  async uploadMedia(
    file: File
  ): Promise<ApiResponse<{ url: string; type: MediaType; width?: number; height?: number }>> {
    const formData = new FormData();
    formData.append('media', file);
    return axiosInstance.post('/stories/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

export const storyService = new StoryService();
