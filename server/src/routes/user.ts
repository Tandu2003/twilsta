import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user';
import { authenticate, userRateLimit } from '../middleware/auth';
import { validationMiddlewares } from '../middleware/validation';

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
}
