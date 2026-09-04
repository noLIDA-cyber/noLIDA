require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

const { generalLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFound } = require('./middleware/error');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const categoryRoutes = require('./routes/categories');
const listingRoutes = require('./routes/listings');
const organizationRoutes = require('./routes/organizations');
const locationRoutes = require('./routes/locations');
const bookingRoutes = require('./routes/bookings');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payments');
const paymentMethodRoutes = require('./routes/paymentMethods');
const reviewRoutes = require('./routes/reviews');
const disputeRoutes = require('./routes/disputes');
const verificationRoutes = require('./routes/verification');
const riskRoutes = require('./routes/risk');
const auditRoutes = require('./routes/audit');
const providerRoutes = require('./routes/provider');
const analyticsRoutes = require('./routes/analytics');
const customerRoutes = require('./routes/customers');
const webhookRoutes = require('./routes/webhooks');
const payoutRoutes = require('./routes/payouts');
const requestRoutes = require('./routes/requests');
const feeRoutes = require('./routes/fees');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const authorizationCodeRoutes = require('./routes/authorizationCodes');
const businessSubmissionRoutes = require('./routes/businessSubmissions'); // business-submissions

require('./services/paymentGatewaySetup');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.CORS_ORIGIN;
    if (!allowed) {
      return callback(null, true);
    }
    const allowedList = allowed.split(',').map(o => o.trim()).filter(Boolean);
    if (!origin) {
      return callback(null, true);
    }
    const normalize = (s) => s.replace(/\/+$/, '').toLowerCase();
    const matched = allowedList.find(o => normalize(o) === normalize(origin));
    if (matched) {
      return callback(null, origin);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders: (res) => {
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/webhooks', webhookRoutes);

app.use(generalLimiter);

app.use(`/api/${process.env.API_VERSION || 'v1'}/health`, healthRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authRoutes);
const authGoogleRouter = require('./routes/auth/google');
const authAppleRouter = require('./routes/auth/apple');
const authPhoneRouter = require('./routes/auth/phone');
const authTwoFactorRouter = require('./routes/auth/two-factor');
const authSessionsRouter = require('./routes/auth/sessions');
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authGoogleRouter);
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authAppleRouter);
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authPhoneRouter);
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authTwoFactorRouter);
app.use(`/api/${process.env.API_VERSION || 'v1'}/auth`, authSessionsRouter);
app.use(`/api/${process.env.API_VERSION || 'v1'}/users`, userRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/search`, searchRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/admin`, adminRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/categories`, categoryRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/listings`, listingRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/organizations`, organizationRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/locations`, locationRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/bookings`, bookingRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/orders`, orderRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/cart`, cartRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/payments`, paymentRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/payment-methods`, paymentMethodRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/reviews`, reviewRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/disputes`, disputeRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/verification`, verificationRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/risk`, riskRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/audit`, auditRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/provider`, providerRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/analytics`, analyticsRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/customers`, customerRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/payouts`, payoutRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/requests`, requestRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/fees`, feeRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/notifications`, notificationRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/upload`, uploadRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/authorization-codes`, authorizationCodeRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/business-submissions`, businessSubmissionRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/auth.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/register.html'));
});

app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/forgot-password.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/dashboard.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/search.html'));
});

app.get('/categories', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/categories.html'));
});

app.get('/listing/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/listing.html'));
});

app.get('/list-business', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/list-business.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/admin.html'));
});

app.get('/provider', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/provider.html'));
});

app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/orders.html'));
});

app.get('/customers', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/customers.html'));
});

app.get('/customer/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/customer.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/analytics.html'));
});

app.get('/bookings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/bookings.html'));
});

app.get('/booking/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/booking.html'));
});

app.get('/book/new', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/book-new.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/checkout.html'));
});

app.get('/reviews', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/reviews.html'));
});

app.get('/disputes', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/disputes.html'));
});

app.get('/verification', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/verification.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings.html'));
});

app.get('/account', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/account.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/notifications.html'));
});

app.get('/settings/security', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings-security.html'));
});

app.get('/settings/payments', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings-payments.html'));
});

app.get('/settings/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings-privacy.html'));
});

app.get('/settings/account', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/settings-account.html'));
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const { testConnection } = require('./config/database');
    await testConnection();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
  }
};

startServer();

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`noLIDA server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

module.exports = app;
// last touched: 2026-09-04T16:10:00Z - force Railway redeploy