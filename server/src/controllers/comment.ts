import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database';
import logger, { loggerHelpers } from '../utils/logger';
import type { ApiResponse } from '../types';
import { Prisma, CommentLike } from '@prisma/client';

export class CommentController {
  // Add comment to post
  static async addComment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
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
      const { content } = request.body;

      // Check if post exists
      const post = await prisma.post.findUnique({
        where: { id },
        select: {
          id: true,
          commentsEnabled: true,
          commentsCount: true,
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

      if (!post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create comment
      const comment = await prisma.comment.create({
        data: {
          content,
          userId: request.user.id,
          postId: id,
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
        },
      });

      // Update post comments count
      await prisma.post.update({
        where: { id },
        data: { commentsCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('comment_added', request.user.id, {
        postId: id,
        commentId: comment.id,
      });

      return reply.status(201).send({
        success: true,
        message: 'Comment added successfully',
        data: comment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'add_comment',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to add comment',
        error: 'ADD_COMMENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get post comments
  static async getPostComments(
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
          commentsEnabled: true,
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

      if (!post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get comments
      const comments = await prisma.comment.findMany({
        where: {
          postId: id,
          parentId: null, // Only get top-level comments
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
          _count: {
            select: {
              replies: true,
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
      const total = await prisma.comment.count({
        where: {
          postId: id,
          parentId: null,
        },
      });

      // Add isLiked flag if user is authenticated
      if (request.user) {
        const commentIds = comments.map((comment) => comment.id);
        const userLikes = await prisma.commentLike.findMany({
          where: {
            commentId: { in: commentIds },
            userId: request.user.id,
          },
          select: {
            commentId: true,
          },
        });

        const likedCommentIds = new Set(
          userLikes.map(
            (like: Pick<CommentLike, 'commentId'>) => like.commentId
          )
        );

        comments.forEach((comment) => {
          (comment as any).isLiked = likedCommentIds.has(comment.id);
          (comment as any).repliesCount = comment._count.replies;
          delete (comment as any)._count;
        });
      }

      return reply.send({
        success: true,
        data: {
          comments,
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
        action: 'get_post_comments',
        userId: request.user?.id,
        postId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get post comments',
        error: 'GET_POST_COMMENTS_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update comment
  static async updateComment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
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
      const { content } = request.body;

      // Check if comment exists and belongs to user
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (comment.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot update this comment',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Update comment
      const updatedComment = await prisma.comment.update({
        where: { id },
        data: { content },
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
      });

      loggerHelpers.logAuth('comment_updated', request.user.id, {
        commentId: id,
      });

      return reply.send({
        success: true,
        message: 'Comment updated successfully',
        data: updatedComment,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'update_comment',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to update comment',
        error: 'UPDATE_COMMENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Delete comment
  static async deleteComment(
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

      // Check if comment exists and belongs to user
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          postId: true,
          parentId: true,
        },
      });

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (comment.userId !== request.user.id) {
        return reply.status(403).send({
          success: false,
          message: 'Cannot delete this comment',
          error: 'ACCESS_DENIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete comment (cascade will handle replies and likes)
      await prisma.comment.delete({
        where: { id },
      });

      // Update post comments count
      await prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      });

      loggerHelpers.logAuth('comment_deleted', request.user.id, {
        commentId: id,
        postId: comment.postId,
      });

      return reply.send({
        success: true,
        message: 'Comment deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'delete_comment',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to delete comment',
        error: 'DELETE_COMMENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Reply to comment
  static async replyToComment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { content: string };
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
      const { content } = request.body;

      // Check if parent comment exists
      const parentComment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          postId: true,
          post: {
            select: {
              commentsEnabled: true,
            },
          },
        },
      });

      if (!parentComment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!parentComment.post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create reply
      const newReply = await prisma.comment.create({
        data: {
          content,
          userId: request.user.id,
          postId: parentComment.postId,
          parentId: id,
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
        },
      });

      // Update post comments count
      await prisma.post.update({
        where: { id: parentComment.postId },
        data: { commentsCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('comment_reply_added', request.user.id, {
        postId: parentComment.postId,
        commentId: id,
        replyId: newReply.id,
      });

      return reply.status(201).send({
        success: true,
        message: 'Reply added successfully',
        data: newReply,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'add_comment_reply',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to add reply',
        error: 'ADD_REPLY_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get comment replies
  static async getCommentReplies(
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

      // Check if comment exists
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          post: {
            select: {
              commentsEnabled: true,
            },
          },
        },
      });

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!comment.post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get replies
      const replies = await prisma.comment.findMany({
        where: { parentId: id },
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
          createdAt: 'asc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.comment.count({
        where: { parentId: id },
      });

      // Add isLiked flag if user is authenticated
      if (request.user) {
        const replyIds = replies.map((reply) => reply.id);
        const userLikes = await prisma.commentLike.findMany({
          where: {
            commentId: { in: replyIds },
            userId: request.user.id,
          },
          select: {
            commentId: true,
          },
        });

        const likedReplyIds = new Set(
          userLikes.map(
            (like: Pick<CommentLike, 'commentId'>) => like.commentId
          )
        );

        replies.forEach((reply) => {
          (reply as any).isLiked = likedReplyIds.has(reply.id);
        });
      }

      return reply.send({
        success: true,
        data: {
          replies,
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
        action: 'get_comment_replies',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to get comment replies',
        error: 'GET_COMMENT_REPLIES_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Like a comment
  static async likeComment(
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

      // Check if comment exists
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          post: {
            select: {
              commentsEnabled: true,
            },
          },
        },
      });

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!comment.post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if already liked
      const existingLike = await prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: request.user.id,
            commentId: id,
          },
        },
      });

      if (existingLike) {
        return reply.status(400).send({
          success: false,
          message: 'Comment already liked',
          error: 'ALREADY_LIKED',
          timestamp: new Date().toISOString(),
        });
      }

      // Create like
      await prisma.commentLike.create({
        data: {
          userId: request.user.id,
          commentId: id,
        },
      });

      // Update comment likes count
      await prisma.comment.update({
        where: { id },
        data: { likesCount: { increment: 1 } },
      });

      loggerHelpers.logAuth('comment_liked', request.user.id, {
        commentId: id,
      });

      return reply.send({
        success: true,
        message: 'Comment liked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'like_comment',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to like comment',
        error: 'LIKE_COMMENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Unlike a comment
  static async unlikeComment(
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

      // Check if comment exists
      const comment = await prisma.comment.findUnique({
        where: { id },
        select: {
          id: true,
          post: {
            select: {
              commentsEnabled: true,
            },
          },
        },
      });

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: 'Comment not found',
          error: 'COMMENT_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      if (!comment.post.commentsEnabled) {
        return reply.status(400).send({
          success: false,
          message: 'Comments are disabled for this post',
          error: 'COMMENTS_DISABLED',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if liked
      const existingLike = await prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: request.user.id,
            commentId: id,
          },
        },
      });

      if (!existingLike) {
        return reply.status(400).send({
          success: false,
          message: 'Comment not liked',
          error: 'NOT_LIKED',
          timestamp: new Date().toISOString(),
        });
      }

      // Delete like
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId: request.user.id,
            commentId: id,
          },
        },
      });

      // Update comment likes count
      await prisma.comment.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });

      loggerHelpers.logAuth('comment_unliked', request.user.id, {
        commentId: id,
      });

      return reply.send({
        success: true,
        message: 'Comment unliked successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'unlike_comment',
        userId: request.user?.id,
        commentId: request.params?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to unlike comment',
        error: 'UNLIKE_COMMENT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
