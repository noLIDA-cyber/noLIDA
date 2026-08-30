const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

const calculateFees = async (transaction) => {
  const applicableFees = await query(
    `SELECT * FROM fees WHERE active = TRUE AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to > NOW())
     AND (country IS NULL OR country = $1)
     AND (category_id IS NULL OR category_id = $2)
     AND (provider_id IS NULL OR provider_id = $3)
     ORDER BY category_id NULLS LAST, provider_id NULLS LAST`,
    [transaction.country || null, transaction.categoryId || null, transaction.providerId || null]
  );

  const fees = [];
  let totalFees = 0;

  for (const fee of applicableFees.rows) {
    let amount = 0;

    if (fee.calculation_type === 'percentage') {
      amount = (transaction.subtotal * fee.value) / 100;
      if (fee.min_amount && amount < fee.min_amount) amount = fee.min_amount;
      if (fee.max_amount && amount > fee.max_amount) amount = fee.max_amount;
    } else if (fee.calculation_type === 'fixed') {
      amount = fee.value;
    }

    amount = Math.round(amount * 100) / 100;
    totalFees += amount;

    fees.push({
      feeId: fee.id,
      name: fee.name,
      type: fee.type,
      amount,
      currency: fee.currency,
      calculation: { type: fee.calculation_type, value: fee.value, base: transaction.subtotal },
    });
  }

  const providerCommission = fees
    .filter(f => f.type === 'commission')
    .reduce((sum, f) => sum + f.amount, 0);

  const platformFee = fees
    .filter(f => f.type === 'platform_fee')
    .reduce((sum, f) => sum + f.amount, 0);

  const processingFee = fees
    .filter(f => f.type === 'processing')
    .reduce((sum, f) => sum + f.amount, 0);

  const providerEarnings = Math.round((transaction.subtotal - providerCommission) * 100) / 100;
  const customerTotal = Math.round((transaction.subtotal + platformFee + processingFee) * 100) / 100;

  return {
    fees,
    totalFees,
    providerCommission,
    platformFee,
    processingFee,
    providerEarnings,
    customerTotal,
  };
};

const createFee = async (feeData) => {
  const result = await query(
    `INSERT INTO fees (name, type, calculation_type, value, currency, country, category_id, provider_id, min_amount, max_amount, active, effective_from, effective_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [feeData.name, feeData.type, feeData.calculation_type, feeData.value, feeData.currency, feeData.country, feeData.categoryId, feeData.providerId, feeData.minAmount, feeData.maxAmount, feeData.active, feeData.effectiveFrom, feeData.effectiveTo]
  );
  return result.rows[0];
};

const listFees = async (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const result = await query('SELECT * FROM fees ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
  const countResult = await query('SELECT COUNT(*) FROM fees');
  const total = parseInt(countResult.rows[0].count);
  return { data: result.rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

module.exports = { calculateFees, createFee, listFees };