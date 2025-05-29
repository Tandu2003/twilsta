import {
  FastifyInstance,
  HookHandlerDoneFunction,
  FastifyRequest,
  FastifyReply,
} from 'fastify';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import logger from './utils/logger';
import path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

export const registerPlugins = async (fastify: FastifyInstance) => {
  // Connect to database
  await connectDatabase();

  // Security plugins
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS configuration
  await fastify.register(require('@fastify/cors'), {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Rate limiting
  await fastify.register(require('@fastify/rate-limit'), {
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  });

  // Multipart/form-data support
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    },
  });

  // JWT authentication
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });

  // Cookie support
  await fastify.register(require('@fastify/cookie'), {
    secret: process.env.JWT_SECRET || 'fallback-secret',
    parseOptions: {},
  });

  // Static files
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
  });

  // Swagger documentation
  await fastify.register(require('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Twilsta API',
        description: 'Social media platform API documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (
        request: FastifyRequest,
        reply: FastifyReply,
        next: HookHandlerDoneFunction
      ) {
        next();
      },
      preHandler: function (
        request: FastifyRequest,
        reply: FastifyReply,
        next: HookHandlerDoneFunction
      ) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
    transformSpecification: (
      swaggerObject: any,
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Global error handler
  fastify.setErrorHandler(errorHandler);

  // 404 handler
  fastify.setNotFoundHandler(notFoundHandler);

  // Health check route
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  });

  // API info route
  fastify.get(
    `/api/${process.env.API_VERSION || 'v1'}`,
    async (request, reply) => {
      return {
        message: 'Twilsta API',
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString(),
        documentation: '/documentation',
      };
    }
  );

  // Register API routes
  const { authRoutes } = await import('./routes/auth');
  await fastify.register(authRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/auth`,
  });

  const { userRoutes } = await import('./routes/user');
  await fastify.register(userRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/users`,
  });

  const { postRoutes } = await import('./routes/post');
  await fastify.register(postRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/posts`,
  });

  const { commentRoutes } = await import('./routes/comment');
  await fastify.register(commentRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/comments`,
  });

  const { hashtagRoutes } = await import('./routes/hashtag');
  await fastify.register(hashtagRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/hashtags`,
  });

  const { storyRoutes } = await import('./routes/story');
  await fastify.register(storyRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/stories`,
  });

  const { conversationRoutes } = await import('./routes/conversation');
  await fastify.register(conversationRoutes, {
    prefix: `/api/${process.env.API_VERSION || 'v1'}/conversations`,
  });

  logger.info('✅ All plugins registered successfully');
};
