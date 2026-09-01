const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { requireOrganizationRole } = require('../middleware/authorization');
const {
  createOrganization,
  getUserOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
  getRoles,
  getOrganizationStats,
} = require('../services/organizationService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendCreated, sendPaginated } = require('../utils/response');
const { validateRequest, validateParams, organizationSchemas, schemas } = require('../utils/validation');

// Get user's organizations
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizations = await getUserOrganizations(req.user.id);
    sendSuccess(res, organizations);
  })
);

// Get single organization
router.get('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  asyncHandler(async (req, res) => {
    const organization = await getOrganization(req.params.id, req.user.id);
    sendSuccess(res, organization);
  })
);

// Create new organization
router.post('/',
  authenticate,
  validateRequest(organizationSchemas.create),
  asyncHandler(async (req, res) => {
    const organization = await createOrganization(req.user.id, req.body);
    sendCreated(res, organization, 'Organization created successfully');
  })
);

// Update organization (owner only)
router.patch('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  requireOrganizationRole('owner', { paramName: 'id' }),
  validateRequest(organizationSchemas.update),
  asyncHandler(async (req, res) => {
    const organization = await updateOrganization(req.params.id, req.user.id, req.body);
    sendSuccess(res, organization, 200, 'Organization updated successfully');
  })
);

// Delete organization (owner only)
router.delete('/:id',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  requireOrganizationRole('owner', { paramName: 'id' }),
  asyncHandler(async (req, res) => {
    const result = await deleteOrganization(req.params.id, req.user.id);
    sendSuccess(res, result, 200, 'Organization deleted successfully');
  })
);

// Get organization members
router.get('/:id/members',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  asyncHandler(async (req, res) => {
    const members = await getOrganizationMembers(req.params.id, req.user.id);
    sendSuccess(res, members);
  })
);

// Add organization member (owner only)
router.post('/:id/members',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  requireOrganizationRole('owner', { paramName: 'id' }),
  validateRequest(organizationSchemas.addMember),
  asyncHandler(async (req, res) => {
    const member = await addOrganizationMember(req.params.id, req.user.id, req.body);
    sendCreated(res, member, 'Member added successfully');
  })
);

// Remove organization member (owner only)
router.delete('/:id/members/:memberId',
  authenticate,
  validateParams(Joi.object({ id: schemas.id, memberId: schemas.id }),
  requireOrganizationRole('owner', { paramName: 'id' }),
  asyncHandler(async (req, res) => {
    const result = await removeOrganizationMember(req.params.id, req.user.id, req.params.memberId);
    sendSuccess(res, result, 200, 'Member removed successfully');
  })
);

// Update member role (owner only)
router.patch('/:id/members/:memberId/role',
  authenticate,
  validateParams(Joi.object({ id: schemas.id, memberId: schemas.id }),
  requireOrganizationRole('owner', { paramName: 'id' }),
  validateRequest(organizationSchemas.updateMemberRole),
  asyncHandler(async (req, res) => {
    const member = await updateMemberRole(req.params.id, req.user.id, req.params.memberId, req.body.roleId);
    sendSuccess(res, member, 200, 'Member role updated successfully');
  })
);

// Get organization stats
router.get('/:id/stats',
  authenticate,
  validateParams(Joi.object({ id: schemas.id }),
  asyncHandler(async (req, res) => {
    const stats = await getOrganizationStats(req.params.id, req.user.id);
    sendSuccess(res, stats);
  })
);

// Get available roles
router.get('/roles/all',
  authenticate,
  asyncHandler(async (req, res) => {
    const roles = await getRoles();
    sendSuccess(res, roles);
  })
);

module.exports = router;
