const { sendOTPEmail, sendPasswordResetEmail } = require('../integrations/email');
const { sendOTPSMS } = require('../integrations/sms');
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

module.exports = {
  sendVerificationEmail,
  sendPasswordReset,
  sendOTPNotification,
  sendBookingConfirmation,
  sendPaymentReceipt,
  sendDisputeNotification,
};