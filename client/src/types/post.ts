import { Comment } from '.';
import { User } from '.';

export interface Post {
  id: string;
  content: string;
  media?: PostMedia[];
  author: User;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostMedia {
  id: string;
  url: string;
  type: MediaType;
  width?: number;
  height?: number;
}

export interface CreatePostRequest {
  content: string;
  media?: PostMedia[];
}

export interface PostWithDetails extends Post {
  comments: Comment[];
  likes: User[];
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
}
