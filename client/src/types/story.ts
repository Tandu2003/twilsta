import { MediaType } from '.';
import { User } from '.';

export interface Story {
  id: string;
  media: StoryMedia;
  author: User;
  viewers: User[];
  viewersCount: number;
  createdAt: string;
  expiresAt: string;
}

export interface StoryMedia {
  id: string;
  url: string;
  type: MediaType;
  width?: number;
  height?: number;
}

export interface CreateStoryRequest {
  media: StoryMedia;
}
