import { FastifyInstance } from 'fastify';
import { MessageController } from '../controllers/message';
import { authenticate } from '../middleware/auth';
import { validationMiddlewares } from '../middleware/validation';

export async function messageRoutes(fastify: FastifyInstance) {
  // Get conversation messages
  fastify.get(
    '/conversations/:id/messages',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Get conversation messages',
        description: 'Get messages from a conversation',
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
        querystring: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              default: 1,
            },
            limit: {
              type: 'number',
              default: 20,
            },
          },
        },
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
                    content: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'],
                    },
                    isEdited: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
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
                    replyTo: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
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
                    reactions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          emoji: { type: 'string' },
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
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    MessageController.getMessages as any
  );

  // Send message
  fastify.post(
    '/conversations/:id/messages',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Send message',
        description: 'Send a new message to a conversation',
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
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
            },
            type: {
              type: 'string',
              enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'],
              default: 'TEXT',
            },
            replyToId: {
              type: 'string',
              format: 'uuid',
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
                  content: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'],
                  },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
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
                  replyTo: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
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
    MessageController.sendMessage as any
  );

  // Edit message
  fastify.put(
    '/messages/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Edit message',
        description: 'Edit an existing message',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Message ID',
            },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
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
                  content: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'],
                  },
                  isEdited: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
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
                  replyTo: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
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
    MessageController.editMessage as any
  );

  // Delete message
  fastify.delete(
    '/messages/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Delete message',
        description: 'Delete a message',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Message ID',
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
    MessageController.deleteMessage as any
  );

  // React to message
  fastify.post(
    '/messages/:id/react',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'React to message',
        description: 'Add a reaction to a message',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Message ID',
            },
          },
        },
        body: {
          type: 'object',
          required: ['emoji'],
          properties: {
            emoji: {
              type: 'string',
              minLength: 1,
              maxLength: 8,
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
                  emoji: { type: 'string' },
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
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    MessageController.reactToMessage as any
  );

  // Remove reaction
  fastify.delete(
    '/messages/:id/react',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Remove reaction',
        description: 'Remove a reaction from a message',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Reaction ID',
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
    MessageController.removeReaction as any
  );

  // Mark message as read
  fastify.post(
    '/messages/:id/read',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Messages'],
        summary: 'Mark message as read',
        description: 'Mark a message as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Message ID',
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
    MessageController.markAsRead as any
  );

  // Send text message
  fastify.post(
    '/messages/text',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Send text message',
        description: 'Send a text message to a conversation',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['conversationId', 'content'],
          properties: {
            conversationId: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
              minLength: 1,
              maxLength: 1000,
            },
            replyToId: {
              type: 'string',
              format: 'uuid',
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
                  content: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
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
    MessageController.sendTextMessage as any
  );

  // Send image message
  fastify.post(
    '/messages/image',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Send image message',
        description: 'Send an image message to a conversation',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  mediaUrl: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
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
    MessageController.sendImageMessage as any
  );

  // Send video message
  fastify.post(
    '/messages/video',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Send video message',
        description: 'Send a video message to a conversation',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  mediaUrl: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
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
    MessageController.sendVideoMessage as any
  );

  // Send audio message
  fastify.post(
    '/messages/audio',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Send audio message',
        description: 'Send an audio message to a conversation',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  mediaUrl: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
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
    MessageController.sendAudioMessage as any
  );

  // Send location message
  fastify.post(
    '/messages/location',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Send location message',
        description: 'Send a location message to a conversation',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['conversationId', 'latitude', 'longitude'],
          properties: {
            conversationId: {
              type: 'string',
              format: 'uuid',
            },
            latitude: {
              type: 'number',
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: 'number',
              minimum: -180,
              maximum: 180,
            },
            address: {
              type: 'string',
            },
            replyToId: {
              type: 'string',
              format: 'uuid',
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
                  content: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
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
    MessageController.sendLocationMessage as any
  );

  // Share post via message
  fastify.post(
    '/messages/post-share',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Messages'],
        summary: 'Share post via message',
        description: 'Share a post via message to a conversation',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['conversationId', 'postId'],
          properties: {
            conversationId: {
              type: 'string',
              format: 'uuid',
            },
            postId: {
              type: 'string',
              format: 'uuid',
            },
            message: {
              type: 'string',
              maxLength: 500,
            },
            replyToId: {
              type: 'string',
              format: 'uuid',
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
                  content: { type: 'string' },
                  messageType: { type: 'string' },
                  createdAt: { type: 'string' },
                  sender: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      fullName: { type: 'string' },
                      avatar: { type: 'string' },
                    },
                  },
                  sharedPost: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      caption: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          username: { type: 'string' },
                          fullName: { type: 'string' },
                          avatar: { type: 'string' },
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
    MessageController.sharePost as any
  );
}
