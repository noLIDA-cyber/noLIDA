/**
 * Input Validation Utility
 * 
 * Provides schema validation and sanitization for API inputs
 * Uses Joi for schema definition and validation
 */

const Joi = require('joi');
const { AppError } = require('../middleware/error');
const { HTTP_STATUS } = require('./response');

/**
 * Common validation schemas for reuse
 */
const schemas = {
  // Email validation
  email: Joi.string().email().lowercase().trim().required(),
  
  // Password validation - minimum 8 chars, at least one uppercase, one lowercase, one number
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number',
    }),
  
  // Phone validation - Nigerian format or international
  phone: Joi.string()
    .pattern(/^(\+234|0)[0-9]{10}$/)
    .messages({
      'string.pattern.base': 'Invalid phone format. Use +234... or 0...',
    }),
  
  // Name validation
  firstName: Joi.string().min(2).max(100).trim().required(),
  lastName: Joi.string().min(2).max(100).trim().required(),
  displayName: Joi.string().min(2).max(200).trim(),
  
  // URL validation
  url: Joi.string().uri().trim(),
  
  // Currency amount - positive decimal
  amount: Joi.number().positive().precision(2),
  
  // Percentage (0-100)
  percentage: Joi.number().min(0).max(100),
  
  // ID validation
  id: Joi.number().integer().positive().required(),
  
  // Slug validation
  slug: Joi.string().lowercase().pattern(/^[a-z0-9-]+$/).required(),
  
  // UUID validation
  uuid: Joi.string().guid({ version: ['uuidv4'] }).required(),
  
  // Date validation
  date: Joi.date().iso().required(),
  
  // ISO 8601 datetime
  datetime: Joi.date().iso().required(),
  
  // Text field with length limits
  text: (minChars = 1, maxChars = 1000) => 
    Joi.string().min(minChars).max(maxChars).trim(),
  
  // Enum validation helper
  enum: (values = []) => 
    Joi.string().valid(...values),
};

/**
 * Validation middleware factory
 * Creates middleware that validates request body against schema
 * 
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Joi validation options
 * @returns {Function} Express middleware
 */
const validateRequest = (schema, options = {}) => {
  return (req, res, next) => {
    const defaultOptions = {
      abortEarly: false, // Get all errors, not just first
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types where possible
      ...options,
    };

    const { error, value } = schema.validate(req.body, defaultOptions);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.context.key,
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
        value: detail.context.value,
      }));

      throw new AppError(
        'Validation failed',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        'validation_error',
        details
      );
    }

    // Replace body with validated value
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 * 
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema, options = {}) => {
  return (req, res, next) => {
    const defaultOptions = {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      ...options,
    };

    const { error, value } = schema.validate(req.query, defaultOptions);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.context.key,
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      throw new AppError(
        'Invalid query parameters',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        'validation_error',
        details
      );
    }

    req.query = value;
    next();
  };
};

/**
 * Validate URL parameters
 * 
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema, options = {}) => {
  return (req, res, next) => {
    const defaultOptions = {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
      ...options,
    };

    const { error, value } = schema.validate(req.params, defaultOptions);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.context.key,
        message: detail.message.replace(/"/g, ''),
        type: detail.type,
      }));

      throw new AppError(
        'Invalid URL parameters',
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        'validation_error',
        details
      );
    }

    req.params = value;
    next();
  };
};

/**
 * Manual validation function
 * Useful for conditional or complex validation
 * 
 * @param {*} data - Data to validate
 * @param {Object} schema - Joi validation schema
 * @param {Object} options - Joi validation options
 * @returns {Object} { error, value }
 */
const validate = (data, schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    ...options,
  };

  return schema.validate(data, defaultOptions);
};

/**
 * Throw validation error if validation fails
 * 
 * @param {Object} result - Validation result from validate()
 * @throws {AppError} If validation failed
 */
const throwIfInvalid = (result) => {
  if (result.error) {
    const details = result.error.details.map(detail => ({
      field: detail.context.key,
      message: detail.message.replace(/"/g, ''),
      type: detail.type,
    }));

    throw new AppError(
      'Validation failed',
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      'validation_error',
      details
    );
  }
};

/**
 * Sanitize user input
 * Removes potentially dangerous characters
 * 
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitize = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Pagination query schema
 * Use this for endpoints that support pagination
 */
const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.max': 'Limit cannot exceed 100',
    }),
  sort: Joi.string()
    .pattern(/^-?[a-z_]+$/)
    .messages({
      'string.pattern.base': 'Invalid sort format. Use field name, optionally with - prefix for descending',
    }),
  search: Joi.string().max(255),
});

/**
 * Common schemas for auth
 */
const authSchemas = {
  register: Joi.object({
    email: schemas.email,
    password: schemas.password,
    firstName: schemas.firstName,
    lastName: schemas.lastName,
  }),

  login: Joi.object({
    email: schemas.email,
    password: Joi.string().required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: schemas.password,
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: schemas.password,
  }),

  verifyOTP: Joi.object({
    code: Joi.string().length(6).pattern(/^\d+$/).required(),
    type: Joi.string().valid('email', 'phone').required(),
  }),
};

/**
 * Common schemas for profile
 */
const profileSchemas = {
  update: Joi.object({
    firstName: schemas.firstName.optional(),
    lastName: schemas.lastName.optional(),
    phone: schemas.phone.optional(),
    bio: Joi.string().max(500),
    country: Joi.string().max(100),
    language: Joi.string().length(2),
    currency: Joi.string().uppercase().length(3),
    timezone: Joi.string().max(50),
    theme: Joi.string().valid('light', 'dark', 'system'),
    accent: Joi.string().valid('default', 'neon-green', 'sunset', 'cyan', 'sage', 'burgundy'),
  }),
};

/**
 * Common schemas for listings
 */
const listingSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().min(10).max(5000),
    categoryId: schemas.id,
    capabilityId: schemas.id.optional(),
    pricingType: Joi.string().valid('fixed', 'hourly', 'range', 'custom', 'quote'),
    basePrice: schemas.amount,
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(255),
    description: Joi.string().min(10).max(5000),
    pricingType: Joi.string().valid('fixed', 'hourly', 'range', 'custom', 'quote'),
    basePrice: schemas.amount,
  }).min(1), // At least one field required
};

/**
 * Common schemas for organizations
 */
const organizationSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(2000).optional(),
    logo_url: schemas.url.optional(),
    website: schemas.url.optional(),
    country: Joi.string().length(2).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255),
    description: Joi.string().max(2000),
    logo_url: schemas.url,
    website: schemas.url,
    country: Joi.string().length(2),
  }).min(1),

  addMember: Joi.object({
    email: schemas.email,
    roleId: schemas.id,
  }),

  updateMemberRole: Joi.object({
    roleId: schemas.id.required(),
  }),
};

/**
 * Common schemas for disputes
 */
const disputeSchemas = {
  create: Joi.object({
    transactionId: schemas.id.required(),
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().min(10).max(5000).required(),
    category: Joi.string().valid('service_not_delivered', 'payment_issue', 'quality_issue', 'harassment', 'fraud', 'other').required(),
    evidence_urls: Joi.array().items(schemas.url).optional(),
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('open', 'in_review', 'resolved', 'closed').required(),
    resolution: Joi.string().max(2000).optional(),
    notes: Joi.string().max(1000).optional(),
  }),
};

/**
 * Common schemas for reviews
 */
const reviewSchemas = {
  create: Joi.object({
    providerId: schemas.id.required(),
    transactionId: schemas.id.required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().min(3).max(255),
    comment: Joi.string().max(5000),
    categoryRatings: Joi.object({
      communication: Joi.number().integer().min(1).max(5),
      professionalism: Joi.number().integer().min(1).max(5),
      timeliness: Joi.number().integer().min(1).max(5),
      quality: Joi.number().integer().min(1).max(5),
    }).optional(),
  }),

  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    title: Joi.string().min(3).max(255),
    comment: Joi.string().max(5000),
  }).min(1),
};

/**
 * Common schemas for fees
 */
const feeSchemas = {
  create: Joi.object({
    type: Joi.string().valid('transaction', 'booking', 'service', 'platform').required(),
    name: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(1000).optional(),
    rate: Joi.number().precision(4).min(0).max(100).required(),
    is_percentage: Joi.boolean().default(true),
    min_amount: schemas.amount.optional(),
    max_amount: schemas.amount.optional(),
    category_id: schemas.id.optional(),
    country: Joi.string().length(2).optional(),
    active: Joi.boolean().default(true),
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(255),
    description: Joi.string().max(1000),
    rate: Joi.number().precision(4).min(0).max(100),
    is_percentage: Joi.boolean(),
    min_amount: schemas.amount,
    max_amount: schemas.amount,
    category_id: schemas.id,
    country: Joi.string().length(2),
    active: Joi.boolean(),
  }).min(1),
};

/**
 * Common schemas for admin operations
 */
const adminSchemas = {
  updateUserStatus: Joi.object({
    status: Joi.string().valid('active', 'suspended', 'deactivated').required(),
    reason: Joi.string().max(1000).optional(),
  }),

  updateRiskEvent: Joi.object({
    status: Joi.string().valid('open', 'investigating', 'resolved', 'closed').required(),
    notes: Joi.string().max(2000).optional(),
    action: Joi.string().valid('none', 'warn', 'suspend', 'ban', 'manual_review').optional(),
  }),
};

module.exports = {
  // Core functions
  validate,
  validateRequest,
  validateQuery,
  validateParams,
  throwIfInvalid,
  sanitize,
  
  // Schemas
  schemas,
  paginationSchema,
  authSchemas,
  profileSchemas,
  listingSchemas,
  organizationSchemas,
  disputeSchemas,
  reviewSchemas,
  feeSchemas,
  adminSchemas,
};
