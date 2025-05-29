import { FastifyInstance } from 'fastify';
import { HashtagController } from '../controllers/hashtag';
import { authenticate, optionalAuth } from '../middleware/auth';

export async function hashtagRoutes(fastify: FastifyInstance) {
  // Get trending hashtags
  fastify.get(
    '/',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Hashtags'],
        summary: 'Get trending hashtags',
        description: 'Get list of trending hashtags',
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
                  hashtags: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        postsCount: { type: 'number' },
                        createdAt: { type: 'string' },
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
    HashtagController.getTrendingHashtags as any
  );

  // Get hashtag details
  fastify.get(
    '/:name',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Hashtags'],
        summary: 'Get hashtag details',
        description: 'Get details of a specific hashtag',
        params: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Hashtag name (without #)',
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
                  name: { type: 'string' },
                  postsCount: { type: 'number' },
                  createdAt: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    HashtagController.getHashtagDetails as any
  );

  // Get posts with hashtag
  fastify.get(
    '/:name/posts',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Hashtags'],
        summary: 'Get posts with hashtag',
        description: 'Get all posts that use a specific hashtag',
        params: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              description: 'Hashtag name (without #)',
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
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        caption: { type: 'string' },
                        location: { type: 'string' },
                        likesCount: { type: 'number' },
                        commentsCount: { type: 'number' },
                        createdAt: { type: 'string' },
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
                        media: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              url: { type: 'string' },
                              type: { type: 'string' },
                              width: { type: 'number' },
                              height: { type: 'number' },
                            },
                          },
                        },
                        isLiked: { type: 'boolean' },
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
    HashtagController.getHashtagPosts as any
  );

  // Search hashtags
  fastify.get(
    '/search',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Hashtags'],
        summary: 'Search hashtags',
        description: 'Search for hashtags by name',
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: {
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
                  hashtags: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        postsCount: { type: 'number' },
                        createdAt: { type: 'string' },
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
    HashtagController.searchHashtags as any
  );

  // Get hashtag suggestions
  fastify.get(
    '/suggestions',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Hashtags'],
        summary: 'Get hashtag suggestions',
        description:
          'Get personalized hashtag suggestions based on user activity',
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
                  hashtags: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        postsCount: { type: 'number' },
                        createdAt: { type: 'string' },
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
    HashtagController.getHashtagSuggestions as any
  );
}
