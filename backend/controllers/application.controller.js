import { z } from "zod";
import pool from "../config/db.js";

const FEE_MAP = { NSF: 59000, CA: 59000, AA: 59000, rPET: 17700, "Any Other": 11800 };
const GST_RATE = 0.18;

const BIN_STATUS = {
  incomplete: ["draft"],
  submitted: ["pending", "scrutiny", "ec"],
  reverted: ["query"],
  rejected: ["rejected"],
  approved: ["approved"],
};

const createSchema = z.object({
  app_type: z.enum(["NSF", "CA", "AA", "rPET", "Any Other"]),
  payment_reference: z.string().max(100).optional(),
  product_name: z.string().min(1).max(200).optional(),
  food_category: z.string().max(100).optional(),
  organization_name: z.string().max(200).optional(),
  address: z.string().optional(),
  manufacturing_address: z.string().optional(),
  authorized_person: z.string().max(100).optional(),
  mobile_number: z.string().regex(/^[6-9]\d{9}$/).optional(),
  contact_email: z.string().email().optional(),
  license_no: z.string().max(100).optional(),
  ingredients: z.string().optional(),
  regulatory_status_text: z.string().optional(),
  safety_info: z.string().optional(),
  gst_no: z.string().max(20).optional(),
});

const updateSchema = createSchema.partial();

// GET /api/applications/stats
export const getStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT status, COUNT(*)::int AS count FROM applications WHERE applicant_id = $1 GROUP BY status",
      [req.user.id]
    );

    const statusCounts = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const total = rows.reduce((s, r) => s + r.count, 0);

    const bins = {};
    for (const [bin, statuses] of Object.entries(BIN_STATUS)) {
      bins[bin] = statuses.reduce((s, st) => s + (statusCounts[st] || 0), 0);
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

    if (bin && BIN_STATUS[bin]) {
      params.push(BIN_STATUS[bin]);
      conditions.push(`a.status = ANY($${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (app_type) {
      params.push(app_type);
      conditions.push(`a.app_type = $${params.length}`);
    }
    if (food_category) {
      params.push(`%${food_category}%`);
      conditions.push(`d.food_category ILIKE $${params.length}`);
    }
    if (reference_no) {
      params.push(`%${reference_no}%`);
      conditions.push(`a.reference_no ILIKE $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    const where = conditions.join(" AND ");
    const offset = (Number(page) - 1) * Number(limit);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT a.id,
                COALESCE(a.reference_no, 'DRAFT-' || a.id) AS display_ref,
                a.reference_no, a.invoice_no, a.app_type, a.status, a.current_stage,
                a.payment_status, a.created_at, a.submitted_at, a.decision_at,
                d.product_name, d.food_category, d.organization_name, d.address, d.fee_amount
         FROM applications a
         LEFT JOIN application_details d ON d.application_id = a.id
         WHERE ${where}
         ORDER BY a.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM applications a
         LEFT JOIN application_details d ON d.application_id = a.id
         WHERE ${where}`,
        params
      ),
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
    const { rows } = await pool.query(
      `SELECT a.*, COALESCE(a.reference_no, 'DRAFT-' || a.id) AS display_ref,
              d.product_name, d.food_category, d.organization_name, d.address,
              d.manufacturing_address, d.authorized_person, d.mobile_number,
              d.contact_email, d.license_no, d.ingredients, d.regulatory_status_text,
              d.safety_info, d.gst_no, d.fee_amount
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       WHERE a.id = $1 AND a.applicant_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications
export const createApplication = async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const base = FEE_MAP[data.app_type] || 0;
    const fee = +(base * (1 + GST_RATE)).toFixed(2);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows: appRows } = await client.query(
        `INSERT INTO applications (applicant_id, app_type, payment_reference)
         VALUES ($1, $2, $3)
         RETURNING id, app_type, status, current_stage, created_at`,
        [req.user.id, data.app_type, data.payment_reference ?? null]
      );
      const app = appRows[0];

      await client.query(
        `INSERT INTO application_details
           (application_id, product_name, food_category, organization_name, address,
            manufacturing_address, authorized_person, mobile_number, contact_email,
            license_no, ingredients, regulatory_status_text, safety_info, gst_no, fee_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          app.id,
          data.product_name ?? null, data.food_category ?? null,
          data.organization_name ?? null, data.address ?? null,
          data.manufacturing_address ?? null, data.authorized_person ?? null,
          data.mobile_number ?? null, data.contact_email ?? null,
          data.license_no ?? null, data.ingredients ?? null,
          data.regulatory_status_text ?? null, data.safety_info ?? null,
          data.gst_no ?? null, fee,
        ]
      );

      await client.query("COMMIT");
      res.status(201).json({
        success: true,
        data: { ...app, display_ref: `DRAFT-${app.id}`, fee_amount: fee },
      });
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
    const { rows: existing } = await pool.query(
      "SELECT id, status, app_type FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!existing[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (existing[0].status !== "draft") {
      return res.status(409).json({ success: false, message: "Only draft applications can be edited" });
    }

    const data = updateSchema.parse(req.body);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Update applications table
      const appFields = [];
      const appParams = [];
      if (data.app_type) {
        appParams.push(data.app_type);
        appFields.push(`app_type = $${appParams.length}`);
      }
      if ("payment_reference" in data) {
        appParams.push(data.payment_reference);
        appFields.push(`payment_reference = $${appParams.length}`);
      }
      if (appFields.length) {
        appParams.push(req.params.id);
        await client.query(
          `UPDATE applications SET ${appFields.join(", ")}, updated_at = NOW() WHERE id = $${appParams.length}`,
          appParams
        );
      }

      // Update application_details table
      const detailKeys = [
        "product_name", "food_category", "organization_name", "address",
        "manufacturing_address", "authorized_person", "mobile_number",
        "contact_email", "license_no", "ingredients", "regulatory_status_text",
        "safety_info", "gst_no",
      ];
      const dFields = [];
      const dParams = [];
      for (const key of detailKeys) {
        if (key in data) {
          dParams.push(data[key]);
          dFields.push(`${key} = $${dParams.length}`);
        }
      }
      if (data.app_type) {
        const fee = +(FEE_MAP[data.app_type] * (1 + GST_RATE)).toFixed(2);
        dParams.push(fee);
        dFields.push(`fee_amount = $${dParams.length}`);
      }
      if (dFields.length) {
        dParams.push(req.params.id);
        await client.query(
          `UPDATE application_details SET ${dFields.join(", ")}, updated_at = NOW() WHERE application_id = $${dParams.length}`,
          dParams
        );
      }

      await client.query("COMMIT");

      const { rows } = await client.query(
        `SELECT a.*, COALESCE(a.reference_no, 'DRAFT-' || a.id) AS display_ref,
                d.product_name, d.food_category, d.organization_name, d.address,
                d.manufacturing_address, d.authorized_person, d.mobile_number,
                d.contact_email, d.license_no, d.ingredients, d.regulatory_status_text,
                d.safety_info, d.gst_no, d.fee_amount
         FROM applications a
         LEFT JOIN application_details d ON d.application_id = a.id
         WHERE a.id = $1`,
        [req.params.id]
      );
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
        "SELECT id, app_type, status FROM applications WHERE id = $1 AND applicant_id = $2 FOR UPDATE",
        [req.params.id, req.user.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status !== "draft") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Already submitted" });
      }

      const year = new Date().getFullYear();
      const typeCode = app.app_type === "Any Other" ? "AOT" : app.app_type;
      const reference_no = `APP-${year}-${typeCode}-${String(app.id).padStart(5, "0")}`;
      const invoice_no = `INV-${year}-${String(app.id).padStart(4, "0")}`;

      const { rows: updated } = await client.query(
        `UPDATE applications
         SET status = 'pending', reference_no = $1, invoice_no = $2,
             submitted_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING id, reference_no, invoice_no, status, submitted_at`,
        [reference_no, invoice_no, app.id]
      );

      await client.query("COMMIT");
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
      "SELECT id, status FROM applications WHERE id = $1 AND applicant_id = $2",
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    if (rows[0].status !== "draft") {
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
      `SELECT a.id, a.reference_no, a.invoice_no, a.app_type, a.payment_status,
              a.payment_reference, a.submitted_at,
              d.organization_name, d.product_name, d.fee_amount, d.gst_no
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       WHERE a.applicant_id = $1 AND a.invoice_no IS NOT NULL
       ORDER BY a.submitted_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
