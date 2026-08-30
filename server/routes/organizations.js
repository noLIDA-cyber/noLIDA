const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
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
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const organizations = await getUserOrganizations(req.user.id);
    sendSuccess(res, organizations);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const organization = await getOrganization(req.params.id, req.user.id);
    sendSuccess(res, organization);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const organization = await createOrganization(req.user.id, req.body);
    sendSuccess(res, organization, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const organization = await updateOrganization(req.params.id, req.user.id, req.body);
    sendSuccess(res, organization);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteOrganization(req.params.id, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/members', authenticate, async (req, res, next) => {
  try {
    const members = await getOrganizationMembers(req.params.id, req.user.id);
    sendSuccess(res, members);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', authenticate, async (req, res, next) => {
  try {
    const member = await addOrganizationMember(req.params.id, req.user.id, req.body);
    sendSuccess(res, member, 201);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:memberId', authenticate, async (req, res, next) => {
  try {
    const result = await removeOrganizationMember(req.params.id, req.user.id, req.params.memberId);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/members/:memberId/role', authenticate, async (req, res, next) => {
  try {
    const { roleId } = req.body;
    const member = await updateMemberRole(req.params.id, req.user.id, req.params.memberId, roleId);
    sendSuccess(res, member);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await getOrganizationStats(req.params.id, req.user.id);
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
});

router.get('/roles/all', authenticate, async (req, res, next) => {
  try {
    const roles = await getRoles();
    sendSuccess(res, roles);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
