import { FastifyInstance } from 'fastify';
import { ConversationController } from '../controllers/conversation';
import { authenticate } from '../middleware/auth';
import { validationMiddlewares } from '../middleware/validation';

export async function conversationRoutes(fastify: FastifyInstance) {
  // Get user's conversations
  fastify.get(
    '/conversations',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Conversations'],
        summary: 'Get user conversations',
        description: 'Get all conversations for the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['DIRECT', 'GROUP'] },
                    name: { type: 'string' },
                    avatar: { type: 'string' },
                    lastMessageAt: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    members: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                          joinedAt: { type: 'string' },
                          user: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              username: { type: 'string' },
                              fullName: { type: 'string' },
                              avatar: { type: 'string' },
                              isVerified: { type: 'boolean' },
                            },
                          },
                        },
                      },
                    },
                    lastMessage: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        createdAt: { type: 'string' },
                        sender: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            fullName: { type: 'string' },
                            avatar: { type: 'string' },
                            isVerified: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.getConversations as any
  );

  // Create new conversation
  fastify.post(
    '/conversations',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Conversations'],
        summary: 'Create conversation',
        description: 'Create a new conversation (direct or group)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['participants'],
          properties: {
            participants: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
            type: {
              type: 'string',
              enum: ['DIRECT', 'GROUP'],
              default: 'DIRECT',
            },
            name: {
              type: 'string',
              maxLength: 100,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['DIRECT', 'GROUP'] },
                  name: { type: 'string' },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            fullName: { type: 'string' },
                            avatar: { type: 'string' },
                            isVerified: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.createConversation as any
  );

  // Get conversation details
  fastify.get(
    '/conversations/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Get conversation details',
        description: 'Get details of a specific conversation',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['DIRECT', 'GROUP'] },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  lastMessageAt: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            fullName: { type: 'string' },
                            avatar: { type: 'string' },
                            isVerified: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                  lastMessage: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
                      createdAt: { type: 'string' },
                      sender: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          username: { type: 'string' },
                          fullName: { type: 'string' },
                          avatar: { type: 'string' },
                          isVerified: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.getConversation as any
  );

  // Update conversation
  fastify.put(
    '/conversations/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Update conversation',
        description: 'Update conversation details (name, avatar)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              maxLength: 100,
            },
            avatar: {
              type: 'string',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['DIRECT', 'GROUP'] },
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            fullName: { type: 'string' },
                            avatar: { type: 'string' },
                            isVerified: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.updateConversation as any
  );

  // Delete conversation
  fastify.delete(
    '/conversations/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Delete conversation',
        description: 'Delete a conversation',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.deleteConversation as any
  );

  // Add members to group
  fastify.post(
    '/conversations/:id/members',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Add members to group',
        description: 'Add new members to a group conversation',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
          },
        },
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['DIRECT', 'GROUP'] },
                  name: { type: 'string' },
                  members: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MEMBER'] },
                        joinedAt: { type: 'string' },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            username: { type: 'string' },
                            fullName: { type: 'string' },
                            avatar: { type: 'string' },
                            isVerified: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.addMembers as any
  );

  // Remove member from group
  fastify.delete(
    '/conversations/:id/members/:userId',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Remove member from group',
        description: 'Remove a member from a group conversation',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID to remove',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.removeMember as any
  );

  // Transfer admin role
  fastify.put(
    '/conversations/:id/admin',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Conversations'],
        summary: 'Transfer admin role',
        description: 'Transfer admin role to another member',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Conversation ID',
            },
          },
        },
        body: {
          type: 'object',
          required: ['newAdminId'],
          properties: {
            newAdminId: {
              type: 'string',
              format: 'uuid',
              description: 'New admin user ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    ConversationController.transferAdmin as any
  );
}
