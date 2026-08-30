const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const createDispute = async (userId, data) => {
  const { transactionId, reason, description } = data;

  if (!transactionId || !reason) {
    throw new AppError('Transaction ID and reason are required', 400);
  }

  const transactionCheck = await query('SELECT id, customer_id, provider_id FROM transactions WHERE id = $1', [transactionId]);
  if (transactionCheck.rows.length === 0) {
    throw new AppError('Transaction not found', 404);
  }

  const transaction = transactionCheck.rows[0];
  if (transaction.customer_id !== userId && transaction.provider_id !== userId) {
    throw new AppError('You can only open disputes for transactions you participated in', 403);
  }

  const existingDispute = await query('SELECT id FROM disputes WHERE transaction_id = $1', [transactionId]);
  if (existingDispute.rows.length > 0) {
    throw new AppError('A dispute already exists for this transaction', 409);
  }

  const result = await query(
    'INSERT INTO disputes (transaction_id, opened_by, reason, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [transactionId, userId, reason, description || null]
  );

  return result.rows[0];
};

const getDispute = async (disputeId) => {
  const result = await query('SELECT * FROM disputes WHERE id = $1', [disputeId]);
  if (result.rows.length === 0) {
    throw new AppError('Dispute not found', 404);
  }
  return result.rows[0];
};

const listDisputes = async (filters = {}) => {
  const { status, openedBy, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;
  const conditions = [];
  const values = [];
  let index = 1;

  if (status) {
    conditions.push(`d.status = $${index}`);
    values.push(status);
    index++;
  }

  if (openedBy) {
    conditions.push(`d.opened_by = $${index}`);
    values.push(openedBy);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT d.*, t.amount, t.currency, c.email as customer_email, p.email as provider_email FROM disputes d LEFT JOIN transactions t ON t.id = d.transaction_id LEFT JOIN users c ON c.id = d.opened_by LEFT JOIN users p ON p.id = t.provider_id ${whereClause} ORDER BY d.created_at DESC LIMIT $${index} OFFSET $${index + 1}`,
    [...values, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM disputes d ${whereClause}`, values);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateDisputeStatus = async (disputeId, status, resolvedBy, resolution) => {
  const disputeResult = await query('SELECT * FROM disputes WHERE id = $1', [disputeId]);
  if (disputeResult.rows.length === 0) {
    throw new AppError('Dispute not found', 404);
  }

  const allowedStatuses = ['under_review', 'resolved', 'closed', 'escalated'];
  if (!allowedStatuses.includes(status)) {
    throw new AppError('Invalid dispute status', 400);
  }

  const updates = ['status = $1', 'updated_at = NOW()'];
  const values = [status];
  let index = 2;

  if (resolvedBy) {
    updates.push(`resolved_by = $${index}`);
    values.push(resolvedBy);
    index++;
  }

  if (resolution) {
    updates.push(`resolution = $${index}`);
    values.push(resolution);
    index++;
  }

  if (status === 'resolved' || status === 'closed') {
    updates.push(`resolved_at = NOW()`);
  }

  values.push(disputeId);

  await query(`UPDATE disputes SET ${updates.join(', ')} WHERE id = $${index}`, values);

  return getDispute(disputeId);
};

module.exports = {
  createDispute,
  getDispute,
  listDisputes,
  updateDisputeStatus,
};
