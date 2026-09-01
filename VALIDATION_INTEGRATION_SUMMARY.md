# Validation Layer Integration — Priority 1 Routes

**Status:** ✅ **Complete for Priority 1 Routes**

**Completed Date:** September 1, 2026

---

## What Was Integrated

### Priority 1 Routes Updated

#### **1. Listings Routes** (`server/routes/listings.js`)

**Changes:**
- ✅ Added `validateRequest()` to POST (create) and PATCH (update)
- ✅ Added `validateParams()` to routes with `:id`
- ✅ Added `validateQuery()` to GET with pagination
- ✅ Replaced try-catch with `asyncHandler`
- ✅ Added `requireOwnership('listing')` to PATCH and DELETE
- ✅ Updated response helpers (`sendCreated`, `sendPaginated`)

**Route Structure (Before & After):**

```javascript
// BEFORE:
router.post('/', authenticate, async (req, res, next) => {
  try {
    const listing = await createListing(req.body);
    sendSuccess(res, listing, 201);
  } catch (error) {
    next(error);
  }
});

// AFTER:
router.post('/',
  authenticate,
  validateRequest(listingSchemas.create),
  asyncHandler(async (req, res) => {
    const listing = await createListing(req.body, req.user.id);
    sendCreated(res, listing, 'Listing created successfully');
  })
);
```

**Validation Applied:**
- `GET /listings` - Pagination validation (page, limit, sort, search)
- `GET /listings/:id` - Parameter validation (id must be positive integer)
- `POST /listings` - Full listing creation schema
  - `title` - 3-255 chars required
  - `description` - 10-5000 chars optional
  - `categoryId` - positive integer ID required
  - `basePrice` - positive decimal required
- `PATCH /listings/:id` - Listing update schema (all fields optional)
- `DELETE /listings/:id` - ID parameter validation

**Authorization Added:**
- PATCH and DELETE routes now require resource ownership
- Non-owners get 403 with audit log entry

---

#### **2. Orders Routes** (`server/routes/orders.js`)

**Changes:**
- ✅ Added `validateRequest()` to POST (create) and PATCH (status)
- ✅ Added `validateParams()` to all routes with `:id`
- ✅ Added `validateQuery()` to GET list with pagination
- ✅ Replaced try-catch with `asyncHandler`
- ✅ Added `requireOwnershipOrPermission()` to PATCH status
- ✅ Updated response helpers

**Route Structure (Before & After):**

```javascript
// BEFORE:
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatus(req.params.id, status, req.user.id);
    sendSuccess(res, order);
  } catch (error) {
    next(error);
  }
});

// AFTER:
router.patch('/:id/status',
  authenticate,
  validateParams({ id: schemas.id }),
  requireOwnershipOrPermission('order', 'orders.manage'),
  validateRequest(updateStatusSchema),
  asyncHandler(async (req, res) => {
    const order = await updateOrderStatus(req.params.id, req.body.status, req.user.id);
    sendSuccess(res, order, 200, 'Order status updated successfully');
  })
);
```

**Validation Applied:**
- `POST /orders` - Order creation schema
  - `listingId` - positive integer ID required
  - `quantity` - positive integer >= 1 required
  - `startDate` - ISO datetime required
  - `endDate` - ISO datetime required, must be after startDate
  - `notes` - 0-1000 chars optional
- `GET /orders/:id` - Parameter validation
- `GET /orders` - Pagination with role filter (customer|provider)
- `PATCH /orders/:id/status` - Status update schema
  - `status` - enum: confirmed, in_progress, completed, cancelled, disputed
  - `notes` - 0-500 chars optional
- `GET /orders/:id/receipt` - Parameter validation

**Authorization Added:**
- PATCH status requires either:
  - Resource ownership (customer or provider), OR
  - Admin permission (`orders.manage`)
- Non-authorized users get 403 with audit log entry

---

## Validation Features Implemented

### 1. Request Body Validation

```javascript
validateRequest(schema)
```

Middleware that:
- Validates request body against Joi schema
- Returns 422 with field-level error details on validation failure
- Strips unknown fields from request
- Converts types where possible
- Provides detailed error messages without quotes

**Example Response (Validation Error):**
```json
{
  "success": false,
  "code": 422,
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "title length must be at least 3 characters long",
      "type": "string.min",
      "value": "AB"
    },
    {
      "field": "categoryId",
      "message": "categoryId must be a positive number",
      "type": "number.positive"
    }
  ]
}
```

### 2. URL Parameter Validation

```javascript
validateParams({ id: schemas.id })
```

Middleware that:
- Validates URL parameters (`:id`, `:listingId`, etc.)
- Returns 422 if parameters don't match schema
- Converts string IDs to integers
- Validates format and type

### 3. Query Parameter Validation

```javascript
validateQuery(paginationSchema)
```

Middleware that:
- Validates query parameters (?page=1&limit=20)
- Ensures pagination defaults (page: 1, limit: 20)
- Limits max results (limit max 100)
- Validates filter parameters (status, role, etc.)

### 4. Pre-Built Validation Schemas

Available from `server/utils/validation.js`:

```javascript
// Reusable common schemas
schemas.id              // Positive integer
schemas.email           // Valid email format
schemas.password        // 8+ chars, uppercase, lowercase, number
schemas.phone           // Nigerian format
schemas.firstName       // 2-100 chars
schemas.lastName        // 2-100 chars
schemas.amount          // Positive decimal
schemas.percentage      // 0-100

// Domain-specific schemas
listingSchemas.create   // Full listing validation
listingSchemas.update   // Partial listing validation
authSchemas.register    // Registration validation
profileSchemas.update   // Profile update validation

// Utility schemas
paginationSchema        // Pagination query validation
```

---

## Error Response Format

All validation errors follow standardized format:

```json
{
  "success": false,
  "code": 422,
  "error": "validation_error",
  "message": "Validation failed",
  "details": [
    {
      "field": "fieldName",
      "message": "Clear error message",
      "type": "error.type",
      "value": "the value that failed"
    }
  ]
}
```

**Benefits:**
- Frontend can easily identify which fields failed
- Error messages are user-friendly (no technical jargon)
- Each error includes the actual value that failed
- Supports multiple field errors in single response

---

## Testing

### Created Test File: `validation-integration.test.js`

Comprehensive test suite covering:

**Listings Validation Tests:**
- Missing required fields rejection
- Invalid ID parameter rejection
- Valid listing creation acceptance
- Minimum field length enforcement

**Orders Validation Tests:**
- Missing required fields rejection
- Invalid quantity validation
- Date range validation (endDate > startDate)
- Enum status values validation

**Query Parameter Tests:**
- Pagination parameter validation
- Valid pagination acceptance

**Error Response Format Tests:**
- Standardized structure verification
- Field-level detail verification
- Message formatting (no quotes)

**Authorization + Validation Integration Tests:**
- Authorization checked before validation
- Validation applied after ownership passes

### Running Tests

```bash
# Run validation tests
npm test -- server/tests/validation-integration.test.js

# Run specific test suite
npm test -- server/tests/validation-integration.test.js -t "Listings Validation"

# Run with verbose output
npm test -- server/tests/validation-integration.test.js --verbose
```

---

## Migration Pattern (Applied to Priority 1)

For each route, the following pattern was applied:

### Step 1: Identify validation needs
- What fields required?
- What types?
- What ranges/formats?

### Step 2: Apply validation middleware
```javascript
// In order of execution:
router.route(path,
  authenticate,                          // Layer 1: Authentication
  validateParams({ ... }),               // Input validation
  requireOwnership('resource'),          // Layer 2: Authorization
  validateRequest(schema),               // Input validation
  asyncHandler(async (req, res) => { })  // Handler with error handling
)
```

### Step 3: Use asyncHandler instead of try-catch
```javascript
// Cleaner, consistent error handling
asyncHandler(async (req, res) => {
  // No need for try-catch, errors caught automatically
  const result = await someAsync();
  sendSuccess(res, result);
})
```

### Step 4: Use proper response helpers
```javascript
sendCreated(res, data, 'Resource created')  // 201
sendSuccess(res, data)                      // 200
sendPaginated(res, items, total, page, limit)  // 200 with pagination
```

---

## Files Modified

| File | Changes | Status |
|------|---------|--------|
| `server/routes/listings.js` | Validation, authorization, asyncHandler | ✅ Complete |
| `server/routes/orders.js` | Validation, authorization, asyncHandler | ✅ Complete |
| `server/tests/validation-integration.test.js` | NEW: Test suite | ✅ Created |

---

## What Happens Now?

### For Valid Requests:
```
Client → Validation ✅ → Authorization ✅ → Handler → Response (200/201)
```

### For Invalid Data:
```
Client → Validation ❌ → Error Response (422 with field details)
                          ↑ Stops here
```

### For Unauthorized Access:
```
Client → Validation ✅ → Authorization ❌ → Error Response (403 + audit log)
                                           ↑ Stops here
```

---

## Next Steps

### Priority 2: Organization Routes (4 routes)
- `PATCH /organizations/:orgId` - Ownership + schema validation
- `DELETE /organizations/:orgId` - Ownership validation
- `DELETE /organizations/:orgId/members/:memberId` - Organization role validation
- `PATCH /organizations/:orgId/members/:memberId/role` - Organization role + schema

### Priority 3: Admin Routes (8+ routes)
- User management (suspend, ban, role changes)
- Fee management (create, update, delete)
- Dispute resolution (resolve, close)
- Payment/payout management

### Priority 4: User Data Routes (4+ routes)
- Profile access/modification
- Review creation
- Dispute filing
- Various GET endpoints

---

## Quick Reference

### For Developers: Adding Validation to New Routes

1. **Identify schema needed:**
   ```javascript
   const { listingSchemas, schemas, paginationSchema } = require('../utils/validation');
   const { validateRequest, validateParams, validateQuery } = require('../utils/validation');
   ```

2. **Apply validation middleware:**
   ```javascript
   router.patch('/resource/:id',
     authenticate,
     validateParams({ id: schemas.id }),
     requireOwnership('resource'),
     validateRequest(updateSchema),
     asyncHandler(async (req, res) => { /* handler */ })
   );
   ```

3. **Validation runs automatically, errors thrown as AppError**
   - Caught by error middleware
   - Returns 422 with field details
   - No need for manual validation checks

---

## Key Takeaways

✅ **Validation Layer Benefits:**
- Single source of truth (schema defined once)
- Consistent error format across all routes
- Field-level error details for frontend
- Type conversion and sanitization
- Defense in depth (validates after authorization)
- All handled by middleware (clean handler code)

✅ **Security Improvements:**
- Invalid data rejected at API boundary
- Authorization checked before handler
- Audit logging on all denials
- Consistent error responses (no info leakage)

✅ **Developer Experience:**
- No try-catch boilerplate (asyncHandler handles it)
- Clear middleware chains
- Reusable schemas
- Easy to extend with new routes

---

## Implementation Checklist

- [x] Priority 1 validation implemented (listings, orders)
- [x] All routes use asyncHandler
- [x] All routes have proper authorization middleware
- [x] Error responses standardized
- [x] Test suite created
- [ ] Priority 2 routes updated (organization routes)
- [ ] Priority 3 routes updated (admin routes)
- [ ] Priority 4 routes updated (user data routes)
- [ ] End-to-end testing completed
- [ ] Production deployment ready

---

## Support & Troubleshooting

### Common Issues

**Issue:** Routes returning 422 for valid data
- Check schema.min() constraints are appropriate
- Verify required() vs optional() fields
- Ensure custom error messages are clear

**Issue:** asyncHandler not catching errors
- Ensure route handler is async
- Errors in sync code won't be caught (use try-catch)
- Use next(error) for manual error passing

**Issue:** Validation not running
- Verify middleware order (validation before handler)
- Check that middleware chain isn't broken
- Ensure validateRequest imports correct schema

### For Questions or Issues:
Refer to `AUTHORIZATION_IMPLEMENTATION_GUIDE.md` and `API_RESPONSE_STANDARDS.md` for comprehensive documentation.
