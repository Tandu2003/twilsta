import { Server } from 'socket.io';
import { TokenUtils } from '../utils/helpers';
import { prisma } from './database';
import logger from '../utils/logger';
import type { FastifyInstance } from 'fastify';

export interface AuthenticatedSocket {
  userId: string;
  username: string;
  avatar?: string;
}

declare module 'socket.io' {
  interface Socket {
    user?: AuthenticatedSocket;
  }
}

export let io: Server;

export const initializeSocket = (fastify: FastifyInstance) => {
  io = new Server(fastify.server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = TokenUtils.verifyAccessToken(token);

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          avatar: true,
          isVerified: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        userId: user.id,
        username: user.username,
        avatar: user.avatar || undefined,
      };

      logger.info(`Socket authenticated: ${user.username}`, {
        socketId: socket.id,
        userId: user.id,
      });

      next();
    } catch (error) {
      logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    if (!socket.user) return;

    logger.info(`User connected: ${socket.user.username}`, {
      socketId: socket.id,
      userId: socket.user.userId,
    });

    // Join user to their personal room
    socket.join(`user:${socket.user.userId}`);

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId: string) => {
      try {
        // Verify user is member of conversation
        const membership = await prisma.conversationMember.findFirst({
          where: {
            conversationId,
            userId: socket.user!.userId,
          },
        });

        if (membership) {
          socket.join(`conversation:${conversationId}`);
          logger.debug(
            `User ${socket.user!.username} joined conversation ${conversationId}`
          );
        }
      } catch (error) {
        logger.error('Error joining conversation:', error);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.debug(
        `User ${socket.user!.username} left conversation ${conversationId}`
      );
    });

    // Handle typing indicators
    socket.on('typing_start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.user!.userId,
        username: socket.user!.username,
        conversationId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.user!.userId,
        username: socket.user!.username,
        conversationId,
        isTyping: false,
      });
    });

    // Handle user status updates
    socket.on('status_update', async (status: 'online' | 'away' | 'busy') => {
      try {
        // Notify friends about status change
        socket.broadcast.emit('user_status_change', {
          userId: socket.user!.userId,
          status,
        });
      } catch (error) {
        logger.error('Error updating user status:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      logger.info(`User disconnected: ${socket.user!.username}`, {
        socketId: socket.id,
        userId: socket.user!.userId,
        reason,
      });

      try {
        // Notify friends about offline status
        socket.broadcast.emit('user_status_change', {
          userId: socket.user!.userId,
          status: 'offline',
        });
      } catch (error) {
        logger.error('Error updating user status on disconnect:', error);
      }
    });
  });

  logger.info('✅ Socket.IO initialized successfully');
  return io;
};

// Helper functions for emitting events
export const socketHelpers = {
  // Send message to specific user
  sendToUser: (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
  },

  // Send message to conversation
  sendToConversation: (conversationId: string, event: string, data: any) => {
    io.to(`conversation:${conversationId}`).emit(event, data);
  },

  // Send notification to user
  sendNotification: (userId: string, notification: any) => {
    io.to(`user:${userId}`).emit('notification', notification);
  },

  // Broadcast new post to followers
  broadcastNewPost: (authorId: string, post: any) => {
    io.emit('new_post', { authorId, post });
  },

  // Send typing indicator
  sendTypingIndicator: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => {
    io.to(`conversation:${conversationId}`).emit('user_typing', {
      userId,
      isTyping,
      conversationId,
    });
  },

  // Get online users count
  getOnlineUsersCount: async (): Promise<number> => {
    const sockets = await io.fetchSockets();
    return sockets.length;
  },

  // Get user's online status
  isUserOnline: async (userId: string): Promise<boolean> => {
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    return sockets.length > 0;
  },
};

export default io;
