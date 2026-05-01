import { z } from "zod";
import pool from "../config/db.js";

const GST_RATE = 0.18;
const FALLBACK_FEES = { NSF: 50000, CA: 50000, AA: 50000, rPET: 15000, AnyOther: 10000 };

const BIN_STAGES = {
  incomplete: ["Draft"],
  submitted: ["Submitted", "WithNodalOfficerA", "WithTechnicalOfficer", "WithExpertCommittee", "WithNodalPointB", "DecisionPending"],
  reverted: ["QuerySent"],
  rejected: ["Rejected"],
  approved: ["Approved", "ConditionallyAuthorized"],
};

const STAGE_TO_STATUS = {
  Draft: "draft",
  Submitted: "pending",
  WithNodalOfficerA: "pending",
  WithTechnicalOfficer: "scrutiny",
  QuerySent: "query",
  WithExpertCommittee: "ec",
  WithNodalPointB: "ec",
  DecisionPending: "ec",
  Approved: "approved",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
  Closed: "withdrawn",
  WithCEO: "appeal",
  WithChairperson: "review",
  WithRCDForInspection: "scrutiny",
  InspectionCompleted: "scrutiny",
  ConditionallyAuthorized: "approved",
};

const normalizeType = (value) => (value === "Any Other" ? "AnyOther" : value);
const displayType = (value) => (value === "AnyOther" ? "Any Other" : value);
const statusFromStage = (stage) => STAGE_TO_STATUS[stage] ?? "pending";

const createSchema = z.object({
  app_type: z.enum(["NSF", "CA", "AA", "rPET", "AnyOther", "Any Other"]),
  payment_reference: z.string().max(100).optional(),
  product_name: z.string().min(1).max(255),
  food_category: z.string().max(100).optional(),
  organization_name: z.string().min(1).max(255),
  address: z.string().optional(),
  manufacturing_address: z.string().optional(),
  authorized_person: z.string().max(150).optional(),
  mobile_number: z.string().regex(/^[6-9]\d{9}$/).optional(),
  contact_email: z.string().email().optional(),
  license_no: z.string().max(100).optional(),
  ingredients: z.string().optional(),
  regulatory_status_text: z.string().optional(),
  safety_info: z.string().optional(),
  gst_no: z.string().max(20).optional(),
  kind_of_business: z.enum(["Manufacturer", "Relabeller", "Importer"]).optional(),
});

const updateSchema = createSchema.partial();

async function getFee(applicationType, aaSubCategory = null, claimType = null) {
  const { rows } = await pool.query(
    `SELECT fee_amount, gst_applicable
     FROM fee_config
     WHERE application_type = $1
       AND is_active = TRUE
       AND (aa_sub_category IS NOT DISTINCT FROM $2 OR aa_sub_category IS NULL)
       AND (claim_type IS NOT DISTINCT FROM $3 OR claim_type IS NULL)
       AND effective_from <= CURRENT_DATE
       AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
     ORDER BY aa_sub_category NULLS LAST, claim_type NULLS LAST
     LIMIT 1`,
    [applicationType, aaSubCategory, claimType]
  );
  const amount = Number(rows[0]?.fee_amount ?? FALLBACK_FEES[applicationType] ?? 0);
  const gst = rows[0]?.gst_applicable === false ? 0 : +(amount * GST_RATE).toFixed(2);
  return { amount, gst, total: +(amount + gst).toFixed(2) };
}

async function getApplicantName(userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(ap.company_name, u.username) AS applicant_name,
            ap.address_line1, ap.address_line2, ap.city, ap.state, ap.pincode,
            ap.contact_person, ap.mobile, ap.gstin, u.fssai_license_no
     FROM users u
     LEFT JOIN applicant_profiles ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] ?? {};
}

async function upsertApplicantProfile(client, userId, data) {
  if (!data.organization_name && !data.authorized_person && !data.mobile_number && !data.gst_no && !data.address) return;
  await client.query(
    `INSERT INTO applicant_profiles (user_id, company_name, contact_person, mobile, address_line1, gstin)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE SET
       company_name = COALESCE(EXCLUDED.company_name, applicant_profiles.company_name),
       contact_person = COALESCE(EXCLUDED.contact_person, applicant_profiles.contact_person),
       mobile = COALESCE(EXCLUDED.mobile, applicant_profiles.mobile),
       address_line1 = COALESCE(EXCLUDED.address_line1, applicant_profiles.address_line1),
       gstin = COALESCE(EXCLUDED.gstin, applicant_profiles.gstin),
       updated_at = NOW()`,
    [
      userId,
      data.organization_name ?? null,
      data.authorized_person ?? null,
      data.mobile_number ?? null,
      data.address ?? null,
      data.gst_no ?? null,
    ]
  );
}

async function generateApplicationRef(client, applicationType) {
  const year = new Date().getFullYear();
  const { rows: codeRows } = await client.query(
    "SELECT type_code FROM application_type_codes WHERE application_type = $1",
    [applicationType]
  );
  const typeCode = codeRows[0]?.type_code ?? (applicationType === "AnyOther" ? "OTH" : applicationType.toUpperCase());

  const { rows } = await client.query(
    `INSERT INTO numbering_sequences (sequence_type, application_type, year, last_serial)
     VALUES ('application', $1, $2, 1)
     ON CONFLICT (sequence_type, application_type, year)
     DO UPDATE SET last_serial = numbering_sequences.last_serial + 1
     RETURNING last_serial`,
    [applicationType, year]
  );

  const serial = String(rows[0].last_serial).padStart(4, "0");
  const month = String(new Date().getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-${typeCode}-FOOD-${serial}`;
}

function appSelect(extra = "") {
  return `
    SELECT a.id,
           COALESCE(a.application_ref_no, 'DRAFT-' || a.id::text) AS display_ref,
           a.application_ref_no AS reference_no,
           a.application_ref_no,
           a.application_type,
           CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
           a.current_stage,
           a.current_stage,
           CASE
             WHEN a.current_stage = 'Draft' THEN 'draft'
             WHEN a.current_stage IN ('Submitted','WithNodalOfficerA') THEN 'pending'
             WHEN a.current_stage IN ('WithTechnicalOfficer','WithRCDForInspection','InspectionCompleted') THEN 'scrutiny'
             WHEN a.current_stage = 'QuerySent' THEN 'query'
             WHEN a.current_stage IN ('WithExpertCommittee','WithNodalPointB','DecisionPending') THEN 'ec'
             WHEN a.current_stage IN ('Approved','ConditionallyAuthorized') THEN 'approved'
             WHEN a.current_stage = 'Rejected' THEN 'rejected'
             WHEN a.current_stage IN ('Withdrawn','Closed') THEN 'withdrawn'
             WHEN a.current_stage = 'WithCEO' THEN 'appeal'
             WHEN a.current_stage = 'WithChairperson' THEN 'review'
             ELSE 'pending'
           END AS status,
           a.final_status,
           a.ec_status,
           a.submitted_date AS submitted_at,
           a.submitted_date,
           a.created_at,
           a.updated_at,
           d.decision_date AS decision_at,
           a.applicant_name AS organization_name,
           a.applicant_name,
           a.address,
           a.product_name,
           a.food_category,
           a.kind_of_business,
           fp.total_amount AS fee_amount,
           fp.amount,
           fp.gst_amount,
           fp.payment_status,
           fp.transaction_ref AS payment_reference,
           ('INV-' || EXTRACT(YEAR FROM COALESCE(a.submitted_date, a.created_at))::int || '-' || substring(a.id::text, 1, 8)) AS invoice_no,
           ap.contact_person AS authorized_person,
           ap.mobile AS mobile_number,
           u.email AS contact_email,
           u.fssai_license_no AS license_no,
           ap.gstin AS gst_no,
           NULL::text AS manufacturing_address,
           NULL::text AS ingredients,
           NULL::text AS regulatory_status_text,
           NULL::text AS safety_info
           ${extra}
    FROM applications a
    LEFT JOIN users u ON u.id = a.applicant_id
    LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
    LEFT JOIN LATERAL (
      SELECT *
      FROM fee_payments fp
      WHERE fp.application_id = a.id
      ORDER BY fp.created_at DESC
      LIMIT 1
    ) fp ON TRUE
    LEFT JOIN LATERAL (
      SELECT decision_date
      FROM decisions d
      WHERE d.application_id = a.id
      ORDER BY d.decision_date DESC
      LIMIT 1
    ) d ON TRUE`;
}

// GET /api/applications/stats
export const getStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT current_stage, COUNT(*)::int AS count FROM applications WHERE applicant_id = $1 GROUP BY current_stage",
      [req.user.id]
    );
    const counts = Object.fromEntries(rows.map((r) => [r.current_stage, r.count]));
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const bins = {};
    for (const [bin, stages] of Object.entries(BIN_STAGES)) {
      bins[bin] = stages.reduce((sum, stage) => sum + (counts[stage] || 0), 0);
    }
    res.json({ success: true, stats: { total, ...bins } });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications
export const listApplications = async (req, res, next) => {
  try {
    const { bin, app_type, food_category, status, reference_no, date_from, date_to, page = 1, limit = 10 } = req.query;
    const params = [req.user.id];
    const conditions = ["a.applicant_id = $1"];

    if (bin && BIN_STAGES[bin]) {
      params.push(BIN_STAGES[bin]);
      conditions.push(`a.current_stage = ANY($${params.length})`);
    }
    if (status) {
      const stages = Object.entries(STAGE_TO_STATUS).filter(([, s]) => s === status).map(([stage]) => stage);
      params.push(stages.length ? stages : [status]);
      conditions.push(`a.current_stage = ANY($${params.length})`);
    }
    if (app_type) {
      params.push(normalizeType(app_type));
      conditions.push(`a.application_type = $${params.length}`);
    }
    if (food_category) {
      params.push(`%${food_category}%`);
      conditions.push(`a.food_category ILIKE $${params.length}`);
    }
    if (reference_no) {
      params.push(`%${reference_no}%`);
      conditions.push(`a.application_ref_no ILIKE $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const where = conditions.join(" AND ");
    const [dataResult, countResult] = await Promise.all([
      pool.query(`${appSelect()} WHERE ${where} ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, Number(limit), offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM applications a WHERE ${where}`, params),
    ]);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: countResult.rows[0].total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(countResult.rows[0].total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id
export const getApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${appSelect()} WHERE a.id = $1 AND a.applicant_id = $2`, [req.params.id, req.user.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id/queries
export const listQueries = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.id, q.query_text, q.response_text, q.response_date, q.status,
              q.sent_date, q.due_date, q.created_at, q.updated_at,
              u.username AS drafted_by_name,
              au.username AS approved_by_name
       FROM queries q
       JOIN applications a ON a.id = q.application_id
       LEFT JOIN users u ON u.id = q.drafted_by
       LEFT JOIN users au ON au.id = q.approved_by
       WHERE q.application_id = $1
         AND a.applicant_id = $2
         AND q.status IN ('Sent','Responded','Closed')
       ORDER BY q.created_at DESC`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const queryResponseSchema = z.object({
  response_text: z.string().min(3, "Response is required"),
});

// POST /api/applications/:id/queries/:queryId/respond
export const respondToQuery = async (req, res, next) => {
  try {
    const data = queryResponseSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT q.id, q.application_id, q.status, a.current_stage
         FROM queries q
         JOIN applications a ON a.id = q.application_id
         WHERE q.id = $1 AND q.application_id = $2 AND a.applicant_id = $3
         FOR UPDATE`,
        [req.params.queryId, req.params.id, req.user.id]
      );
      const query = rows[0];
      if (!query) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Query not found" });
      }
      if (query.status !== "Sent") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only sent queries can be responded to" });
      }

      await client.query(
        `UPDATE queries
         SET response_text = $1, response_date = NOW(), status = 'Responded', updated_at = NOW()
         WHERE id = $2`,
        [data.response_text, query.id]
      );
      await client.query(
        "UPDATE applications SET current_stage = 'WithTechnicalOfficer', updated_at = NOW() WHERE id = $1",
        [query.application_id]
      );
      await client.query(
        `INSERT INTO workflow_actions (application_id, actor_id, from_role, to_role, action_type, remarks)
         VALUES ($1, $2, 'Applicant', 'TechnicalOfficer', 'QueryResponse', $3)`,
        [query.application_id, req.user.id, data.response_text]
      );

      const { rows: officers } = await client.query(
        `SELECT DISTINCT officer_id
         FROM officer_assignments
         WHERE application_id = $1 AND is_current = TRUE`,
        [query.application_id]
      );
      for (const officer of officers) {
        await client.query(
          `INSERT INTO notifications (user_id, application_id, title, message, notification_type)
           VALUES ($1, $2, 'Applicant responded to query', 'The applicant has submitted a response to your query.', 'Queries')`,
          [officer.officer_id, query.application_id]
        );
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Query response submitted" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/applications
export const createApplication = async (req, res, next) => {
  try {
    const data = createSchema.parse({ ...req.body, app_type: normalizeType(req.body.app_type) });
    const applicationType = normalizeType(data.app_type);
    const fee = await getFee(applicationType);
    const profile = await getApplicantName(req.user.id);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await upsertApplicantProfile(client, req.user.id, data);

      if (data.license_no) {
        await client.query("UPDATE users SET fssai_license_no = COALESCE(fssai_license_no, $1), updated_at = NOW() WHERE id = $2", [data.license_no, req.user.id]);
      }

      const { rows: appRows } = await client.query(
        `INSERT INTO applications
           (applicant_id, applicant_name, address, application_type, product_name, food_category, kind_of_business, current_stage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
         RETURNING id`,
        [
          req.user.id,
          data.organization_name || profile.applicant_name || "Applicant",
          data.address ?? null,
          applicationType,
          data.product_name,
          data.food_category ?? null,
          data.kind_of_business ?? "Manufacturer",
        ]
      );

      const app = appRows[0];
      await client.query(
        `INSERT INTO fee_payments (application_id, category, fee_type, amount, gst_amount, total_amount, payment_status, transaction_ref)
         VALUES ($1, $2, 'ApplicationFee', $3, $4, $5, $6, $7)`,
        [app.id, applicationType, fee.amount, fee.gst, fee.total, data.payment_reference ? "Paid" : "Pending", data.payment_reference ?? null]
      );

      await client.query("COMMIT");

      const { rows } = await pool.query(`${appSelect()} WHERE a.id = $1`, [app.id]);
      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// PATCH /api/applications/:id
export const updateApplication = async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body.app_type ? { ...req.body, app_type: normalizeType(req.body.app_type) } : req.body);
    const { rows: existing } = await pool.query(
      "SELECT id, current_stage FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!existing[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (existing[0].current_stage !== "Draft") {
      return res.status(409).json({ success: false, message: "Only draft applications can be edited" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await upsertApplicantProfile(client, req.user.id, data);

      const fields = [];
      const params = [];
      const map = {
        app_type: "application_type",
        organization_name: "applicant_name",
        address: "address",
        product_name: "product_name",
        food_category: "food_category",
        kind_of_business: "kind_of_business",
      };
      for (const [key, column] of Object.entries(map)) {
        if (key in data) {
          params.push(key === "app_type" ? normalizeType(data[key]) : data[key]);
          fields.push(`${column} = $${params.length}`);
        }
      }
      if (fields.length) {
        params.push(req.params.id);
        await client.query(`UPDATE applications SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`, params);
      }

      if (data.app_type) {
        const fee = await getFee(normalizeType(data.app_type));
        await client.query(
          `UPDATE fee_payments
           SET category = $1, amount = $2, gst_amount = $3, total_amount = $4
           WHERE application_id = $5`,
          [normalizeType(data.app_type), fee.amount, fee.gst, fee.total, req.params.id]
        );
      }

      await client.query("COMMIT");
      const { rows } = await pool.query(`${appSelect()} WHERE a.id = $1`, [req.params.id]);
      res.json({ success: true, data: rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/submit
export const submitApplication = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, application_type, current_stage FROM applications WHERE id = $1 AND applicant_id = $2 FOR UPDATE",
        [req.params.id, req.user.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.current_stage !== "Draft") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Already submitted" });
      }

      const ref = await generateApplicationRef(client, app.application_type);
      await client.query(
        `UPDATE applications
         SET current_stage = 'WithNodalOfficerA',
             application_ref_no = $1,
             submitted_date = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [ref, app.id]
      );

      await client.query(
        `INSERT INTO workflow_actions (application_id, actor_id, from_role, to_role, action_type, remarks)
         VALUES ($1, $2, 'Applicant', 'NodalOfficerA', 'Submit', 'Application submitted by applicant')`,
        [app.id, req.user.id]
      );

      await client.query("COMMIT");
      const { rows: updated } = await pool.query(`${appSelect()} WHERE a.id = $1`, [app.id]);
      res.json({ success: true, data: updated[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// DELETE /api/applications/:id
export const deleteApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, current_stage FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (rows[0].current_stage !== "Draft") {
      return res.status(409).json({ success: false, message: "Only draft applications can be deleted" });
    }

    await pool.query("DELETE FROM applications WHERE id = $1", [req.params.id]);
    res.json({ success: true, message: "Application deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/invoices
export const listInvoices = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${appSelect()}
       WHERE a.applicant_id = $1 AND a.application_ref_no IS NOT NULL
       ORDER BY a.submitted_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/requests/appeals
export const listAppeals = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ap.id, ap.appeal_type, ap.filed_date, ap.decision, ap.decision_date,
              ap.grounds_text AS grounds, ap.remarks,
              a.application_ref_no AS reference_no,
              CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
              d.decision_date AS decision_at,
              COALESCE(a.application_ref_no, 'DRAFT-' || a.id::text) AS display_ref,
              a.applicant_name AS organization_name,
              a.product_name,
              a.food_category
       FROM appeals ap
       JOIN applications a ON a.id = ap.application_id
       LEFT JOIN LATERAL (
         SELECT decision_date FROM decisions d WHERE d.application_id = a.id ORDER BY decision_date DESC LIMIT 1
       ) d ON TRUE
       WHERE ap.filed_by = $1
       ORDER BY ap.filed_date DESC`,
      [req.user.id]
    );
    const stats = { total: rows.length, pending: 0, accepted: 0, rejected: 0 };
    rows.forEach((r) => {
      if (!r.decision || r.decision === "Pending") stats.pending++;
      else if (r.decision === "Accepted") stats.accepted++;
      else stats.rejected++;
    });
    res.json({ success: true, data: rows, stats });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/appeal
export const fileAppeal = async (req, res, next) => {
  try {
    const { grounds, appeal_type = "AgainstRejection" } = req.body;
    if (!grounds?.trim()) return res.status(400).json({ success: false, message: "Grounds required" });

    const { rows } = await pool.query(
      "SELECT id, current_stage FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (rows[0].current_stage !== "Rejected") return res.status(409).json({ success: false, message: "Can only appeal rejected applications" });

    const { rows: result } = await pool.query(
      `INSERT INTO appeals (application_id, appeal_type, filed_by, grounds_text)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, appeal_type, req.user.id, grounds]
    );
    res.status(201).json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/requests/reviews
export const listReviews = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT rv.id, rv.review_reason, rv.filed_at, rv.chairperson_decision, rv.decided_at,
              a.application_ref_no AS reference_no,
              CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
              COALESCE(a.application_ref_no, 'DRAFT-' || a.id::text) AS display_ref,
              a.applicant_name AS organization_name,
              a.product_name,
              a.food_category,
              ap.decision_date AS appeal_rejected_on
       FROM reviews rv
       JOIN applications a ON a.id = rv.application_id
       LEFT JOIN appeals ap ON ap.id = rv.appeal_id
       WHERE rv.filed_by_applicant_id = $1
       ORDER BY rv.filed_at DESC`,
      [req.user.id]
    );
    const stats = { total: rows.length, pending: 0, accepted: 0, rejected: 0 };
    rows.forEach((r) => {
      if (!r.chairperson_decision || r.chairperson_decision === "Pending") stats.pending++;
      else if (r.chairperson_decision === "Accepted") stats.accepted++;
      else stats.rejected++;
    });
    res.json({ success: true, data: rows, stats });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/review
export const fileReview = async (req, res, next) => {
  try {
    const { review_reason, appeal_id } = req.body;
    if (!review_reason?.trim()) return res.status(400).json({ success: false, message: "Review reason required" });
    if (!appeal_id) return res.status(400).json({ success: false, message: "Appeal ID required" });

    const { rows } = await pool.query(
      "SELECT id FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });

    const { rows: result } = await pool.query(
      `INSERT INTO reviews (application_id, appeal_id, filed_by_applicant_id, review_reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, appeal_id, req.user.id, review_reason]
    );
    res.status(201).json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/requests/extensions
export const listExtensions = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT er.id, er.reason, er.status, er.requested_date, er.created_at,
              a.application_ref_no AS reference_no,
              CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
              COALESCE(a.application_ref_no, 'DRAFT-' || a.id::text) AS display_ref,
              a.applicant_name AS organization_name,
              a.food_category,
              q.due_date,
              q.query_text
       FROM extension_requests er
       JOIN applications a ON a.id = er.application_id
       LEFT JOIN queries q ON q.id = er.query_id
       WHERE er.requested_by = $1
       ORDER BY er.created_at DESC`,
      [req.user.id]
    );
    const stats = { total: rows.length, pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => {
      if (r.status === "Pending") stats.pending++;
      else if (r.status === "Approved") stats.approved++;
      else if (r.status === "Rejected") stats.rejected++;
    });
    res.json({ success: true, data: rows, stats });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/extension-request
export const createExtensionRequest = async (req, res, next) => {
  try {
    const { reason, query_id, requested_new_deadline } = req.body;
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Reason required" });

    const { rows } = await pool.query(
      "SELECT id, current_stage FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (rows[0].current_stage !== "QuerySent") {
      return res.status(409).json({ success: false, message: "Can only request extension for applications with active queries" });
    }

    const deadline = requested_new_deadline ?? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { rows: result } = await pool.query(
      `INSERT INTO extension_requests (application_id, query_id, requested_by, requested_new_deadline, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, query_id ?? null, req.user.id, deadline, reason]
    );
    res.status(201).json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
};
