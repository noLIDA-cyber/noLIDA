const axios = require('axios');
const env = require('../config/env');

const flutterwave = axios.create({
  baseURL: 'https://api.flutterwave.com/v3',
  headers: {
    Authorization: `Bearer ${env.flutterwave.secretKey}`,
    'Content-Type': 'application/json',
  },
});

const initiatePayment = async (payload) => {
  const response = await flutterwave.post('/payments', payload);
  return response.data;
};

const verifyPayment = async (transactionId) => {
  const response = await flutterwave.get(`/transactions/${transactionId}/verify`);
  return response.data;
};

const initiateTransfer = async (payload) => {
  const response = await flutterwave.post('/transfers', payload);
  return response.data;
};

const getTransfer = async (transferId) => {
  const response = await flutterwave.get(`/transfers/${transferId}`);
  return response.data;
};

const refundPayment = async (transactionId, amount) => {
  const response = await flutterwave.post('/refunds', {
    transaction_id: transactionId,
    amount,
  });
  return response.data;
};

module.exports = {
  initiatePayment,
  verifyPayment,
  initiateTransfer,
  getTransfer,
  refundPayment,
};