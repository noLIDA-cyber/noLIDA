const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createAuditLog = async (data) => {
  const { actorId, action, targetType, targetId, changes, ipAddress, userAgent } = data;

  if (!action) {
    throw new AppError('Action is required', 400);
  }

  const result = await query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [actorId || null, action, targetType || null, targetId || null, changes || null, ipAddress || null, userAgent || null]
  );

  return result.rows[0];
};

const getAuditLog = async (logId) => {
  const result = await query('SELECT * FROM audit_logs WHERE id = $1', [logId]);
  if (result.rows.length === 0) {
    throw new AppError('Audit log not found', 404);
  }
  return result.rows[0];
};

const listAuditLogs = async (filters = {}) => {
  const { actorId, action, targetType, targetId, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (actorId) {
    conditions.push(`actor_id = $${index}`);
    values.push(actorId);
    index++;
  }

  if (action) {
    conditions.push(`action = $${index}`);
    values.push(action);
    index++;
  }

  if (targetType) {
    conditions.push(`target_type = $${index}`);
    values.push(targetType);
    index++;
  }

  if (targetId) {
    conditions.push(`target_id = $${index}`);
    values.push(targetId);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT l.*, u.email, p.display_name FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_id LEFT JOIN profiles p ON p.user_id = l.actor_id ${whereClause} ORDER BY l.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM audit_logs l ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const getAuditSummary = async () => {
  const totalResult = await query('SELECT COUNT(*) FROM audit_logs');
  const actionResult = await query('SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10');

  const total = parseInt(totalResult.rows[0].count);

  const topActions = actionResult.rows.map(row => ({
    action: row.action,
    count: parseInt(row.count),
  }));

  return {
    total,
    topActions,
  };
};

module.exports = {
  createAuditLog,
  getAuditLog,
  listAuditLogs,
  getAuditSummary,
};
