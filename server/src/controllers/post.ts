import { FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { prisma } from '../config/database';
import { CloudinaryService } from '../config/cloudinary';
import logger, { loggerHelpers } from '../utils/logger';
import type {
  ApiResponse,
  Post,
  CreatePostRequest,
  UpdatePostRequest,
} from '../types';

export class PostController {
  // Create new post
  static async createPost(
    request: FastifyRequest<{ Body: CreatePostRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<Post>> {
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

      const { caption, location } = request.body;

      // Upload to Cloudinary using stream
      const uploadResult = await CloudinaryService.uploadFile(
        data.file,
        {
          folder: 'posts',
          public_id: `post_${request.user.id}_${Date.now()}`,
          transformation: [
            { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
            { quality: 'auto' },
          ],
        },
        'post'
      );

      // Create post with media
      const post = await prisma.post.create({
        data: {
          caption,
          location,
          userId: request.user.id,
          media: {
            create: {
              url: uploadResult.url,
              type: 'IMAGE',
              width: 1080,
              height: 1080,
            },
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
          media: true,
        },
      });

      // Update user's post count
      await prisma.user.update({
        where: { id: request.user.id },
        data: { postsCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('post_created', request.user.id, {
        postId: post.id,
      });

      return reply.status(201).send({
        success: true,
        message: 'Post created successfully',
        data: post,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'create_post',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to create post',
        error: 'CREATE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get single post
  static async getPost(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<Post>> {
    try {
      const { id } = request.params;
      const currentUserId = request.user?.id;

      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatar: true,
              isVerified: true,
              isPrivate: true,
            },
          },
          media: true,
          likes: {
            select: {
              userId: true,
            },
          },
          comments: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user has access to the post
      if (post.user.isPrivate && currentUserId !== post.userId) {
        const isFollowing = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId!,
              followingId: post.userId,
            },
          },
        });

        if (!isFollowing) {
          return reply.status(403).send({
            success: false,
            message: 'Cannot access this post',
            error: 'ACCESS_DENIED',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Add isLiked flag if user is authenticated
      if (currentUserId) {
        (post as any).isLiked = post.likes.some(
          (like) => like.userId === currentUserId
        );
      }

      // Add likes and comments count
      (post as any).likesCount = post.likes.length;
      (post as any).commentsCount = post.comments.length;

      // Remove likes and comments arrays
      delete (post as any).likes;
      delete (post as any).comments;

      return reply.send({
        success: true,
        data: post,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get post',
        error: 'GET_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update post
  static async updatePost(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdatePostRequest;
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse<Post>> {
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
      const { caption, location } = request.body;

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot update this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Update post
      const updatedPost = await prisma.post.update({
        where: { id },
        data: {
          caption,
          location,
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
        },
      });

      loggerHelpers.logAuth('post_updated', request.user.id, {
        postId: id,
        updatedFields: Object.keys(request.body),
      });

      return reply.send({
        success: true,
        message: 'Post updated successfully',
        data: updatedPost,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'update_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to update post',
        error: 'UPDATE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete post
  static async deletePost(
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

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          media: true,
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot delete this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete post (cascade will handle related data)
      await prisma.post.delete({
        where: { id },
      });

      // Delete images from cloud storage
      try {
        for (const media of post.media) {
          await CloudinaryService.deleteFile(media.url);
        }
      } catch (error) {
        logger.error('Failed to delete post media from cloud storage:', error);
      }

      // Update user's post count
      await prisma.user.update({
        where: { id: request.user.id },
        data: { postsCount: { decrement: 1 } },
      });

      loggerHelpers.logAuth('post_deleted', request.user.id, {
        postId: id,
      });

      return reply.send({
        success: true,
        message: 'Post deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'delete_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to delete post',
        error: 'DELETE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get user's posts
  static async getUserPosts(
    request: FastifyRequest<{
      Params: { userId: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { userId } = request.params;
      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;
      const currentUserId = request.user?.id;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPrivate: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user has access to posts
      if (user.isPrivate && currentUserId !== userId) {
        const isFollowing = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId!,
              followingId: userId,
            },
          },
        });

        if (!isFollowing) {
          return reply.status(403).send({
            success: false,
            message: 'Cannot access this user posts',
            error: 'ACCESS_DENIED',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Get user's posts
      const posts = await prisma.post.findMany({
        where: {
          userId,
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
          comments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.post.count({
        where: {
          userId,
          isArchived: false,
        },
      });

      // Add isLiked flag and counts if user is authenticated
      if (currentUserId) {
        posts.forEach((post) => {
          (post as any).isLiked = post.likes.some(
            (like) => like.userId === currentUserId
          );
          (post as any).likesCount = post.likes.length;
          (post as any).commentsCount = post.comments.length;
          delete (post as any).likes;
          delete (post as any).comments;
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
      loggerHelpers.logError(error as Error, {
        action: 'get_user_posts',
        userId: request.user?.id,
        targetUserId: request.params?.userId,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get user posts',
        error: 'GET_USER_POSTS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get current user's posts
  static async getCurrentUserPosts(
    request: FastifyRequest<{
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

      const { page = 1, limit = 10 } = request.query;
      const skip = (page - 1) * limit;

      // Get user's posts
      const posts = await prisma.post.findMany({
        where: {
          userId: request.user.id,
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
          comments: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.post.count({
        where: {
          userId: request.user.id,
          isArchived: false,
        },
      });

      // Add isLiked flag and counts
      posts.forEach((post) => {
        (post as any).isLiked = post.likes.some(
          (like) => like.userId === request.user!.id
        );
        (post as any).likesCount = post.likes.length;
        (post as any).commentsCount = post.comments.length;
        delete (post as any).likes;
        delete (post as any).comments;
      });

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
      loggerHelpers.logError(error as Error, {
        action: 'get_current_user_posts',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get current user posts',
        error: 'GET_CURRENT_USER_POSTS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Archive post
  static async archivePost(
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

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        select: { userId: true, isArchived: true },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot archive this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.isArchived) {
        return reply.status(400).send({
          success: false,
          message: 'Post is already archived',
          error: 'POST_ALREADY_ARCHIVED',
          timestamp: new Date().toISOString(),
        });
      }

      // Archive post
      await prisma.post.update({
        where: { id },
        data: { isArchived: true },
      });

      loggerHelpers.logAuth('post_archived', request.user.id, {
        postId: id,
      });

      return reply.send({
        success: true,
        message: 'Post archived successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'archive_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to archive post',
        error: 'ARCHIVE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Unarchive post
  static async unarchivePost(
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

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        select: { userId: true, isArchived: true },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot unarchive this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      if (!post.isArchived) {
        return reply.status(400).send({
          success: false,
          message: 'Post is not archived',
          error: 'POST_NOT_ARCHIVED',
          timestamp: new Date().toISOString(),
        });
      }

      // Unarchive post
      await prisma.post.update({
        where: { id },
        data: { isArchived: false },
      });

      loggerHelpers.logAuth('post_unarchived', request.user.id, {
        postId: id,
      });

      return reply.send({
        success: true,
        message: 'Post unarchived successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'unarchive_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to unarchive post',
        error: 'UNARCHIVE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Upload post media
  static async uploadMedia(
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
          folder: 'posts',
          public_id: `post_${request.user.id}_${Date.now()}`,
          transformation: [
            { width: 1080, height: 1080, crop: 'fill', gravity: 'auto' },
            { quality: 'auto' },
          ],
        },
        'post'
      );

      return reply.status(201).send({
        success: true,
        message: 'Media uploaded successfully',
        data: {
          url: uploadResult.url,
          type: 'IMAGE',
          width: 1080,
          height: 1080,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'upload_post_media',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to upload media',
        error: 'UPLOAD_MEDIA_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Add media to post
  static async addMedia(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        url: string;
        type: 'IMAGE' | 'VIDEO' | 'AUDIO';
        width?: number;
        height?: number;
      };
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
      const { url, type, width, height } = request.body;

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot add media to this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get current media count for ordering
      const mediaCount = await prisma.postMedia.count({
        where: { postId: id },
      });

      // Add media to post
      const media = await prisma.postMedia.create({
        data: {
          postId: id,
          url,
          type,
          width,
          height,
          order: mediaCount,
        },
      });

      loggerHelpers.logAuth('post_media_added', request.user.id, {
        postId: id,
        mediaId: media.id,
      });

      return reply.status(201).send({
        success: true,
        message: 'Media added successfully',
        data: media,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'add_post_media',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to add media',
        error: 'ADD_MEDIA_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Remove media from post
  static async removeMedia(
    request: FastifyRequest<{
      Params: { id: string; mediaId: string };
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

      const { id, mediaId } = request.params;

      // Check if post exists and belongs to user
      const post = await prisma.post.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (post.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot remove media from this post',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if media exists and belongs to post
      const media = await prisma.postMedia.findUnique({
        where: { id: mediaId },
        select: { postId: true, url: true },
      });

      if (!media) {
        return reply.status(404).send({
          success: false,
          message: 'Media not found',
          error: 'MEDIA_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (media.postId !== id) {
        return reply.status(400).send({
          success: false,
          message: 'Media does not belong to this post',
          error: 'INVALID_MEDIA',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete media from cloud storage
      try {
        await CloudinaryService.deleteFile(media.url);
      } catch (error) {
        logger.error('Failed to delete media from cloud storage:', error);
      }

      // Remove media from post
      await prisma.postMedia.delete({
        where: { id: mediaId },
      });

      loggerHelpers.logAuth('post_media_removed', request.user.id, {
        postId: id,
        mediaId,
      });

      return reply.send({
        success: true,
        message: 'Media removed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'remove_post_media',
        userId: request.user?.id,
        postId: request.params?.id,
        mediaId: request.params?.mediaId,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to remove media',
        error: 'REMOVE_MEDIA_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Like a post
  static async likePost(
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

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          likesEnabled: true,
          likesCount: true,
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!post.likesEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Likes are disabled for this post',
          error: 'LIKES_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if already liked
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: request.user.id,
            postId: id,
          },
        },
      });

      if (existingLike) {
        return reply.status(400).send({
          success: false,
          message: 'Post already liked',
          error: 'ALREADY_LIKED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create like
      await prisma.like.create({
        data: {
          userId: request.user.id,
          postId: id,
        },
      });

      // Update post likes count
      await prisma.post.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('post_liked', request.user.id, {
        postId: id,
      });

      return reply.send({
        success: true,
        message: 'Post liked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'like_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to like post',
        error: 'LIKE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Unlike a post
  static async unlikePost(
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

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          likesEnabled: true,
          likesCount: true,
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!post.likesEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Likes are disabled for this post',
          error: 'LIKES_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if liked
      const existingLike = await prisma.like.findUnique({
        where: {
          userId_postId: {
            userId: request.user.id,
            postId: id,
          },
        },
      });

      if (!existingLike) {
        return reply.status(400).send({
          success: false,
          message: 'Post not liked',
          error: 'NOT_LIKED',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete like
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: request.user.id,
            postId: id,
          },
        },
      });

      // Update post likes count
      await prisma.post.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });

      loggerHelpers.logAuth('post_unliked', request.user.id, {
        postId: id,
      });

      return reply.send({
        success: true,
        message: 'Post unliked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'unlike_post',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to unlike post',
        error: 'UNLIKE_POST_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get post likes count
  static async getPostLikes(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          likesEnabled: true,
          likesCount: true,
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!post.likesEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Likes are disabled for this post',
          error: 'LIKES_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: {
          likesCount: post.likesCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'get_post_likes',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get post likes',
        error: 'GET_POST_LIKES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get users who liked post
  static async getPostLikers(
    request: FastifyRequest<{
      Params: { id: string };
      Querystring: { page?: number; limit?: number };
    }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20 } = request.query;
      const skip = (page - 1) * limit;

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          likesEnabled: true,
        },
      });

      if (!post) {
        return reply.status(404).send({
          success: false,
          message: 'Post not found',
          error: 'POST_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!post.likesEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Likes are disabled for this post',
          error: 'LIKES_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get users who liked the post
      const likes = await prisma.like.findMany({
        where: { postId: id },
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
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.like.count({
        where: { postId: id },
      });

      return reply.send({
        success: true,
        data: {
          users: likes.map((like) => like.user),
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
        action: 'get_post_likers',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get post likers',
        error: 'GET_POST_LIKERS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
