# Authorization Audit Report — Phase 0

**Date:** 2026-09-01  
**Status:** 🔴 CRITICAL GAPS FOUND  
**Severity:** HIGH

---

## Executive Summary

Authorization validation is currently **inconsistent and potentially unsafe**. While some routes have proper checks, the overall system lacks:
- ✅ Centralized permission checking middleware
- ✅ Permission-based access control (currently only role-based)
- ✅ Consistent ownership/resource validation
- ✅ Clear authorization matrix
- ✅ Audit trail for permission denials

---

## Current Authorization Architecture

### Authentication ✅ GOOD
- JWT tokens properly verified
- Session validation against `jti` token
- User status checked (must be 'active')
- Token expiration enforced

**File:** `server/middleware/auth.js`

### Authorization ⚠️ NEEDS WORK

**Current Implementation:**
```javascript
const authorize = (...allowedRoles) => {
  // Checks if user has ONE of the allowed roles
  // Based on organization_members table
};
```

**Problems:**
1. **Only organization-based roles** - Doesn't account for admin/system roles
2. **No permission granularity** - Only checks role slug, not individual permissions
3. **Inconsistent usage** - Many routes don't use this middleware at all
4. **Resource ownership not validated** - Routes trust service layer to check ownership
5. **No audit trail** - Permission denials aren't logged

---

## Route Authorization Audit

### Routes with Proper Authorization ✅

| Route | Method | Auth | Authorization | Status |
|-------|--------|------|---------------|--------|
| `/api/v1/admin/users` | GET | ✅ | `['super_admin', 'admin']` | ✅ |
| `/api/v1/admin/*` | ALL | ✅ | `['super_admin', 'admin']` | ✅ |
| `/api/v1/fees/*` | ALL | ✅ | `['super_admin', 'admin']` | ✅ |
| `/api/v1/analytics/*` | ALL | ✅ | `['super_admin', 'admin', 'analytics_admin']` | ✅ |
| `/api/v1/risk/*` | POST | ✅ | `['admin', 'moderator']` | ✅ |

### Routes with Auth but No Authorization ⚠️

| Route | Method | Issue | Risk |
|-------|--------|-------|------|
| `POST /api/v1/listings` | POST | No ownership validation in middleware | User could create listing for different provider |
| `PATCH /api/v1/listings/:id` | PATCH | No ownership validation in middleware | User could modify any listing |
| `DELETE /api/v1/listings/:id` | DELETE | No ownership validation in middleware | User could delete any listing |
| `POST /api/v1/bookings` | POST | No customer/provider validation | User could book on behalf of anyone |
| `PATCH /api/v1/organizations/:id` | PATCH | No role check | Any member can update org |
| `DELETE /api/v1/organizations/:id/members/:id` | DELETE | No role check | Any member can remove members |
| `PATCH /api/v1/organizations/:id/members/:id/role` | PATCH | No role check | Any member can assign roles |
| `POST /api/v1/orders` | POST | No validation | User could create order for different customer |
| `DELETE /api/v1/orders/:id` | DELETE | No ownership check | User could delete any order |
| `POST /api/v1/reviews` | POST | No transaction validation | Anyone could review any transaction |
| `POST /api/v1/disputes` | POST | No dispute permission check | User could open dispute for unrelated transaction |

### Routes with No Authentication ⚠️ CRITICAL

| Route | Purpose | Should Require Auth? |
|-------|---------|---------------------|
| `GET /api/v1/health` | Health check | ✅ No (public) |
| `GET /api/v1/categories` | Browse categories | ✅ No (public) |
| `GET /api/v1/listings` | Browse listings | ✅ No (public) |
| `GET /api/v1/listings/:id` | View listing | ✅ No (public) |
| `GET /api/v1/search` | Search listings | ✅ No (public) |
| `GET /api/v1/reviews` | View reviews | ✅ No (public) |
| `GET /api/v1/verification/me/status` | ⚠️ Check own verification | ✅ YES, needs auth |
| `POST /api/v1/auth/register` | Registration | ✅ No (public) |
| `POST /api/v1/auth/login` | Login | ✅ No (public) |

---

## Critical Authorization Gaps

### 1. 🔴 Resource Ownership Not Validated in Middleware

**Problem:** Routes that modify resources only pass `req.user.id` to service layer. Service layer *may* check ownership, but it's not enforced at API boundary.

**Example:**
```javascript
// UNSAFE - Service could fail to check ownership
router.patch('/:id', authenticate, async (req, res, next) => {
  const listing = await updateListing(req.params.id, req.body, req.user.id);
  // If updateListing() doesn't validate ownership, user can modify any listing
});
```

**Risk:** If service has a bug, authorization is bypassed silently.

### 2. 🔴 Organization Member Permissions Not Enforced

**Problem:** Organization member operations (add/remove members, change roles) don't check user role.

**Example:**
```javascript
// UNSAFE - Any org member can remove other members
router.delete('/:id/members/:memberId', authenticate, async (req, res) => {
  const result = await removeOrganizationMember(req.params.id, req.user.id, req.params.memberId);
  // Should check: Is user OWNER or MANAGER?
});
```

**Risk:** Support staff or receptionist could remove managers.

### 3. 🔴 No Permission-Based Authorization

**Problem:** System only checks roles, not specific permissions. All admins can do everything.

**Current Model:**
```
Role = Set of Permissions (hardcoded)
User → Organization Member → Role
```

**Should Be:**
```
Role = Set of Permissions (from role_permissions junction)
User → Organization Member → Role → Permissions
// Additionally: User → Admin Role → Permissions
```

### 4. 🔴 No Audit Trail for Authorization Decisions

**Problem:** When access is denied, nothing is logged. Can't identify authorization attacks.

**Example:**
```javascript
// User tries to delete listing owned by someone else
DELETE /api/v1/listings/123
// Returns 403 Forbidden, but no audit record created
```

### 5. 🔴 Admin Routes Vulnerable to Privilege Escalation

**Problem:** Admin route authorization middleware doesn't validate ownership for operations on other admins.

**Example:**
```javascript
// Admin could theoretically suspend/delete other admins
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  // Should check: Can this admin delete this user?
  // Different rules for deleting customers vs admins
});
```

---

## Authorization Matrix — Should Be

### Customer Permissions

| Action | Self | Other Customer | Provider | Admin |
|--------|------|-----------------|----------|-------|
| View Profile | ✅ | ✅ | ✅ | ✅ |
| Update Profile | ✅ only | ❌ | ❌ | ✅ |
| Delete Account | ✅ only | ❌ | ❌ | ✅ if no obligations |
| Create Booking | ✅ | ❌ | ❌ | ✅ |
| Cancel Booking | ✅ if owned | ❌ | ✅ owner | ✅ |
| Review Provider | ✅ if completed tx | ❌ | ❌ | ✅ |
| Open Dispute | ✅ if involved | ❌ | ✅ if involved | ✅ |

### Provider Permissions

| Action | Self | Other Provider | Customer | Admin |
|--------|------|-----------------|----------|-------|
| View Profile | ✅ | ✅ (public) | ✅ | ✅ |
| Update Profile | ✅ only | ❌ | ❌ | ✅ |
| Create Listing | ✅ for self | ❌ | ❌ | ✅ |
| Update Listing | ✅ if owner | ❌ | ❌ | ✅ |
| View Bookings | ✅ if provider | ✅ if customer | ✅ if customer | ✅ |
| Cancel Booking | ✅ if provider | ❌ | ❌ | ✅ |
| View Earnings | ✅ only | ❌ | ❌ | ✅ |

### Organization Permissions

| Action | Owner | Manager | Staff | Customer | Admin |
|--------|-------|---------|-------|----------|-------|
| View Org | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update Org | ✅ | ❌ | ❌ | ❌ | ✅ |
| Add Member | ✅ | ✅ | ❌ | ❌ | ✅ |
| Remove Member | ✅ | ✅ (peers only) | ❌ | ❌ | ✅ |
| Change Role | ✅ | ❌ | ❌ | ❌ | ✅ |
| Delete Org | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Stats | ✅ | ✅ | ✅ | ❌ | ✅ |

### Admin Permissions

| Action | Moderator | Support | Finance | Trust & Safety | Admin | Super Admin |
|--------|-----------|---------|---------|----------------|-------|------------|
| View Users | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Suspend User | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Ban User | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Process Refund | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Process Payout | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Resolve Dispute | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| View Analytics | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Change Fee Rules | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Admins | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Recommended Fixes (Priority Order)

### Priority 🔴 CRITICAL

**1. Create Permission Validation Middleware**
- New middleware: `requirePermission('permission.slug')`
- Check permission in `role_permissions` junction table
- Supports both system admin roles and organization roles
- Logs authorization failures for audit

**2. Create Resource Ownership Validation Middleware**
- New middleware: `requireOwnership('resource', 'field')`
- Validates user owns the resource before handler executes
- Example: `requireOwnership('listing', 'provider_id')`
- Returns 403 if user doesn't own resource

**3. Update Critical Routes**
- Listings: Add ownership validation
- Orders/Bookings: Add customer/provider validation
- Organization Members: Add role-based permission checks
- Admin operations: Add permission checks

**4. Create Authorization Audit Logging**
- Log all permission denials (403 responses)
- Log all privilege-escalation attempts
- Include: user, action, resource, reason

### Priority 🟡 HIGH

**5. Permission Setup Migration**
- Populate `role_permissions` table (already created in migration)
- Define all permission slugs
- Assign permissions to each admin role

**6. Service Layer Cleanup**
- Add defensive authorization checks in services
- Services should validate ownership AGAIN (defense in depth)
- Throw `AppError` with 403 if unauthorized

**7. Comprehensive Route Migration**
- Go through each route systematically
- Add appropriate authorization middleware
- Test authorization scenarios

### Priority 🟢 MEDIUM

**8. Authorization Testing Suite**
- Test ownership checks
- Test permission denials
- Test role-based access
- Test privilege escalation attempts

**9. Documentation**
- Update API docs with authorization requirements
- Document permission matrix
- Create authorization testing guide

---

## Security Testing Checklist

### For Each Protected Route

- [ ] Verify authentication is required (401 if no token)
- [ ] Verify token validation works (401 if invalid)
- [ ] Verify user status is checked (401 if suspended)
- [ ] Verify authorization is checked (403 if no permission)
- [ ] Verify resource ownership is checked (403 if not owner)
- [ ] Verify 403 response is returned, not silently ignored
- [ ] Verify error message doesn't leak sensitive info
- [ ] Verify authorization denial is logged

---

## Immediate Actions Required

1. **Review** all service functions for authorization checks
2. **Build** permission validation middleware
3. **Build** resource ownership validation middleware
4. **Create** authorization audit logging service
5. **Update** critical routes (listings, orders, organization members)
6. **Test** authorization scenarios end-to-end

---

## Files to Create/Modify

```
NEW:
- server/middleware/authorization.js     (Permission checking)
- server/middleware/ownership.js         (Ownership validation)
- server/services/authorizationService.js (Auth logic)

MODIFY:
- server/middleware/auth.js              (Add new middleware)
- server/routes/listings.js              (Add ownership checks)
- server/routes/orders.js                (Add validation)
- server/routes/bookings.js              (Add validation)
- server/routes/organizations.js         (Add permission checks)
- server/routes/admin.js                 (Add permission checks)

VERIFY:
- All service layer functions for ownership validation
```

---

## Risk Assessment

**Current Risk Level:** 🔴 **HIGH**

**Vulnerabilities:**
- User could modify resources they don't own (if service has bug)
- Staff could perform admin actions (org permissions)
- Authorization denial not logged (can't detect attacks)
- No permission granularity (all admins equal)

**Impact if Exploited:**
- Data modification by unauthorized users
- Privilege escalation
- Organizational chaos
- No audit trail

---

## Next Steps

Proceed with implementing:
1. Authorization middleware utilities
2. Permission checking functions
3. Ownership validation functions
4. Route updates
5. Testing
