import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ApiResponse } from '../types';
import { MessageType, Prisma } from '@prisma/client';
import { socketHelpers } from '../config/socket';

export class MessageController {
  // Get conversation messages
  static async getMessages(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const { page = 1, limit = 20 } = request.query;

      // Check if user is a member of the conversation
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          leftAt: null,
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'You are not a member of this conversation',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      const messages = await prisma.message.findMany({
        where: {
          conversationId: id,
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                  isVerified: true,
                },
              },
            },
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                  isVerified: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Update last read message
      if (messages.length > 0) {
        await prisma.conversationMember.update({
          where: {
            id: membership.id,
          },
          data: {
            lastReadMessageId: messages[0].id,
            lastReadAt: new Date(),
          },
        });
      }

      return reply.send({
        success: true,
        data: messages,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Send message
  static async sendMessage(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        content?: string;
        type?: MessageType;
        replyToId?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const { content, type = 'TEXT', replyToId } = request.body;

      // Check if user is a member of the conversation
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          leftAt: null,
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'You are not a member of this conversation',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: request.user.id,
          content,
          messageType: type,
          replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                  isVerified: true,
                },
              },
            },
          },
        },
      });

      // Update conversation last message
      await prisma.conversation.update({
        where: { id },
        data: {
          lastMessageId: message.id,
          lastMessageAt: new Date(),
          lastMessageText: content || '',
        },
      });

      // Notify all members
      socketHelpers.sendToConversation(id, 'new_message', message);

      return reply.status(201).send({
        success: true,
        data: message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Edit message
  static async editMessage(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const { content } = request.body;

      // Check if message exists and belongs to user
      const message = await prisma.message.findFirst({
        where: {
          id,
          senderId: request.user.id,
          isDeleted: false,
        },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          message: 'Message not found or you are not authorized to edit it',
          error: 'MESSAGE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Update message
      const updatedMessage = await prisma.message.update({
        where: { id },
        data: {
          content,
          isEdited: true,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatar: true,
                  isVerified: true,
                },
              },
            },
          },
        },
      });

      // Update conversation last message if this was the last message
      if (message.id === message.conversation.lastMessageId) {
        await prisma.conversation.update({
          where: { id: message.conversationId },
          data: {
            lastMessageText: content,
          },
        });
      }

      // Notify all members
      socketHelpers.sendToConversation(
        message.conversationId,
        'message_updated',
        updatedMessage
      );

      return reply.send({
        success: true,
        data: updatedMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error editing message:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete message
  static async deleteMessage(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;

      // Check if message exists and belongs to user
      const message = await prisma.message.findFirst({
        where: {
          id,
          senderId: request.user.id,
          isDeleted: false,
        },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          message: 'Message not found or you are not authorized to delete it',
          error: 'MESSAGE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Soft delete message
      await prisma.message.update({
        where: { id },
        data: {
          isDeleted: true,
          content: null,
        },
      });

      // Update conversation last message if this was the last message
      if (message.id === message.conversation.lastMessageId) {
        const newLastMessage = await prisma.message.findFirst({
          where: {
            conversationId: message.conversationId,
            isDeleted: false,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        await prisma.conversation.update({
          where: { id: message.conversationId },
          data: {
            lastMessageId: newLastMessage?.id || null,
            lastMessageAt: newLastMessage?.createdAt || null,
            lastMessageText: newLastMessage?.content || null,
          },
        });
      }

      // Notify all members
      socketHelpers.sendToConversation(
        message.conversationId,
        'message_deleted',
        {
          id,
        }
      );

      return reply.send({
        success: true,
        message: 'Message deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // React to message
  static async reactToMessage(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { emoji: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const { emoji } = request.body;

      // Check if message exists
      const message = await prisma.message.findFirst({
        where: {
          id,
          isDeleted: false,
        },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          message: 'Message not found',
          error: 'MESSAGE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is a member of the conversation
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: message.conversationId,
          userId: request.user.id,
          leftAt: null,
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'You are not a member of this conversation',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Add reaction
      const reaction = await prisma.messageReaction.create({
        data: {
          messageId: id,
          userId: request.user.id,
          emoji,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
      });

      // Notify all members
      socketHelpers.sendToConversation(
        message.conversationId,
        'message_reaction_added',
        reaction
      );

      return reply.status(201).send({
        success: true,
        data: reaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Remove reaction
  static async removeReaction(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;

      // Check if reaction exists and belongs to user
      const reaction = await prisma.messageReaction.findFirst({
        where: {
          id,
          userId: request.user.id,
        },
        include: {
          message: {
            include: {
              conversation: true,
            },
          },
        },
      });

      if (!reaction) {
        return reply.status(404).send({
          success: false,
          message: 'Reaction not found or you are not authorized to remove it',
          error: 'REACTION_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete reaction
      await prisma.messageReaction.delete({
        where: { id },
      });

      // Notify all members
      socketHelpers.sendToConversation(
        reaction.message.conversationId,
        'message_reaction_removed',
        { id }
      );

      return reply.send({
        success: true,
        message: 'Reaction removed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error removing reaction:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Mark message as read
  static async markAsRead(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;

      // Check if message exists
      const message = await prisma.message.findFirst({
        where: {
          id,
          isDeleted: false,
        },
        include: {
          conversation: true,
        },
      });

      if (!message) {
        return reply.status(404).send({
          success: false,
          message: 'Message not found',
          error: 'MESSAGE_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is a member of the conversation
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: message.conversationId,
          userId: request.user.id,
          leftAt: null,
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'You are not a member of this conversation',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Update last read message
      await prisma.conversationMember.update({
        where: {
          id: membership.id,
        },
        data: {
          lastReadMessageId: id,
          lastReadAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        message: 'Message marked as read',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
