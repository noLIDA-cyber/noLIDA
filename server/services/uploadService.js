const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');
const { sendSuccess, sendError } = require('../utils/response');
const env = require('../config/env');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    return cb(new AppError('Invalid file type. Only JPG, PNG, and WebP are allowed.', 400), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const fileUrl = `/uploads/profiles/${req.file.filename}`;
    const result = await query(
      'UPDATE profiles SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
      [fileUrl, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    sendSuccess(res, { avatar_url: fileUrl });
  } catch (error) {
    next(error);
  }
};

const removeProfilePhoto = async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE profiles SET avatar_url = NULL, updated_at = NOW() WHERE user_id = $1 RETURNING *',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    sendSuccess(res, { message: 'Profile photo removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadProfilePhoto, removeProfilePhoto };
