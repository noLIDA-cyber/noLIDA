/**
 * Authorization Middleware
 * 
 * Provides permission-based access control (not just role-based)
 * Integrates with role_permissions junction table
 */

const { query } = require('../config/database');
const { AppError, HTTP_STATUS } = require('./error');
const { createAuditLog } = require('../services/auditService');

/**
 * Check if user has specific permission
 * Works for both admin and organization member roles
 * 
 * @param {number} userId - User ID
 * @param {string} permissionSlug - Permission slug to check (e.g., 'users.manage')
 * @returns {Promise<boolean>} True if user has permission
 */
const hasPermission = async (userId, permissionSlug) => {
  if (!userId || !permissionSlug) return false;

  try {
    // Check if user has this permission through any role
    const result = await query(
      `SELECT COUNT(*) as count FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       JOIN organization_members om ON om.role_id = r.id
       WHERE om.user_id = $1 
         AND p.slug = $2
         AND om.status = 'active'
         AND r.is_system = FALSE
       UNION ALL
       SELECT COUNT(*) as count FROM role_permissions rp
       JOIN roles r ON r.id = rp.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.slug = $2
         AND r.is_system = TRUE
         AND r.id IN (
           SELECT role_id FROM organization_members 
           WHERE user_id = $1 AND status = 'active'
         )`,
      [userId, permissionSlug]
    );

    return result.rows.some(row => parseInt(row.count) > 0);
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

/**
 * Check if user has multiple permissions (any match = pass)
 * 
 * @param {number} userId - User ID
 * @param {string[]} permissionSlugs - Array of permission slugs
 * @returns {Promise<boolean>} True if user has any of the permissions
 */
const hasAnyPermission = async (userId, permissionSlugs) => {
  if (!userId || !Array.isArray(permissionSlugs) || permissionSlugs.length === 0) {
    return false;
  }

  for (const slug of permissionSlugs) {
    if (await hasPermission(userId, slug)) {
      return true;
    }
  }
  return false;
};

/**
 * Check if user has all permissions (all must match)
 * 
 * @param {number} userId - User ID
 * @param {string[]} permissionSlugs - Array of permission slugs
 * @returns {Promise<boolean>} True if user has all permissions
 */
const hasAllPermissions = async (userId, permissionSlugs) => {
  if (!userId || !Array.isArray(permissionSlugs) || permissionSlugs.length === 0) {
    return true; // No permissions required
  }

  for (const slug of permissionSlugs) {
    if (!(await hasPermission(userId, slug))) {
      return false;
    }
  }
  return true;
};

/**
 * Middleware factory: Require specific permission
 * Logs authorization denial to audit log
 * 
 * @param {string|string[]} permissionSlugs - Single permission or array of permissions
 * @param {Object} options - Configuration options
 * @param {string} options.mode - 'all' (all required) or 'any' (any required). Default: 'any'
 * @param {boolean} options.audit - Whether to log denial. Default: true
 * @returns {Function} Express middleware
 */
const requirePermission = (permissionSlugs, options = {}) => {
  const { mode = 'any', audit = true } = options;
  const slugs = Array.isArray(permissionSlugs) ? permissionSlugs : [permissionSlugs];

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      const hasAccess = mode === 'all'
        ? await hasAllPermissions(req.user.id, slugs)
        : await hasAnyPermission(req.user.id, slugs);

      if (!hasAccess) {
        if (audit) {
          await createAuditLog({
            actor_id: req.user.id,
            action: 'permission_denied',
            target_type: 'permission',
            target_id: null,
            metadata: {
              permissions_required: slugs,
              mode,
              ip_address: req.ip,
              user_agent: req.headers['user-agent'],
            },
          }).catch(err => console.error('Audit log failed:', err));
        }

        throw new AppError(
          'Insufficient permissions',
          403,
          'forbidden'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require ANY of multiple permission sets
 * Example: Require (users.manage OR users.view AND users.edit)
 * 
 * @param {string[][]} permissionSetArrays - Array of permission arrays
 * @returns {Function} Express middleware
 */
const requireAnyPermissionSet = (permissionSetArrays) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      let hasAccess = false;
      for (const perms of permissionSetArrays) {
        if (await hasAllPermissions(req.user.id, perms)) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'forbidden'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require super admin or specific permission
 * Useful for: Can be overridden by super admin
 * 
 * @param {string|string[]} permissionSlugs - Permission(s) to check
 * @returns {Function} Express middleware
 */
const requirePermissionOrSuperAdmin = (permissionSlugs) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      // Check if user is super admin
      const isSuperAdmin = await hasPermission(req.user.id, 'admin.*');
      if (isSuperAdmin) {
        return next();
      }

      // Otherwise check specific permission
      const hasAccess = await hasAnyPermission(
        req.user.id,
        Array.isArray(permissionSlugs) ? permissionSlugs : [permissionSlugs]
      );

      if (!hasAccess) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'forbidden'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check organization role
 * 
 * @param {number} userId - User ID
 * @param {number} organizationId - Organization ID
 * @param {string|string[]} roleSlug - Role slug(s) to check
 * @returns {Promise<boolean>} True if user has role in organization
 */
const hasOrganizationRole = async (userId, organizationId, roleSlug) => {
  try {
    const roleSlugs = Array.isArray(roleSlug) ? roleSlug : [roleSlug];

    const result = await query(
      `SELECT COUNT(*) as count FROM organization_members om
       JOIN roles r ON r.id = om.role_id
       WHERE om.user_id = $1
         AND om.organization_id = $2
         AND om.status = 'active'
         AND r.slug = ANY($3)`,
      [userId, organizationId, roleSlugs]
    );

    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Role check failed:', error);
    return false;
  }
};

/**
 * Middleware: Require specific organization role
 * 
 * @param {string|string[]} roleSlugs - Role slug(s) to require
 * @param {Object} options - Configuration
 * @param {string} options.paramName - URL param name for organization ID. Default: 'orgId'
 * @returns {Function} Express middleware
 */
const requireOrganizationRole = (roleSlugs, options = {}) => {
  const { paramName = 'orgId' } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401, 'unauthorized');
      }

      const orgId = req.params[paramName];
      if (!orgId) {
        throw new AppError('Organization ID required', 400, 'bad_request');
      }

      const hasRole = await hasOrganizationRole(req.user.id, orgId, roleSlugs);
      if (!hasRole) {
        throw new AppError(
          'Insufficient organization permissions',
          403,
          'forbidden'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  // Permission checking functions
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,

  // Organization role checking
  hasOrganizationRole,

  // Middleware factories
  requirePermission,
  requireAnyPermissionSet,
  requirePermissionOrSuperAdmin,
  requireOrganizationRole,
};
