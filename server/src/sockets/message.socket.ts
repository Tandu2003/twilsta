import { Socket } from 'socket.io';
import logger from '../utils/logger';
import { AuthenticatedSocket } from './types';

export const handleMessage = (socket: AuthenticatedSocket) => {
  // Send new message
  socket.on(
    'message:send',
    (data: { roomId: string; content: string; type?: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const messageData = {
        id: Date.now().toString(), // Temporary ID, should be replaced with DB ID
        senderId: socket.userId,
        roomId: data.roomId,
        content: data.content,
        type: data.type || 'text',
        timestamp: new Date().toISOString(),
      };

      // Broadcast to room
      socket.to(data.roomId).emit('message:new', messageData);
      // Send delivery confirmation to sender
      socket.emit('message:delivered', { messageId: messageData.id });
      logger.info(
        `New message sent in room ${data.roomId} by user ${socket.userId}`
      );
    }
  );

  // Edit message
  socket.on(
    'message:edit',
    (data: { messageId: string; content: string; roomId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const updatedMessage = {
        id: data.messageId,
        content: data.content,
        editedAt: new Date().toISOString(),
      };

      socket.to(data.roomId).emit('message:updated', updatedMessage);
      logger.info(`Message ${data.messageId} edited by user ${socket.userId}`);
    }
  );

  // Delete message
  socket.on('message:delete', (data: { messageId: string; roomId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket
      .to(data.roomId)
      .emit('message:deleted', { messageId: data.messageId });
    logger.info(`Message ${data.messageId} deleted by user ${socket.userId}`);
  });

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

  // Mark message as read
  socket.on('message:read', (data: { messageId: string; roomId: string }) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const readReceipt = {
      messageId: data.messageId,
      userId: socket.userId,
      readAt: new Date().toISOString(),
    };

    socket.to(data.roomId).emit('message:read_receipt', readReceipt);
    logger.info(
      `Message ${data.messageId} marked as read by user ${socket.userId}`
    );
  });

  // Message reactions
  socket.on(
    'message:react',
    (data: { messageId: string; roomId: string; reaction: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const reactionData = {
        messageId: data.messageId,
        userId: socket.userId,
        reaction: data.reaction,
        timestamp: new Date().toISOString(),
      };

      socket.to(data.roomId).emit('message:reaction_added', reactionData);
      logger.info(
        `Reaction added to message ${data.messageId} by user ${socket.userId}`
      );
    }
  );

  socket.on(
    'message:unreact',
    (data: { messageId: string; roomId: string; reaction: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const reactionData = {
        messageId: data.messageId,
        userId: socket.userId,
        reaction: data.reaction,
      };

      socket.to(data.roomId).emit('message:reaction_removed', reactionData);
      logger.info(
        `Reaction removed from message ${data.messageId} by user ${socket.userId}`
      );
    }
  );
};
