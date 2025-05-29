import { User } from '.';

export interface Message {
  id: string;
  content: string;
  sender: User;
  conversationId: string;
  isRead: boolean;
  reaction?: Reaction;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface Reaction {
  id: string;
  type: ReactionType;
  user: User;
  createdAt: string;
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY',
}
