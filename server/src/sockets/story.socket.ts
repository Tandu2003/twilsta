import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleStory = (socket: AuthenticatedSocket) => {
  // View story
  socket.on(
    'story:view',
    (data: { storyId: string; authorId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify story author
      socket.to(data.authorId).emit('story:viewed', {
        storyId: data.storyId,
        viewedBy: socket.userId,
        timestamp: data.timestamp,
      });

      logger.info(`User ${socket.userId} viewed story ${data.storyId}`);
    }
  );

  // React to story
  socket.on(
    'story:react',
    (data: {
      storyId: string;
      authorId: string;
      reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
      timestamp: number;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify story author
      socket.to(data.authorId).emit('story:reaction', {
        storyId: data.storyId,
        reactedBy: socket.userId,
        reaction: data.reaction,
        timestamp: data.timestamp,
      });

      logger.info(
        `User ${socket.userId} reacted to story ${data.storyId} with ${data.reaction}`
      );
    }
  );

  // Screenshot story
  socket.on(
    'story:screenshot',
    (data: { storyId: string; authorId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify story author
      socket.to(data.authorId).emit('story:screenshot_taken', {
        storyId: data.storyId,
        takenBy: socket.userId,
        timestamp: data.timestamp,
      });

      logger.info(
        `User ${socket.userId} took screenshot of story ${data.storyId}`
      );
    }
  );

  // Story expiration check
  const checkStoryExpiration = (
    storyId: string,
    authorId: string,
    createdAt: number
  ) => {
    const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeLeft = createdAt + EXPIRATION_TIME - Date.now();

    if (timeLeft <= 0) {
      // Notify story author
      socket.to(authorId).emit('story:expired', {
        storyId,
        timestamp: Date.now(),
      });

      logger.info(`Story ${storyId} has expired`);
      return;
    }

    // Schedule next check
    setTimeout(
      () => {
        checkStoryExpiration(storyId, authorId, createdAt);
      },
      Math.min(timeLeft, 60000)
    ); // Check every minute or when time is up
  };

  // Start expiration check when story is created
  socket.on(
    'story:created',
    (data: { storyId: string; authorId: string; createdAt: number }) => {
      checkStoryExpiration(data.storyId, data.authorId, data.createdAt);
    }
  );

  // Remove story reaction
  socket.on(
    'story:remove_reaction',
    (data: { storyId: string; authorId: string; timestamp: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify story author
      socket.to(data.authorId).emit('story:reaction_removed', {
        storyId: data.storyId,
        removedBy: socket.userId,
        timestamp: data.timestamp,
      });

      logger.info(
        `User ${socket.userId} removed reaction from story ${data.storyId}`
      );
    }
  );

  // Get story reactions
  socket.on('story:get_reactions', (data: { storyId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // In a real implementation, fetch reactions from database
    // Here we're just acknowledging the request
    socket.emit('story:reactions', {
      storyId: data.storyId,
      reactions: [], // This should be populated from the database
      timestamp: Date.now(),
    });

    logger.info(
      `User ${socket.userId} requested reactions for story ${data.storyId}`
    );
  });
};
