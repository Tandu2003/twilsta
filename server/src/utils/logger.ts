import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define format for console logging
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define which logs to display based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true,
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    handleExceptions: true,
    handleRejections: true,
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Add daily rotate file transport for production
if (process.env.NODE_ENV === 'production') {
  const DailyRotateFile = require('winston-daily-rotate-file');

  transports.push(
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Helper functions for structured logging
export const loggerHelpers = {
  // Log API requests
  logRequest: (req: any, res: any, responseTime: number) => {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;

    logger.http(`${method} ${url}`, {
      method,
      url,
      statusCode,
      responseTime,
      ip,
      userAgent: headers['user-agent'],
    });
  },

  // Log authentication events
  logAuth: (event: string, userId?: string, details?: any) => {
    logger.info(`Auth: ${event}`, {
      event,
      userId,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log database operations
  logDB: (
    operation: string,
    table: string,
    recordId?: string,
    details?: any
  ) => {
    logger.debug(`DB: ${operation} on ${table}`, {
      operation,
      table,
      recordId,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log cache operations
  logCache: (operation: string, key: string, hit?: boolean, details?: any) => {
    logger.debug(`Cache: ${operation} for ${key}`, {
      operation,
      key,
      hit,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log file upload operations
  logUpload: (
    event: string,
    filename: string,
    size?: number,
    userId?: string
  ) => {
    logger.info(`Upload: ${event}`, {
      event,
      filename,
      size,
      userId,
      timestamp: new Date().toISOString(),
    });
  },

  // Log security events
  logSecurity: (event: string, ip: string, details?: any) => {
    logger.warn(`Security: ${event}`, {
      event,
      ip,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log performance metrics
  logPerformance: (operation: string, duration: number, details?: any) => {
    const level = duration > 1000 ? 'warn' : 'debug'; // Warn if operation takes > 1s
    logger[level](`Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      ...details,
      timestamp: new Date().toISOString(),
    });
  },

  // Log errors with context
  logError: (error: Error, context?: any) => {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: new Date().toISOString(),
    });
  },
};

// Stream for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export logger as default
export default logger;
