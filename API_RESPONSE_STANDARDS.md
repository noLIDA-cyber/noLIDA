# noLIDA API Response Standards

## Overview

All API endpoints must return standardized JSON responses. This ensures consistent behavior across the platform and simplifies frontend implementation.

---

## Response Format

### Success Response (2xx)

```json
{
  "success": true,
  "code": 200,
  "message": "Operation successful",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Fields:**
- `success` (boolean): Always `true` for successful responses
- `code` (number): HTTP status code (200, 201, 202, etc.)
- `message` (string): Human-readable success message
- `data` (object|array): Response payload (may be omitted if empty)

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "code": 400,
  "message": "Validation failed",
  "error": "validation_error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "type": "string.email"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "type": "string.min"
    }
  ]
}
```

**Fields:**
- `success` (boolean): Always `false` for error responses
- `code` (number): HTTP status code (400, 401, 403, 404, 500, etc.)
- `message` (string): Human-readable error message
- `error` (string): Machine-readable error code (e.g., `validation_error`, `unauthorized`, `not_found`)
- `details` (array): Optional detailed error information (especially for validation errors)

### Paginated Response

```json
{
  "success": true,
  "code": 200,
  "message": "Fetched successfully",
  "data": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" },
    { "id": 3, "name": "Item 3" }
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

**Pagination Fields:**
- `page` (number): Current page (1-indexed)
- `limit` (number): Items per page
- `total` (number): Total count of items across all pages
- `pages` (number): Total number of pages
- `hasNextPage` (boolean): Whether there's a next page
- `hasPreviousPage` (boolean): Whether there's a previous page
- `offset` (number): Current offset in results (useful for alternative pagination)

---

## HTTP Status Codes

### 2xx Success

| Code | Name | Usage |
|------|------|-------|
| 200 | OK | Standard successful response for GET, PUT, PATCH |
| 201 | Created | Successful resource creation (POST) |
| 202 | Accepted | Asynchronous operation accepted (long-running tasks) |
| 204 | No Content | Successful response with no body (DELETE, some POST) |

### 4xx Client Errors

| Code | Name | Error Code | Usage |
|------|------|------------|-------|
| 400 | Bad Request | `bad_request` | Invalid input, malformed request |
| 401 | Unauthorized | `unauthorized` | Missing or invalid authentication |
| 403 | Forbidden | `forbidden` | Authenticated but insufficient permissions |
| 404 | Not Found | `not_found` | Resource doesn't exist |
| 409 | Conflict | `conflict` | Resource already exists (duplicate) |
| 422 | Unprocessable Entity | `validation_error` | Validation failed (use for detailed validation errors) |

### 5xx Server Errors

| Code | Name | Error Code | Usage |
|------|------|------------|-------|
| 500 | Internal Server Error | `internal_error` | Unexpected server error |
| 503 | Service Unavailable | `service_unavailable` | External service unavailable |

---

## Error Codes Reference

### Common Error Codes

```
authentication_error      - Authentication failed
authorization_error       - Permission denied
bad_request              - Invalid input
conflict                 - Resource conflict (e.g., duplicate email)
database_error           - Database operation failed
duplicate_resource       - Resource already exists
forbidden                - Access denied
internal_error           - Unexpected server error
invalid_reference        - Foreign key violation
not_found                - Resource not found
service_unavailable      - External service unavailable
unauthorized             - Not authenticated
validation_error         - Input validation failed
```

### Specific Error Codes (Domain)

```
auth/invalid_credentials       - Wrong email or password
auth/email_not_verified        - Email verification required
auth/otp_expired               - OTP has expired
auth/otp_invalid               - OTP is incorrect
auth/too_many_attempts         - Too many failed attempts
payment/insufficient_funds     - Payment method insufficient funds
payment/processing_failed      - Payment processing failed
payment/invalid_card           - Card is invalid
payout/method_not_set          - Payout method not configured
listing/approval_pending       - Listing pending approval
organization/not_member        - User not organization member
verification/not_verified      - Identity not verified
```

---

## Response Helpers in Code

### Using Response Utilities

All response helpers are in `server/utils/response.js`:

```javascript
const {
  sendSuccess,
  sendCreated,
  sendError,
  sendValidationError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendPaginated,
  HTTP_STATUS,
} = require('../utils/response');
```

### Examples

#### Successful GET
```javascript
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }
    sendSuccess(res, user, HTTP_STATUS.OK, 'User retrieved');
  } catch (error) {
    next(error);
  }
});
```

#### Successful POST (Created)
```javascript
router.post('/users', async (req, res, next) => {
  try {
    const user = await createUser(req.body);
    sendCreated(res, user, 'User created successfully');
  } catch (error) {
    next(error);
  }
});
```

#### Validation Error
```javascript
router.post('/users', async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req.body);
    if (error) {
      const details = error.details.map(err => ({
        field: err.context.key,
        message: err.message,
      }));
      return sendValidationError(res, details);
    }
    // ... create user
  } catch (error) {
    next(error);
  }
});
```

#### Paginated Response
```javascript
router.get('/listings', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const { listings, total } = await getListings(page, limit);
    sendPaginated(res, listings, total, page, limit);
  } catch (error) {
    next(error);
  }
});
```

#### Throwing AppError
```javascript
const { AppError } = require('../middleware/error');

router.delete('/users/:id', authenticate, async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404, 'not_found');
    }
    
    if (user.id !== req.user.id && !hasPermission(req.user, 'users.delete')) {
      throw new AppError('You cannot delete this user', 403, 'forbidden');
    }
    
    await deleteUser(user.id);
    sendSuccess(res, null, 200, 'User deleted');
  } catch (error) {
    next(error);
  }
});
```

#### Using asyncHandler
```javascript
const { asyncHandler } = require('../middleware/error');

router.get('/users/:id', authenticate, asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404, 'not_found');
  }
  sendSuccess(res, user);
}));

// No need for try-catch, asyncHandler wraps errors automatically
```

---

## Frontend Usage

### Basic Success Handling

```javascript
const response = await fetch('/api/v1/users/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const json = await response.json();

if (json.success) {
  console.log('User:', json.data);
} else {
  console.error('Error:', json.message);
}
```

### Handling Validation Errors

```javascript
async function submitForm(data) {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const json = await response.json();

  if (json.success) {
    console.log('Success:', json.data);
  } else if (json.error === 'validation_error' && json.details) {
    // Display validation errors
    json.details.forEach(detail => {
      console.error(`${detail.field}: ${detail.message}`);
    });
  } else {
    console.error('Error:', json.message);
  }
}
```

### Handling Paginated Responses

```javascript
async function fetchListings(page = 1, limit = 20) {
  const response = await fetch(`/api/v1/listings?page=${page}&limit=${limit}`);
  const json = await response.json();

  if (json.success) {
    console.log('Items:', json.data);
    console.log('Total:', json.pagination.total);
    console.log('Has next:', json.pagination.hasNextPage);
    console.log('Current page:', json.pagination.page);
  }
}
```

---

## Implementation Checklist

When building or updating an endpoint:

- [ ] Define input validation schema (Joi, etc.)
- [ ] Use appropriate HTTP status code
- [ ] Use correct response helper function
- [ ] For errors, provide meaningful error message and error code
- [ ] For validation errors, include details array with field-level errors
- [ ] For paginated endpoints, include pagination metadata
- [ ] Throw `AppError` with statusCode for application errors
- [ ] Test with valid input, invalid input, and edge cases
- [ ] Verify response format matches this standard
- [ ] Document pagination parameters (page, limit defaults)
- [ ] Add JSDoc comments explaining parameters

---

## Common Patterns

### Authentication Required
```javascript
const { authenticate } = require('../middleware/auth');

router.get('/protected', authenticate, asyncHandler(async (req, res) => {
  // req.user is now available
  sendSuccess(res, { userId: req.user.id });
}));
```

### Permission Check
```javascript
if (!hasPermission(req.user, 'users.delete')) {
  throw new AppError('Insufficient permissions', 403, 'forbidden');
}
```

### Conditional Response
```javascript
if (!user) {
  return sendNotFound(res, 'User not found');
}
// Continue processing
```

### Async Handler Cleanup
```javascript
// Instead of:
router.get('/users', (req, res, next) => {
  getUserList()
    .then(users => sendSuccess(res, users))
    .catch(next); // Still catches errors
});

// Do:
router.get('/users', asyncHandler(async (req, res) => {
  const users = await getUserList();
  sendSuccess(res, users);
}));
```

---

## Migration Notes

When updating existing endpoints to this standard:

1. Replace direct `res.json()` calls with response helpers
2. Replace manual status code setting with appropriate helper
3. Add error codes to error responses
4. Consolidate error handling to single error middleware
5. Add validation error details to validation failures
6. Update tests to check for new response format
7. Update frontend API client to handle new format

---

## Questions?

Refer to the response utility file: `server/utils/response.js`
Refer to error handler: `server/middleware/error.js`
