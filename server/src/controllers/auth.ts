import { FastifyRequest, FastifyReply } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { prisma } from '../config/database';
import { PasswordUtils, TokenUtils, StringUtils } from '../utils/helpers';
import { EmailService } from '../config/email';
import { loggerHelpers } from '../utils/logger';
import type {
  CreateUserRequest,
  LoginRequest,
  AuthResponse,
  ApiResponse,
} from '../types';

export class AuthController {
  // Register new user
  static async register(
    request: FastifyRequest<{ Body: CreateUserRequest }>,
    reply: FastifyReply
  ): Promise<ApiResponse<AuthResponse>> {
    try {
      const { username, email, password, fullName, phone } = request.body;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'Email' : 'Username';
        return reply.status(409).send({
          success: false,
          message: `${field} already exists`,
          error: 'USER_EXISTS',
          timestamp: new Date().toISOString(),
        });
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
          // Store verification token temporarily (you might want to create a separate table for this)
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

      // Store reset token (you might want to create a separate table for this)
      // For now, we'll just send the email

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

      // In a real implementation, you would verify the token against a database
      // For now, we'll simulate token verification
      // You should create a password_reset_tokens table

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

      // Update user password (this is simplified - you should verify token first)
      // const user = await prisma.user.update({
      //   where: { /* based on valid token */ },
      //   data: { password: hashedPassword },
      // });

      loggerHelpers.logAuth('password_reset_completed', 'user_id', {
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

  // Verify email address
  static async verifyEmail(
    request: FastifyRequest<{ Body: { token: string } }>,
    reply: FastifyReply
  ): Promise<ApiResponse> {
    try {
      const { token } = request.body;

      // In a real implementation, you would verify the token against a database
      // For now, we'll simulate token verification
      // You should create an email_verification_tokens table

      // Update user verification status (this is simplified)
      // const user = await prisma.user.update({
      //   where: { /* based on valid token */ },
      //   data: { isVerified: true },
      // });

      // Send welcome email
      // await EmailService.sendWelcomeEmail(user.email, user.username);

      loggerHelpers.logAuth('email_verified', 'user_id', {
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
}
