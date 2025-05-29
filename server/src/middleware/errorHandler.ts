import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(message: string, statusCode: number = 500, errorCode?: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
export class ValidationError extends AppError {
  public details: any;

  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, 'DATABASE_ERROR');
    this.name = 'DatabaseError';

    // Log original error for debugging
    if (originalError) {
      logger.error('Database error details:', originalError);
    }
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Rate limit error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// File upload error class
export class FileUploadError extends AppError {
  constructor(message: string) {
    super(message, 400, 'FILE_UPLOAD_ERROR');
    this.name = 'FileUploadError';
  }
}

// Handle Prisma errors
const handlePrismaError = (error: any): AppError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        const fieldName = field?.[0] || 'field';
        return new ValidationError(
          `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} already exists`,
          { field: fieldName, code: error.code }
        );

      case 'P2025':
        // Record not found
        return new NotFoundError('Record');

      case 'P2003':
        // Foreign key constraint violation
        return new ValidationError(
          'Invalid reference - related record does not exist',
          { code: error.code }
        );

      case 'P2014':
        // Required relation missing
        return new ValidationError('Required relation is missing', {
          code: error.code,
        });

      default:
        return new DatabaseError('Database operation failed', error);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new DatabaseError('Unknown database error occurred', error);
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseError('Database engine error', error);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError('Database initialization error', error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data provided', error);
  }

  return new DatabaseError('Database error occurred', error);
};

// Handle JWT errors
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token has expired');
  }

  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active yet');
  }

  return new AuthenticationError('Token verification failed');
};

// Handle validation errors from Joi or other validators
const handleValidationError = (error: any): AppError => {
  if (error.isJoi) {
    const details = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    return new ValidationError('Validation failed', details);
  }

  return new ValidationError(error.message || 'Validation failed');
};

// Handle multer errors
const handleMulterError = (error: any): AppError => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new FileUploadError('File size too large');
    case 'LIMIT_FILE_COUNT':
      return new FileUploadError('Too many files');
    case 'LIMIT_FIELD_COUNT':
      return new FileUploadError('Too many fields');
    case 'LIMIT_UNEXPECTED_FILE':
      return new FileUploadError('Unexpected file field');
    default:
      return new FileUploadError(error.message || 'File upload failed');
  }
};

// Main error handler
export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  let appError: AppError;

  // Handle known error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name?.includes('Prisma')) {
    appError = handlePrismaError(error);
  } else if (
    error.name?.includes('JsonWebToken') ||
    error.name?.includes('Token')
  ) {
    appError = handleJWTError(error);
  } else if (error.validation || (error as any).isJoi) {
    appError = handleValidationError(error);
  } else if (error.code?.startsWith('LIMIT_')) {
    appError = handleMulterError(error);
  } else {
    // Unknown error
    appError = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : error.message || 'Internal server error',
      error.statusCode || 500,
      'INTERNAL_ERROR'
    );
  }

  // Log error details
  const errorInfo = {
    error: {
      name: appError.name,
      message: appError.message,
      statusCode: appError.statusCode,
      errorCode: appError.errorCode,
      stack: appError.stack,
    },
    request: {
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    },
    timestamp: new Date().toISOString(),
  };

  // Log based on severity
  if (appError.statusCode >= 500) {
    logger.error('Server error:', errorInfo);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client error:', errorInfo);
  }

  // Prepare response
  const response: any = {
    success: false,
    message: appError.message,
    error: appError.errorCode || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  };

  // Add details for validation errors
  if (appError instanceof ValidationError && appError.details) {
    response.details = appError.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = appError.stack;
  }

  // Send error response
  reply.status(appError.statusCode).send(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await fn(request, reply);
    } catch (error) {
      errorHandler(error as FastifyError, request, reply);
    }
  };
};

// Not found handler
export const notFoundHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const error = new NotFoundError(`Route ${request.method} ${request.url}`);
  errorHandler(error as unknown as FastifyError, request, reply);
};

// Helper function to throw errors
export const throwError = (
  message: string,
  statusCode: number = 500,
  errorCode?: string
): never => {
  throw new AppError(message, statusCode, errorCode);
};

// Helper function to throw validation error
export const throwValidationError = (message: string, details?: any): never => {
  throw new ValidationError(message, details);
};

// Helper function to throw not found error
export const throwNotFoundError = (resource: string = 'Resource'): never => {
  throw new NotFoundError(resource);
};

// Helper function to throw authentication error
export const throwAuthError = (message?: string): never => {
  throw new AuthenticationError(message);
};

// Helper function to throw authorization error
export const throwAuthzError = (message?: string): never => {
  throw new AuthorizationError(message);
};

// Type guards
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isDatabaseError = (error: any): error is DatabaseError => {
  return error instanceof DatabaseError;
};

// Error codes enum for consistency
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  MISSING_TOKEN = 'MISSING_TOKEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
}
