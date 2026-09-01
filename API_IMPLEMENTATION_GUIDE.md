# API Response Standardization — Implementation Guide

## What Changed

The API response format has been standardized across all endpoints to provide consistent, predictable responses for frontend developers.

---

## Files Modified/Created

### 1. `server/utils/response.js` ✅
**Status:** Completely rewritten

**New Functions:**
- `sendSuccess(res, data, statusCode, message)` - Generic success response
- `sendCreated(res, data, message)` - 201 Created response
- `sendError(res, message, statusCode, error, details)` - Generic error
- `sendValidationError(res, details, message)` - 422 Validation error with field details
- `sendBadRequest(res, message, error)` - 400 Bad request
- `sendUnauthorized(res, message)` - 401 Unauthorized
- `sendForbidden(res, message)` - 403 Forbidden
- `sendNotFound(res, message)` - 404 Not found
- `sendConflict(res, message, error)` - 409 Conflict
- `sendPaginated(res, data, total, page, limit, message)` - Paginated response with full metadata
- `sendNoContent(res)` - 204 No content
- `sendServerError(res, message)` - 500 Internal error
- `sendServiceUnavailable(res, message)` - 503 Service unavailable

**New Exports:**
- `HTTP_STATUS` - Object with HTTP status codes for reference

### 2. `server/middleware/error.js` ✅
**Status:** Enhanced error handling

**Changes:**
- Now uses standardized response format
- Added handling for specific error codes (PostgreSQL 23505, 23503)
- Added Joi validation error handling
- New `asyncHandler()` wrapper for automatic error catching
- Better logging with error codes
- Development vs production error detail levels

**New Exports:**
- `asyncHandler(fn)` - Wraps async functions to catch errors automatically

### 3. `server/utils/validation.js` ✅ **NEW**
**Status:** Complete input validation utility

**Features:**
- Joi-based schema validation
- Pre-defined common schemas (email, password, phone, names, etc.)
- Middleware factories: `validateRequest()`, `validateQuery()`, `validateParams()`
- Manual validation with `validate()` function
- Error sanitization and type conversion
- Pre-built schema collections:
  - `authSchemas` - registration, login, password reset
  - `profileSchemas` - profile updates
  - `listingSchemas` - listing creation/updates
  - `paginationSchema` - pagination parameters

### 4. `API_RESPONSE_STANDARDS.md` ✅ **NEW**
**Status:** Comprehensive documentation

Contains:
- Response format specifications
- HTTP status code reference
- Error codes reference
- Usage examples for all response types
- Frontend usage patterns
- Migration checklist

---

## Quick Start for Route Implementation

### Before (Old Pattern)
```javascript
router.post('/users', async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### After (New Pattern)
```javascript
const { asyncHandler } = require('../middleware/error');
const { sendCreated } = require('../utils/response');

router.post('/users', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  sendCreated(res, user);
}));

// Error handling is automatic! No try-catch needed.
```

---

## Implementation Checklist

### For Each API Endpoint

- [ ] Replace `res.json()` with appropriate `send*` function
- [ ] Use correct HTTP status code (200, 201, 400, 401, 404, etc.)
- [ ] Add proper error code strings (not just messages)
- [ ] For validation errors, include `details` array
- [ ] Use `asyncHandler` wrapper to eliminate try-catch boilerplate
- [ ] Test response format with actual requests
- [ ] Update tests to check new response structure

### Example: Complete Endpoint Refactoring

**Before:**
```javascript
router.get('/listings/:id', async (req, res, next) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'ID is required'
      });
    }

    const listing = await getListing(req.params.id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});
```

**After:**
```javascript
const { asyncHandler } = require('../middleware/error');
const { sendSuccess, sendNotFound } = require('../utils/response');
const { validateParams } = require('../utils/validation');
const { schemas } = require('../utils/validation');
const Joi = require('joi');

router.get(
  '/listings/:id',
  validateParams(Joi.object({ id: schemas.id })),
  asyncHandler(async (req, res) => {
    const listing = await getListing(req.params.id);
    if (!listing) {
      return sendNotFound(res, 'Listing not found');
    }
    sendSuccess(res, listing);
  })
);
```

---

## Response Format Examples

### Success Response
```json
{
  "success": true,
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "John Doe"
  }
}
```

### Created Response
```json
{
  "success": true,
  "code": 201,
  "message": "Resource created successfully",
  "data": {
    "id": 42,
    "email": "user@example.com"
  }
}
```

### Validation Error
```json
{
  "success": false,
  "code": 422,
  "message": "Validation failed",
  "error": "validation_error",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email",
      "type": "string.email"
    },
    {
      "field": "password",
      "message": "Password must contain uppercase, lowercase, and number",
      "type": "string.pattern.base"
    }
  ]
}
```

### Paginated Response
```json
{
  "success": true,
  "code": 200,
  "message": "Fetched successfully",
  "data": [
    { "id": 1, "title": "Item 1" },
    { "id": 2, "title": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "offset": 0
  }
}
```

---

## HTTP Status Codes Quick Reference

| Code | Use For | Function |
|------|---------|----------|
| 200 | GET, PUT, PATCH success | `sendSuccess()` |
| 201 | POST success (resource created) | `sendCreated()` |
| 204 | DELETE success (no response body) | `sendNoContent()` |
| 400 | Bad request | `sendBadRequest()` |
| 401 | Not authenticated | `sendUnauthorized()` |
| 403 | Permission denied | `sendForbidden()` |
| 404 | Resource not found | `sendNotFound()` |
| 409 | Resource conflict/duplicate | `sendConflict()` |
| 422 | Validation failed | `sendValidationError()` |
| 500 | Server error | `sendServerError()` |
| 503 | Service unavailable | `sendServiceUnavailable()` |

---

## Validation Examples

### Using Middleware
```javascript
const { validateRequest, validateQuery, authSchemas, paginationSchema } = require('../utils/validation');

// Validate POST body
router.post('/auth/register', 
  validateRequest(authSchemas.register),
  asyncHandler(async (req, res) => {
    // req.body is already validated
    const user = await registerUser(req.body);
    sendCreated(res, user);
  })
);

// Validate query parameters
router.get('/listings',
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    // req.query.page, req.query.limit are validated numbers
    const { listings, total } = await getListings(req.query);
    sendPaginated(res, listings, total, req.query.page, req.query.limit);
  })
);
```

### Manual Validation
```javascript
const { validate, throwIfInvalid, authSchemas } = require('../utils/validation');

const result = validate(req.body, authSchemas.login);
throwIfInvalid(result); // Throws AppError if invalid

const { value } = result;
const user = await loginUser(value);
```

---

## Error Codes Reference

### Authentication Errors
- `unauthorized` - Not authenticated
- `invalid_credentials` - Wrong email/password
- `email_not_verified` - Email verification required

### Authorization Errors
- `forbidden` - Insufficient permissions

### Validation Errors
- `validation_error` - Input validation failed
- `bad_request` - Invalid request format

### Not Found Errors
- `not_found` - Resource doesn't exist

### Conflict Errors
- `conflict` - Resource already exists
- `duplicate_resource` - Duplicate key/email

### Server Errors
- `internal_error` - Unexpected server error
- `service_unavailable` - External service down

---

## Migration Path for Existing Routes

### Priority 1 (Core)
- [ ] `server/routes/auth.js`
- [ ] `server/routes/users.js`
- [ ] `server/routes/payments.js`
- [ ] `server/routes/bookings.js`

### Priority 2 (High-value)
- [ ] `server/routes/listings.js`
- [ ] `server/routes/orders.js`
- [ ] `server/routes/admin.js`

### Priority 3 (Standard)
- [ ] `server/routes/search.js`
- [ ] `server/routes/reviews.js`
- [ ] `server/routes/notifications.js`

### Priority 4 (Other)
- [ ] Remaining routes

---

## Testing the New Format

### Test Success Response
```bash
curl http://localhost:3001/api/v1/health
# Should return 200 with standardized format
```

### Test Validation Error
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid"}'
# Should return 422 with validation details
```

### Test Not Found
```bash
curl http://localhost:3001/api/v1/users/99999
# Should return 404 with proper error format
```

---

## Common Patterns

### Check for Validation Errors in Frontend
```javascript
if (response.code === 422) {
  // Handle validation errors
  response.details?.forEach(error => {
    showFieldError(error.field, error.message);
  });
}
```

### Handle Specific Error Codes
```javascript
if (response.error === 'duplicate_resource') {
  showError('This email is already registered');
} else if (response.error === 'unauthorized') {
  redirectToLogin();
} else {
  showError(response.message);
}
```

### Display Pagination Controls
```javascript
const { pagination } = response;
showPagination({
  currentPage: pagination.page,
  totalPages: pagination.pages,
  hasNext: pagination.hasNextPage,
  hasPrev: pagination.hasPreviousPage,
});
```

---

## Questions & Troubleshooting

**Q: How do I handle validation in complex scenarios?**
A: Use the `validate()` function manually:
```javascript
const result = validate(data, schema);
if (result.error) {
  // Handle error with details
}
```

**Q: Can I add custom error codes?**
A: Yes! Pass any string as the `error` parameter:
```javascript
throw new AppError('Custom message', 400, 'my_custom_error');
```

**Q: How do I migrate a route gradually?**
A: Update one route at a time, test it thoroughly, then move to next.

**Q: What if the error handler doesn't catch my error?**
A: Make sure you're using `asyncHandler` or calling `next(error)`.

---

## Summary

The new response standardization provides:
- ✅ Consistent response format across all endpoints
- ✅ Better error handling with detailed validation errors
- ✅ Cleaner code with `asyncHandler` wrapper
- ✅ Type-safe validation with Joi schemas
- ✅ Reusable validation schemas
- ✅ Better debugging with error codes
- ✅ Comprehensive pagination support

Start migrating routes in priority order, test thoroughly, and update frontend accordingly.
