import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { TokenUtils } from '../utils/helpers';
import { prisma } from '../config/database';
import logger from '../utils/logger';

// Extend FastifyRequest interface to include user property
declare module 'fastify' {
  export interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      email: string;
      isVerified: boolean;
      role?: string;
    };
  }
}

// In-memory token blacklist
const tokenBlacklist = new Set<string>();

// In-memory rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// JWT Authentication middleware
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        message: 'Access token is required',
        error: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = TokenUtils.verifyAccessToken(token);
    } catch (error) {
      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired token',
        error: 'INVALID_TOKEN',
      });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return reply.status(401).send({
        success: false,
        message: 'Token has been revoked',
        error: 'REVOKED_TOKEN',
      });
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        isVerified: true,
        isPrivate: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      });
    }

    // Attach user to request
    request.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified,
    };

    // Log authentication success
    logger.info(`User authenticated: ${user.username}`, {
      userId: user.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    return reply.status(500).send({
      success: false,
      message: 'Authentication failed',
      error: 'AUTH_ERROR',
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // Continue without authentication
    }

    const token = authHeader.substring(7);

    try {
      const decoded = TokenUtils.verifyAccessToken(token);

      // Check if token is blacklisted
      if (tokenBlacklist.has(token)) {
        return; // Continue without authentication
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          isVerified: true,
        },
      });

      if (user) {
        request.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
        };
      }
    } catch (error) {
      // Continue without authentication
      return;
    }
  } catch (error) {
    // Continue without authentication
    return;
  }
};

// Require verified email
export const requireVerified = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
    });
  }

  if (!request.user.isVerified) {
    return reply.status(403).send({
      success: false,
      message: 'Email verification required',
      error: 'EMAIL_NOT_VERIFIED',
    });
  }
};

// Rate limiting by user
export const userRateLimit = (
  maxRequests: number = 100,
  windowMs: number = 900000
) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const key = `rate_limit:${request.user.id}`;
    const now = Date.now();
    const limit = rateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      limit.count++;
      if (limit.count > maxRequests) {
        return reply.status(429).send({
          success: false,
          message: 'Too many requests',
          error: 'RATE_LIMIT_EXCEEDED',
        });
      }
    }

    // Add rate limit headers
    const current = rateLimits.get(key)?.count || 0;
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
    reply.header('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
  };
};

// Admin role check
export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      message: 'Authentication required',
      error: 'NOT_AUTHENTICATED',
    });
  }

  // Check if user has admin role (you'll need to add role field to user model)
  const user = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: { id: true }, // Add role field when available
  });

  if (!user) {
    return reply.status(401).send({
      success: false,
      message: 'User not found',
      error: 'USER_NOT_FOUND',
    });
  }

  // For now, you can check against specific user IDs or implement role system
  // if (!user.role || user.role !== 'admin') {
  //   return reply.status(403).send({
  //     success: false,
  //     message: 'Admin access required',
  //     error: 'INSUFFICIENT_PERMISSIONS'
  //   });
  // }
};

// Check if user owns resource
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        message: 'Authentication required',
        error: 'NOT_AUTHENTICATED',
      });
    }

    const resourceId = (request.params as any)[resourceIdParam];
    const userId = request.user.id;

    // This is a generic ownership check - you'll need to implement specific checks
    // based on your resource types (posts, comments, etc.)
    if (resourceId !== userId) {
      // For more complex ownership checks, you might need to query the database
      // Example: const post = await prisma.post.findUnique({where: {id: resourceId}});
      // if (post.userId !== userId) { ... }

      return reply.status(403).send({
        success: false,
        message: 'Access denied - insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS',
      });
    }
  };
};

// Logout function
export const logout = async (token: string): Promise<void> => {
  tokenBlacklist.add(token);
};

// Logout all sessions for a user
export const logoutAll = async (userId: string): Promise<void> => {
  // In a real application, you would need to track all active tokens for a user
  // For now, we'll just clear the rate limits
  for (const [key] of rateLimits) {
    if (key.startsWith(`rate_limit:${userId}`)) {
      rateLimits.delete(key);
    }
  }
};

// Check global blacklist
export const checkGlobalBlacklist = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const token = request.headers.authorization?.split(' ')[1];
  if (token && tokenBlacklist.has(token)) {
    return reply.status(401).send({
      success: false,
      message: 'Token has been revoked',
      error: 'REVOKED_TOKEN',
    });
  }
};
