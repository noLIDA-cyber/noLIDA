# noLIDA

Universal discovery, service, commerce, booking, hiring, and transaction platform.

> Tell noLIDA what you need. We'll help you get it done.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Payments**: Flutterwave (abstraction layer)
- **Auth**: JWT + OAuth + OTP

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

### Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies:

```bash
npm install
```

4. Run database migrations:

```bash
npm run migrate
```

5. Start the development server:

```bash
npm run dev
```

6. Open `http://localhost:3000` in your browser.

## API Documentation

Base URL: `/api/v1`

### Authentication

- `POST /api/v1/auth/register` — Register a new user
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh access token
- `POST /api/v1/auth/logout` — Logout
- `POST /api/v1/auth/forgot-password` — Request password reset
- `POST /api/v1/auth/reset-password` — Reset password
- `POST /api/v1/auth/verify-email` — Verify email
- `POST /api/v1/auth/verify-phone` — Verify phone
- `POST /api/v1/auth/google` — Google Sign-In
- `POST /api/v1/auth/apple` — Apple Sign-In

### Users

- `GET /api/v1/users/me` — Get current user profile
- `PATCH /api/v1/users/me` — Update current user profile

### Health

- `GET /api/v1/health` — Health check

## Project Structure

```
server/
├── app.js
├── config/
│   ├── database.js
│   └── env.js
├── controllers/
├── middleware/
│   ├── auth.js
│   ├── authorize.js
│   ├── error.js
│   ├── rateLimit.js
│   └── notFound.js
├── routes/
│   ├── health.js
│   ├── auth.js
│   ├── users.js
│   ├── search.js
│   └── admin.js
├── services/
├── models/
├── integrations/
│   ├── flutterwave.js
│   ├── email.js
│   └── sms.js
├── utils/
│   ├── logger.js
│   ├── response.js
│   └── crypto.js
├── migrations/
├── seeds/
├── tests/
└── db/
    └── migrate.js

public/
├── assets/
│   └── images/
│       └── noLIDA.jpg
├── css/
│   ├── variables.css
│   ├── reset.css
│   ├── base.css
│   ├── components.css
│   └── utilities.css
├── js/
│   ├── api.js
│   ├── app.js
│   ├── auth.js
│   ├── ui.js
│   └── modules/
└── pages/
    ├── index.html
    ├── auth.html
    ├── dashboard.html
    ├── search.html
    └── admin.html
```

## Development Phases

- **Phase 0**: Foundation (current)
- **Phase 1**: Core Marketplace
- **Phase 2**: Transactions
- **Phase 3**: Trust
- **Phase 4**: Business Tools
- **Phase 5**: Growth
- **Phase 6**: Intelligence
- **Phase 7**: Scale

## License

Proprietary — noLIDA