import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ApiResponse } from '../types';
import { ConversationType, MemberRole } from '@prisma/client';
import { socketHelpers } from '../config/socket';

export class ConversationController {
  // Get user's conversations
  static async getConversations(
    request: FastifyRequest,
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

      const conversations = await prisma.conversation.findMany({
        where: {
          members: {
            some: {
              userId: request.user.id,
              leftAt: null,
            },
          },
        },
        include: {
          members: {
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
          lastMessage: {
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
        orderBy: {
          lastMessageAt: 'desc',
        },
      });

      return reply.send({
        success: true,
        data: conversations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting conversations:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Create new conversation
  static async createConversation(
    request: FastifyRequest<{
      Body: {
        participants: string[];
        type?: ConversationType;
        name?: string;
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

      const { participants, type = 'DIRECT', name } = request.body;

      // Validate participants
      if (type === 'DIRECT' && participants.length !== 1) {
        return reply.status(400).send({
          success: false,
          message: 'Direct conversations must have exactly one participant',
          error: 'INVALID_PARTICIPANTS',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if direct conversation already exists
      if (type === 'DIRECT') {
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            type: 'DIRECT',
            members: {
              every: {
                userId: {
                  in: [request.user.id, participants[0]],
                },
              },
            },
          },
        });

        if (existingConversation) {
          return reply.status(200).send({
            success: true,
            data: existingConversation,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          type,
          name,
          adminId: type === 'GROUP' ? request.user.id : null,
          members: {
            create: [
              {
                userId: request.user.id,
                role:
                  type === 'GROUP' ? ('ADMIN' as const) : ('MEMBER' as const),
              },
              ...participants.map((userId) => ({
                userId,
                role: 'MEMBER' as const,
              })),
            ],
          },
        },
        include: {
          members: {
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
      });

      // Notify participants
      participants.forEach((userId) => {
        socketHelpers.sendToUser(userId, 'new_conversation', conversation);
      });

      return reply.status(201).send({
        success: true,
        data: conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get conversation details
  static async getConversation(
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

      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          members: {
            some: {
              userId: request.user.id,
              leftAt: null,
            },
          },
        },
        include: {
          members: {
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
          lastMessage: {
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

      if (!conversation) {
        return reply.status(404).send({
          success: false,
          message: 'Conversation not found',
          error: 'CONVERSATION_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting conversation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update conversation
  static async updateConversation(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        name?: string;
        avatar?: string;
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
      const { name, avatar } = request.body;

      // Check if user is admin
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          role: 'ADMIN',
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'Only admins can update conversation details',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      const conversation = await prisma.conversation.update({
        where: { id },
        data: {
          name,
          avatar,
        },
        include: {
          members: {
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
      });

      // Notify all members
      socketHelpers.sendToConversation(
        id,
        'conversation_updated',
        conversation
      );

      return reply.send({
        success: true,
        data: conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete conversation
  static async deleteConversation(
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

      // Check if user is admin
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          role: 'ADMIN',
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'Only admins can delete conversations',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get all member IDs before deleting
      const members = await prisma.conversationMember.findMany({
        where: { conversationId: id },
        select: { userId: true },
      });

      // Delete conversation
      await prisma.conversation.delete({
        where: { id },
      });

      // Notify all members
      members.forEach((member) => {
        socketHelpers.sendToUser(member.userId, 'conversation_deleted', { id });
      });

      return reply.send({
        success: true,
        message: 'Conversation deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Add members to group
  static async addMembers(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { userIds: string[] };
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
      const { userIds } = request.body;

      // Check if user is admin
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          role: 'ADMIN',
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'Only admins can add members',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Add members
      const newMembers = await prisma.conversationMember.createMany({
        data: userIds.map((userId) => ({
          conversationId: id,
          userId,
          role: 'MEMBER',
        })),
        skipDuplicates: true,
      });

      // Get updated conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          members: {
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
      });

      // Notify new members
      userIds.forEach((userId) => {
        socketHelpers.sendToUser(userId, 'added_to_conversation', conversation);
      });

      // Notify existing members
      socketHelpers.sendToConversation(id, 'members_added', {
        conversationId: id,
        newMemberCount: newMembers.count,
      });

      return reply.send({
        success: true,
        data: conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error adding members:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Remove member from group
  static async removeMember(
    request: FastifyRequest<{
      Params: { id: string; userId: string };
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

      const { id, userId } = request.params;

      // Check if user is admin
      const membership = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          role: 'ADMIN',
        },
      });

      if (!membership) {
        return reply.status(403).send({
          success: false,
          message: 'Only admins can remove members',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Remove member
      await prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: id,
            userId,
          },
        },
        data: {
          leftAt: new Date(),
        },
      });

      // Notify removed member
      socketHelpers.sendToUser(userId, 'removed_from_conversation', { id });

      // Notify remaining members
      socketHelpers.sendToConversation(id, 'member_removed', {
        conversationId: id,
        userId,
      });

      return reply.send({
        success: true,
        message: 'Member removed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error removing member:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Transfer admin role
  static async transferAdmin(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { newAdminId: string };
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
      const { newAdminId } = request.body;

      // Check if current user is admin
      const currentAdmin = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: request.user.id,
          role: 'ADMIN',
        },
      });

      if (!currentAdmin) {
        return reply.status(403).send({
          success: false,
          message: 'Only admins can transfer admin role',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if new admin is a member
      const newAdmin = await prisma.conversationMember.findFirst({
        where: {
          conversationId: id,
          userId: newAdminId,
          leftAt: null,
        },
      });

      if (!newAdmin) {
        return reply.status(400).send({
          success: false,
          message: 'New admin must be a member of the conversation',
          error: 'INVALID_MEMBER',
          timestamp: new Date().toISOString(),
        });
      }

      // Transfer admin role
      await prisma.$transaction([
        prisma.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId: id,
              userId: request.user.id,
            },
          },
          data: {
            role: 'MEMBER',
          },
        }),
        prisma.conversationMember.update({
          where: {
            conversationId_userId: {
              conversationId: id,
              userId: newAdminId,
            },
          },
          data: {
            role: 'ADMIN',
          },
        }),
        prisma.conversation.update({
          where: { id },
          data: {
            adminId: newAdminId,
          },
        }),
      ]);

      // Notify all members
      socketHelpers.sendToConversation(id, 'admin_transferred', {
        conversationId: id,
        newAdminId,
        previousAdminId: request.user.id,
      });

      return reply.send({
        success: true,
        message: 'Admin role transferred successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error transferring admin role:', error);
      return reply.status(500).send({
        success: false,
        message: 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
