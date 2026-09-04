const { query } = require('../config/database');
const { AppError } = require('../middleware/error');

const createBusinessSubmission = async (userId, submissionData) => {
  const { authorizationCodeId, businessName, categoryId, description, services, products, pricing, businessPhone, businessEmail, website, socialMedia, location, serviceAreas, businessHours, photos, logoUrl, portfolio, documents, verificationData } = submissionData;

  if (process.env.NODE_ENV !== 'production') {
    console.log('business-submission payload types:', {
      businessName: typeof businessName,
      categoryId: typeof categoryId, categoryIdVal: categoryId,
      location: typeof location, locationVal: location,
      services: typeof services, servicesVal: services,
      pricing: typeof pricing, pricingVal: pricing,
    });
  }

  if (!businessName || !categoryId) {
    throw new AppError('Business name and category are required', 400);
  }

  if (authorizationCodeId) {
    const codeResult = await query(
      'SELECT id FROM authorization_codes WHERE id = $1 AND status = $2 AND expires_at > NOW() AND used_count < max_uses',
      [authorizationCodeId, 'active']
    );

    if (codeResult.rows.length === 0) {
      throw new AppError('Invalid or expired authorization code', 400);
    }
  }

  const existingSubmission = await query(
    'SELECT id FROM business_submissions WHERE user_id = $1 AND status IN ($2, $3, $4)',
    [userId, 'draft', 'pending_review', 'changes_requested']
  );

  if (existingSubmission.rows.length > 0) {
    throw new AppError('You already have a pending business submission', 409);
  }

  const toJsonb = (v, fallback) => {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'string') {
      try { return JSON.parse(v); } catch { return fallback; }
    }
    if (typeof v === 'object') return v;
    return fallback;
  };

  const result = await query(
    `INSERT INTO business_submissions
     (user_id, authorization_code_id, business_name, category_id, description, services, products, pricing, business_phone, business_email, website, social_media, location, service_areas, business_hours, photos, logo_url, portfolio, documents, verification_data, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
    [userId, authorizationCodeId || null, businessName, categoryId, description || null, toJsonb(services, []), toJsonb(products, []), toJsonb(pricing, {}), businessPhone || null, businessEmail || null, website || null, toJsonb(socialMedia, {}), toJsonb(location, {}), toJsonb(serviceAreas, []), toJsonb(businessHours, {}), toJsonb(photos, []), logoUrl || null, toJsonb(portfolio, []), toJsonb(documents, []), toJsonb(verificationData, {}), 'pending_review']
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('business_submission inserted OK, id =', result.rows[0]?.id);
  }

  await query(
    'INSERT INTO approval_records (business_submission_id, admin_id, action, new_status) VALUES ($1, $2, $3, $4)',
    [result.rows[0].id, userId, 'submitted', 'pending_review']
  );

  if (process.env.NODE_ENV !== 'production') {
    console.log('approval_record inserted OK');
  }

  return result.rows[0];
};

const getBusinessSubmission = async (submissionId, userId) => {
  const result = await query(
    'SELECT * FROM business_submissions WHERE id = $1',
    [submissionId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Business submission not found', 404);
  }

  const submission = result.rows[0];
  if (submission.user_id !== userId) {
    throw new AppError('Access denied', 403);
  }

  return submission;
};

const listBusinessSubmissions = async (filters = {}) => {
  const { status, userId, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let sql = 'SELECT bs.*, u.email as user_email, p.display_name as user_name, c.name as category_name FROM business_submissions bs JOIN users u ON u.id = bs.user_id LEFT JOIN profiles p ON p.user_id = bs.user_id LEFT JOIN categories c ON c.id = bs.category_id WHERE 1=1';
  const params = [];
  let index = 1;

  if (status) {
    sql += ` AND bs.status = $${index}`;
    params.push(status);
    index++;
  }

  if (userId) {
    sql += ` AND bs.user_id = $${index}`;
    params.push(userId);
    index++;
  }

  sql += ` ORDER BY bs.created_at DESC LIMIT $${index} OFFSET ${index + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  const countResult = await query('SELECT COUNT(*) FROM business_submissions WHERE 1=1' + (status ? ' AND status = $1' : '') + (userId ? ' AND user_id = $2' : ''), status && userId ? [status, userId] : status ? [status] : userId ? [userId] : []);
  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const updateBusinessSubmissionStatus = async (submissionId, newStatus, adminId, notes) => {
  const submissionResult = await query('SELECT * FROM business_submissions WHERE id = $1', [submissionId]);
  if (submissionResult.rows.length === 0) {
    throw new AppError('Business submission not found', 404);
  }

  const submission = submissionResult.rows[0];
  const previousStatus = submission.status;

  const allowedStatuses = ['approved', 'rejected', 'changes_requested', 'suspended', 'unpublished'];
  if (!allowedStatuses.includes(newStatus)) {
    throw new AppError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`, 400);
  }

  const updates = ['status = $1', 'updated_at = NOW()'];
  const values = [newStatus];
  let index = 2;

  if (notes) {
    if (newStatus === 'rejected') {
      updates.push(`rejection_reason = $${index}`);
    } else if (newStatus === 'changes_requested') {
      updates.push(`changes_requested = $${index}`);
    } else {
      updates.push(`admin_notes = $${index}`);
    }
    values.push(notes);
    index++;
  }

    if (newStatus === 'approved' || newStatus === 'rejected' || newStatus === 'changes_requested') {
      updates.push(`reviewed_by = $${index}`);
      values.push(adminId);
      index++;
      updates.push(`reviewed_at = NOW()`);

      if (newStatus === 'approved') {
        const listingResult = await createListingFromSubmission(submission);
        updates.push(`published_listing_id = $${index}`);
        values.push(listingResult.id);
        index++;

        const orgResult = await query(
          `INSERT INTO organizations (name, slug, type, description, status)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [
            submission.business_name,
            submission.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            'business',
            submission.description || null,
            'active'
          ]
        );

        const ownerRole = await query('SELECT id FROM roles WHERE slug = $1', ['owner']);
        if (ownerRole.rows.length > 0) {
          await query(
            'INSERT INTO organization_members (organization_id, user_id, role_id, status, joined_at) VALUES ($1, $2, $3, $4, NOW())',
            [orgResult.rows[0].id, submission.user_id, ownerRole.rows[0].id, 'active']
          );
        }
      }
    }

  values.push(submissionId);

  const result = await query(
    `UPDATE business_submissions SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`,
    values
  );

  await query(
    'INSERT INTO approval_records (business_submission_id, admin_id, action, previous_status, new_status, notes) VALUES ($1, $2, $3, $4, $5, $6)',
    [submissionId, adminId, newStatus, previousStatus, newStatus, notes || null]
  );

  await query(
    'INSERT INTO audit_logs (actor_id, action, target_type, target_id, changes) VALUES ($1, $2, $3, $4, $5)',
    [adminId, `business_${newStatus}`, 'business_submission', submissionId, JSON.stringify({ previous_status: previousStatus, new_status: newStatus })]
  );

  return result.rows[0];
};

const createListingFromSubmission = async (submission) => {
  const listingResult = await query(
    `INSERT INTO listings 
     (provider_id, category_id, title, description, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      submission.user_id,
      submission.category_id,
      submission.business_name,
      submission.description,
      'active',
      {
        business_submission_id: submission.id,
        services: submission.services,
        products: submission.products,
        pricing: submission.pricing,
        business_phone: submission.business_phone,
        business_email: submission.business_email,
        website: submission.website,
        social_media: submission.social_media,
        location: submission.location,
        service_areas: submission.service_areas,
        business_hours: submission.business_hours,
        photos: submission.photos,
        logo_url: submission.logo_url,
        portfolio: submission.portfolio,
        documents: submission.documents,
        verification_data: submission.verification_data,
      }
    ]
  );

  if (submission.photos && submission.photos.length > 0) {
    for (const photoUrl of submission.photos) {
      try {
        await query(
          'INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES ($1, $2, $3)',
          [listingResult.rows[0].id, photoUrl, 0]
        );
      } catch (error) {
        if (error.code !== '42P01') {
          throw error;
        }
      }
    }
  }

  return listingResult.rows[0];
};

const getSubmissionApprovalHistory = async (submissionId) => {
  const result = await query(
    'SELECT ar.*, u.email as admin_email FROM approval_records ar JOIN users u ON u.id = ar.admin_id WHERE ar.business_submission_id = $1 ORDER BY ar.created_at ASC',
    [submissionId]
  );
  return result.rows;
};

const hasApprovedBusiness = async (userId) => {
  const result = await query(
    'SELECT id FROM business_submissions WHERE user_id = $1 AND status = $2 LIMIT 1',
    [userId, 'approved']
  );
  return result.rows.length > 0;
};

const getApprovedBusiness = async (userId) => {
  const result = await query(
    'SELECT * FROM business_submissions WHERE user_id = $1 AND status = $2 LIMIT 1',
    [userId, 'approved']
  );
  return result.rows[0] || null;
};

const getLatestBusinessSubmission = async (userId) => {
  const result = await query(
    'SELECT * FROM business_submissions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || null;
};

module.exports = {
  createBusinessSubmission,
  getBusinessSubmission,
  listBusinessSubmissions,
  updateBusinessSubmissionStatus,
  getSubmissionApprovalHistory,
  hasApprovedBusiness,
  getApprovedBusiness,
  getLatestBusinessSubmission,
};
