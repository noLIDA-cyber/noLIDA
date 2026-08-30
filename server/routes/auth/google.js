const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { authenticateWithGoogle } = require('../../services/googleAuthService');
const { generateTokens } = require('../../utils/crypto');
const { sendSuccess, sendError } = require('../../utils/response');

router.post('/google', async (req, res, next) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      throw new AppError('Google access token is required', 400);
    }

    const { user, tokens } = await authenticateWithGoogle(accessToken);

    res.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, email_verified: user.email_verified },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
