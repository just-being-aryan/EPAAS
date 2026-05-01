import { z } from "zod";
import pool from "../config/db.js";

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

const STATUS_TO_STAGES = Object.entries(STAGE_TO_STATUS).reduce((acc, [stage, status]) => {
  acc[status] = [...(acc[status] ?? []), stage];
  return acc;
}, {});

const normalizeType = (value) => (value === "Any Other" ? "AnyOther" : value);
const normalizeStatus = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;

function stageCaseSql() {
  return `CASE
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
  END`;
}

function appSelect(extra = "") {
  return `
    SELECT a.id,
           a.application_ref_no AS reference_no,
           a.application_ref_no,
           COALESCE(a.application_ref_no, 'DRAFT-' || a.id::text) AS display_ref,
           CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
           a.application_type,
           ${stageCaseSql()} AS status,
           a.current_stage,
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
           a.risk_level,
           fp.total_amount AS fee_amount,
           fp.payment_status,
           ap.contact_person AS authorized_person,
           ap.mobile AS mobile_number,
           u.email AS contact_email,
           u.fssai_license_no AS license_no,
           ap.gstin AS gst_no,
           oa.assigned_at,
           no_user.username AS assigned_by_name
           ${extra}
    FROM applications a
    JOIN officer_assignments oa ON oa.application_id = a.id
    JOIN roles ar ON ar.id = oa.role_id AND ar.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')
    LEFT JOIN users u ON u.id = a.applicant_id
    LEFT JOIN applicant_profiles ap ON ap.user_id = a.applicant_id
    LEFT JOIN users no_user ON no_user.id = oa.assigned_by
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

async function logAction(client, { application_id, actor_id, from_role, to_role, action_type, remarks }) {
  await client.query(
    `INSERT INTO workflow_actions (application_id, actor_id, from_role, to_role, action_type, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [application_id, actor_id ?? null, from_role ?? null, to_role ?? null, action_type, remarks ?? null]
  );
}

async function notifyNodal(client, applicationId, title, message) {
  const { rows } = await client.query(
    `SELECT DISTINCT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN officer_assignments oa ON oa.assigned_by = u.id AND oa.application_id = $1
     WHERE r.role_code IN ('NodalOfficerA','NodalOfficerARPET')
       AND (oa.assigned_by IS NOT NULL OR u.is_active = TRUE)`,
    [applicationId]
  );
  for (const row of rows) {
    await client.query(
      `INSERT INTO notifications (user_id, application_id, title, message, notification_type)
       VALUES ($1, $2, $3, $4, 'System')`,
      [row.id, applicationId, title, message]
    );
  }
}

function addFilters(query, params, conditions) {
  const { status, app_type, reference_no, date_from, date_to, q } = query;
  if (status) {
    const stages = STATUS_TO_STAGES[status] ?? [status];
    params.push(stages);
    conditions.push(`a.current_stage = ANY($${params.length})`);
  }
  if (app_type) {
    params.push(normalizeType(app_type));
    conditions.push(`a.application_type = $${params.length}`);
  }
  if (reference_no) {
    params.push(`%${reference_no}%`);
    conditions.push(`a.application_ref_no ILIKE $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    conditions.push(`(a.application_ref_no ILIKE $${n} OR a.applicant_name ILIKE $${n} OR a.product_name ILIKE $${n} OR a.food_category ILIKE $${n})`);
  }
  if (date_from) {
    params.push(date_from);
    conditions.push(`a.submitted_date >= $${params.length}`);
  }
  if (date_to) {
    params.push(date_to);
    conditions.push(`a.submitted_date <= $${params.length}`);
  }
}

export const getDashboardStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.current_stage, a.final_status, COUNT(*)::int AS count
       FROM applications a
       JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
       JOIN roles r ON r.id = oa.role_id AND r.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')
       GROUP BY a.current_stage, a.final_status`,
      [req.user.id]
    );
    const stats = { total: 0, pending: 0, scrutiny: 0, query: 0, ec: 0, approved: 0, rejected: 0, withdrawn: 0, appeal: 0, review: 0 };
    for (const row of rows) {
      const status = STAGE_TO_STATUS[row.current_stage] ?? "pending";
      stats[status] = (stats[status] ?? 0) + row.count;
      stats.total += row.count;
    }
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

export const listApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const params = [req.user.id];
    const conditions = ["oa.officer_id = $1", "oa.is_current = TRUE"];
    if (!req.query.status) {
      params.push(["WithTechnicalOfficer", "QuerySent", "WithExpertCommittee", "DecisionPending"]);
      conditions.push(`a.current_stage = ANY($${params.length})`);
    }
    addFilters(req.query, params, conditions);
    const where = conditions.join(" AND ");
    const offset = (Number(page) - 1) * Number(limit);
    const [dataResult, countResult] = await Promise.all([
      pool.query(`${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST, oa.assigned_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, Number(limit), offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM applications a JOIN officer_assignments oa ON oa.application_id = a.id JOIN roles ar ON ar.id = oa.role_id AND ar.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET') WHERE ${where}`, params),
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

export const getApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${appSelect()} WHERE oa.officer_id = $1 AND oa.is_current = TRUE AND a.id = $2`,
      [req.user.id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const riskSchema = z.object({
  risk_level: z.enum(["Low", "Medium", "High"]),
  remarks: z.string().optional(),
});

export const updateRisk = async (req, res, next) => {
  try {
    const data = riskSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT a.id, a.current_stage
         FROM applications a
         JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
         WHERE a.id = $2 FOR UPDATE`,
        [req.user.id, req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      await client.query("UPDATE applications SET risk_level = $1, updated_at = NOW() WHERE id = $2", [data.risk_level, app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: app.current_stage,
        action_type: "PrepareLetter",
        remarks: data.remarks ?? `Risk classified as ${data.risk_level}`,
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Risk classification saved" });
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

const querySchema = z.object({
  query_text: z.string().min(10),
  due_date: z.string().optional(),
  is_post_ec: z.boolean().optional(),
});

export const draftQuery = async (req, res, next) => {
  try {
    const data = querySchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT a.id, a.current_stage
         FROM applications a
         JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
         WHERE a.id = $2 FOR UPDATE`,
        [req.user.id, req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["WithTechnicalOfficer", "QuerySent", "WithExpertCommittee"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Cannot draft query in current stage" });
      }
      const { rows: qRows } = await client.query(
        `INSERT INTO queries (application_id, drafted_by, query_text, due_date, is_post_ec, status)
         VALUES ($1, $2, $3, $4, $5, 'Draft')
         RETURNING id, query_text, status, due_date, created_at`,
        [app.id, req.user.id, data.query_text, data.due_date ?? null, data.is_post_ec ?? false]
      );
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: "TechnicalOfficer",
        to_role: "NodalOfficerA",
        action_type: "DraftQuery",
        remarks: data.query_text,
      });
      await notifyNodal(client, app.id, "Query drafted by Technical Officer", "A draft query is waiting for Nodal Officer approval.");
      await client.query("COMMIT");
      res.status(201).json({ success: true, data: qRows[0] });
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

const recommendationSchema = z.object({
  recommendation: z.enum(["ForwardToEC", "Approve", "Reject", "Clarification"]),
  remarks: z.string().min(3),
});

export const submitRecommendation = async (req, res, next) => {
  try {
    const data = recommendationSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT a.id, a.current_stage
         FROM applications a
         JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
         WHERE a.id = $2 FOR UPDATE`,
        [req.user.id, req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      const nextStage = data.recommendation === "ForwardToEC" ? "WithExpertCommittee" : "WithNodalOfficerA";
      const toRole = data.recommendation === "ForwardToEC" ? "ExpertCommittee" : "NodalOfficerA";

      await client.query("UPDATE applications SET current_stage = $1, updated_at = NOW() WHERE id = $2", [nextStage, app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: "TechnicalOfficer",
        to_role: toRole,
        action_type: data.recommendation === "ForwardToEC" ? "ForwardToEC" : "PrepareLetter",
        remarks: `${data.recommendation}: ${data.remarks}`,
      });
      if (data.recommendation === "ForwardToEC") {
        await notifyNodal(client, app.id, "Application forwarded to Expert Committee", data.remarks);
      } else {
        await notifyNodal(client, app.id, "Technical recommendation submitted", data.remarks);
      }
      await client.query("COMMIT");
      res.json({ success: true, message: "Recommendation submitted to Nodal Officer" });
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

export const listQueries = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT q.*, a.application_ref_no AS reference_no, a.applicant_name AS organization_name, a.product_name
       FROM queries q
       JOIN applications a ON a.id = q.application_id
       JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
       WHERE q.drafted_by = $1
       ORDER BY q.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const getWorkflowHistory = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wa.*,
              wa.from_role AS from_status,
              wa.to_role AS to_status,
              wa.action_date AS created_at,
              u.username AS performed_by_name
       FROM workflow_actions wa
       LEFT JOIN users u ON u.id = wa.actor_id
       WHERE wa.application_id = $1
       ORDER BY wa.action_date ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const listExtensions = async (req, res, next) => {
  try {
    const status = normalizeStatus(req.query.status ?? "Pending");
    const { rows } = await pool.query(
      `SELECT er.*, er.requested_new_deadline AS new_due_date,
              a.application_ref_no AS reference_no,
              a.applicant_name AS organization_name,
              a.product_name,
              q.query_text,
              q.due_date AS current_due_date
       FROM extension_requests er
       JOIN applications a ON a.id = er.application_id
       JOIN officer_assignments oa ON oa.application_id = a.id AND oa.officer_id = $1 AND oa.is_current = TRUE
       LEFT JOIN queries q ON q.id = er.query_id
       WHERE er.status = $2
       ORDER BY er.created_at DESC`,
      [req.user.id, status]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const extensionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
  new_due_date: z.string().optional(),
});

export const handleExtension = async (req, res, next) => {
  try {
    const data = extensionSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT er.*
         FROM extension_requests er
         JOIN officer_assignments oa ON oa.application_id = er.application_id AND oa.officer_id = $1 AND oa.is_current = TRUE
         WHERE er.id = $2 FOR UPDATE`,
        [req.user.id, req.params.id]
      );
      const ext = rows[0];
      if (!ext) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Extension request not found" });
      }
      if (ext.status !== "Pending") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Extension request already processed" });
      }
      const newStatus = data.action === "approve" ? "Approved" : "Rejected";
      await client.query(
        "UPDATE extension_requests SET status = $1, approved_by = $2, actioned_date = NOW() WHERE id = $3",
        [newStatus, req.user.id, ext.id]
      );
      if (data.action === "approve" && (data.new_due_date || ext.requested_new_deadline) && ext.query_id) {
        await client.query("UPDATE queries SET due_date = $1, updated_at = NOW() WHERE id = $2", [data.new_due_date ?? ext.requested_new_deadline, ext.query_id]);
      }
      await logAction(client, {
        application_id: ext.application_id,
        actor_id: req.user.id,
        from_role: "TechnicalOfficer",
        to_role: "Applicant",
        action_type: "ExtensionDecision",
        remarks: `Extension ${newStatus}. ${data.remarks ?? ""}`.trim(),
      });
      await client.query("COMMIT");
      res.json({ success: true, message: `Extension request ${newStatus}` });
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

export const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, a.application_ref_no AS reference_no
       FROM notifications n
       LEFT JOIN applications a ON a.id = n.application_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread_count = rows.filter((r) => !r.is_read).length;
    res.json({ success: true, data: rows, unread_count, unread: unread_count });
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const searchApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const params = [req.user.id];
    const conditions = ["oa.officer_id = $1", "oa.is_current = TRUE"];
    addFilters(req.query, params, conditions);
    const where = conditions.join(" AND ");
    const offset = (Number(page) - 1) * Number(limit);
    const { rows } = await pool.query(
      `${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

export const reportStatus = async (req, res, next) => {
  try {
    const params = [req.user.id];
    const conditions = ["oa.officer_id = $1", "oa.is_current = TRUE"];
    addFilters(req.query, params, conditions);
    const where = conditions.join(" AND ");
    const [summary, detail] = await Promise.all([
      pool.query(
        `SELECT ${stageCaseSql()} AS status,
                CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
                COUNT(*)::int AS count
         FROM applications a
         JOIN officer_assignments oa ON oa.application_id = a.id
         JOIN roles ar ON ar.id = oa.role_id AND ar.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')
         WHERE ${where}
         GROUP BY status, app_type
         ORDER BY status, app_type`,
        params
      ),
      pool.query(`${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST`, params),
    ]);
    res.json({ success: true, summary: summary.rows, data: detail.rows });
  } catch (err) {
    next(err);
  }
};
