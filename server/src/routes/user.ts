import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user';
import { authenticate, userRateLimit, optionalAuth } from '../middleware/auth';
import { validationMiddlewares, userSchemas } from '../middleware/validation';

export async function userRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get current user profile',
        description: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
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
                  username: { type: 'string' },
                  email: { type: 'string' },
                  fullName: { type: 'string' },
                  bio: { type: 'string' },
                  avatar: { type: 'string' },
                  website: { type: 'string' },
                  phone: { type: 'string' },
                  isVerified: { type: 'boolean' },
                  isPrivate: { type: 'boolean' },
                  postsCount: { type: 'number' },
                  followersCount: { type: 'number' },
                  followingCount: { type: 'number' },
                  isOwnProfile: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.getCurrentUser
  );

  // Update current user profile
  fastify.put(
    '/me',
    {
      preHandler: [
        authenticate,
        userRateLimit(20, 900000),
        validationMiddlewares.updateProfile,
      ],
      schema: {
        tags: ['Users'],
        summary: 'Update current user profile',
        description: 'Update the authenticated user profile',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Full name',
            },
            bio: {
              type: 'string',
              maxLength: 500,
              description: 'Biography',
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Website URL',
            },
            phone: {
              type: 'string',
              pattern: '^\\+?[\\d\\s\\-\\(\\)]{10,}$',
              description: 'Phone number',
            },
            isPrivate: {
              type: 'boolean',
              description: 'Make account private',
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
                  username: { type: 'string' },
                  email: { type: 'string' },
                  fullName: { type: 'string' },
                  bio: { type: 'string' },
                  avatar: { type: 'string' },
                  website: { type: 'string' },
                  phone: { type: 'string' },
                  isVerified: { type: 'boolean' },
                  isPrivate: { type: 'boolean' },
                  postsCount: { type: 'number' },
                  followersCount: { type: 'number' },
                  followingCount: { type: 'number' },
                  isOwnProfile: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.updateCurrentUser as any
  );

  // Delete current user account
  fastify.delete(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Delete current user account',
        description: 'Permanently delete the authenticated user account',
        security: [{ bearerAuth: [] }],
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
    UserController.deleteCurrentUser
  );

  // Get user profile by ID
  fastify.get(
    '/:id',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Get user profile by ID',
        description: 'Get user profile by user ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID',
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
                  username: { type: 'string' },
                  fullName: { type: 'string' },
                  bio: { type: 'string' },
                  avatar: { type: 'string' },
                  website: { type: 'string' },
                  isVerified: { type: 'boolean' },
                  isPrivate: { type: 'boolean' },
                  postsCount: { type: 'number' },
                  followersCount: { type: 'number' },
                  followingCount: { type: 'number' },
                  isFollowing: { type: 'boolean' },
                  isFollower: { type: 'boolean' },
                  isOwnProfile: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.getUserById as any
  );

  // Get user by username
  fastify.get(
    '/username/:username',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get user profile by username',
        description: 'Get user profile by username',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['username'],
          properties: {
            username: {
              type: 'string',
              pattern: '^[a-zA-Z0-9._]{3,30}$',
              description: 'Username',
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
                  username: { type: 'string' },
                  fullName: { type: 'string' },
                  bio: { type: 'string' },
                  avatar: { type: 'string' },
                  website: { type: 'string' },
                  isVerified: { type: 'boolean' },
                  isPrivate: { type: 'boolean' },
                  postsCount: { type: 'number' },
                  followersCount: { type: 'number' },
                  followingCount: { type: 'number' },
                  isFollowing: { type: 'boolean' },
                  isFollower: { type: 'boolean' },
                  isOwnProfile: { type: 'boolean' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.getUserByUsername as any
  );

  // Upload profile avatar
  fastify.post(
    '/upload-avatar',
    {
      preHandler: [
        authenticate,
        userRateLimit(5, 900000),
        validationMiddlewares.validateProfileImage,
      ],
      schema: {
        tags: ['Users'],
        summary: 'Upload profile avatar',
        description: 'Upload or update profile picture',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  avatar: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.uploadAvatar
  );

  // Remove profile avatar
  fastify.delete(
    '/avatar',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Remove profile avatar',
        description: 'Remove current profile picture',
        security: [{ bearerAuth: [] }],
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
    UserController.removeAvatar
  );

  // Search users
  fastify.get(
    '/search',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Users'],
        summary: 'Search users',
        description: 'Search users by name or username',
        querystring: {
          type: 'object',
          required: ['query'],
          properties: {
            query: {
              type: 'string',
              minLength: 1,
              description: 'Search query',
            },
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
                  users: {
                    type: 'array',
                    items: userSchemas,
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
    UserController.search as any
  );

  // Get follow suggestions
  fastify.get(
    '/suggestions',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get follow suggestions',
        description: 'Get personalized user suggestions to follow',
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Number of suggestions',
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
                    items: userSchemas,
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.getSuggestions as any
  );

  // Get trending users
  fastify.get(
    '/trending',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Users'],
        summary: 'Get trending users',
        description:
          'Get trending users based on follower growth and engagement',
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 50,
              default: 10,
              description: 'Number of trending users',
            },
            period: {
              type: 'string',
              enum: ['day', 'week', 'month'],
              default: 'week',
              description: 'Time period for trending calculation',
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
                    items: userSchemas,
                  },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    UserController.getTrending as any
  );

  // Follow a user
  fastify.post(
    '/:id/follow',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Follow a user',
        description: 'Follow another user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID to follow',
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
    UserController.followUser as any
  );

  // Unfollow a user
  fastify.delete(
    '/:id/unfollow',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Unfollow a user',
        description: 'Unfollow another user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID to unfollow',
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
    UserController.unfollowUser as any
  );

  // Get user's followers
  fastify.get(
    '/:id/followers',
    {
      preHandler: [optionalAuth, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Get user followers',
        description: 'Get list of users following the specified user',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
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
                  followers: {
                    type: 'array',
                    items: userSchemas,
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
    UserController.getFollowers as any
  );

  // Get user's following
  fastify.get(
    '/:id/following',
    {
      preHandler: [optionalAuth, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Get user following',
        description: 'Get list of users that the specified user is following',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
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
                  following: {
                    type: 'array',
                    items: userSchemas,
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
    UserController.getFollowing as any
  );

  // Get current user's followers
  fastify.get(
    '/me/followers',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get current user followers',
        description: 'Get list of users following the current user',
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
                  followers: {
                    type: 'array',
                    items: userSchemas,
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
    async (request, reply) => {
      request.params = { id: request.user!.id };
      return UserController.getFollowers(request as any, reply);
    }
  );

  // Get current user's following
  fastify.get(
    '/me/following',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Users'],
        summary: 'Get current user following',
        description: 'Get list of users that the current user is following',
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
                  following: {
                    type: 'array',
                    items: userSchemas,
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
    async (request, reply) => {
      request.params = { id: request.user!.id };
      return UserController.getFollowing(request as any, reply);
    }
  );

  // Get mutual followers
  fastify.get(
    '/:id/mutual-followers',
    {
      preHandler: [authenticate, validationMiddlewares.validateId],
      schema: {
        tags: ['Users'],
        summary: 'Get mutual followers',
        description:
          'Get list of users that both the current user and specified user follow',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
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
                  mutualFollowers: {
                    type: 'array',
                    items: userSchemas,
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
    UserController.getMutualFollowers as any
  );
}
