export interface StoryViewData {
  storyId: string;
  authorId: string;
  timestamp: number;
}

export interface StoryReactionData {
  storyId: string;
  authorId: string;
  reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  timestamp: number;
}

export interface StoryScreenshotData {
  storyId: string;
  authorId: string;
  timestamp: number;
}

export interface StoryCreatedData {
  storyId: string;
  authorId: string;
  createdAt: number;
}

export interface StoryViewedResponse {
  storyId: string;
  viewedBy: string;
  timestamp: number;
}

export interface StoryReactionResponse {
  storyId: string;
  reactedBy: string;
  reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  timestamp: number;
}

export interface StoryScreenshotResponse {
  storyId: string;
  takenBy: string;
  timestamp: number;
}

export interface StoryExpiredResponse {
  storyId: string;
  timestamp: number;
}

export interface StoryReactionRemovedResponse {
  storyId: string;
  removedBy: string;
  timestamp: number;
}

export interface StoryReactionsResponse {
  storyId: string;
  reactions: Array<{
    userId: string;
    reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
    timestamp: number;
  }>;
  timestamp: number;
}
