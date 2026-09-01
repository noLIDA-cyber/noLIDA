# Authorization Implementation Guide — Phase 0

## Overview

This guide covers how to implement the new authorization system across all routes.

---

## Architecture Overview

### Three-Layer Authorization

```
Layer 1: Authentication (JWT Verification)
  ↓ (user is valid and active)
Layer 2: Permission Checking (Role-based access)
  ↓ (user has required permission)
Layer 3: Ownership Validation (Resource-level access)
  ↓ (user owns or has admin override)
Handler executes
```

### Files Created

1. **`server/middleware/authorization.js`**
   - Permission checking functions and middleware
   - Organization role validation
   - Audit logging on denial

2. **`server/middleware/ownership.js`**
   - Resource ownership validation
   - Supports multiple resource types
   - Custom ownership checks

3. **`server/services/authorizationService.js`**
   - Business logic for authorization
   - Role and permission management
   - Account obligations tracking

---

## Using Authorization Middleware

### Pattern 1: Require Permission (Admin Operations)

```javascript
const { requirePermission } = require('../middleware/authorization');
const { asyncHandler } = require('../middleware/error');
const { sendSuccess } = require('../utils/response');

// Admin only - require specific permission
router.post('/users/:id/suspend',
  requirePermission('users.manage'),
  asyncHandler(async (req, res) => {
    // Only users with 'users.manage' permission reach here
    // Permission denial is logged to audit trail
    const result = await suspendUser(req.params.id);
    sendSuccess(res, result);
  })
);
```

### Pattern 2: Require Resource Ownership (User Operations)

```javascript
const { requireOwnership } = require('../middleware/ownership');

// Only owner can modify their listing
router.patch('/listings/:id',
  authenticate,
  requireOwnership('listing'), // Validates user owns listing
  asyncHandler(async (req, res) => {
    const listing = await updateListing(req.params.id, req.body);
    sendSuccess(res, listing);
  })
);
```

### Pattern 3: Require Ownership OR Admin Permission

```javascript
const { requireOwnershipOrPermission } = require('../middleware/ownership');

// Owner can modify order, or admin can override
router.patch('/orders/:id',
  authenticate,
  requireOwnershipOrPermission('order', 'orders.manage'),
  asyncHandler(async (req, res) => {
    const order = await updateOrder(req.params.id, req.body);
    sendSuccess(res, order);
  })
);
```

### Pattern 4: Require Multiple Permissions (Any Match)

```javascript
const { requirePermission } = require('../middleware/authorization');

// Any admin role can view disputes
router.get('/disputes',
  requirePermission(['disputes.view', 'disputes.manage']),
  asyncHandler(async (req, res) => {
    const disputes = await getDisputes();
    sendSuccess(res, disputes);
  })
);
```

### Pattern 5: Require All Permissions

```javascript
const { requirePermission } = require('../middleware/authorization');

// Must have BOTH permissions
router.patch('/fee-rules/:id',
  requirePermission(['settings.manage', 'reports.view'], { mode: 'all' }),
  asyncHandler(async (req, res) => {
    const rule = await updateFeeRule(req.params.id, req.body);
    sendSuccess(res, rule);
  })
);
```

### Pattern 6: Organization Role-Based Access

```javascript
const { requireOrganizationRole } = require('../middleware/authorization');

// Only org owners can delete organization
router.delete('/organizations/:orgId',
  authenticate,
  requireOrganizationRole('owner', { paramName: 'orgId' }),
  asyncHandler(async (req, res) => {
    const result = await deleteOrganization(req.params.orgId);
    sendSuccess(res, result);
  })
);
```

### Pattern 7: Transaction Access (Customer or Provider)

```javascript
const { requireTransactionAccess } = require('../middleware/ownership');

// Either customer or provider of transaction can view it
router.get('/transactions/:transactionId',
  authenticate,
  requireTransactionAccess(),
  asyncHandler(async (req, res) => {
    // req.transaction contains transaction data
    // req.isCustomer indicates if user is customer
    // req.isProvider indicates if user is provider
    sendSuccess(res, req.transaction);
  })
);
```

---

## Permission Slugs Reference

### User Management
- `users.view` - View user profiles
- `users.manage` - Create, update, suspend users

### Listing Management
- `listings.view` - View all listings
- `listings.manage` - Create and manage listings
- `listings.moderate` - Review and moderate listings

### Transaction Management
- `transactions.view` - View transaction records
- `payments.manage` - Process payments
- `payouts.manage` - Process payouts
- `refunds.manage` - Process refunds

### Dispute Management
- `disputes.view` - View disputes
- `disputes.manage` - Resolve disputes

### Verification & Risk
- `verification.manage` - Review verification documents
- `risk.view` - View risk events
- `risk.manage` - Investigate risk events

### Analytics & Reports
- `analytics.view` - View analytics
- `reports.view` - View financial reports

### System
- `settings.manage` - Modify platform configuration
- `admin.*` - Super admin (all permissions)

---

## Resource Types for Ownership Checks

Currently supported resource types:

```javascript
'listing'          // Owned by provider_id
'order'            // Owned by customer_id
'booking'          // Owned by customer_id (appointment/reservation)
'transaction'      // Can be customer OR provider
'conversation'     // Can be customer OR provider
'review'           // Owned by customer_id
'payment_method'   // Owned by user_id
```

### Adding New Resource Types

Update `checkOwnership()` in `server/middleware/ownership.js`:

```javascript
const ownershipMap = {
  listing: { table: 'listings', ownerField: 'provider_id' },
  // ... existing
  invoice: { table: 'invoices', ownerField: 'creator_id' },
};
```

---

## Migration Steps for Each Route

### Step 1: Identify Authorization Requirements

For each route, determine:
- Is authentication required?
- Who can perform this action? (roles/permissions)
- Is this a user's own resource? (ownership)
- Can admins override? (which permission?)

### Step 2: Add Authorization Middleware

```javascript
// Before:
router.patch('/listings/:id', authenticate, async (req, res, next) => {
  // Authorization checked in service layer
});

// After:
router.patch('/listings/:id',
  authenticate,
  requireOwnership('listing'),
  asyncHandler(async (req, res) => {
    // Authorization checked here before handler
  })
);
```

### Step 3: Test Authorization Scenarios

For each route, test:
- ✅ Owner can access their resource
- ✅ Non-owner gets 403
- ✅ Admin with permission can access (if override exists)
- ✅ Denials are logged to audit_logs table

### Step 4: Update Service Layer

Keep defensive checks in services (defense in depth):

```javascript
async function updateListing(id, data, userId) {
  // Verify ownership (defense in depth)
  const listing = await query('SELECT * FROM listings WHERE id = $1', [id]);
  if (listing.provider_id !== userId) {
    throw new AppError('Not authorized', 403);
  }
  
  // Perform update
  return update(id, data);
}
```

---

## Critical Routes to Update (Priority)

### Priority 1 - Resource Modification

- [ ] `PATCH /api/v1/listings/:id` - Add `requireOwnership('listing')`
- [ ] `DELETE /api/v1/listings/:id` - Add `requireOwnership('listing')`
- [ ] `PATCH /api/v1/orders/:id` - Add `requireOwnershipOrPermission('order', 'orders.manage')`
- [ ] `DELETE /api/v1/orders/:id` - Add `requireOwnership('order')`

### Priority 2 - Organization Management

- [ ] `PATCH /api/v1/organizations/:id` - Add `requireOrganizationRole('owner')`
- [ ] `DELETE /api/v1/organizations/:id` - Add `requireOrganizationRole('owner')`
- [ ] `DELETE /api/v1/organizations/:id/members/:memberId` - Add `requireOrganizationRole('owner')`
- [ ] `PATCH /api/v1/organizations/:id/members/:memberId/role` - Add `requireOrganizationRole('owner')`

### Priority 3 - Admin Operations

- [ ] `POST /api/v1/admin/users/:id/suspend` - Add `requirePermission('users.manage')`
- [ ] `POST /api/v1/admin/users/:id/ban` - Add `requirePermission('users.manage')`
- [ ] `PATCH /api/v1/admin/fees/:id` - Add `requirePermission('settings.manage')`
- [ ] `POST /api/v1/admin/disputes/:id/resolve` - Add `requirePermission('disputes.manage')`

### Priority 4 - User Data Access

- [ ] `GET /api/v1/users/:id` - Add `requireOwnership('profile')` or `requirePermission('users.view')`
- [ ] `PATCH /api/v1/users/:id` - Add `requireOwnership('profile')`
- [ ] `POST /api/v1/reviews` - Verify transaction involvement
- [ ] `POST /api/v1/disputes` - Verify transaction involvement

---

## Testing Authorization

### Unit Test Example

```javascript
// Test ownership validation
describe('requireOwnership middleware', () => {
  it('should allow owner to update listing', async () => {
    const res = await request(app)
      .patch('/api/v1/listings/123')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'Updated' });
    
    expect(res.status).toBe(200);
  });

  it('should deny non-owner', async () => {
    const res = await request(app)
      .patch('/api/v1/listings/123')
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ title: 'Updated' });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('forbidden');
  });

  it('should allow admin to override', async () => {
    const res = await request(app)
      .patch('/api/v1/orders/456')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' });
    
    expect(res.status).toBe(200);
  });
});
```

### Integration Test Checklist

```javascript
// For each route:

it('should require authentication', () => {
  // Test without token - expect 401
});

it('should require proper authorization', () => {
  // Test with unauthorized user - expect 403
});

it('should verify resource ownership', () => {
  // Test accessing other user's resource - expect 403
});

it('should log authorization denial', () => {
  // Verify audit_logs entry created
});

it('should allow admin override', () => {
  // Test admin with permission bypasses ownership check
});
```

---

## Audit Logging

### Permission Denial Logged

```json
{
  "actor_id": 123,
  "action": "permission_denied",
  "target_type": "permission",
  "target_id": null,
  "metadata": {
    "permissions_required": ["users.manage"],
    "ip_address": "192.168.1.1",
    "user_agent": "..."
  }
}
```

### Resource Access Denial Logged

```json
{
  "actor_id": 123,
  "action": "unauthorized_resource_access",
  "target_type": "listing",
  "target_id": 456,
  "metadata": {
    "resource_type": "listing",
    "ip_address": "192.168.1.1"
  }
}
```

---

## Common Patterns

### Pattern: Self OR Admin

```javascript
// User can view/edit own profile, OR admin can view/edit any
router.get('/users/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const isSelf = req.user.id === userId;
      const isAdmin = await hasPermission(req.user.id, 'users.view');
      
      if (!isSelf && !isAdmin) {
        throw new AppError('Forbidden', 403);
      }
      
      const user = await getUser(userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);
```

### Pattern: Owner AND Status Check

```javascript
// Can only cancel order if in correct status
router.post('/orders/:id/cancel',
  authenticate,
  requireOwnership('order'),
  asyncHandler(async (req, res) => {
    const order = await getOrder(req.params.id);
    
    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new AppError(
        'Cannot cancel order in current status',
        409,
        'invalid_state'
      );
    }
    
    const result = await cancelOrder(req.params.id);
    sendSuccess(res, result);
  })
);
```

### Pattern: Cascading Authorization

```javascript
// Transaction access → Can view related messages
router.get('/transactions/:transactionId/messages',
  authenticate,
  requireTransactionAccess(),
  asyncHandler(async (req, res) => {
    // User is confirmed customer or provider
    const messages = await getTransactionMessages(req.params.transactionId);
    sendSuccess(res, messages);
  })
);
```

---

## Troubleshooting

### Issue: "Insufficient permissions" for admin user

**Cause:** Admin permissions not populated in `role_permissions` table

**Solution:** Run setup script:
```javascript
const { setupDefaultRolePermissions } = require('./services/authorizationService');
await setupDefaultRolePermissions();
```

### Issue: Ownership check fails for legitimate owner

**Cause:** Custom ownership check not added to `checkOwnership()`

**Solution:** Add resource type to `ownershipMap` in `server/middleware/ownership.js`

### Issue: Middleware applied but not working

**Cause:** Wrong middleware import or `asyncHandler` not used

**Solution:** Ensure:
```javascript
const { requireOwnership } = require('../middleware/ownership');
const { asyncHandler } = require('../middleware/error');

router.patch('/resource/:id',
  requireOwnership('resource'),
  asyncHandler(async (req, res) => { ... })
);
```

---

## Summary

**Key Points:**
- ✅ Permissions checked BEFORE handler (not in service)
- ✅ Ownership validated at middleware level
- ✅ All denials logged to audit trail
- ✅ Admins can override with proper permission
- ✅ Defense in depth: service layer checks again

**Implementation Order:**
1. Update critical routes (Priority 1-2)
2. Test each route authorization scenarios
3. Update remaining routes (Priority 3-4)
4. Verify audit logs working
5. Comprehensive security testing

---

## Files Reference

- Authorization Audit Report: [`AUTHORIZATION_AUDIT_REPORT.md`](./AUTHORIZATION_AUDIT_REPORT.md)
- Authorization Middleware: `server/middleware/authorization.js`
- Ownership Middleware: `server/middleware/ownership.js`
- Authorization Service: `server/services/authorizationService.js`
- API Standards: [`API_RESPONSE_STANDARDS.md`](./API_RESPONSE_STANDARDS.md)
