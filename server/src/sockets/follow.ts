import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/authSocket';

interface FollowRequest {
  requesterId: string;
  targetId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

export const handleFollow = (socket: AuthenticatedSocket) => {
  // Store follow requests
  const followRequests = new Map<string, FollowRequest>();

  // Follow user
  socket.on('follow:user', (data: { targetId: string; isPrivate: boolean }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (data.isPrivate) {
      // Create follow request for private account
      const request: FollowRequest = {
        requesterId: socket.userId,
        targetId: data.targetId,
        timestamp: Date.now(),
        status: 'pending',
      };

      followRequests.set(`${socket.userId}:${data.targetId}`, request);

      // Notify target user
      socket.to(data.targetId).emit('follow:request_received', {
        requesterId: socket.userId,
        timestamp: request.timestamp,
      });

      logger.info(
        `User ${socket.userId} sent follow request to ${data.targetId}`
      );
    } else {
      // Direct follow for public account
      socket.to(data.targetId).emit('follow:followed', {
        followerId: socket.userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${socket.userId} followed ${data.targetId}`);
    }
  });

  // Unfollow user
  socket.on('follow:unfollow', (data: { targetId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Notify target user
    socket.to(data.targetId).emit('follow:unfollowed', {
      unfollowerId: socket.userId,
      timestamp: Date.now(),
    });

    logger.info(`User ${socket.userId} unfollowed ${data.targetId}`);
  });

  // Send follow request
  socket.on('follow:request', (data: { targetId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const request: FollowRequest = {
      requesterId: socket.userId,
      targetId: data.targetId,
      timestamp: Date.now(),
      status: 'pending',
    };

    followRequests.set(`${socket.userId}:${data.targetId}`, request);

    // Notify target user
    socket.to(data.targetId).emit('follow:request_received', {
      requesterId: socket.userId,
      timestamp: request.timestamp,
    });

    logger.info(
      `User ${socket.userId} sent follow request to ${data.targetId}`
    );
  });

  // Accept follow request
  socket.on('follow:accept', (data: { requesterId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const requestKey = `${data.requesterId}:${socket.userId}`;
    const request = followRequests.get(requestKey);

    if (!request) {
      socket.emit('error', { message: 'Follow request not found' });
      return;
    }

    request.status = 'accepted';
    followRequests.set(requestKey, request);

    // Notify requester
    socket.to(data.requesterId).emit('follow:request_accepted', {
      targetId: socket.userId,
      timestamp: Date.now(),
    });

    // Check for mutual follow
    checkMutualFollow(data.requesterId, socket.userId);

    logger.info(
      `User ${socket.userId} accepted follow request from ${data.requesterId}`
    );
  });

  // Decline follow request
  socket.on('follow:decline', (data: { requesterId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const requestKey = `${data.requesterId}:${socket.userId}`;
    const request = followRequests.get(requestKey);

    if (!request) {
      socket.emit('error', { message: 'Follow request not found' });
      return;
    }

    request.status = 'declined';
    followRequests.set(requestKey, request);

    // Notify requester
    socket.to(data.requesterId).emit('follow:request_declined', {
      targetId: socket.userId,
      timestamp: Date.now(),
    });

    logger.info(
      `User ${socket.userId} declined follow request from ${data.requesterId}`
    );
  });

  // Function to check for mutual follow
  const checkMutualFollow = (userId1: string, userId2: string) => {
    // In a real implementation, you would check the database
    // Here we're just simulating the check
    const isMutual = Math.random() > 0.5; // Simulate random mutual follow

    if (isMutual) {
      // Notify both users
      socket.to(userId1).emit('follow:mutual_follow', {
        userId: userId2,
        timestamp: Date.now(),
      });

      socket.to(userId2).emit('follow:mutual_follow', {
        userId: userId1,
        timestamp: Date.now(),
      });

      logger.info(
        `Mutual follow established between ${userId1} and ${userId2}`
      );
    }
  };

  // Clean up on disconnect
  socket.on('disconnect', () => {
    // Clean up any pending requests
    for (const [key, request] of followRequests.entries()) {
      if (
        request.requesterId === socket.userId ||
        request.targetId === socket.userId
      ) {
        followRequests.delete(key);
      }
    }
  });
};
