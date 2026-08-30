const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload, uploadProfilePhoto, removeProfilePhoto, uploadVerificationDoc, uploadVerificationDocument } = require('../services/uploadService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.post('/avatar', authenticate, upload.single('avatar'), uploadProfilePhoto);
router.delete('/avatar', authenticate, removeProfilePhoto);

router.post('/verification-document', authenticate, uploadVerificationDoc.single('document'), uploadVerificationDocument);

module.exports = router;
