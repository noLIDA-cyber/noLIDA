const router = require('express').Router();
const express = require('express');
const { handleFlutterwaveWebhook } = require('../services/webhookService');

router.post('/flutterwave', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const payload = req.body;
    const signature = req.headers['verif-hash'] || req.headers['x-flutterwave-signature'];

    if (!signature) {
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    const result = await handleFlutterwaveWebhook(payload, { 'verif-hash': signature });
    res.json(result);
  } catch (error) {
    if (error.message.includes('signature') || error.message.includes('secret')) {
      return res.status(401).json({ success: false, message: error.message });
    }
    next(error);
  }
});

module.exports = router;
