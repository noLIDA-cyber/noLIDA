const { sendError, HTTP_STATUS } = require('../utils/response');

/**
 * Custom application error class
 * Used for throwing application-level errors that have proper HTTP semantics
 */
class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, error = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Central error handler middleware
 * Catches all errors thrown in route handlers and sends standardized responses
 */
const errorHandler = (err, req, res, next) => {
  // Set defaults
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'An error occurred';
  let errorCode = err.error || 'internal_error';
  let details = err.details || null;
  let isOperational = err.isOperational !== false;

  // Handle specific error types
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
    errorCode = 'service_unavailable';
    message = 'Service temporarily unavailable';
    isOperational = true;
  }

  if (err.code === '22P02' || /invalid input syntax/i.test(err.message || '')) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = 'invalid_value_format';
    // Build a detailed message with the full Postgres context so we
    // can identify the failing column and value from the browser.
    const parts = [err.message];
    if (err.detail) parts.push(`detail: ${err.detail}`);
    if (err.hint) parts.push(`hint: ${err.hint}`);
    if (err.position) parts.push(`position: ${err.position}`);
    if (err.where) parts.push(`where: ${err.where}`);
    message = parts.join(' | ');
    isOperational = true;
  }

  if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = HTTP_STATUS.CONFLICT;
    errorCode = 'duplicate_resource';
    message = 'A resource with this value already exists';
    isOperational = true;
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = 'invalid_reference';
    message = 'Invalid reference to another resource';
    isOperational = true;
  }

  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    errorCode = 'validation_error';
    message = err.message || 'Validation failed';
    isOperational = true;
    
    // Convert Joi validation errors
    if (err.details && Array.isArray(err.details)) {
      details = err.details.map(detail => ({
        field: detail.context?.key || 'unknown',
        message: detail.message,
        type: detail.type,
      }));
    }
  }

  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR:', {
      statusCode,
      message,
      errorCode,
      operational: isOperational,
      stack: err.stack,
    });
  }

  // Log critical errors in production
  if (!isOperational) {
    console.error('CRITICAL ERROR:', err);
  }

  // Send standardized error response
  sendError(res, message, statusCode, errorCode, details);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res) => {
  sendError(
    res,
    'Route not found',
    HTTP_STATUS.NOT_FOUND,
    'not_found'
  );
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to errorHandler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
};