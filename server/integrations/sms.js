const env = require('../config/env');
const { AppError } = require('../middleware/error');

const sendSMS = async (to, message) => {
  if (env.sms.provider === 'twilio') {
    const twilio = require('twilio');
    const client = twilio(env.sms.twilio.accountSid, env.sms.twilio.authToken);

    try {
      const result = await client.messages.create({
        body: message,
        from: env.sms.twilio.phoneNumber,
        to,
      });
      return { sid: result.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      throw new AppError('Failed to send SMS', 500);
    }
  }

  console.log(`[SMS SKIPPED] To: ${to}, Message: ${message}`);
  return { skipped: true };
};

const sendOTPSMS = async (to, otp) => {
  const message = `Your noLIDA verification code is: ${otp}. This code will expire in 10 minutes.`;
  return sendSMS(to, message);
};

module.exports = { sendSMS, sendOTPSMS };