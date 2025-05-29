import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/authSocket';

export const handleConversation = (socket: AuthenticatedSocket) => {
  // Join conversation room
  socket.on('conversation:join', (data: { conversationId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.join(data.conversationId);
    logger.info(
      `User ${socket.userId} joined conversation ${data.conversationId}`
    );
  });

  // Leave conversation room
  socket.on('conversation:leave', (data: { conversationId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.leave(data.conversationId);
    logger.info(
      `User ${socket.userId} left conversation ${data.conversationId}`
    );
  });

  // Archive conversation
  socket.on('conversation:archive', (data: { conversationId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.to(data.conversationId).emit('conversation:archived', {
      conversationId: data.conversationId,
      archivedBy: socket.userId,
      archivedAt: new Date().toISOString(),
    });

    logger.info(
      `Conversation ${data.conversationId} archived by user ${socket.userId}`
    );
  });

  // Unarchive conversation
  socket.on('conversation:unarchive', (data: { conversationId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.to(data.conversationId).emit('conversation:unarchived', {
      conversationId: data.conversationId,
      unarchivedBy: socket.userId,
      unarchivedAt: new Date().toISOString(),
    });

    logger.info(
      `Conversation ${data.conversationId} unarchived by user ${socket.userId}`
    );
  });

  // Mute conversation
  socket.on(
    'conversation:mute',
    (data: {
      conversationId: string;
      duration?: number; // Duration in milliseconds, optional
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      socket.to(data.conversationId).emit('conversation:muted', {
        conversationId: data.conversationId,
        mutedBy: socket.userId,
        mutedAt: new Date().toISOString(),
        duration: data.duration,
      });

      logger.info(
        `Conversation ${data.conversationId} muted by user ${socket.userId}`
      );
    }
  );

  // Unmute conversation
  socket.on('conversation:unmute', (data: { conversationId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.to(data.conversationId).emit('conversation:unmuted', {
      conversationId: data.conversationId,
      unmutedBy: socket.userId,
      unmutedAt: new Date().toISOString(),
    });

    logger.info(
      `Conversation ${data.conversationId} unmuted by user ${socket.userId}`
    );
  });
};
