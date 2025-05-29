import { FastifyInstance } from 'fastify';
import { CommentController } from '../controllers/comment';
import { authenticate, userRateLimit } from '../middleware/auth';
import { validationMiddlewares } from '../middleware/validation';

export async function commentRoutes(fastify: FastifyInstance) {
  // Update comment
  fastify.put(
    '/comments/:id',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000), // 20 updates per 15 minutes
        validationMiddlewares.validateId,
      ],
      schema: {
        tags: ['Comments'],
        summary: 'Update comment',
        description: 'Update a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
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
              description: 'Comment content',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
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
    CommentController.updateComment as any
  );

  // Delete comment
  fastify.delete(
    '/comments/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Comments'],
        summary: 'Delete comment',
        description: 'Delete a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
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
    CommentController.deleteComment as any
  );

  // Reply to comment
  fastify.post(
    '/comments/:id/reply',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000), // 20 replies per 15 minutes
        validationMiddlewares.validateId,
      ],
      schema: {
        tags: ['Comments'],
        summary: 'Reply to comment',
        description: 'Add a reply to a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
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
              description: 'Reply content',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
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
    CommentController.replyToComment as any
  );

  // Get comment replies
  fastify.get(
    '/comments/:id/replies',
    {
      preHandler: [validationMiddlewares.validateId],
      schema: {
        tags: ['Comments'],
        summary: 'Get comment replies',
        description: 'Get replies for a comment',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
            },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 20,
              description: 'Results per page',
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
                  replies: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                        isLiked: { type: 'boolean' },
                        likesCount: { type: 'integer' },
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
                  pagination: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' },
                      pages: { type: 'integer' },
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
    CommentController.getCommentReplies as any
  );

  // Like a comment
  fastify.post(
    '/comments/:id/like',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Comments'],
        summary: 'Like a comment',
        description: 'Like a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
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
    CommentController.likeComment as any
  );

  // Unlike a comment
  fastify.delete(
    '/comments/:id/like',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Comments'],
        summary: 'Unlike a comment',
        description: 'Unlike a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Comment ID',
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
    CommentController.unlikeComment as any
  );
}
