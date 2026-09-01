BEGIN;

-- Add integrity constraints and fix schema issues

-- Ensure users can't be deleted if they have unresolved account obligations
-- (This is enforced at application level, constraint is informational)

-- Locations table: at least one of organization_id or user_id must be set
-- Adding constraint to ensure locations have proper ownership
ALTER TABLE locations 
  ADD CONSTRAINT locations_has_owner 
  CHECK ((organization_id IS NOT NULL) OR (user_id IS NOT NULL));

-- Bookings/reservations: ensure customer and provider are different
ALTER TABLE transactions
  ADD CONSTRAINT transactions_customer_provider_different
  CHECK (customer_id != provider_id);

-- Fee applications: ensure amount is not negative
ALTER TABLE fee_applications
  ADD CONSTRAINT fee_applications_amount_positive
  CHECK (amount >= 0);

-- Payouts: ensure amount is not negative
ALTER TABLE payouts
  ADD CONSTRAINT payouts_amount_positive
  CHECK (amount > 0);

-- Reviews: ensure rating is valid
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_valid
  CHECK (rating BETWEEN 1 AND 5);

-- Listings: ensure price fields are not negative
ALTER TABLE listing_pricing
  ADD CONSTRAINT listing_pricing_base_price_positive
  CHECK (base_price >= 0),
  ADD CONSTRAINT listing_pricing_min_price_positive
  CHECK (min_price IS NULL OR min_price >= 0),
  ADD CONSTRAINT listing_pricing_max_price_positive
  CHECK (max_price IS NULL OR max_price >= 0),
  ADD CONSTRAINT listing_pricing_deposit_positive
  CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  ADD CONSTRAINT listing_pricing_min_max_consistency
  CHECK ((min_price IS NULL) OR (max_price IS NULL) OR (min_price <= max_price));

-- OTP codes: ensure attempts don't exceed max_attempts
ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_attempts_valid
  CHECK (attempts <= max_attempts);

-- Sessions: ensure expiration is in the future on creation
ALTER TABLE sessions
  ADD CONSTRAINT sessions_expiration_future
  CHECK (expires_at > created_at);

-- Service requests: ensure budget range is valid
ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_budget_valid
  CHECK ((budget_min IS NULL) OR (budget_max IS NULL) OR (budget_min <= budget_max));

-- Carts: ensure quantity is positive
ALTER TABLE carts
  ADD CONSTRAINT carts_quantity_positive
  CHECK (quantity > 0);

COMMIT;
