import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

interface TrendingPost {
  postId: string;
  authorId: string;
  engagement: number; // Combined score of likes, comments, shares
  timestamp: number;
}

export const handleFeed = (socket: AuthenticatedSocket) => {
  // Store trending posts
  const trendingPosts = new Map<string, TrendingPost>();
  const TRENDING_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Subscribe to feed updates
  socket.on(
    'feed:subscribe',
    (data: { userId: string; lastUpdate?: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Join user's feed room
      socket.join(`feed:${data.userId}`);

      logger.info(`User ${socket.userId} subscribed to feed updates`);
    }
  );

  // Unsubscribe from feed updates
  socket.on('feed:unsubscribe', (data: { userId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Leave user's feed room
    socket.leave(`feed:${data.userId}`);

    logger.info(`User ${socket.userId} unsubscribed from feed updates`);
  });

  // New post in feed
  socket.on(
    'feed:new_post',
    (data: {
      postId: string;
      authorId: string;
      content: string;
      timestamp: number;
      authorName: string;
      authorAvatar?: string;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify followers
      socket.to(`feed:${data.authorId}`).emit('feed:new_post', {
        postId: data.postId,
        authorId: data.authorId,
        content: data.content,
        timestamp: data.timestamp,
        authorName: data.authorName,
        authorAvatar: data.authorAvatar,
      });

      // Update trending posts
      updateTrendingPosts(data.postId, data.authorId, 0);

      logger.info(
        `New post ${data.postId} added to feed by user ${data.authorId}`
      );
    }
  );

  // Post updated in feed
  socket.on(
    'feed:post_updated',
    (data: {
      postId: string;
      authorId: string;
      content: string;
      timestamp: number;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify followers
      socket.to(`feed:${data.authorId}`).emit('feed:post_updated', {
        postId: data.postId,
        authorId: data.authorId,
        content: data.content,
        timestamp: data.timestamp,
      });

      logger.info(
        `Post ${data.postId} updated in feed by user ${data.authorId}`
      );
    }
  );

  // Post deleted from feed
  socket.on(
    'feed:post_deleted',
    (data: { postId: string; authorId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify followers
      socket.to(`feed:${data.authorId}`).emit('feed:post_deleted', {
        postId: data.postId,
        authorId: data.authorId,
      });

      // Remove from trending posts
      trendingPosts.delete(data.postId);

      logger.info(
        `Post ${data.postId} deleted from feed by user ${data.authorId}`
      );
    }
  );

  // Update post engagement
  socket.on(
    'feed:update_engagement',
    (data: { postId: string; authorId: string; engagement: number }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      updateTrendingPosts(data.postId, data.authorId, data.engagement);
    }
  );

  // Function to update trending posts
  const updateTrendingPosts = (
    postId: string,
    authorId: string,
    engagement: number
  ) => {
    trendingPosts.set(postId, {
      postId,
      authorId,
      engagement,
      timestamp: Date.now(),
    });

    // Sort and get top trending posts
    const topTrending = Array.from(trendingPosts.values())
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    // Broadcast trending posts update
    socket.broadcast.emit('feed:trending', {
      posts: topTrending,
      timestamp: Date.now(),
    });
  };

  // Periodically update trending posts
  setInterval(() => {
    const topTrending = Array.from(trendingPosts.values())
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    socket.broadcast.emit('feed:trending', {
      posts: topTrending,
      timestamp: Date.now(),
    });

    logger.info('Updated trending posts');
  }, TRENDING_UPDATE_INTERVAL);

  // Request feed refresh
  socket.on('feed:request_refresh', (data: { userId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify user to refresh their feed
    socket.to(`feed:${data.userId}`).emit('feed:refresh', {
      timestamp: Date.now(),
    });

    logger.info(`Feed refresh requested for user ${data.userId}`);
  });
};
