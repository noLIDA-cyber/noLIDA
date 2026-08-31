const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { createAuthorizationCode, validateAuthorizationCode, getAuthorizationCode, listAuthorizationCodes, revokeAuthorizationCode } = require('../services/authorizationCodeService');
const { AppError } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');

router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('Authorization code is required', 400);
    }

    const result = await validateAuthorizationCode(req.user.id, code, req.ip, req.headers['user-agent']);
    sendSuccess(res, { valid: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/my-codes', authenticate, async (req, res, next) => {
  try {
    const result = await listAuthorizationCodes({ intendedUserId: req.user.id, limit: 50 });
    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate, authorize('super_admin', 'admin'));

router.post('/', async (req, res, next) => {
  try {
    const code = await createAuthorizationCode(req.user.id, req.body);
    sendSuccess(res, code, 201);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await listAuthorizationCodes(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const code = await getAuthorizationCode(req.params.id);
    const { code_hash, ...safeCode } = code;
    sendSuccess(res, safeCode);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await revokeAuthorizationCode(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
