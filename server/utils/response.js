/**
 * API Response Utility
 * 
 * Standardizes all API responses to follow a consistent format:
 * 
 * Success (200):
 * {
 *   "success": true,
 *   "code": 200,
 *   "message": "Operation successful",
 *   "data": { ... }
 * }
 * 
 * Error (400/500):
 * {
 *   "success": false,
 *   "code": 400,
 *   "message": "Validation failed",
 *   "error": "field_specific_error",
 *   "details": [
 *     { "field": "email", "message": "Invalid email format" }
 *   ]
 * }
 * 
 * Paginated (200):
 * {
 *   "success": true,
 *   "code": 200,
 *   "message": "Fetched successfully",
 *   "data": [ ... ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 150,
 *     "pages": 8
 *   }
 * }
 */

/**
 * HTTP Status Code Map
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Send successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Response message (default: "Success")
 */
const sendSuccess = (res, data, statusCode = HTTP_STATUS.OK, message = 'Success') => {
  const response = {
    success: true,
    code: statusCode,
    message,
  };

  if (data !== undefined && data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Response message
 */
const sendCreated = (res, data, message = 'Resource created successfully') => {
  sendSuccess(res, data, HTTP_STATUS.CREATED, message);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} error - Specific error code/type
 * @param {Array} details - Detailed error information (validation errors, etc.)
 */
const sendError = (res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, error = null, details = null) => {
  const response = {
    success: false,
    code: statusCode,
    message: message || 'An error occurred',
  };

  if (error) {
    response.error = error;
  }

  if (details && Array.isArray(details) && details.length > 0) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

/**
 * Send validation error response (422)
 * @param {Object} res - Express response object
 * @param {Array} details - Array of validation errors
 * @param {string} message - Error message
 */
const sendValidationError = (res, details, message = 'Validation failed') => {
  sendError(
    res,
    message,
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    'validation_error',
    details
  );
};

/**
 * Send bad request error (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} error - Specific error code
 */
const sendBadRequest = (res, message = 'Bad request', error = 'bad_request') => {
  sendError(res, message, HTTP_STATUS.BAD_REQUEST, error);
};

/**
 * Send unauthorized error (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  sendError(res, message, HTTP_STATUS.UNAUTHORIZED, 'unauthorized');
};

/**
 * Send forbidden error (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Forbidden') => {
  sendError(res, message, HTTP_STATUS.FORBIDDEN, 'forbidden');
};

/**
 * Send not found error (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  sendError(res, message, HTTP_STATUS.NOT_FOUND, 'not_found');
};

/**
 * Send conflict error (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} error - Specific error code
 */
const sendConflict = (res, message = 'Resource conflict', error = 'conflict') => {
  sendError(res, message, HTTP_STATUS.CONFLICT, error);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} total - Total count of items (not page count)
 * @param {number} page - Current page (1-indexed)
 * @param {number} limit - Items per page
 * @param {string} message - Response message
 */
const sendPaginated = (res, data, total, page, limit, message = 'Fetched successfully') => {
  if (!Array.isArray(data)) {
    return sendError(res, 'Data must be an array', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  const pages = Math.ceil(total / limit);
  const hasNextPage = page < pages;
  const hasPreviousPage = page > 1;

  res.status(HTTP_STATUS.OK).json({
    success: true,
    code: HTTP_STATUS.OK,
    message,
    data,
    pagination: {
      page: Math.max(1, page), // Ensure page is at least 1
      limit,
      total,
      pages,
      hasNextPage,
      hasPreviousPage,
      offset: (Math.max(1, page) - 1) * limit,
    },
  });
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  res.status(HTTP_STATUS.NO_CONTENT).send();
};

/**
 * Send server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendServerError = (res, message = 'Internal server error') => {
  sendError(res, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'internal_error');
};

/**
 * Send service unavailable response (503)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const sendServiceUnavailable = (res, message = 'Service temporarily unavailable') => {
  sendError(res, message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'service_unavailable');
};

module.exports = {
  // Response functions
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendPaginated,
  sendNoContent,
  sendServerError,
  sendServiceUnavailable,
  
  // HTTP Status codes
  HTTP_STATUS,
};