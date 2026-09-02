const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorization');
const { createFee, getFees, getFee, updateFee, deleteFee } = require('../services/feeService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateRequest, validateParams, validateQuery, paginationSchema, feeSchemas, schemas } = require('../utils/validation');

// Admin routes - require authentication and permissions
router.use(authenticate);

// List fees (requires settings.manage or view permission)
router.get('/',
  requirePermission(['settings.manage', 'reports.view'], { mode: 'any' }),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.categoryId) filters.categoryId = parseInt(req.query.categoryId);
    if (req.query.providerId) filters.providerId = parseInt(req.query.providerId);
    if (req.query.country) filters.country = req.query.country;
    if (req.query.active !== undefined) filters.active = req.query.active === 'true';

    const fees = await getFees(filters);
    sendSuccess(res, fees, 200, 'Fees retrieved successfully');
  })
);

// Get single fee
router.get('/:id',
  requirePermission(['settings.manage', 'reports.view'], { mode: 'any' }),
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const fee = await getFee(req.params.id);
    sendSuccess(res, fee, 200, 'Fee retrieved successfully');
  })
);

// Create fee (requires settings.manage permission)
router.post('/',
  requirePermission('settings.manage'),
  validateRequest(feeSchemas.create),
  asyncHandler(async (req, res) => {
    const fee = await createFee(req.body);
    sendCreated(res, fee, 'Fee created successfully');
  })
);

// Update fee (requires settings.manage permission)
router.patch('/:id',
  requirePermission('settings.manage'),
  validateParams(Joi.object({ id: schemas.id })),
  validateRequest(feeSchemas.update),
  asyncHandler(async (req, res) => {
    const fee = await updateFee(req.params.id, req.body);
    sendSuccess(res, fee, 200, 'Fee updated successfully');
  })
);

// Delete fee (requires settings.manage permission)
router.delete('/:id',
  requirePermission('settings.manage'),
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const result = await deleteFee(req.params.id);
    sendSuccess(res, result, 200, 'Fee deleted successfully');
  })
);

module.exports = router;
