import { FastifyRequest, FastifyReply } from 'fastify';
import Joi from 'joi';
import { ValidationError } from './errorHandler';
import { StringUtils, ValidationUtils } from '../utils/helpers';

// Validation options
const validationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true,
};

// Common validation schemas
export const commonSchemas = {
  // ID validation
  id: Joi.string().uuid().required().messages({
    'string.uuid': 'Invalid ID format',
    'any.required': 'ID is required',
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Email validation
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),

  // Password validation
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format',
    }),

  // URL validation
  url: Joi.string().uri().optional().messages({
    'string.uri': 'Invalid URL format',
  }),

  // Date validation
  date: Joi.date().iso().messages({
    'date.format': 'Date must be in ISO format',
  }),

  // File validation
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().required(),
    size: Joi.number().required(),
    buffer: Joi.binary().required(),
  }),
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    fullName: Joi.string().min(2).max(100).optional(),
    phone: commonSchemas.phone,
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  updateProfile: Joi.object({
    fullName: Joi.string().min(2).max(100).optional(),
    bio: Joi.string().max(500).optional(),
    website: commonSchemas.url,
    phone: commonSchemas.phone,
    isPrivate: Joi.boolean().optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: commonSchemas.password,
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
    }),
    password: commonSchemas.password,
  }),

  verifyEmail: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Verification token is required',
    }),
  }),
};

// Post validation schemas
export const postSchemas = {
  create: Joi.object({
    caption: Joi.string().max(2000).optional(),
    location: Joi.string().max(100).optional(),
    commentsEnabled: Joi.boolean().default(true),
    likesEnabled: Joi.boolean().default(true),
    hashtags: Joi.array().items(Joi.string().max(50)).optional(),
  }),

  update: Joi.object({
    caption: Joi.string().max(2000).optional(),
    location: Joi.string().max(100).optional(),
    commentsEnabled: Joi.boolean().optional(),
    likesEnabled: Joi.boolean().optional(),
    isArchived: Joi.boolean().optional(),
  }),

  getPosts: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    userId: Joi.string().uuid().optional(),
    hashtag: Joi.string().optional(),
    location: Joi.string().optional(),
  }),
};

// Comment validation schemas
export const commentSchemas = {
  create: Joi.object({
    content: Joi.string().min(1).max(500).required().messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment must not exceed 500 characters',
      'any.required': 'Comment content is required',
    }),
    parentId: Joi.string().uuid().optional(),
  }),

  update: Joi.object({
    content: Joi.string().min(1).max(500).required().messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment must not exceed 500 characters',
      'any.required': 'Comment content is required',
    }),
  }),
};

// Story validation schemas
export const storySchemas = {
  create: Joi.object({
    text: Joi.string().max(200).optional(),
    expiresAt: Joi.date().iso().min('now').optional(),
  }),
};

// Message validation schemas
export const messageSchemas = {
  send: Joi.object({
    content: Joi.string().min(1).max(1000).optional(),
    type: Joi.string()
      .valid('text', 'image', 'video', 'audio', 'file')
      .default('text'),
    replyToId: Joi.string().uuid().optional(),
  }),

  createConversation: Joi.object({
    participants: Joi.array().items(Joi.string().uuid()).min(1).required(),
    type: Joi.string().valid('direct', 'group').default('direct'),
    name: Joi.string().max(100).optional(),
  }),

  updateConversation: Joi.object({
    name: Joi.string().max(100).optional(),
  }),
};

// Follow validation schemas
export const followSchemas = {
  follow: Joi.object({
    userId: commonSchemas.id,
  }),
};

// Search validation schemas
export const searchSchemas = {
  search: Joi.object({
    q: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query must not exceed 100 characters',
      'any.required': 'Search query is required',
    }),
    type: Joi.string()
      .valid('users', 'posts', 'hashtags', 'all')
      .default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

// Notification validation schemas
export const notificationSchemas = {
  markAsRead: Joi.object({
    notificationIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),
};

// Generic validation middleware
export const validate = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      let dataToValidate;

      switch (source) {
        case 'body':
          dataToValidate = request.body;
          break;
        case 'query':
          dataToValidate = request.query;
          break;
        case 'params':
          dataToValidate = request.params;
          break;
        default:
          dataToValidate = request.body;
      }

      const { error, value } = schema.validate(
        dataToValidate,
        validationOptions
      );

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new ValidationError('Validation failed', details);
      }

      // Sanitize string inputs if they exist
      if (value && typeof value === 'object') {
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === 'string') {
            // Apply HTML sanitization for content fields
            if (key === 'caption' || key === 'content' || key === 'bio') {
              value[key] = StringUtils.sanitizeHtml(val);
            }
          }
        }
      }

      // Replace the original data with validated and sanitized data
      switch (source) {
        case 'body':
          request.body = value;
          break;
        case 'query':
          request.query = value;
          break;
        case 'params':
          request.params = value;
          break;
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR',
          details: error.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  };
};

// Specific validation middlewares
export const validateBody = (schema: Joi.ObjectSchema) =>
  validate(schema, 'body');
export const validateQuery = (schema: Joi.ObjectSchema) =>
  validate(schema, 'query');
export const validateParams = (schema: Joi.ObjectSchema) =>
  validate(schema, 'params');

// Combined validation for multiple sources
export const validateAll = (schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      // Validate params first
      if (schemas.params) {
        const { error: paramsError, value: paramsValue } =
          schemas.params.validate(request.params, validationOptions);
        if (paramsError) {
          throw new ValidationError(
            'Params validation failed',
            paramsError.details
          );
        }
        request.params = paramsValue;
      }

      // Validate query
      if (schemas.query) {
        const { error: queryError, value: queryValue } = schemas.query.validate(
          request.query,
          validationOptions
        );
        if (queryError) {
          throw new ValidationError(
            'Query validation failed',
            queryError.details
          );
        }
        request.query = queryValue;
      }

      // Validate body
      if (schemas.body) {
        const { error: bodyError, value: bodyValue } = schemas.body.validate(
          request.body,
          validationOptions
        );
        if (bodyError) {
          throw new ValidationError(
            'Body validation failed',
            bodyError.details
          );
        }
        request.body = bodyValue;
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({
          success: false,
          message: error.message,
          error: 'VALIDATION_ERROR',
          details: error.details,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  };
};

// File validation middleware
export const validateFile = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
  maxCount?: number;
}) => {
  return async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const files = (request as any).files;

      if (options.required && (!files || files.length === 0)) {
        throw new ValidationError('File is required');
      }

      if (files && files.length > 0) {
        // Check file count
        if (options.maxCount && files.length > options.maxCount) {
          throw new ValidationError(
            `Maximum ${options.maxCount} files allowed`
          );
        }

        // Validate each file
        for (const file of files) {
          // Check file size
          if (options.maxSize && file.size > options.maxSize) {
            throw new ValidationError(
              `File size exceeds limit of ${Math.round(options.maxSize / 1024 / 1024)}MB`
            );
          }

          // Check file type
          if (
            options.allowedTypes &&
            !options.allowedTypes.includes(file.mimetype)
          ) {
            throw new ValidationError(
              `File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
            );
          }
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({
          success: false,
          message: error.message,
          error: 'FILE_VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  };
};

// Custom validators
export const customValidators = {
  // Check if username is available
  isUsernameAvailable: Joi.extend((joi) => ({
    type: 'usernameAvailable',
    base: joi.string(),
    messages: {
      'usernameAvailable.taken': 'Username is already taken',
    },
    validate(value, helpers) {
      // This would need to be implemented with database check
      // For now, just return the value
      return { value };
    },
  })),

  // Check if email is available
  isEmailAvailable: Joi.extend((joi) => ({
    type: 'emailAvailable',
    base: joi.string(),
    messages: {
      'emailAvailable.taken': 'Email is already registered',
    },
    validate(value, helpers) {
      // This would need to be implemented with database check
      // For now, just return the value
      return { value };
    },
  })),
};

// Export pre-built validation middlewares
export const validationMiddlewares = {
  // User validations
  registerUser: validateBody(userSchemas.register),
  loginUser: validateBody(userSchemas.login),
  updateProfile: validateBody(userSchemas.updateProfile),
  changePassword: validateBody(userSchemas.changePassword),
  forgotPassword: validateBody(userSchemas.forgotPassword),
  resetPassword: validateBody(userSchemas.resetPassword),
  verifyEmail: validateBody(userSchemas.verifyEmail),

  // Post validations
  createPost: validateBody(postSchemas.create),
  updatePost: validateBody(postSchemas.update),
  getPostsQuery: validateQuery(postSchemas.getPosts),

  // Comment validations
  createComment: validateBody(commentSchemas.create),
  updateComment: validateBody(commentSchemas.update),

  // Story validations
  createStory: validateBody(storySchemas.create),

  // Message validations
  sendMessage: validateBody(messageSchemas.send),
  createConversation: validateBody(messageSchemas.createConversation),
  updateConversation: validateBody(messageSchemas.updateConversation),

  // Follow validations
  followUser: validateBody(followSchemas.follow),

  // Search validations
  searchQuery: validateQuery(searchSchemas.search),

  // Notification validations
  markNotificationsRead: validateBody(notificationSchemas.markAsRead),

  // Common validations
  validateId: validateParams(Joi.object({ id: commonSchemas.id })),
  validatePagination: validateQuery(commonSchemas.pagination),

  // File validations
  validateProfileImage: validateFile({
    required: false,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    maxCount: 1,
  }),

  validatePostMedia: validateFile({
    required: true,
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ],
    maxCount: 10,
  }),

  validateStoryMedia: validateFile({
    required: true,
    maxSize: 30 * 1024 * 1024, // 30MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
    ],
    maxCount: 1,
  }),
};
