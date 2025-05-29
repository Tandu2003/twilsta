export interface MessageData {
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  replyTo?: string;
}

export interface MessageReactionData {
  messageId: string;
  conversationId: string;
  reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
}

export interface MessageEditData {
  messageId: string;
  conversationId: string;
  content: string;
}

export interface MessageDeleteData {
  messageId: string;
  conversationId: string;
}

export interface MessageReadData {
  messageId: string;
  conversationId: string;
}

export interface TypingData {
  roomId: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  replyTo?: string;
  timestamp: number;
}

export interface MessageReactionResponse {
  messageId: string;
  reactedBy: string;
  reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  timestamp: number;
}

export interface MessageReactionRemovedResponse {
  messageId: string;
  removedBy: string;
  timestamp: number;
}

export interface MessageEditedResponse {
  messageId: string;
  content: string;
  editedBy: string;
  timestamp: number;
}

export interface MessageDeletedResponse {
  messageId: string;
  deletedBy: string;
  timestamp: number;
}

export interface MessageReadResponse {
  messageId: string;
  readBy: string;
  timestamp: number;
}

export interface MessageReactionsResponse {
  messageId: string;
  reactions: Array<{
    userId: string;
    reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
    timestamp: number;
  }>;
  timestamp: number;
}

export interface TypingResponse {
  userId: string;
  isTyping?: boolean;
}
