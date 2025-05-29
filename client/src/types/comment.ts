import { User } from '.';

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface CommentWithReplies extends Comment {
  replies: Comment[];
}
