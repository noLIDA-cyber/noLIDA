const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { listLocations, getLocation, createLocation, updateLocation, deleteLocation, listServiceAreas, createServiceArea, deleteServiceArea } = require('../services/locationService');
const { sendSuccess } = require('../utils/response');

router.get('/', async (req, res, next) => {
  try {
    const result = await listLocations(req.query);
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
    const location = await getLocation(req.params.id);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const location = await createLocation(req.body);
    sendSuccess(res, location, 201);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const location = await updateLocation(req.params.id, req.body);
    sendSuccess(res, location);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteLocation(req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

router.get('/service-areas/me', authenticate, async (req, res, next) => {
  try {
    const serviceAreas = await listServiceAreas(req.user.id);
    sendSuccess(res, serviceAreas);
  } catch (error) {
    next(error);
  }
});

router.post('/service-areas', authenticate, async (req, res, next) => {
  try {
    const serviceArea = await createServiceArea(req.user.id, req.body);
    sendSuccess(res, serviceArea, 201);
  } catch (error) {
    next(error);
  }
});

router.delete('/service-areas/:id', authenticate, async (req, res, next) => {
  try {
    const result = await deleteServiceArea(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;