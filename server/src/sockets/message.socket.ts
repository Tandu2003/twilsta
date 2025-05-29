import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleMessage = (socket: AuthenticatedSocket) => {
  // Send message
  socket.on(
    'message:send',
    (data: {
      conversationId: string;
      content: string;
      type: 'text' | 'image' | 'video' | 'file';
      mediaUrl?: string;
      replyTo?: string;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:new', {
        id: Date.now().toString(), // Temporary ID, should be replaced with DB ID
        conversationId: data.conversationId,
        senderId: socket.userId,
        content: data.content,
        type: data.type,
        mediaUrl: data.mediaUrl,
        replyTo: data.replyTo,
        timestamp: Date.now(),
      });

      logger.info(
        `User ${socket.userId} sent message in conversation ${data.conversationId}`
      );
    }
  );

  // React to message
  socket.on(
    'message:react',
    (data: {
      messageId: string;
      conversationId: string;
      reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:reaction', {
        messageId: data.messageId,
        reactedBy: socket.userId,
        reaction: data.reaction,
        timestamp: Date.now(),
      });

      logger.info(`User ${socket.userId} reacted to message ${data.messageId}`);
    }
  );

  // Remove message reaction
  socket.on(
    'message:remove_reaction',
    (data: { messageId: string; conversationId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:reaction_removed', {
        messageId: data.messageId,
        removedBy: socket.userId,
        timestamp: Date.now(),
      });

      logger.info(
        `User ${socket.userId} removed reaction from message ${data.messageId}`
      );
    }
  );

  // Edit message
  socket.on(
    'message:edit',
    (data: { messageId: string; conversationId: string; content: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:edited', {
        messageId: data.messageId,
        content: data.content,
        editedBy: socket.userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${socket.userId} edited message ${data.messageId}`);
    }
  );

  // Delete message
  socket.on(
    'message:delete',
    (data: { messageId: string; conversationId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:deleted', {
        messageId: data.messageId,
        deletedBy: socket.userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${socket.userId} deleted message ${data.messageId}`);
    }
  );

  // Mark message as read
  socket.on(
    'message:read',
    (data: { messageId: string; conversationId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Notify conversation members
      socket.to(data.conversationId).emit('message:read', {
        messageId: data.messageId,
        readBy: socket.userId,
        timestamp: Date.now(),
      });

      logger.info(`User ${socket.userId} read message ${data.messageId}`);
    }
  );

  // Get message reactions
  socket.on(
    'message:get_reactions',
    (data: { messageId: string; conversationId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // In a real implementation, fetch reactions from database
      // Here we're just acknowledging the request
      socket.emit('message:reactions', {
        messageId: data.messageId,
        reactions: [], // This should be populated from the database
        timestamp: Date.now(),
      });

      logger.info(
        `User ${socket.userId} requested reactions for message ${data.messageId}`
      );
    }
  );

  // Typing indicators
  socket.on('message:typing_start', (data: { roomId: string }) => {
    if (!socket.userId) return;
    socket.to(data.roomId).emit('message:typing', { userId: socket.userId });
  });

  socket.on('message:typing_stop', (data: { roomId: string }) => {
    if (!socket.userId) return;
    socket
      .to(data.roomId)
      .emit('message:typing', { userId: socket.userId, isTyping: false });
  });
};
