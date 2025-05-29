import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ApiResponse, Hashtag } from '../types';
import { ValidationUtils } from '../utils/helpers';
import logger from '../utils/logger';

export class HashtagController {
  // Get trending hashtags
  static async getTrendingHashtags(
    request: FastifyRequest<{
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ hashtags: Hashtag[]; pagination: any }>> {
    try {
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.hashtag.count();

      // Get trending hashtags (sorted by postsCount)
      const hashtags = await prisma.hashtag.findMany({
        skip,
        take: limit,
        orderBy: {
          postsCount: 'desc',
        },
      });

      return reply.send({
        success: true,
        data: {
          hashtags,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting trending hashtags:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get trending hashtags',
        error: 'GET_TRENDING_HASHTAGS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get hashtag details
  static async getHashtagDetails(
    request: FastifyRequest<{
      Params: { name: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<Hashtag>> {
    try {
      const { name } = request.params;
      const sanitizedName = ValidationUtils.sanitizeHashtag(name);

      const hashtag = await prisma.hashtag.findUnique({
        where: { name: sanitizedName },
      });

      if (!hashtag) {
        return reply.status(404).send({
          success: false,
          message: 'Hashtag not found',
          error: 'HASHTAG_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: hashtag,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting hashtag details:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get hashtag details',
        error: 'GET_HASHTAG_DETAILS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get posts with hashtag
  static async getHashtagPosts(
    request: FastifyRequest<{
      Params: { name: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ posts: any[]; pagination: any }>> {
    try {
      const { name } = request.params;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;
      const skip = (page - 1) * limit;
      const sanitizedName = ValidationUtils.sanitizeHashtag(name);

      // Get hashtag
      const hashtag = await prisma.hashtag.findUnique({
        where: { name: sanitizedName },
      });

      if (!hashtag) {
        return reply.status(404).send({
          success: false,
          message: 'Hashtag not found',
          error: 'HASHTAG_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Get total posts count
      const total = await prisma.postHashtag.count({
        where: { hashtagId: hashtag.id },
      });

      // Get posts with hashtag
      const posts = await prisma.post.findMany({
        where: {
          hashtags: {
            some: {
              hashtagId: hashtag.id,
            },
          },
          isArchived: false,
        },
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
          media: true,
          likes: {
            select: {
              userId: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Add isLiked flag if user is authenticated
      const currentUserId = request.user?.id;
      if (currentUserId) {
        posts.forEach((post: any) => {
          post.isLiked = post.likes.some(
            (like: any) => like.userId === currentUserId
          );
        });
      }

      return reply.send({
        success: true,
        data: {
          posts,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting hashtag posts:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get hashtag posts',
        error: 'GET_HASHTAG_POSTS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Search hashtags
  static async searchHashtags(
    request: FastifyRequest<{
      Querystring: { q: string; page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ hashtags: Hashtag[]; pagination: any }>> {
    try {
      const { q } = request.query;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;
      const skip = (page - 1) * limit;
      const sanitizedQuery = ValidationUtils.sanitizeHashtag(q);

      // Get total count
      const total = await prisma.hashtag.count({
        where: {
          name: {
            contains: sanitizedQuery,
            mode: 'insensitive',
          },
        },
      });

      // Search hashtags
      const hashtags = await prisma.hashtag.findMany({
        where: {
          name: {
            contains: sanitizedQuery,
            mode: 'insensitive',
          },
        },
        skip,
        take: limit,
        orderBy: {
          postsCount: 'desc',
        },
      });

      return reply.send({
        success: true,
        data: {
          hashtags,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error searching hashtags:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to search hashtags',
        error: 'SEARCH_HASHTAGS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get hashtag suggestions
  static async getHashtagSuggestions(
    request: FastifyRequest<{
      Querystring: { limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ hashtags: Hashtag[] }>> {
    try {
      const limit = Number(request.query.limit) || 10;
      const currentUserId = request.user?.id;

      if (!currentUserId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get user's recent posts
      const recentPosts = await prisma.post.findMany({
        where: {
          userId: currentUserId,
        },
        include: {
          hashtags: {
            include: {
              hashtag: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Get last 50 posts for better suggestions
      });

      // Extract hashtags from recent posts
      const userHashtags = new Set<string>();
      recentPosts.forEach((post) => {
        post.hashtags.forEach((ph) => {
          userHashtags.add(ph.hashtag.name);
        });
      });

      // Get trending hashtags that user hasn't used
      const hashtags = await prisma.hashtag.findMany({
        where: {
          name: {
            notIn: Array.from(userHashtags),
          },
        },
        orderBy: {
          postsCount: 'desc',
        },
        take: limit,
      });

      return reply.send({
        success: true,
        data: { hashtags },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting hashtag suggestions:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get hashtag suggestions',
        error: 'GET_HASHTAG_SUGGESTIONS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
