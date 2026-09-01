const router = require('express').Router();
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { getUserProfile, updateUserProfile } = require('../services/userService');
const { hasApprovedBusiness, getApprovedBusiness } = require('../services/businessSubmissionService');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');
const { validateRequest, profileSchemas, schemas } = require('../utils/validation');

// Get authenticated user's profile
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserProfile(req.user.id);
    const businessApproved = await hasApprovedBusiness(req.user.id);
    const business = await getApprovedBusiness(req.user.id);
    sendSuccess(res, { ...user, business_approved: businessApproved, business: business || null });
  })
);

// Get business status
router.get('/business-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const approved = await hasApprovedBusiness(req.user.id);
    const business = await (require('../services/businessSubmissionService').getLatestBusinessSubmission(req.user.id));
    sendSuccess(res, { approved, business }, 200, 'Business status retrieved successfully');
  })
);

// Get theme preferences (unauthenticated users get defaults)
router.get('/theme',
  asyncHandler(async (req, res) => {
    if (req.user) {
      const user = await getUserProfile(req.user.id);
      return sendSuccess(res, { theme: user.theme || 'system', accent: user.accent || 'default' });
    }
    sendSuccess(res, { theme: 'system', accent: 'default' });
  })
);

// Update theme preference
const updateThemeSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system').optional(),
  accent: Joi.string().valid('default', 'neon-green', 'sunset', 'cyan', 'sage', 'burgundy').optional(),
}).min(1); // At least one field required

router.patch('/theme',
  authenticate,
  validateRequest(updateThemeSchema),
  asyncHandler(async (req, res) => {
    const { theme, accent } = req.body;

    const updates = {};
    if (theme) updates.theme = theme;
    if (accent) updates.accent = accent;

    const user = await updateUserProfile(req.user.id, updates);
    sendSuccess(res, { theme: user.theme, accent: user.accent }, 200, 'Theme preferences updated successfully');
  })
);

// Update user profile
router.patch('/me',
  authenticate,
  validateRequest(profileSchemas.update),
  asyncHandler(async (req, res) => {
    const user = await updateUserProfile(req.user.id, req.body);
    sendSuccess(res, user, 200, 'Profile updated successfully');
  })
);

module.exports = router;