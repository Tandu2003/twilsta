import { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie, { FastifyCookie } from '@fastify/cookie';
import { prisma } from '../config/database';
import { PasswordUtils, TokenUtils, StringUtils } from '../utils/helpers';
import { EmailService } from '../config/email';
import { loggerHelpers } from '../utils/logger';
import type {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  ApiResponse,
  User,
} from '../types';

export class AuthController {
  // Helper function to generate username from email
  private static generateUsernameFromEmail(email: string): string {
    // Get the part before @ symbol
    const username = email.split('@')[0];
    // Remove any special characters and convert to lowercase
    return username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  // Register new user
  static async register(
    request: FastifyRequest<{ Body: CreateUserRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password, fullName, phone } = request.body;

      // Generate username from email
      let username = AuthController.generateUsernameFromEmail(email);
      let isUsernameUnique = false;
      let counter = 1;

      // Keep trying until we find a unique username
      while (!isUsernameUnique) {
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ email }, { username }, ...(phone ? [{ phone }] : [])],
          },
        });

        if (!existingUser) {
          isUsernameUnique = true;
        } else if (existingUser.email === email) {
          return reply.status(409).send({
            success: false,
            message: 'Email already exists',
            error: 'EMAIL_EXISTS',
            timestamp: new Date().toISOString(),
          });
        } else if (existingUser.phone === phone) {
          return reply.status(409).send({
            success: false,
            message: 'Phone number already exists',
            error: 'PHONE_EXISTS',
            timestamp: new Date().toISOString(),
          });
        } else {
          // If username exists, append a number and try again
          username = `${AuthController.generateUsernameFromEmail(email)}${counter}`;
          counter++;
        }
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hash(password);

      // Generate email verification token
      const emailToken = TokenUtils.generateEmailToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          fullName,
          phone,
        },
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

      // Store email verification token
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: emailToken,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Generate JWT tokens
      const accessToken = TokenUtils.generateAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const refreshToken = TokenUtils.generateRefreshToken({
        userId: user.id,
        tokenId: StringUtils.generateRandom(16),
      });

      // Send verification email
      await EmailService.sendVerificationEmail(email, emailToken);

      // Log successful registration
      loggerHelpers.logAuth('user_registered', user.id, {
        username: user.username,
        email: user.email,
        ip: request.ip,
      });

      return reply.status(201).send({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: {
          user,
          accessToken,
          refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'register',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Registration failed',
        error: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Login user
  static async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      const { email, password } = request.body;

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        loggerHelpers.logSecurity('failed_login_attempt', request.ip, {
          email,
          reason: 'user_not_found',
        });

        return reply.status(401).send({
          success: false,
          message: 'Invalid credentials',
          error: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
        });
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(
        password,
        user.password
      );

      if (!isPasswordValid) {
        loggerHelpers.logSecurity('failed_login_attempt', request.ip, {
          email,
          userId: user.id,
          reason: 'invalid_password',
        });

        return reply.status(401).send({
          success: false,
          message: 'Invalid credentials',
          error: 'INVALID_CREDENTIALS',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if email is verified
      if (!user.isVerified) {
        return reply.status(403).send({
          success: false,
          message: 'Please verify your email address before logging in',
          error: 'EMAIL_NOT_VERIFIED',
          data: { email: user.email },
          timestamp: new Date().toISOString(),
        });
      }

      // Generate JWT tokens
      const accessToken = TokenUtils.generateAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const refreshToken = TokenUtils.generateRefreshToken({
        userId: user.id,
        tokenId: StringUtils.generateRandom(16),
      });

      // Set cookies
      reply.setCookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      // Log successful login
      loggerHelpers.logAuth('user_login', user.id, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        success: true,
        message: 'Login successful',
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'login',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Login failed',
        error: 'LOGIN_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Check authentication status
  static async checkAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<{ user: User }>> {
    try {
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: 'Not authenticated',
          error: 'NOT_AUTHENTICATED',
          timestamp: new Date().toISOString(),
        });
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
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
        return reply.status(401).send({
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
      }

      return reply.send({
        success: true,
        data: { user },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'check_auth',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Authentication check failed',
        error: 'AUTH_CHECK_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Logout user
  static async logout(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<ApiResponse<void>> {
    try {
      // Clear cookies
      reply.clearCookie('accessToken', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      reply.clearCookie('refreshToken', {
        path: '/api/v1/auth/refresh',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return reply.send({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'logout',
        userId: request.user?.id,
      });

      return reply.status(500).send({
        success: false,
        message: 'Logout failed',
        error: 'LOGOUT_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Refresh token
  static async refresh(
    request: FastifyRequest<{ Body: { refreshToken: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    try {
      const refreshToken =
        request.cookies.refreshToken || request.body.refreshToken;

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          message: 'Refresh token required',
          error: 'REFRESH_TOKEN_REQUIRED',
          timestamp: new Date().toISOString(),
        });
      }

      const decoded = TokenUtils.verifyRefreshToken(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN',
          timestamp: new Date().toISOString(),
        });
      }

      // Generate new tokens
      const newAccessToken = TokenUtils.generateAccessToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });

      const newRefreshToken = TokenUtils.generateRefreshToken({
        userId: user.id,
        tokenId: StringUtils.generateRandom(16),
      });

      // Set new cookies
      reply.setCookie('accessToken', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      reply.setCookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth/refresh',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return reply.send({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'refresh_token',
      });

      return reply.status(500).send({
        success: false,
        message: 'Token refresh failed',
        error: 'REFRESH_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Verify email address
  static async verifyEmail(
    request: FastifyRequest<{ Body: { token: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { token } = request.body;

      if (!token) {
        return reply.status(400).send({
          success: false,
          message: 'Verification token is required',
          error: 'TOKEN_REQUIRED',
          timestamp: new Date().toISOString(),
        });
      }

      // Find verification token
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          token,
          type: 'EMAIL_VERIFICATION',
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!verificationToken) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid or expired verification token',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is already verified
      if (verificationToken.user.isVerified) {
        return reply.status(400).send({
          success: false,
          message: 'Email is already verified',
          error: 'ALREADY_VERIFIED',
          timestamp: new Date().toISOString(),
        });
      }

      // Update user verification status and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { isVerified: true },
        }),
        prisma.verificationToken.update({
          where: { id: verificationToken.id },
          data: { isUsed: true },
        }),
      ]);

      // Send welcome email
      await EmailService.sendWelcomeEmail(
        verificationToken.user.email,
        verificationToken.user.username
      );

      loggerHelpers.logAuth('email_verified', verificationToken.userId, {
        ip: request.ip,
      });

      return reply.status(200).send({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'verify_email',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Email verification failed',
        error: 'VERIFICATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Send forgot password email
  static async forgotPassword(
    request: FastifyRequest<{ Body: { email: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { email } = request.body;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, username: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return reply.status(200).send({
          success: true,
          message: 'If the email exists, a password reset link has been sent',
          timestamp: new Date().toISOString(),
        });
      }

      // Generate reset token
      const resetToken = TokenUtils.generateResetToken();

      // Store reset token
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          type: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send password reset email
      await EmailService.sendPasswordResetEmail(email, resetToken);

      loggerHelpers.logAuth('password_reset_requested', user.id, {
        ip: request.ip,
      });

      return reply.status(200).send({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'forgot_password',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to process password reset request',
        error: 'FORGOT_PASSWORD_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Reset password with token
  static async resetPassword(
    request: FastifyRequest<{ Body: { token: string; password: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { token, password } = request.body;

      if (!token || !password) {
        return reply.status(400).send({
          success: false,
          message: 'Token and password are required',
          error: 'MISSING_FIELDS',
          timestamp: new Date().toISOString(),
        });
      }

      // Find reset token
      const resetToken = await prisma.verificationToken.findFirst({
        where: {
          token,
          type: 'PASSWORD_RESET',
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      if (!resetToken) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid or expired reset token',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString(),
        });
      }

      // Validate password strength
      const validation = PasswordUtils.validateStrength(password);
      if (!validation.isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Password does not meet requirements',
          error: 'WEAK_PASSWORD',
          details: validation.feedback,
          timestamp: new Date().toISOString(),
        });
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hash(password);

      // Update user password and mark token as used
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        }),
        prisma.verificationToken.update({
          where: { id: resetToken.id },
          data: { isUsed: true },
        }),
      ]);

      loggerHelpers.logAuth('password_reset_completed', resetToken.userId, {
        ip: request.ip,
      });

      return reply.status(200).send({
        success: true,
        message: 'Password reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'reset_password',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Password reset failed',
        error: 'RESET_PASSWORD_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Resend verification email
  static async resendVerification(
    request: FastifyRequest<{ Body: { email: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { email } = request.body;

      // Check rate limit for this IP and email
      const rateLimitKey = `resend_verification:${request.ip}:${email}`;
      const rateLimitData = await prisma.rateLimitLog.findFirst({
        where: {
          key: rateLimitKey,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      });

      if (rateLimitData && rateLimitData.attempts >= 3) {
        return reply.status(429).send({
          success: false,
          message: 'Too many verification requests. Please try again later.',
          error: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, username: true, isVerified: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        // Log the rate limit attempt anyway
        await prisma.rateLimitLog.upsert({
          where: { key: rateLimitKey },
          update: { attempts: { increment: 1 } },
          create: { key: rateLimitKey, attempts: 1 },
        });

        return reply.status(200).send({
          success: true,
          message:
            'If the email exists and is unverified, a new verification email has been sent.',
          timestamp: new Date().toISOString(),
        });
      }

      // Check if already verified
      if (user.isVerified) {
        return reply.status(200).send({
          success: true,
          message: 'Email is already verified.',
          timestamp: new Date().toISOString(),
        });
      }

      // Update rate limit
      await prisma.rateLimitLog.upsert({
        where: { key: rateLimitKey },
        update: { attempts: { increment: 1 } },
        create: { key: rateLimitKey, attempts: 1 },
      });

      // Invalidate old verification tokens
      await prisma.verificationToken.updateMany({
        where: {
          userId: user.id,
          type: 'EMAIL_VERIFICATION',
          isUsed: false,
        },
        data: { isUsed: true },
      });

      // Generate new verification token
      const emailToken = TokenUtils.generateEmailToken();

      // Store new verification token (shorter expiry for resend)
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: emailToken,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Send verification email
      await EmailService.sendVerificationEmail(email, emailToken);

      loggerHelpers.logAuth('verification_resent', user.id, {
        ip: request.ip,
      });

      return reply.status(200).send({
        success: true,
        message: 'A new verification email has been sent.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      loggerHelpers.logError(error as Error, {
        action: 'resend_verification',
        ip: request.ip,
      });

      return reply.status(500).send({
        success: false,
        message: 'Failed to resend verification email',
        error: 'RESEND_VERIFICATION_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
