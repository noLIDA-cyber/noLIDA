const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const { AppError } = require('./error');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, env.jwt.accessSecret);

    const result = await query(
      'SELECT id, email, email_verified, phone_verified, status FROM users WHERE id = $1 AND status = $2',
      [decoded.userId, 'active']
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid token', 401);
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    next(error);
  }
};

const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (allowedRoles.length === 0) {
        return next();
      }

      const result = await query(
        `SELECT r.slug FROM roles r
         JOIN organization_members om ON om.role_id = r.id
         WHERE om.user_id = $1 AND om.status = $2`,
        [req.user.id, 'active']
      );

      const userRoles = result.rows.map(row => row.slug);

      const hasPermission = allowedRoles.some(role => userRoles.includes(role));

      if (!hasPermission) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { authenticate, authorize };