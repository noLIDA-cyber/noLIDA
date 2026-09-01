/**
 * Authorization Service
 * 
 * Provides business logic for authorization decisions
 * Handles permission setup, role management, and access control
 */

const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

/**
 * Initialize default system roles and permissions
 * Should be called during setup/migration
 */
const initializeDefaultRoles = async () => {
  try {
    // Ensure all default permissions exist
    const defaultPermissions = [
      { slug: 'users.view', name: 'View Users', description: 'View user profiles' },
      { slug: 'users.manage', name: 'Manage Users', description: 'Create, update, suspend users' },
      { slug: 'listings.view', name: 'View Listings', description: 'View all listings' },
      { slug: 'listings.manage', name: 'Manage Listings', description: 'Create and moderate listings' },
      { slug: 'listings.moderate', name: 'Moderate Listings', description: 'Review and moderate listings' },
      { slug: 'transactions.view', name: 'View Transactions', description: 'View transaction records' },
      { slug: 'payments.manage', name: 'Manage Payments', description: 'Process and manage payments' },
      { slug: 'payouts.manage', name: 'Manage Payouts', description: 'Process and manage payouts' },
      { slug: 'refunds.manage', name: 'Manage Refunds', description: 'Process refunds' },
      { slug: 'reports.view', name: 'View Reports', description: 'View financial reports' },
      { slug: 'tickets.manage', name: 'Manage Tickets', description: 'Manage support tickets' },
      { slug: 'disputes.view', name: 'View Disputes', description: 'View dispute cases' },
      { slug: 'disputes.manage', name: 'Manage Disputes', description: 'Resolve disputes' },
      { slug: 'analytics.view', name: 'View Analytics', description: 'View platform analytics' },
      { slug: 'verification.manage', name: 'Manage Verification', description: 'Review verification documents' },
      { slug: 'risk.view', name: 'View Risk', description: 'View risk events and signals' },
      { slug: 'risk.manage', name: 'Manage Risk', description: 'Investigate and resolve risk events' },
      { slug: 'settings.manage', name: 'Manage Settings', description: 'Modify platform configuration' },
      { slug: 'admin.*', name: 'Super Admin', description: 'All permissions (admin wildcard)' },
    ];

    for (const perm of defaultPermissions) {
      await query(
        `INSERT INTO permissions (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [perm.name, perm.slug, perm.description]
      );
    }

    console.log('Default permissions initialized');
  } catch (error) {
    console.error('Failed to initialize default permissions:', error);
    throw error;
  }
};

/**
 * Setup role permissions for default system roles
 * Should be called after roles are created
 */
const setupDefaultRolePermissions = async () => {
  try {
    // Get all permissions
    const permResult = await query('SELECT id, slug FROM permissions');
    const permMap = Object.fromEntries(permResult.rows.map(r => [r.slug, r.id]));

    // Get all roles
    const roleResult = await query('SELECT id, slug FROM roles WHERE is_system = TRUE');
    const roleMap = Object.fromEntries(roleResult.rows.map(r => [r.slug, r.id]));

    // Define role permission mapping
    const rolePermissions = {
      super_admin: ['admin.*'], // All permissions
      admin: [
        'users.manage',
        'listings.manage',
        'transactions.view',
        'payments.manage',
        'payouts.manage',
        'refunds.manage',
        'reports.view',
        'disputes.manage',
        'analytics.view',
        'verification.manage',
        'risk.view',
        'settings.manage',
      ],
      moderator: [
        'listings.moderate',
        'listings.view',
        'disputes.view',
        'risk.view',
      ],
      finance_admin: [
        'transactions.view',
        'payments.manage',
        'payouts.manage',
        'refunds.manage',
        'reports.view',
      ],
      support_admin: [
        'users.view',
        'tickets.manage',
        'disputes.view',
      ],
      trust_safety_admin: [
        'users.view',
        'risk.manage',
        'verification.manage',
        'disputes.manage',
      ],
      analytics_admin: [
        'analytics.view',
        'reports.view',
      ],
    };

    // Assign permissions to roles
    for (const [roleSlug, permissions] of Object.entries(rolePermissions)) {
      const roleId = roleMap[roleSlug];
      if (!roleId) {
        console.warn(`Role not found: ${roleSlug}`);
        continue;
      }

      for (const permSlug of permissions) {
        const permId = permMap[permSlug];
        if (!permId) {
          console.warn(`Permission not found: ${permSlug}`);
          continue;
        }

        await query(
          `INSERT INTO role_permissions (role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleId, permId]
        );
      }
    }

    console.log('Default role permissions setup complete');
  } catch (error) {
    console.error('Failed to setup default role permissions:', error);
    throw error;
  }
};

/**
 * Get all permissions for a user
 * Includes both admin and organization role permissions
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of permission slugs
 */
const getUserPermissions = async (userId) => {
  try {
    const result = await query(
      `SELECT DISTINCT p.slug FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN roles r ON r.id = rp.role_id
       JOIN organization_members om ON om.role_id = r.id
       WHERE om.user_id = $1 AND om.status = 'active'
       UNION
       SELECT DISTINCT p.slug FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.is_system = TRUE
         AND r.id IN (
           SELECT role_id FROM organization_members 
           WHERE user_id = $1 AND status = 'active'
         )`,
      [userId]
    );

    return result.rows.map(row => row.slug);
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return [];
  }
};

/**
 * Get user's roles
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of role objects {id, slug, name}
 */
const getUserRoles = async (userId) => {
  try {
    const result = await query(
      `SELECT DISTINCT r.id, r.slug, r.name FROM roles r
       JOIN organization_members om ON om.role_id = r.id
       WHERE om.user_id = $1 AND om.status = 'active'`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get user roles:', error);
    return [];
  }
};

/**
 * Check if user can perform action on organization
 * 
 * @param {number} userId - User ID
 * @param {number} organizationId - Organization ID
 * @param {string} action - Action to perform (e.g., 'update', 'delete', 'invite_member')
 * @returns {Promise<boolean>} True if user can perform action
 */
const canUserManageOrganization = async (userId, organizationId, action) => {
  try {
    // Get user's role in this organization
    const result = await query(
      `SELECT r.slug FROM roles r
       JOIN organization_members om ON om.role_id = r.id
       WHERE om.user_id = $1 AND om.organization_id = $2 AND om.status = 'active'`,
      [userId, organizationId]
    );

    if (result.rows.length === 0) {
      return false; // User not in organization
    }

    const role = result.rows[0].slug;

    // Define action permissions
    const actionPermissions = {
      update: ['owner', 'manager'],
      delete: ['owner'],
      invite_member: ['owner', 'manager'],
      remove_member: ['owner', 'manager'],
      change_member_role: ['owner'],
      view: ['owner', 'manager', 'staff'],
    };

    const allowedRoles = actionPermissions[action] || [];
    return allowedRoles.includes(role);
  } catch (error) {
    console.error('Failed to check organization permissions:', error);
    return false;
  }
};

/**
 * Verify user has no unresolved account obligations
 * Prevents account deletion/suspension with pending issues
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} {canDelete: boolean, obligations: Array}
 */
const checkAccountObligations = async (userId) => {
  try {
    const result = await query(
      `SELECT id, obligation_type, description, amount, status 
       FROM account_obligations
       WHERE user_id = $1 AND status IN ('open', 'review')`,
      [userId]
    );

    return {
      canDelete: result.rows.length === 0,
      obligations: result.rows,
    };
  } catch (error) {
    console.error('Failed to check account obligations:', error);
    return {
      canDelete: false,
      obligations: [],
    };
  }
};

/**
 * Add account obligation
 * 
 * @param {number} userId - User ID
 * @param {Object} obligation - Obligation data
 * @param {string} obligation.type - Type of obligation (pending_refund, pending_payout, etc.)
 * @param {string} obligation.description - Description
 * @param {number} obligation.amount - Amount if applicable
 * @param {string} obligation.related_type - Type of related resource
 * @param {number} obligation.related_id - ID of related resource
 * @returns {Promise<Object>} Created obligation
 */
const createAccountObligation = async (userId, obligation) => {
  try {
    const {
      type,
      description,
      amount = null,
      currency = 'NGN',
      related_type = null,
      related_id = null,
      priority = 'normal',
    } = obligation;

    const result = await query(
      `INSERT INTO account_obligations 
       (user_id, obligation_type, description, amount, currency, related_type, related_id, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
       RETURNING *`,
      [userId, type, description, amount, currency, related_type, related_id, priority]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Failed to create account obligation:', error);
    throw error;
  }
};

/**
 * Resolve account obligation
 * 
 * @param {number} obligationId - Obligation ID
 * @param {number} resolvedBy - Admin user ID
 * @param {Object} resolution - Resolution details
 * @param {string} resolution.status - New status (resolved, closed)
 * @param {string} resolution.notes - Resolution notes
 * @returns {Promise<Object>} Updated obligation
 */
const resolveAccountObligation = async (obligationId, resolvedBy, resolution = {}) => {
  try {
    const { status = 'resolved', notes = '' } = resolution;

    const result = await query(
      `UPDATE account_obligations 
       SET status = $1, resolved_at = NOW(), resolved_by = $2, notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, resolvedBy, notes, obligationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Obligation not found', 404);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Failed to resolve account obligation:', error);
    throw error;
  }
};

module.exports = {
  // Setup
  initializeDefaultRoles,
  setupDefaultRolePermissions,

  // Permission checking
  getUserPermissions,
  getUserRoles,

  // Organization management
  canUserManageOrganization,

  // Account obligations
  checkAccountObligations,
  createAccountObligation,
  resolveAccountObligation,
};
