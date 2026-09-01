const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { createLocation, getUserLocations, getLocation, updateLocation, deleteLocation } = require('../services/locationService');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const locations = await getUserLocations(req.user.id);
    sendSuccess(res, locations);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const location = await getLocation(req.params.id, req.user.id);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const location = await createLocation(req.user.id, req.body);
    sendSuccess(res, location, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const location = await updateLocation(req.params.id, req.user.id, req.body);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteLocation(req.params.id, req.user.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
