-- Add integrity constraints and fix schema issues.
--
-- Each ADD CONSTRAINT is wrapped in a DO block that checks
-- pg_constraint first, so re-running this file is safe and the
-- partial-state from a previously failed run is harmless.

-- Locations table: at least one of organization_id or user_id must be set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'locations_has_owner' AND conrelid = 'locations'::regclass
  ) THEN
    ALTER TABLE locations
      ADD CONSTRAINT locations_has_owner
      CHECK ((organization_id IS NOT NULL) OR (user_id IS NOT NULL));
  END IF;
END
$$;

-- Transactions: customer and provider must be different
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_customer_provider_different' AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_customer_provider_different
      CHECK (customer_id != provider_id);
  END IF;
END
$$;

-- Fee applications: amount must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fee_applications_amount_positive' AND conrelid = 'fee_applications'::regclass
  ) THEN
    ALTER TABLE fee_applications
      ADD CONSTRAINT fee_applications_amount_positive
      CHECK (amount >= 0);
  END IF;
END
$$;

-- Payouts: amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payouts_amount_positive' AND conrelid = 'payouts'::regclass
  ) THEN
    ALTER TABLE payouts
      ADD CONSTRAINT payouts_amount_positive
      CHECK (amount > 0);
  END IF;
END
$$;

-- Reviews: rating must be 1-5
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_rating_valid' AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_valid
      CHECK (rating BETWEEN 1 AND 5);
  END IF;
END
$$;

-- Listings: pricing fields must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_pricing_base_price_positive' AND conrelid = 'listing_pricing'::regclass) THEN
    ALTER TABLE listing_pricing ADD CONSTRAINT listing_pricing_base_price_positive CHECK (base_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_pricing_min_price_positive' AND conrelid = 'listing_pricing'::regclass) THEN
    ALTER TABLE listing_pricing ADD CONSTRAINT listing_pricing_min_price_positive CHECK (min_price IS NULL OR min_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_pricing_max_price_positive' AND conrelid = 'listing_pricing'::regclass) THEN
    ALTER TABLE listing_pricing ADD CONSTRAINT listing_pricing_max_price_positive CHECK (max_price IS NULL OR max_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_pricing_deposit_positive' AND conrelid = 'listing_pricing'::regclass) THEN
    ALTER TABLE listing_pricing ADD CONSTRAINT listing_pricing_deposit_positive CHECK (deposit_amount IS NULL OR deposit_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listing_pricing_min_max_consistency' AND conrelid = 'listing_pricing'::regclass) THEN
    ALTER TABLE listing_pricing ADD CONSTRAINT listing_pricing_min_max_consistency CHECK ((min_price IS NULL) OR (max_price IS NULL) OR (min_price <= max_price));
  END IF;
END
$$;

-- OTP codes: attempts must not exceed max_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'otp_codes_attempts_valid' AND conrelid = 'otp_codes'::regclass
  ) THEN
    ALTER TABLE otp_codes
      ADD CONSTRAINT otp_codes_attempts_valid
      CHECK (attempts <= max_attempts);
  END IF;
END
$$;

-- Sessions: expiration must be after creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_expiration_future' AND conrelid = 'sessions'::regclass
  ) THEN
    ALTER TABLE sessions
      ADD CONSTRAINT sessions_expiration_future
      CHECK (expires_at > created_at);
  END IF;
END
$$;

-- Service requests: budget range must be valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_requests_budget_valid' AND conrelid = 'service_requests'::regclass
  ) THEN
    ALTER TABLE service_requests
      ADD CONSTRAINT service_requests_budget_valid
      CHECK ((budget_min IS NULL) OR (budget_max IS NULL) OR (budget_min <= budget_max));
  END IF;
END
$$;

-- Carts: quantity must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'carts_quantity_positive' AND conrelid = 'carts'::regclass
  ) THEN
    ALTER TABLE carts
      ADD CONSTRAINT carts_quantity_positive
      CHECK (quantity > 0);
  END IF;
END
$$;
