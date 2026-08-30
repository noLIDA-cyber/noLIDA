const { registerProvider } = require('./paymentGatewayService');
const { initiatePayment, verifyPayment, initiateTransfer, getTransfer, refundPayment } = require('../integrations/flutterwave');

registerProvider('flutterwave', {
  createPayment: async (paymentData) => {
    const response = await initiatePayment({
      tx_ref: paymentData.reference || `TXN-${Date.now()}`,
      amount: paymentData.amount,
      currency: paymentData.currency || 'NGN',
      payment_method: paymentData.method || 'card',
      customer: paymentData.customer || {},
      customizations: paymentData.customizations || {},
      meta: paymentData.meta || {},
    });
    return response.data;
  },

  verifyPayment: async (reference) => {
    const response = await verifyPayment(reference);
    return response.data;
  },

  initiatePayout: async (payoutData) => {
    const response = await initiateTransfer({
      account_bank: payoutData.bankCode,
      account_number: payoutData.accountNumber,
      amount: payoutData.amount,
      currency: payoutData.currency || 'NGN',
      reference: payoutData.reference || `PAYOUT-${Date.now()}`,
      narration: payoutData.narration || 'noLIDA payout',
      meta: payoutData.meta || {},
    });
    return response.data;
  },

  getPayoutStatus: async (reference) => {
    const response = await getTransfer(reference);
    return response.data;
  },

  processRefund: async (refundData) => {
    const response = await refundPayment(refundData.reference, refundData.amount);
    return response.data;
  },
});

module.exports = {};
