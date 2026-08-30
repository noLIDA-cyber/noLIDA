const { sendSuccess } = require('../utils/response');

const healthCheck = async (req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1',
  });
};

module.exports = { healthCheck };