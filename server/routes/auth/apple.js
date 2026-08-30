const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const { authenticateWithApple } = require('../../services/appleAuthService');
const { generateTokens } = require('../../utils/crypto');
const { sendSuccess, sendError } = require('../../utils/response');

router.post('/apple', async (req, res, next) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      throw new AppError('Apple identity token is required', 400);
    }

    const { user, tokens } = await authenticateWithApple(identityToken);

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
