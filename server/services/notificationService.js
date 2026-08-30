const { sendOTPEmail, sendPasswordResetEmail } = require('../integrations/email');
const { sendOTPSMS } = require('../integrations/sms');
const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const sendVerificationEmail = async (user) => {
  return sendOTPEmail(user.email, '000000', 'email_verification');
};

const sendPasswordReset = async (email, resetLink) => {
  return sendPasswordResetEmail(email, resetLink);
};

const sendOTPNotification = async (user, otp, type) => {
  if (type === 'email') {
    return sendOTPEmail(user.email, otp, type);
  }
  if (type === 'phone') {
    return sendOTPSMS(user.phone, otp);
  }
  throw new AppError('Unsupported OTP type', 400);
};

const sendBookingConfirmation = async (user, transaction) => {
  return sendOTPEmail(user.email, '000000', 'booking_confirmation');
};

const sendPaymentReceipt = async (user, payment) => {
  return sendOTPEmail(user.email, '000000', 'payment_receipt');
};

const sendDisputeNotification = async (user) => {
  return sendOTPEmail(user.email, '000000', 'dispute_notification');
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const result = await query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [userId, limit, offset]
  );
  const countResult = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
  const total = parseInt(countResult.rows[0].count);
  return { data: result.rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

const getUnreadCount = async (userId) => {
  const result = await query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = FALSE', [userId]);
  return { count: parseInt(result.rows[0].count) };
};

const markAsRead = async (notificationId, userId) => {
  const result = await query(
    'UPDATE notifications SET read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
    [notificationId, userId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Notification not found', 404);
  }
  return result.rows[0];
};

const markAllAsRead = async (userId) => {
  await query('UPDATE notifications SET read = TRUE, read_at = NOW() WHERE user_id = $1 AND read = FALSE', [userId]);
  return { message: 'All notifications marked as read' };
};

module.exports = {
  sendVerificationEmail,
  sendPasswordReset,
  sendOTPNotification,
  sendBookingConfirmation,
  sendPaymentReceipt,
  sendDisputeNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
