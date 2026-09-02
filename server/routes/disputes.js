const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requireOwnership, requireTransactionAccess } = require('../middleware/ownership');
const { requirePermission } = require('../middleware/authorization');
const { createDispute, getDispute, listDisputes, updateDisputeStatus } = require('../services/disputeService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateRequest, validateParams, validateQuery, paginationSchema, disputeSchemas, schemas } = require('../utils/validation');

// Create dispute (requires transaction involvement)
router.post('/',
  authenticate,
  validateRequest(disputeSchemas.create),
  asyncHandler(async (req, res) => {
    const dispute = await createDispute(req.user.id, req.body);
    sendCreated(res, dispute, 'Dispute created successfully');
  })
);

// List disputes (admin/moderator only)
router.get('/',
  authenticate,
  requirePermission(['disputes.view', 'disputes.manage'], { mode: 'any' }),
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listDisputes({ ...req.query, page, limit });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Disputes retrieved successfully');
  })
);

// List user's own disputes
router.get('/me',
  authenticate,
  validateQuery(paginationSchema, { presence: 'optional' }),
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listDisputes({ openedBy: req.user.id, page, limit });
    sendPaginated(res, result.data, result.pagination.total, result.pagination.page, result.pagination.limit, 'Your disputes retrieved successfully');
  })
);

// Get single dispute
router.get('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  requireOwnership('dispute'),
  asyncHandler(async (req, res) => {
    const dispute = await getDispute(req.params.id);
    sendSuccess(res, dispute, 200, 'Dispute retrieved successfully');
  })
);

// Update dispute status (admin/moderator or owner with permission)
router.patch('/:id/status',
  authenticate,
  validateParams(Joi.object({ id: schemas.id })),
  requirePermission(['disputes.manage', 'disputes.view'], { mode: 'any' }),
  validateRequest(disputeSchemas.updateStatus),
  asyncHandler(async (req, res) => {
    const { status, resolution, notes } = req.body;
    const dispute = await updateDisputeStatus(req.params.id, status, req.user.id, resolution, notes);
    sendSuccess(res, dispute, 200, 'Dispute status updated successfully');
  })
);

module.exports = router;
