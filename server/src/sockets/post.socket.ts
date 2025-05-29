import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handlePost = (socket: AuthenticatedSocket) => {
  // Like post
  socket.on('post:like', (data: { postId: string; authorId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify post author
    socket.to(data.authorId).emit('post:liked', {
      postId: data.postId,
      likedBy: socket.userId,
      timestamp: Date.now(),
    });

    // Broadcast live count update
    socket.to(data.postId).emit('post:live_count', {
      postId: data.postId,
      type: 'like',
      action: 'add',
      count: 1, // This should be replaced with actual count from DB
    });

    logger.info(`User ${socket.userId} liked post ${data.postId}`);
  });

  // Unlike post
  socket.on('post:unlike', (data: { postId: string; authorId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify post author
    socket.to(data.authorId).emit('post:unliked', {
      postId: data.postId,
      unlikedBy: socket.userId,
      timestamp: Date.now(),
    });

    // Broadcast live count update
    socket.to(data.postId).emit('post:live_count', {
      postId: data.postId,
      type: 'like',
      action: 'remove',
      count: -1, // This should be replaced with actual count from DB
    });

    logger.info(`User ${socket.userId} unliked post ${data.postId}`);
  });

  // Add comment
  socket.on(
    'post:comment',
    (data: {
      postId: string;
      authorId: string;
      content: string;
      parentCommentId?: string; // For nested comments
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const commentData = {
        id: Date.now().toString(), // Temporary ID, should be replaced with DB ID
        postId: data.postId,
        authorId: socket.userId,
        content: data.content,
        parentCommentId: data.parentCommentId,
        timestamp: Date.now(),
      };

      // Notify post author
      socket.to(data.authorId).emit('post:new_comment', commentData);

      // Broadcast live count update
      socket.to(data.postId).emit('post:live_count', {
        postId: data.postId,
        type: 'comment',
        action: 'add',
        count: 1, // This should be replaced with actual count from DB
      });

      logger.info(`User ${socket.userId} commented on post ${data.postId}`);
    }
  );

  // View post
  socket.on('post:view', (data: { postId: string; authorId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // This is typically handled by analytics service
    // No need to emit events for views to avoid spam
    logger.info(`User ${socket.userId} viewed post ${data.postId}`);
  });

  // Share post
  socket.on(
    'post:share',
    (data: {
      postId: string;
      authorId: string;
      shareType: 'copy_link' | 'embed' | 'social_media';
      platform?: string; // For social media shares
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const shareData = {
        postId: data.postId,
        sharedBy: socket.userId,
        shareType: data.shareType,
        platform: data.platform,
        timestamp: Date.now(),
      };

      // Notify post author
      socket.to(data.authorId).emit('post:shared', shareData);

      logger.info(
        `User ${socket.userId} shared post ${data.postId} via ${data.shareType}`
      );
    }
  );

  // Delete comment
  socket.on(
    'post:delete_comment',
    (data: { postId: string; commentId: string; authorId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify post author
      socket.to(data.authorId).emit('post:comment_deleted', {
        postId: data.postId,
        commentId: data.commentId,
        deletedBy: socket.userId,
        timestamp: Date.now(),
      });

      // Broadcast live count update
      socket.to(data.postId).emit('post:live_count', {
        postId: data.postId,
        type: 'comment',
        action: 'remove',
        count: -1, // This should be replaced with actual count from DB
      });

      logger.info(
        `User ${socket.userId} deleted comment ${data.commentId} from post ${data.postId}`
      );
    }
  );
};
