import { FastifyInstance } from 'fastify';
import { StoryController } from '../controllers/story';
import { authenticate, userRateLimit } from '../middleware/auth';
import { ReactionType } from '@prisma/client';

export async function storyRoutes(fastify: FastifyInstance) {
  // Create new story
  fastify.post(
    '/',
    {
      preHandler: [
        authenticate,
        userRateLimit(10, 900000), // 10 stories per 15 minutes
      ],
      schema: {
        tags: ['Stories'],
        summary: 'Create new story',
        description: 'Create a new story with media',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['mediaUrl', 'mediaType'],
          properties: {
            mediaUrl: {
              type: 'string',
              description: 'URL of the story media',
            },
            mediaType: {
              type: 'string',
              enum: ['IMAGE', 'VIDEO', 'AUDIO'],
              description: 'Type of media',
            },
            text: {
              type: 'string',
              maxLength: 1000,
              description: 'Optional text overlay',
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
                  mediaUrl: { type: 'string' },
                  mediaType: { type: 'string' },
                  text: { type: 'string' },
                  expiresAt: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    StoryController.createStory as any
  );

  // Get current user's stories
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Get current user stories',
        description: 'Get all stories of the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        mediaUrl: { type: 'string' },
                        mediaType: { type: 'string' },
                        text: { type: 'string' },
                        expiresAt: { type: 'string' },
                        createdAt: { type: 'string' },
                        views: { type: 'number' },
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
    StoryController.getCurrentUserStories as any
  );

  // Get user's stories
  fastify.get(
    '/user/:userId',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Get user stories',
        description: 'Get all stories of a specific user',
        security: [{ bearerAuth: [] }],
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
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        mediaUrl: { type: 'string' },
                        mediaType: { type: 'string' },
                        text: { type: 'string' },
                        expiresAt: { type: 'string' },
                        createdAt: { type: 'string' },
                        views: { type: 'number' },
                        isViewed: { type: 'boolean' },
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
    StoryController.getUserStories as any
  );

  // Get stories feed
  fastify.get(
    '/feed',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Get stories feed',
        description: 'Get stories from followed users',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        mediaUrl: { type: 'string' },
                        mediaType: { type: 'string' },
                        text: { type: 'string' },
                        expiresAt: { type: 'string' },
                        createdAt: { type: 'string' },
                        views: { type: 'number' },
                        isViewed: { type: 'boolean' },
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
    StoryController.getStoriesFeed as any
  );

  // Delete story
  fastify.delete(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Delete story',
        description: 'Delete a story',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Story ID',
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
    StoryController.deleteStory as any
  );

  // Upload story media
  fastify.post(
    '/upload',
    {
      preHandler: [
        authenticate,
        userRateLimit(10, 900000), // 10 uploads per 15 minutes
      ],
      schema: {
        tags: ['Stories'],
        summary: 'Upload story media',
        description: 'Upload media for a story',
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
    StoryController.uploadMedia as any
  );

  // Mark story as viewed
  fastify.post(
    '/:id/view',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Mark story as viewed',
        description: 'Mark a story as viewed by the current user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Story ID',
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
    StoryController.markStoryAsViewed as any
  );

  // Get story viewers
  fastify.get(
    '/:id/viewers',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'Get story viewers',
        description: 'Get list of users who viewed a story',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Story ID',
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
                  viewers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        fullName: { type: 'string' },
                        avatar: { type: 'string' },
                        isVerified: { type: 'boolean' },
                        viewedAt: { type: 'string' },
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
    StoryController.getStoryViewers as any
  );

  // React to story
  fastify.post(
    '/:id/react',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Stories'],
        summary: 'React to story',
        description: 'Add a reaction to a story',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Story ID',
            },
          },
        },
        body: {
          type: 'object',
          required: ['reaction'],
          properties: {
            reaction: {
              type: 'string',
              enum: Object.values(ReactionType),
              description: 'Reaction type',
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
                  reaction: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    StoryController.reactToStory as any
  );
}
