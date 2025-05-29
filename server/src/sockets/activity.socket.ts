import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleActivity = (socket: AuthenticatedSocket) => {
  // Viewing profile
  socket.on(
    'activity:viewing_profile',
    (data: { profileId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify the profile owner
      socket.to(data.profileId).emit('activity:user_viewing', {
        viewerId: socket.userId,
        type: 'profile',
        timestamp: data.timestamp,
      });

      logger.info(`User ${socket.userId} viewing profile ${data.profileId}`);
    }
  );

  // Viewing post
  socket.on(
    'activity:viewing_post',
    (data: { postId: string; authorId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify the post author
      socket.to(data.authorId).emit('activity:user_viewing', {
        viewerId: socket.userId,
        type: 'post',
        postId: data.postId,
        timestamp: data.timestamp,
      });

      logger.info(`User ${socket.userId} viewing post ${data.postId}`);
    }
  );

  // Scrolling feed
  socket.on('activity:scrolling_feed', (data: { timestamp: number }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Broadcast user activity
    socket.broadcast.emit('activity:user_active', {
      userId: socket.userId,
      type: 'feed',
      timestamp: data.timestamp,
    });

    logger.info(`User ${socket.userId} scrolling feed`);
  });

  // In chat
  socket.on(
    'activity:in_chat',
    (data: { chatId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify other chat participants
      socket.to(data.chatId).emit('activity:user_active', {
        userId: socket.userId,
        type: 'chat',
        chatId: data.chatId,
        timestamp: data.timestamp,
      });

      logger.info(`User ${socket.userId} active in chat ${data.chatId}`);
    }
  );

  // Handle user idle state
  let idleTimeout: NodeJS.Timeout;

  const resetIdleTimeout = () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }

    // Set user as active
    socket.broadcast.emit('activity:user_active', {
      userId: socket.userId,
      type: 'active',
      timestamp: Date.now(),
    });

    // Set timeout for idle state (5 minutes)
    idleTimeout = setTimeout(
      () => {
        if (socket.userId) {
          socket.broadcast.emit('activity:user_idle', {
            userId: socket.userId,
            timestamp: Date.now(),
          });
          logger.info(`User ${socket.userId} is now idle`);
        }
      },
      5 * 60 * 1000
    );
  };

  // Reset idle timeout on any activity
  socket.onAny(() => {
    if (socket.userId) {
      resetIdleTimeout();
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    if (idleTimeout) {
      clearTimeout(idleTimeout);
    }
  });
};
