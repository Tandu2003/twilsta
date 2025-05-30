import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth';
import { authenticate } from '../middleware/auth';
import { userSchemas, validationMiddlewares } from '../middleware/validation';
import Joi from 'joi';

// Additional validation schemas for auth routes
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Register user
  fastify.post(
    '/register',
    {
      preHandler: [validationMiddlewares.registerUser],
      schema: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Valid email address',
            },
            password: {
              type: 'string',
              minLength: 8,
              description:
                'Strong password with uppercase, lowercase, number, and special character',
            },
            fullName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              description: 'Full name (optional)',
            },
            phone: {
              type: 'string',
              pattern: '^\\+?[\\d\\s\\-\\(\\)]{10,}$',
              description: 'Phone number (optional)',
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  user: userSchemas,
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.register as any
  );

  // Login user
  fastify.post(
    '/login',
    {
      preHandler: [validationMiddlewares.loginUser],
      schema: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user and return JWT tokens',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              description: 'User password',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  user: userSchemas,
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.login as any
  );

  // Logout user
  fastify.post(
    '/logout',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Logout user and invalidate token',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.logout
  );

  // Check authentication status
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Authentication'],
        summary: 'Check authentication status',
        description: 'Verify if user is authenticated and return user info',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: userSchemas,
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.checkAuth as any
  );

  // Refresh token
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Refresh JWT token',
        description: 'Get new access token using refresh token',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.refresh
  );

  // Forgot password
  fastify.post(
    '/forgot-password',
    {
      preHandler: [validationMiddlewares.forgotPassword],
      schema: {
        tags: ['Authentication'],
        summary: 'Send password reset email',
        description: 'Send password reset link to user email',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.forgotPassword as any
  );

  // Reset password
  fastify.post(
    '/reset-password',
    {
      preHandler: [validationMiddlewares.resetPassword],
      schema: {
        tags: ['Authentication'],
        summary: 'Reset password with token',
        description: 'Reset user password using reset token',
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: {
              type: 'string',
              description: 'Password reset token',
            },
            password: {
              type: 'string',
              minLength: 8,
              description: 'New password',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.resetPassword as any
  );

  // Verify email
  fastify.post(
    '/verify-email',
    {
      preHandler: [validationMiddlewares.verifyEmail],
      schema: {
        tags: ['Authentication'],
        summary: 'Verify email address',
        description: 'Verify user email with verification token',
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'Email verification token',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.verifyEmail as any
  );

  // Resend verification email
  fastify.post(
    '/resend-verification',
    {
      preHandler: [
        async (request, reply) => {
          const emailSchema = Joi.object({
            email: Joi.string().email().required().messages({
              'any.required': 'Email is required',
              'string.email': 'Please provide a valid email address',
            }),
          });
          const { error, value } = emailSchema.validate(request.body);
          if (error) {
            return reply.status(400).send({
              success: false,
              message: 'Validation failed',
              error: 'VALIDATION_ERROR',
              details: error.details,
              timestamp: new Date().toISOString(),
            });
          }
          request.body = value;
        },
      ],
      schema: {
        tags: ['Authentication'],
        summary: 'Resend email verification',
        description: 'Send a new verification email to user',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    AuthController.resendVerification as any
  );
}
