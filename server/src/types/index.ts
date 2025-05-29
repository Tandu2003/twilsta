// User related types
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  website?: string;
  phone?: string;
  isVerified: boolean;
  isPrivate: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile
  extends Omit<
    User,
    'password' | 'email' | 'fullName' | 'bio' | 'avatar' | 'website' | 'phone'
  > {
  fullName?: string | null;
  bio?: string | null;
  avatar?: string | null;
  website?: string | null;
  phone?: string | null;
  isFollowing?: boolean;
  isFollower?: boolean;
  isOwnProfile?: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}

export interface UpdateUserRequest {
  username?: string;
  fullName?: string | null;
  bio?: string | null;
  website?: string | null;
  phone?: string | null;
  isPrivate?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken: string;
}

// Post related types
export interface Post {
  id: string;
  userId: string;
  caption?: string;
  location?: string;
  isArchived: boolean;
  commentsEnabled: boolean;
  likesEnabled: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: UserProfile;
  media: PostMedia[];
  hashtags: Hashtag[];
  isLiked?: boolean;
  isSaved?: boolean;
}

export interface PostMedia {
  id: string;
  postId: string;
  url: string;
  type: MediaType;
  width?: number;
  height?: number;
  order: number;
  createdAt: Date;
}

export interface CreatePostRequest {
  caption?: string;
  location?: string;
  commentsEnabled?: boolean;
  likesEnabled?: boolean;
  hashtags?: string[];
}

export interface UpdatePostRequest {
  caption?: string;
  location?: string;
  commentsEnabled?: boolean;
  likesEnabled?: boolean;
  isArchived?: boolean;
}

// Comment related types
export interface Comment {
  id: string;
  userId: string;
  postId: string;
  content: string;
  parentId?: string;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: UserProfile;
  replies?: Comment[];
  isLiked?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// Like related types
export interface Like {
  id: string;
  userId: string;
  postId: string;
  createdAt: Date;
  user?: UserProfile;
}

// Follow related types
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower?: UserProfile;
  following?: UserProfile;
}

export interface FollowRequest {
  userId: string;
}

// Hashtag related types
export interface Hashtag {
  id: string;
  name: string;
  postsCount: number;
  createdAt: Date;
}

// Story related types
export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: MediaType;
  text?: string;
  expiresAt: Date;
  createdAt: Date;
  user: UserProfile;
  views: StoryView[];
  isViewed?: boolean;
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  viewedAt: Date;
  user?: UserProfile;
}

export interface CreateStoryRequest {
  text?: string;
  expiresAt?: Date;
}

// Message related types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  replyToId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  sender: UserProfile;
  replyTo?: Message;
  reactions: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user?: UserProfile;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ConversationMember {
  conversationId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  lastReadAt?: Date;
  user?: UserProfile;
}

export interface SendMessageRequest {
  content?: string;
  type?: MessageType;
  replyToId?: string;
}

export interface CreateConversationRequest {
  participants: string[];
  type?: ConversationType;
  name?: string;
}

// Notification related types
export interface Notification {
  id: string;
  senderId: string;
  receiverId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  sender?: UserProfile;
}

export interface MarkNotificationsReadRequest {
  notificationIds: string[];
}

// Search related types
export interface SearchRequest {
  q: string;
  type?: 'users' | 'posts' | 'hashtags' | 'all';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  users?: UserProfile[];
  posts?: Post[];
  hashtags?: Hashtag[];
}

// File upload types
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CloudinaryUploadResult {
  public_id: string;
  url: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
  created_at: string;
}

// Pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  details?: any;
  timestamp: string;
  stack?: string;
}

// Enums
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

export enum MemberRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
}

export enum NotificationType {
  LIKE = 'like',
  COMMENT = 'comment',
  FOLLOW = 'follow',
  MENTION = 'mention',
  MESSAGE = 'message',
  STORY_VIEW = 'story_view',
  POST_UPLOAD = 'post_upload',
}

// JWT Payload types
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Cache types
export interface CacheOptions {
  ttl?: number;
  key?: string;
}

// Email types
export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: any;
}

// Push notification types
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Analytics types
export interface UserAnalytics {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  totalStories: number;
  engagementRate: number;
  topHashtags: Array<{
    hashtag: string;
    count: number;
  }>;
}

export interface PostAnalytics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagementRate: number;
}

// Socket.IO types
export interface SocketUser {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  createdAt: Date;
  sender: SocketUser;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

// Rate limiting types
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

// Health check types
export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services?: {
    database?: HealthCheck;
    redis?: HealthCheck;
    cloudinary?: HealthCheck;
  };
  uptime?: number;
  memory?: {
    used: number;
    total: number;
    percentage: number;
  };
}

// Configuration types
export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiVersion: string;
  corsOrigin: string;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
  upload: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}
