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
}
