const router = require('express').Router();
const { sendSuccess } = require('../utils/response');

router.get('/', (req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || 'v1',
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || 'unknown',
  });
});

module.exports = router;