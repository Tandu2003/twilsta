import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import { ApiResponse } from '../types';
import { CloudinaryService } from '../config/cloudinary';
import logger from '../utils/logger';
import { ReactionType } from '@prisma/client';

export class StoryController {
  // Create new story
  static async createStory(
    request: FastifyRequest<{
      Body: {
        mediaUrl: string;
        mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO';
        text?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { mediaUrl, mediaType, text } = request.body;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create story with 24-hour expiration
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const story = await prisma.story.create({
        data: {
          userId,
          mediaUrl,
          mediaType,
          text,
          expiresAt,
        },
      });

      return reply.status(201).send({
        success: true,
        message: 'Story created successfully',
        data: story,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error creating story:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to create story',
        error: 'CREATE_STORY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get current user's stories
  static async getCurrentUserStories(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const stories = await prisma.story.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send({
        success: true,
        data: { stories },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting current user stories:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get stories',
        error: 'GET_STORIES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user's stories
  static async getUserStories(
    request: FastifyRequest<{
      Params: { userId: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { userId } = request.params;
      const currentUserId = request.user?.id;

      if (!currentUserId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const stories = await prisma.story.findMany({
        where: {
          userId,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          views: {
            where: {
              userId: currentUserId,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Add isViewed flag
      const storiesWithViewStatus = stories.map((story) => ({
        ...story,
        isViewed: story.views.length > 0,
      }));

      return reply.send({
        success: true,
        data: { stories: storiesWithViewStatus },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting user stories:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get stories',
        error: 'GET_STORIES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get stories feed
  static async getStoriesFeed(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const currentUserId = request.user?.id;

      if (!currentUserId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get followed users
      const followedUsers = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
        },
        select: {
          followingId: true,
        },
      });

      const followedUserIds = followedUsers.map((f) => f.followingId);

      // Get stories from followed users
      const stories = await prisma.story.findMany({
        where: {
          userId: {
            in: followedUserIds,
          },
          expiresAt: {
            gt: new Date(),
          },
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
          views: {
            where: {
              userId: currentUserId,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Add isViewed flag
      const storiesWithViewStatus = stories.map((story) => ({
        ...story,
        isViewed: story.views.length > 0,
      }));

      return reply.send({
        success: true,
        data: { stories: storiesWithViewStatus },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error getting stories feed:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get stories feed',
        error: 'GET_STORIES_FEED_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete story
  static async deleteStory(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story exists and belongs to user
      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return reply.status(404).send({
          success: false,
          message: 'Story not found',
          error: 'STORY_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (story.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Not authorized to delete this story',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete story
      await prisma.story.delete({
        where: { id },
      });

      return reply.send({
        success: true,
        message: 'Story deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error deleting story:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to delete story',
        error: 'DELETE_STORY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Upload story media
  static async uploadMedia(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const data = (await request.file()) as any;
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file uploaded',
          error: 'NO_FILE_UPLOADED',
          timestamp: new Date().toISOString(),
        });
      }

      // Upload media
      const mediaResult = await CloudinaryService.uploadFile(
        data,
        {
          folder: 'stories',
        },
        'story'
      );

      return reply.status(201).send({
        success: true,
        message: 'Media uploaded successfully',
        data: mediaResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error uploading story media:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to upload media',
        error: 'UPLOAD_MEDIA_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Mark story as viewed
  static async markStoryAsViewed(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story exists
      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return reply.status(404).send({
          success: false,
          message: 'Story not found',
          error: 'STORY_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story has expired
      if (story.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          message: 'Story has expired',
          error: 'STORY_EXPIRED',
          timestamp: new Date().toISOString(),
        });
      }

      // Add view
      await prisma.storyView.upsert({
        where: {
          storyId_userId: {
            storyId: id,
            userId,
          },
        },
        create: {
          storyId: id,
          userId,
        },
        update: {
          viewedAt: new Date(),
        },
      });

      return reply.send({
        success: true,
        message: 'Story marked as viewed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error marking story as viewed:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to mark story as viewed',
        error: 'MARK_STORY_VIEWED_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get story viewers
  static async getStoryViewers(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { id } = request.params;
      const page = Number(request.query.page) || 1;
      const limit = Number(request.query.limit) || 10;
      const skip = (page - 1) * limit;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story exists and belongs to user
      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return reply.status(404).send({
          success: false,
          message: 'Story not found',
          error: 'STORY_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (story.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Not authorized to view story viewers',
          error: 'NOT_AUTHORIZED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get total viewers count
      const total = await prisma.storyView.count({
        where: { storyId: id },
      });

      // Get viewers with pagination
      const views = await prisma.storyView.findMany({
        where: { storyId: id },
        select: {
          id: true,
          userId: true,
          viewedAt: true,
        },
        orderBy: {
          viewedAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get user details for each view
      const viewers = await Promise.all(
        views.map(async (view) => {
          const user = await prisma.user.findUnique({
            where: { id: view.userId },
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
            },
          });
          return {
            ...user,
            viewedAt: view.viewedAt,
          };
        })
      );

      return reply.send({
        success: true,
        data: {
          viewers,
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
      logger.error('Error getting story viewers:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get story viewers',
        error: 'GET_STORY_VIEWERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // React to story
  static async reactToStory(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { reaction: ReactionType };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<any>> {
    try {
      const { id } = request.params;
      const { reaction: reactionType } = request.body;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story exists
      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return reply.status(404).send({
          success: false,
          message: 'Story not found',
          error: 'STORY_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if story has expired
      if (story.expiresAt < new Date()) {
        return reply.status(400).send({
          success: false,
          message: 'Story has expired',
          error: 'STORY_EXPIRED',
          timestamp: new Date().toISOString(),
        });
      }

      // Add or update reaction
      const storyReaction = await prisma.storyReaction.upsert({
        where: {
          storyId_userId: {
            storyId: id,
            userId,
          },
        },
        create: {
          storyId: id,
          userId,
          reaction: reactionType,
        },
        update: {
          reaction: reactionType,
        },
      });

      return reply.send({
        success: true,
        message: 'Reaction added successfully',
        data: storyReaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Error reacting to story:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to react to story',
        error: 'REACT_TO_STORY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
