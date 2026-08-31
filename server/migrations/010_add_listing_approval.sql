BEGIN;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (approval_status IN ('draft', 'pending_review', 'changes_requested', 'approved', 'rejected', 'suspended', 'unpublished'));
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS business_submission_id INTEGER REFERENCES business_submissions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_approval_status ON listings(approval_status);
CREATE INDEX IF NOT EXISTS idx_listings_business_submission ON listings(business_submission_id);

UPDATE listings SET approval_status = 'approved' WHERE status = 'active';
UPDATE listings SET approval_status = 'pending_review' WHERE status = 'inactive';

COMMIT;
