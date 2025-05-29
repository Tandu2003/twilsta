import { FastifyInstance } from 'fastify';
import { PostController } from '../controllers/post';
import { authenticate, userRateLimit, optionalAuth } from '../middleware/auth';
import { validationMiddlewares, postSchemas } from '../middleware/validation';

export async function postRoutes(fastify: FastifyInstance) {
  // Create new post
  fastify.post(
    '/',
    {
      preHandler: [
        authenticate,
        userRateLimit(10, 900000), // 10 posts per 15 minutes
        validationMiddlewares.validatePostMedia,
      ],
      schema: {
        tags: ['Posts'],
        summary: 'Create new post',
        description: 'Create a new post with image',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            caption: {
              type: 'string',
              maxLength: 2200,
              description: 'Post caption',
            },
            location: {
              type: 'string',
              maxLength: 100,
              description: 'Location',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: postSchemas,
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.createPost as any
  );

  // Get single post
  fastify.get(
    '/:id',
    {
      preHandler: [optionalAuth, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Get single post',
        description: 'Get a post by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: postSchemas,
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.getPost as any
  );

  // Update post
  fastify.put(
    '/:id',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000),
        validationMiddlewares.validateId,
      ],
      schema: {
        tags: ['Posts'],
        summary: 'Update post',
        description: 'Update post caption and location',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
            },
          },
        },
        body: {
          type: 'object',
          properties: {
            caption: {
              type: 'string',
              maxLength: 2200,
              description: 'Post caption',
            },
            location: {
              type: 'string',
              maxLength: 100,
              description: 'Location',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: postSchemas,
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.updatePost as any
  );

  // Delete post
  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Delete post',
        description: 'Delete a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
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
    PostController.deletePost as any
  );

  // Get user's posts
  fastify.get(
    '/user/:userId',
    {
      preHandler: [optionalAuth, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Get user posts',
        description: 'Get all posts by a user',
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
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
              default: 10,
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
                  posts: {
                    type: 'array',
                    items: postSchemas,
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
    PostController.getUserPosts as any
  );

  // Get current user's posts
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Posts'],
        summary: 'Get current user posts',
        description: 'Get all posts by the current user',
        security: [{ bearerAuth: [] }],
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
              default: 10,
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
                  posts: {
                    type: 'array',
                    items: postSchemas,
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
    PostController.getCurrentUserPosts as any
  );

  // Archive post
  fastify.post(
    '/:id/archive',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Archive post',
        description: 'Archive a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
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
    PostController.archivePost as any
  );

  // Unarchive post
  fastify.delete(
    '/:id/archive',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Unarchive post',
        description: 'Unarchive a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
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
    PostController.unarchivePost as any
  );
}
