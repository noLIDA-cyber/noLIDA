require('dotenv').config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiVersion: process.env.API_VERSION || 'v1',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },
  sms: {
    provider: process.env.SMS_PROVIDER,
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    },
  },
  flutterwave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    webhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET,
  },
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './uploads',
    s3: {
      bucket: process.env.STORAGE_S3_BUCKET,
      region: process.env.STORAGE_S3_REGION,
      accessKey: process.env.STORAGE_S3_ACCESS_KEY,
      secretKey: process.env.STORAGE_S3_SECRET_KEY,
    },
  },
  maps: {
    provider: process.env.MAPS_PROVIDER || 'google',
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
  app: {
    url: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS) || 5,
    otpResendCooldownSeconds: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  },
};

module.exports = env;