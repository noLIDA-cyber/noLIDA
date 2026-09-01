const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');
const { createAuthorizationCode, validateAuthorizationCode, getAuthorizationCode, listAuthorizationCodes, revokeAuthorizationCode } = require('../services/authorizationCodeService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateParams, validateQuery } = require('../utils/validation');
const { schemas } = require('../utils/validation');

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().pattern(/^-?[a-z_]+$/),
  search: Joi.string().max(255),
});

const validateSchema = Joi.object({
  code: Joi.string().required().messages({
    'any.required': 'Authorization code is required',
  }),
});

router.post('/validate', authenticate, (req, res, next) => {
  const { error, value } = validateSchema.validate(req.body, { abortEarly: false, stripUnknown: true, convert: true });
  if (error) {
    const details = error.details.map(detail => ({ field: detail.context.key, message: detail.message.replace(/"/g, ''), type: detail.type }));
    throw new AppError('Validation failed', 422, 'validation_error', details);
  }
  req.body = value;
  next();
}, async (req, res, next) => {
  try {
    const result = await validateAuthorizationCode(req.user.id, req.body.code, req.ip, req.headers['user-agent']);
    sendSuccess(res, { valid: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate, requirePermission('authorization_codes.manage'));

router.post('/', async (req, res, next) => {
  try {
    const code = await createAuthorizationCode(req.user.id, req.body);
    sendCreated(res, code, 'Authorization code created successfully');
  } catch (error) {
    next(error);
  }
});

router.get('/', validateQuery(paginationSchema, { presence: 'optional' }), async (req, res, next) => {
  try {
    const result = await listAuthorizationCodes(req.query);
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Authorization codes retrieved successfully');
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateParams(Joi.object({ id: schemas.id })), async (req, res, next) => {
  try {
    const code = await getAuthorizationCode(req.params.id);
    sendSuccess(res, code, 200, 'Authorization code retrieved successfully');
  } catch (error) {
    next(error);
  }
});

router.post('/:id/revoke', validateParams(Joi.object({ id: schemas.id })), async (req, res, next) => {
  try {
    const result = await revokeAuthorizationCode(req.user.id, req.params.id);
    sendSuccess(res, result, 200, 'Authorization code revoked successfully');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
