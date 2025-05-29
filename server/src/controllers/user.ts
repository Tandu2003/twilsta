import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../config/database';
import { PasswordUtils, ObjectUtils } from '../utils/helpers';
import { CloudinaryService } from '../config/cloudinary';
import logger, { loggerHelpers } from '../utils/logger';
import type {
  UpdateUserRequest,
  ApiResponse,
  UserProfile,
  UploadedFile,
} from '../types';

export class UserController {
  // Get current user profile
  static async getCurrentUser(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<UserProfile>> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          bio: true,
          avatar: true,
          website: true,
          phone: true,
          isVerified: true,
          isPrivate: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'User profile retrieved successfully',
        data: { ...user, isOwnProfile: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_current_user',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get user profile',
        error: 'GET_USER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update current user profile
  static async updateCurrentUser(
    request: FastifyRequest<{ Body: UpdateUserRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<UserProfile>> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const updateData = request.body;

      // Check if username is being changed and if it's available
      if (updateData.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            username: updateData.username,
            NOT: { id: request.user.id },
          },
        });

        if (existingUser) {
          return reply.status(409).send({
            success: false,
            message: 'Username already exists',
            error: 'USERNAME_EXISTS',
            timestamp: new Date().toISOString(),
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: request.user.id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          bio: true,
          avatar: true,
          website: true,
          phone: true,
          isVerified: true,
          isPrivate: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      loggerHelpers.logAuth('user_profile_updated', request.user.id, {
        updatedFields: Object.keys(updateData),
      });

      return reply.status(200).send({
        success: true,
        message: 'Profile updated successfully',
        data: { ...updatedUser, isOwnProfile: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'update_current_user',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to update profile',
        error: 'UPDATE_USER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete current user account
  static async deleteCurrentUser(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get user data before deletion for cleanup
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { avatar: true, username: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete user (cascade will handle related data)
      await prisma.user.delete({
        where: { id: request.user.id },
      });

      // Clean up avatar from cloud storage if exists
      if (user.avatar) {
        try {
          await CloudinaryService.deleteFile(user.avatar);
        } catch (error) {
          logger.error('Failed to delete avatar from cloud storage:', error);
        }
      }

      loggerHelpers.logAuth('user_account_deleted', request.user.id, {
        username: user.username,
      });

      return reply.status(200).send({
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'delete_current_user',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to delete account',
        error: 'DELETE_USER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user profile by ID
  static async getUserById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const { id } = request.params;
      const currentUserId = request.user?.id;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          fullName: true,
          bio: true,
          avatar: true,
          website: true,
          isVerified: true,
          isPrivate: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check follow relationship if user is authenticated
      let isFollowing = false;
      let isFollower = false;

      if (currentUserId && currentUserId !== id) {
        const followRelations = await prisma.follow.findMany({
          where: {
            OR: [
              { followerId: currentUserId, followingId: id },
              { followerId: id, followingId: currentUserId },
            ],
          },
        });

        isFollowing = followRelations.some(
          (f) => f.followerId === currentUserId && f.followingId === id
        );
        isFollower = followRelations.some(
          (f) => f.followerId === id && f.followingId === currentUserId
        );
      }

      const userProfile: UserProfile = {
        ...user,
        isFollowing,
        isFollower,
        isOwnProfile: currentUserId === id,
      };

      return reply.status(200).send({
        success: true,
        message: 'User profile retrieved successfully',
        data: userProfile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_user_by_id',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get user profile',
        error: 'GET_USER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user by username
  static async getUserByUsername(
    request: FastifyRequest<{ Params: { username: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<UserProfile>> {
    try {
      const { username } = request.params;
      const currentUserId = request.user?.id;

      const user = await prisma.user.findUnique({
        where: { username },
        select: {
          id: true,
          username: true,
          fullName: true,
          bio: true,
          avatar: true,
          website: true,
          isVerified: true,
          isPrivate: true,
          postsCount: true,
          followersCount: true,
          followingCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check follow relationship if user is authenticated
      let isFollowing = false;
      let isFollower = false;

      if (currentUserId && currentUserId !== user.id) {
        const followRelations = await prisma.follow.findMany({
          where: {
            OR: [
              { followerId: currentUserId, followingId: user.id },
              { followerId: user.id, followingId: currentUserId },
            ],
          },
        });

        isFollowing = followRelations.some(
          (f) => f.followerId === currentUserId && f.followingId === user.id
        );
        isFollower = followRelations.some(
          (f) => f.followerId === user.id && f.followingId === currentUserId
        );
      }

      const userProfile: UserProfile = {
        ...user,
        isFollowing,
        isFollower,
        isOwnProfile: currentUserId === user.id,
      };

      return reply.status(200).send({
        success: true,
        message: 'User profile retrieved successfully',
        data: userProfile,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_user_by_username',
        userId: request.user?.id,
        targetUsername: request.params?.username,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get user profile',
        error: 'GET_USER_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Upload profile avatar
  static async uploadAvatar(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ avatar: string }>> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Handle multipart file upload
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'No file uploaded',
          error: 'NO_FILE',
          timestamp: new Date().toISOString(),
        });
      }

      // Upload to Cloudinary using stream
      const uploadResult = await CloudinaryService.uploadFile(
        data.file,
        {
          folder: 'avatars',
          public_id: `avatar_${request.user.id}`,
          overwrite: true,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
            { quality: 'auto' },
          ],
        },
        'profile'
      );

      // Get current user to check for existing avatar
      const currentUser = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { avatar: true },
      });

      // Update user avatar
      const updatedUser = await prisma.user.update({
        where: { id: request.user.id },
        data: { avatar: uploadResult.url },
        select: { avatar: true },
      });

      // Delete old avatar if different
      if (currentUser?.avatar && currentUser.avatar !== uploadResult.url) {
        try {
          await CloudinaryService.deleteFile(currentUser.avatar);
        } catch (error) {
          logger.error('Failed to delete old avatar:', error);
        }
      }

      loggerHelpers.logAuth('avatar_uploaded', request.user.id);

      return reply.status(200).send({
        success: true,
        message: 'Avatar uploaded successfully',
        data: { avatar: updatedUser.avatar! },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'upload_avatar',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to upload avatar',
        error: 'UPLOAD_AVATAR_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Remove profile avatar
  static async removeAvatar(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get current avatar
      const user = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { avatar: true },
      });

      if (!user?.avatar) {
        return reply.status(404).send({
          success: false,
          message: 'No avatar to remove',
          error: 'NO_AVATAR',
          timestamp: new Date().toISOString(),
        });
      }

      // Remove avatar from database
      await prisma.user.update({
        where: { id: request.user.id },
        data: { avatar: null },
      });

      // Delete from cloud storage
      try {
        await CloudinaryService.deleteFile(user.avatar);
      } catch (error) {
        logger.error('Failed to delete avatar from cloud storage:', error);
      }

      loggerHelpers.logAuth('avatar_removed', request.user.id);

      return reply.status(200).send({
        success: true,
        message: 'Avatar removed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'remove_avatar',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to remove avatar',
        error: 'REMOVE_AVATAR_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Search users by name/username
  static async search(
    request: FastifyRequest<{
      Querystring: {
        query: string;
        page?: number;
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { query, page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;

      // Search users by username or fullName
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
        },
        skip,
        take: limit,
        orderBy: {
          followersCount: 'desc',
        },
      });

      const total = await prisma.user.count({
        where: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
          ],
        },
      });

      return reply.send({
        success: true,
        data: {
          users,
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
      loggerHelpers.logError(error as Error, {
        action: 'search_users',
        query: request.query,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to search users',
        error: 'SEARCH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get follow suggestions
  static async getSuggestions(
    request: FastifyRequest<{
      Querystring: {
        limit?: number;
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { limit = 10 } = request.query;
      const userId = request.user?.id;

      // Get users that the current user is not following
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { isPrivate: false }, // Only suggest public profiles
            { id: { not: userId } }, // Exclude current user
            // Exclude users that the current user is already following
            {
              followers: {
                none: {
                  followerId: userId,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
        },
        take: limit,
        orderBy: [{ followersCount: 'desc' }, { postsCount: 'desc' }],
      });

      return reply.send({
        success: true,
        data: { users },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_suggestions',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get suggestions',
        error: 'SUGGESTIONS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get trending users
  static async getTrending(
    request: FastifyRequest<{
      Querystring: {
        limit?: number;
        period?: 'day' | 'week' | 'month';
      };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { limit = 10, period = 'week' } = request.query;

      // Calculate date range based on period
      const now = new Date();
      const startDate = new Date();
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      // Get trending users based on follower growth and engagement
      const users = await prisma.user.findMany({
        where: {
          isPrivate: false, // Only show public profiles
          // Add more conditions based on your trending algorithm
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
          // Add more fields if needed
        },
        take: limit,
        orderBy: [{ followersCount: 'desc' }, { postsCount: 'desc' }],
      });

      return reply.send({
        success: true,
        data: { users },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_trending',
        period: request.query.period,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get trending users',
        error: 'TRENDING_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Follow a user
  static async followUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const followerId = request.user.id;

      // Check if trying to follow self
      if (id === followerId) {
        return reply.status(400).send({
          success: false,
          message: 'Cannot follow yourself',
          error: 'INVALID_OPERATION',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user exists
      const userToFollow = await prisma.user.findUnique({
        where: { id },
        select: { id: true, isPrivate: true },
      });

      if (!userToFollow) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId: id,
          },
        },
      });

      if (existingFollow) {
        return reply.status(409).send({
          success: false,
          message: 'Already following this user',
          error: 'ALREADY_FOLLOWING',
          timestamp: new Date().toISOString(),
        });
      }

      // Create follow relationship
      await prisma.follow.create({
        data: {
          followerId,
          followingId: id,
        },
      });

      // Update follower counts
      await prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id },
        data: { followersCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('user_followed', followerId, {
        targetUserId: id,
      });

      return reply.status(200).send({
        success: true,
        message: 'Successfully followed user',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'follow_user',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to follow user',
        error: 'FOLLOW_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Unfollow a user
  static async unfollowUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const followerId = request.user.id;

      // Check if trying to unfollow self
      if (id === followerId) {
        return reply.status(400).send({
          success: false,
          message: 'Cannot unfollow yourself',
          error: 'INVALID_OPERATION',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if follow relationship exists
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId: id,
          },
        },
      });

      if (!follow) {
        return reply.status(404).send({
          success: false,
          message: 'Not following this user',
          error: 'NOT_FOLLOWING',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete follow relationship
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: id,
          },
        },
      });

      // Update follower counts
      await prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      });

      await prisma.user.update({
        where: { id },
        data: { followersCount: { decrement: 1 } },
      });

      loggerHelpers.logAuth('user_unfollowed', followerId, {
        targetUserId: id,
      });

      return reply.status(200).send({
        success: true,
        message: 'Successfully unfollowed user',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'unfollow_user',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to unfollow user',
        error: 'UNFOLLOW_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user's followers
  static async getFollowers(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;
      const currentUserId = request.user?.id;

      // Get user's followers
      const followers = await prisma.user.findMany({
        where: {
          following: {
            some: {
              followingId: id,
            },
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
        },
        skip,
        take: limit,
        orderBy: {
          followersCount: 'desc',
        },
      });

      // Get total count
      const total = await prisma.user.count({
        where: {
          following: {
            some: {
              followingId: id,
            },
          },
        },
      });

      // Add isFollowing flag if user is authenticated
      if (currentUserId) {
        const followRelations = await prisma.follow.findMany({
          where: {
            followerId: currentUserId,
            followingId: {
              in: followers.map((f) => f.id),
            },
          },
        });

        followers.forEach((follower) => {
          (follower as any).isFollowing = followRelations.some(
            (f) => f.followingId === follower.id
          );
        });
      }

      return reply.send({
        success: true,
        data: {
          followers,
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
      loggerHelpers.logError(error as Error, {
        action: 'get_followers',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get followers',
        error: 'GET_FOLLOWERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user's following
  static async getFollowing(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;
      const currentUserId = request.user?.id;

      // Get user's following
      const following = await prisma.user.findMany({
        where: {
          followers: {
            some: {
              followerId: id,
            },
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
        },
        skip,
        take: limit,
        orderBy: {
          followersCount: 'desc',
        },
      });

      // Get total count
      const total = await prisma.user.count({
        where: {
          followers: {
            some: {
              followerId: id,
            },
          },
        },
      });

      // Add isFollowing flag if user is authenticated
      if (currentUserId) {
        const followRelations = await prisma.follow.findMany({
          where: {
            followerId: currentUserId,
            followingId: {
              in: following.map((f) => f.id),
            },
          },
        });

        following.forEach((user) => {
          (user as any).isFollowing = followRelations.some(
            (f) => f.followingId === user.id
          );
        });
      }

      return reply.send({
        success: true,
        data: {
          following,
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
      loggerHelpers.logError(error as Error, {
        action: 'get_following',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get following',
        error: 'GET_FOLLOWING_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get mutual followers
  static async getMutualFollowers(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          message: 'Authentication required',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      const { id } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;
      const currentUserId = request.user.id;

      // Get mutual followers
      const mutualFollowers = await prisma.user.findMany({
        where: {
          AND: [
            {
              followers: {
                some: {
                  followerId: currentUserId,
                },
              },
            },
            {
              followers: {
                some: {
                  followerId: id,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          bio: true,
          followersCount: true,
          followingCount: true,
          postsCount: true,
          isVerified: true,
        },
        skip,
        take: limit,
        orderBy: {
          followersCount: 'desc',
        },
      });

      // Get total count
      const total = await prisma.user.count({
        where: {
          AND: [
            {
              followers: {
                some: {
                  followerId: currentUserId,
                },
              },
            },
            {
              followers: {
                some: {
                  followerId: id,
                },
              },
            },
          ],
        },
      });

      // Add isFollowing flag
      const followRelations = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: {
            in: mutualFollowers.map((f) => f.id),
          },
        },
      });

      mutualFollowers.forEach((user) => {
        (user as any).isFollowing = followRelations.some(
          (f) => f.followingId === user.id
        );
      });

      return reply.send({
        success: true,
        data: {
          mutualFollowers,
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
      loggerHelpers.logError(error as Error, {
        action: 'get_mutual_followers',
        userId: request.user?.id,
        targetUserId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get mutual followers',
        error: 'GET_MUTUAL_FOLLOWERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
