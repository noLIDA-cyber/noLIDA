const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createRiskEvent = async (data) => {
  const { userId, eventType, severity, description, metadata } = data;

  if (!eventType) {
    throw new AppError('Event type is required', 400);
  }

  const allowedSeverities = ['low', 'medium', 'high', 'critical'];
  const actualSeverity = allowedSeverities.includes(severity) ? severity : 'low';

  const result = await query(
    'INSERT INTO risk_events (user_id, event_type, severity, description, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId || null, eventType, actualSeverity, description || null, metadata || null]
  );

  return result.rows[0];
};

const getRiskEvent = async (eventId) => {
  const result = await query('SELECT * FROM risk_events WHERE id = $1', [eventId]);
  if (result.rows.length === 0) {
    throw new AppError('Risk event not found', 404);
  }
  return result.rows[0];
};

const listRiskEvents = async (filters = {}) => {
  const { userId, severity, resolved, eventType, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (userId) {
    conditions.push(`user_id = $${index}`);
    values.push(userId);
    index++;
  }

  if (severity) {
    conditions.push(`severity = $${index}`);
    values.push(severity);
    index++;
  }

  if (resolved !== undefined) {
    conditions.push(`resolved = $${index}`);
    values.push(resolved);
    index++;
  }

  if (eventType) {
    conditions.push(`event_type = $${index}`);
    values.push(eventType);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT r.*, u.email, p.display_name FROM risk_events r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN profiles p ON p.user_id = r.user_id ${whereClause} ORDER BY r.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM risk_events r ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const resolveRiskEvent = async (eventId, resolvedBy) => {
  const eventResult = await query('SELECT * FROM risk_events WHERE id = $1', [eventId]);
  if (eventResult.rows.length === 0) {
    throw new AppError('Risk event not found', 404);
  }

  await query(
    'UPDATE risk_events SET resolved = TRUE, resolved_by = $1, resolved_at = NOW() WHERE id = $2',
    [resolvedBy, eventId]
  );

  return getRiskEvent(eventId);
};

const getRiskSummary = async () => {
  const totalResult = await query('SELECT COUNT(*) FROM risk_events');
  const openResult = await query('SELECT COUNT(*) FROM risk_events WHERE resolved = FALSE');
  const severityResult = await query('SELECT severity, COUNT(*) as count FROM risk_events GROUP BY severity');

  const total = parseInt(totalResult.rows[0].count);
  const open = parseInt(openResult.rows[0].count);

  const bySeverity = severityResult.rows.reduce((acc, row) => {
    acc[row.severity] = parseInt(row.count);
    return acc;
  }, {});

  return {
    total,
    open,
    resolved: total - open,
    bySeverity,
  };
};

module.exports = {
  createRiskEvent,
  getRiskEvent,
  listRiskEvents,
  resolveRiskEvent,
  getRiskSummary,
};
