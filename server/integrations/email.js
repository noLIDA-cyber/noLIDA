const nodemailer = require('nodemailer');
const env = require('../config/env');
const { AppError } = require('../middleware/error');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.secure,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

const sendEmail = async (to, subject, html, text) => {
  if (!env.smtp.host || env.smtp.host === 'smtp.example.com') {
    console.log(`[EMAIL SKIPPED] To: ${to}, Subject: ${subject}`);
    return { skipped: true };
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text: text || subject,
      html,
    });
    return { messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw new AppError('Failed to send email', 500);
  }
};

const sendOTPEmail = async (to, otp, purpose) => {
  const subject = 'Your noLIDA Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0D0D0D;">noLIDA Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="font-size: 32px; letter-spacing: 8px; color: #0D0D0D;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p style="color: #6B7280; font-size: 14px;">If you did not request this code, please ignore this email.</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};

const sendPasswordResetEmail = async (to, resetLink) => {
  const subject = 'Reset your noLIDA password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0D0D0D;">Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #0D0D0D; color: #FFFFFF; text-decoration: none; border-radius: 8px; margin: 16px 0;">Reset Password</a>
      <p style="color: #6B7280; font-size: 14px;">This link will expire in 1 hour.</p>
    </div>
  `;

  return sendEmail(to, subject, html);
};

module.exports = { sendEmail, sendOTPEmail, sendPasswordResetEmail };