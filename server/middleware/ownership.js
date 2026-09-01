/**
 * Resource Ownership Validation Middleware
 * 
 * Validates that the current user owns or has access to a specific resource
 * Prevents users from modifying resources they don't own
 */

const { query } = require('../config/database');
const { AppError } = require('./error');
const { createAuditLog } = require('../services/auditService');

/**
 * Check if user owns a resource
 * 
 * @param {number} userId - User ID
 * @param {string} resourceType - Type of resource (listing, order, booking, etc.)
 * @param {number} resourceId - ID of the resource
 * @param {Object} options - Configuration
 * @param {string} options.ownerField - Database field to check (e.g., 'provider_id', 'customer_id')
 * @param {string} options.table - Database table name
 * @returns {Promise<boolean>} True if user owns the resource
 */
const checkOwnership = async (userId, resourceType, resourceId, options = {}) => {
  if (!userId || !resourceType || !resourceId) {
    return false;
  }

  try {
    // Define ownership checks for different resource types
    const ownershipMap = {
      listing: {
        table: 'listings',
        ownerField: 'provider_id',
      },
      order: {
        table: 'transactions',
        ownerField: 'customer_id',
        additionalCheck: "transaction_type = 'order'",
      },
      booking: {
        table: 'transactions',
        ownerField: 'customer_id',
        additionalCheck: "transaction_type IN ('appointment', 'reservation')",
      },
      transaction: {
        table: 'transactions',
        ownerField: null, // Special case - can be customer or provider
      },
      conversation: {
        table: 'conversations',
        ownerField: null, // Special case - can be customer or provider
      },
      review: {
        table: 'reviews',
        ownerField: 'customer_id',
      },
      dispute: {
        table: 'disputes',
        ownerField: 'opened_by',
      },
      payment_method: {
        table: 'payment_methods',
        ownerField: 'user_id',
      },
    };

    // Merge with provided options
    const config = { ...ownershipMap[resourceType], ...options };

    if (!config.table) {
      console.warn(`No ownership config for resource type: ${resourceType}`);
      return false;
    }

    // Handle special cases
    if (resourceType === 'transaction') {
      const result = await query(
        `SELECT id FROM ${config.table} 
         WHERE id = $1 AND (customer_id = $2 OR provider_id = $2)`,
        [resourceId, userId]
      );
      return result.rows.length > 0;
    }

    if (resourceType === 'conversation') {
      const result = await query(
        `SELECT id FROM ${config.table}
         WHERE id = $1 AND (customer_id = $2 OR provider_id = $2)`,
        [resourceId, userId]
      );
      return result.rows.length > 0;
    }

    // Standard ownership check
    if (!config.ownerField) {
      console.warn(`No owner field for resource type: ${resourceType}`);
      return false;
    }

    let sql = `SELECT id FROM ${config.table} WHERE id = $1 AND ${config.ownerField} = $2`;
    const params = [resourceId, userId];

    if (config.additionalCheck) {
      sql += ` AND ${config.additionalCheck}`;
    }

    const result = await query(sql, params);
    return result.rows.length > 0;
  } catch (error) {
    console.error(`Ownership check failed for ${resourceType}:`, error);
    return false;
  }
};

/**
 * Check if user has access to resource
 * Allows owner OR admin with permission
 * 
 * @param {number} userId - User ID
 * @param {string} resourceType - Type of resource
 * @param {number} resourceId - ID of the resource
 * @param {string} requiredPermission - Permission to check if user isn't owner
 * @returns {Promise<boolean>} True if user owns or has permission
 */
const hasResourceAccess = async (userId, resourceType, resourceId, requiredPermission = null) => {
  // Check if user is owner
  const isOwner = await checkOwnership(userId, resourceType, resourceId);
  if (isOwner) {
    return true;
  }

  // If not owner, check if user has override permission
  if (requiredPermission) {
    const { hasPermission } = require('./authorization');
    return await hasPermission(userId, requiredPermission);
  }

  return false;
};

/**
 * Middleware factory: Require resource ownership
 * Validates user owns resource before passing to handler
 * Logs ownership violations
 * 
 * @param {string} resourceType - Type of resource (listing, order, booking, etc.)
 * @param {Object} options - Configuration
 * @param {string} options.paramName - URL param name for resource ID. Default: 'id'
 * @param {boolean} options.audit - Log violations. Default: true
 * @param {string} options.overridePermission - Permission to override ownership check
 * @param {Function} options.customOwnershipCheck - Custom ownership check function
 * @returns {Function} Express middleware
 */
const requireOwnership = (resourceType, options = {}) => {
  const {
    paramName = 'id',
    audit = true,
    overridePermission = null,
    customOwnershipCheck = null,
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        throw new AppError(`${paramName} parameter required`, 400, 'bad_request');
      }

      let hasAccess = false;

      // Use custom check if provided
      if (customOwnershipCheck) {
        hasAccess = await customOwnershipCheck(req.user.id, resourceId);
      } else {
        // Use standard ownership check
        hasAccess = await hasResourceAccess(
          req.user.id,
          resourceType,
          resourceId,
          overridePermission
        );
      }

      if (!hasAccess) {
        if (audit) {
          await createAuditLog({
            actor_id: req.user.id,
            action: 'unauthorized_resource_access',
            target_type: resourceType,
            target_id: parseInt(resourceId),
            metadata: {
              resource_type: resourceType,
              param_name: paramName,
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
            },
          }).catch(err => console.error('Audit log failed:', err));
        }

        throw new AppError(
          `You do not have access to this ${resourceType}`,
          403,
          'forbidden'
        );
      }

      // Store resource ID for later use
      req.resourceId = parseInt(resourceId);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require ownership OR specific permission
 * Useful for: Admins can moderate user content
 * 
 * @param {string} resourceType - Type of resource
 * @param {string} adminPermission - Permission required if not owner
 * @param {Object} options - Configuration
 * @returns {Function} Express middleware
 */
const requireOwnershipOrPermission = (resourceType, adminPermission, options = {}) => {
  const { paramName = 'id', audit = true } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        throw new AppError(`${paramName} parameter required`, 400, 'bad_request');
      }

      // Check ownership
      const isOwner = await checkOwnership(req.user.id, resourceType, resourceId);
      if (isOwner) {
        req.resourceId = parseInt(resourceId);
        req.isOwner = true;
        return next();
      }

      // Check permission if not owner
      const { hasPermission } = require('./authorization');
      const hasPermissionAccess = await hasPermission(req.user.id, adminPermission);

      if (!hasPermissionAccess) {
        if (audit) {
          await createAuditLog({
            actor_id: req.user.id,
            action: 'unauthorized_resource_access',
            target_type: resourceType,
            target_id: parseInt(resourceId),
            metadata: {
              required_permission: adminPermission,
              ip_address: req.ip,
            },
          }).catch(err => console.error('Audit log failed:', err));
        }

        throw new AppError(
          `You do not have access to this ${resourceType}`,
          403,
          'forbidden'
        );
      }

      req.resourceId = parseInt(resourceId);
      req.isOwner = false;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require customer or provider of transaction
 * Useful for: Bookings, orders (customer can view/modify) AND (provider can view/respond)
 * 
 * @param {Object} options - Configuration
 * @param {string} options.paramName - URL param name for transaction ID. Default: 'transactionId'
 * @returns {Function} Express middleware
 */
const requireTransactionAccess = (options = {}) => {
  const { paramName = 'transactionId' } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      const txId = req.params[paramName];
      if (!txId) {
        throw new AppError(`${paramName} parameter required`, 400, 'bad_request');
      }

      const result = await query(
        `SELECT id, customer_id, provider_id FROM transactions 
         WHERE id = $1 AND (customer_id = $2 OR provider_id = $2)`,
        [txId, req.user.id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Transaction not found or no access', 403, 'forbidden');
      }

      const tx = result.rows[0];
      req.transaction = tx;
      req.isCustomer = tx.customer_id === req.user.id;
      req.isProvider = tx.provider_id === req.user.id;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  // Ownership checking functions
  checkOwnership,
  hasResourceAccess,

  // Middleware factories
  requireOwnership,
  requireOwnershipOrPermission,
  requireTransactionAccess,
};
