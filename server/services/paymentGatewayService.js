const { query } = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/error');

const providers = {};

const registerProvider = (name, implementation) => {
  providers[name] = implementation;
};

const getProvider = (name) => {
  if (!providers[name]) {
    throw new AppError(`Payment provider "${name}" is not supported`, 400);
  }
  return providers[name];
};

const listProviders = () => {
  return Object.keys(providers);
};

const calculateFees = async (amount, currency, categoryId, providerId, country) => {
  const fees = await query(
    `SELECT * FROM fees WHERE active = TRUE AND (country IS NULL OR country = $1) AND (category_id IS NULL OR category_id = $2) AND (provider_id IS NULL OR provider_id = $3) AND effective_from <= NOW() AND (effective_to IS NULL OR effective_to >= NOW()) ORDER BY type`,
    [country || null, categoryId || null, providerId || null]
  );

  let totalFee = 0;
  const feeBreakdown = [];

  for (const fee of fees.rows) {
    let feeAmount = 0;

    if (fee.calculation_type === 'percentage') {
      feeAmount = (amount * fee.value) / 100;
    } else if (fee.calculation_type === 'fixed') {
      feeAmount = fee.value;
    } else if (fee.calculation_type === 'tiered') {
      const tiers = JSON.parse(fee.metadata?.tiers || '[]');
      for (const tier of tiers) {
        if (amount >= tier.min && (tier.max === null || amount <= tier.max)) {
          feeAmount = tier.value;
          break;
        }
      }
    }

    if (fee.min_amount && feeAmount < fee.min_amount) {
      feeAmount = fee.min_amount;
    }
    if (fee.max_amount && feeAmount > fee.max_amount) {
      feeAmount = fee.max_amount;
    }

    totalFee += feeAmount;
    feeBreakdown.push({
      feeId: fee.id,
      name: fee.name,
      type: fee.type,
      amount: parseFloat(feeAmount.toFixed(2)),
    });
  }

  const net = amount - totalFee;

  return {
    gross: amount,
    totalFees: parseFloat(totalFee.toFixed(2)),
    net: parseFloat(net.toFixed(2)),
    currency,
    breakdown: feeBreakdown,
  };
};

const createPayment = async (providerName, paymentData) => {
  const provider = getProvider(providerName);
  return provider.createPayment(paymentData);
};

const verifyPayment = async (providerName, reference) => {
  const provider = getProvider(providerName);
  return provider.verifyPayment(reference);
};

const initiatePayout = async (providerName, payoutData) => {
  const provider = getProvider(providerName);
  return provider.initiatePayout(payoutData);
};

const getPayoutStatus = async (providerName, reference) => {
  const provider = getProvider(providerName);
  return provider.getPayoutStatus(reference);
};

const processRefund = async (providerName, refundData) => {
  const provider = getProvider(providerName);
  return provider.processRefund(refundData);
};

module.exports = {
  registerProvider,
  getProvider,
  listProviders,
  calculateFees,
  createPayment,
  verifyPayment,
  initiatePayout,
  getPayoutStatus,
  processRefund,
};
