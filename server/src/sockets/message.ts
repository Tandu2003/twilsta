import logger from '../utils/logger';
import { AuthenticatedSocket } from '../types/authSocket';
import {
  MessageData,
  MessageReactionData,
  MessageEditData,
  MessageDeleteData,
  MessageReadData,
  TypingData,
  MessageResponse,
  MessageReactionResponse,
  MessageReactionRemovedResponse,
  MessageEditedResponse,
  MessageDeletedResponse,
  MessageReadResponse,
  MessageReactionsResponse,
  TypingResponse,
} from '../types/message';

export const handleMessage = (socket: AuthenticatedSocket) => {
  // Send message
  socket.on('message:send', (data: MessageData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const messageResponse: MessageResponse = {
      id: Date.now().toString(), // Temporary ID, should be replaced with DB ID
      conversationId: data.conversationId,
      senderId: socket.userId,
      content: data.content,
      type: data.type,
      mediaUrl: data.mediaUrl,
      replyTo: data.replyTo,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket.to(data.conversationId).emit('message:new', messageResponse);

    logger.info(
      `User ${socket.userId} sent message in conversation ${data.conversationId}`
    );
  });

  // React to message
  socket.on('message:react', (data: MessageReactionData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionResponse: MessageReactionResponse = {
      messageId: data.messageId,
      reactedBy: socket.userId,
      reaction: data.reaction,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket.to(data.conversationId).emit('message:reaction', reactionResponse);

    logger.info(`User ${socket.userId} reacted to message ${data.messageId}`);
  });

  // Remove message reaction
  socket.on('message:remove_reaction', (data: MessageDeleteData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionRemovedResponse: MessageReactionRemovedResponse = {
      messageId: data.messageId,
      removedBy: socket.userId,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket
      .to(data.conversationId)
      .emit('message:reaction_removed', reactionRemovedResponse);

    logger.info(
      `User ${socket.userId} removed reaction from message ${data.messageId}`
    );
  });

  // Edit message
  socket.on('message:edit', (data: MessageEditData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const editedResponse: MessageEditedResponse = {
      messageId: data.messageId,
      content: data.content,
      editedBy: socket.userId,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket.to(data.conversationId).emit('message:edited', editedResponse);

    logger.info(`User ${socket.userId} edited message ${data.messageId}`);
  });

  // Delete message
  socket.on('message:delete', (data: MessageDeleteData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const deletedResponse: MessageDeletedResponse = {
      messageId: data.messageId,
      deletedBy: socket.userId,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket.to(data.conversationId).emit('message:deleted', deletedResponse);

    logger.info(`User ${socket.userId} deleted message ${data.messageId}`);
  });

  // Mark message as read
  socket.on('message:read', (data: MessageReadData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const readResponse: MessageReadResponse = {
      messageId: data.messageId,
      readBy: socket.userId,
      timestamp: Date.now(),
    };

    // Notify conversation members
    socket.to(data.conversationId).emit('message:read', readResponse);

    logger.info(`User ${socket.userId} read message ${data.messageId}`);
  });

  // Get message reactions
  socket.on('message:get_reactions', (data: MessageDeleteData) => {
    if (!socket.userId) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const reactionsResponse: MessageReactionsResponse = {
      messageId: data.messageId,
      reactions: [], // This should be populated from the database
      timestamp: Date.now(),
    };

    // In a real implementation, fetch reactions from database
    socket.emit('message:reactions', reactionsResponse);

    logger.info(
      `User ${socket.userId} requested reactions for message ${data.messageId}`
    );
  });

  // Typing indicators
  socket.on('message:typing_start', (data: TypingData) => {
    if (!socket.userId) return;

    const typingResponse: TypingResponse = {
      userId: socket.userId,
    };

    socket.to(data.roomId).emit('message:typing', typingResponse);
  });

  socket.on('message:typing_stop', (data: TypingData) => {
    if (!socket.userId) return;

    const typingResponse: TypingResponse = {
      userId: socket.userId,
      isTyping: false,
    };

    socket.to(data.roomId).emit('message:typing', typingResponse);
  });
};
