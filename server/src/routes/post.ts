import { FastifyInstance } from 'fastify';
import { PostController } from '../controllers/post';
import { CommentController } from '../controllers/comment';
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

  // Add comment to post
  fastify.post(
    '/:id/comments',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000), // 20 comments per 15 minutes
        validationMiddlewares.validateId,
      ],
      schema: {
        tags: ['Comments'],
        summary: 'Add comment to post',
        description: 'Add a comment to a post',
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
    CommentController.addComment as any
  );

  // Get post comments
  fastify.get(
    '/:id/comments',
    {
      preHandler: [validationMiddlewares.validateId],
      schema: {
        tags: ['Comments'],
        summary: 'Get post comments',
        description: 'Get comments for a post',
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
                  comments: {
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
                        repliesCount: { type: 'integer' },
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
    CommentController.getPostComments as any
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

  // Upload post media
  fastify.post(
    '/upload',
    {
      preHandler: [
        authenticate,
        userRateLimit(10, 900000), // 10 uploads per 15 minutes
        validationMiddlewares.validatePostMedia,
      ],
      schema: {
        tags: ['Posts'],
        summary: 'Upload post media',
        description: 'Upload media for a post',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'AUDIO'] },
                  width: { type: 'number' },
                  height: { type: 'number' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.uploadMedia as any
  );

  // Add media to post
  fastify.post(
    '/:id/media',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000), // 20 media additions per 15 minutes
        validationMiddlewares.validateId,
      ],
      schema: {
        tags: ['Posts'],
        summary: 'Add media to post',
        description: 'Add media to an existing post',
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
          required: ['url', 'type'],
          properties: {
            url: {
              type: 'string',
              description: 'Media URL',
            },
            type: {
              type: 'string',
              enum: ['IMAGE', 'VIDEO', 'AUDIO'],
              description: 'Media type',
            },
            width: {
              type: 'number',
              description: 'Media width (for images)',
            },
            height: {
              type: 'number',
              description: 'Media height (for images)',
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
                  postId: { type: 'string' },
                  url: { type: 'string' },
                  type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'AUDIO'] },
                  width: { type: 'number' },
                  height: { type: 'number' },
                  order: { type: 'number' },
                  createdAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.addMedia as any
  );

  // Remove media from post
  fastify.delete(
    '/:id/media/:mediaId',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Remove media from post',
        description: 'Remove media from a post',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'mediaId'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Post ID',
            },
            mediaId: {
              type: 'string',
              format: 'uuid',
              description: 'Media ID',
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
    PostController.removeMedia as any
  );

  // Like a post
  fastify.post(
    '/:id/like',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Like a post',
        description: 'Like a post',
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
    PostController.likePost as any
  );

  // Unlike a post
  fastify.delete(
    '/:id/like',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Unlike a post',
        description: 'Unlike a post',
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
    PostController.unlikePost as any
  );

  // Get post likes count
  fastify.get(
    '/:id/likes',
    {
      preHandler: [validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Get post likes count',
        description: 'Get the number of likes for a post',
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
              data: {
                type: 'object',
                properties: {
                  likesCount: { type: 'integer' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    PostController.getPostLikes as any
  );

  // Get users who liked post
  fastify.get(
    '/:id/likers',
    {
      preHandler: [validationMiddlewares.validateId],
      schema: {
        tags: ['Posts'],
        summary: 'Get post likers',
        description: 'Get users who liked a post',
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
                  users: {
                    type: 'array',
                    items: {
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
    PostController.getPostLikers as any
  );
}
