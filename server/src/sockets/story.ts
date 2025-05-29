import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/authSocket';
import {
  StoryViewData,
  StoryReactionData,
  StoryScreenshotData,
  StoryCreatedData,
  StoryViewedResponse,
  StoryReactionResponse,
  StoryScreenshotResponse,
  StoryExpiredResponse,
  StoryReactionRemovedResponse,
  StoryReactionsResponse,
} from '../types/story';

export const handleStory = (socket: AuthenticatedSocket) => {
  // View story
  socket.on('story:view', (data: StoryViewData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const viewedResponse: StoryViewedResponse = {
      storyId: data.storyId,
      viewedBy: socket.userId,
      timestamp: data.timestamp,
    };

    // Notify story author
    socket.to(data.authorId).emit('story:viewed', viewedResponse);

    logger.info(`User ${socket.userId} viewed story ${data.storyId}`);
  });

  // React to story
  socket.on('story:react', (data: StoryReactionData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionResponse: StoryReactionResponse = {
      storyId: data.storyId,
      reactedBy: socket.userId,
      reaction: data.reaction,
      timestamp: data.timestamp,
    };

    // Notify story author
    socket.to(data.authorId).emit('story:reaction', reactionResponse);

    logger.info(
      `User ${socket.userId} reacted to story ${data.storyId} with ${data.reaction}`
    );
  });

  // Screenshot story
  socket.on('story:screenshot', (data: StoryScreenshotData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const screenshotResponse: StoryScreenshotResponse = {
      storyId: data.storyId,
      takenBy: socket.userId,
      timestamp: data.timestamp,
    };

    // Notify story author
    socket.to(data.authorId).emit('story:screenshot_taken', screenshotResponse);

    logger.info(
      `User ${socket.userId} took screenshot of story ${data.storyId}`
    );
  });

  // Story expiration check
  const checkStoryExpiration = (
    storyId: string,
    authorId: string,
    createdAt: number
  ) => {
    const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const timeLeft = createdAt + EXPIRATION_TIME - Date.now();

    if (timeLeft <= 0) {
      const expiredResponse: StoryExpiredResponse = {
        storyId,
        timestamp: Date.now(),
      };

      // Notify story author
      socket.to(authorId).emit('story:expired', expiredResponse);

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
  socket.on('story:created', (data: StoryCreatedData) => {
    checkStoryExpiration(data.storyId, data.authorId, data.createdAt);
  });

  // Remove story reaction
  socket.on('story:remove_reaction', (data: StoryViewData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionRemovedResponse: StoryReactionRemovedResponse = {
      storyId: data.storyId,
      removedBy: socket.userId,
      timestamp: data.timestamp,
    };

    // Notify story author
    socket
      .to(data.authorId)
      .emit('story:reaction_removed', reactionRemovedResponse);

    logger.info(
      `User ${socket.userId} removed reaction from story ${data.storyId}`
    );
  });

  // Get story reactions
  socket.on('story:get_reactions', (data: { storyId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionsResponse: StoryReactionsResponse = {
      storyId: data.storyId,
      reactions: [], // This should be populated from the database
      timestamp: Date.now(),
    };

    // In a real implementation, fetch reactions from database
    socket.emit('story:reactions', reactionsResponse);

    logger.info(
      `User ${socket.userId} requested reactions for story ${data.storyId}`
    );
  });
};
