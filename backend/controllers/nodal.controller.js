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
const normalizeStatus = (value) => {
  if (!value) return value;
  const title = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return title;
};

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
           u.username AS applicant_user_name,
           u.email AS applicant_email,
           fp.total_amount AS fee_amount,
           fp.payment_status,
           to_user.id AS assigned_to,
           to_user.username AS assigned_officer_name,
           to_user.email AS assigned_officer_email
           ${extra}
    FROM applications a
    LEFT JOIN users u ON u.id = a.applicant_id
    LEFT JOIN LATERAL (
      SELECT *
      FROM fee_payments fp
      WHERE fp.application_id = a.id
      ORDER BY fp.created_at DESC
      LIMIT 1
    ) fp ON TRUE
    LEFT JOIN LATERAL (
      SELECT d.decision_date
      FROM decisions d
      WHERE d.application_id = a.id
      ORDER BY d.decision_date DESC
      LIMIT 1
    ) d ON TRUE
    LEFT JOIN LATERAL (
      SELECT oa.officer_id
      FROM officer_assignments oa
      JOIN roles r ON r.id = oa.role_id
      WHERE oa.application_id = a.id
        AND oa.is_current = TRUE
        AND r.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')
      ORDER BY oa.assigned_at DESC
      LIMIT 1
    ) oa ON TRUE
    LEFT JOIN users to_user ON to_user.id = oa.officer_id`;
}

async function logAction(client, { application_id, actor_id, from_role, to_role, action_type, remarks }) {
  await client.query(
    `INSERT INTO workflow_actions (application_id, actor_id, from_role, to_role, action_type, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [application_id, actor_id ?? null, from_role ?? null, to_role ?? null, action_type, remarks ?? null]
  );
}

async function notify(client, { user_id, application_id, title, message, notification_type = "System" }) {
  await client.query(
    `INSERT INTO notifications (user_id, application_id, title, message, notification_type)
     VALUES ($1, $2, $3, $4, $5)`,
    [user_id, application_id ?? null, title, message, notification_type]
  );
}

function addAppFilters(query, params, conditions) {
  const { status, app_type, reference_no, date_from, date_to } = query;
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
  if (date_from) {
    params.push(date_from);
    conditions.push(`a.submitted_date >= $${params.length}`);
  }
  if (date_to) {
    params.push(date_to);
    conditions.push(`a.submitted_date <= $${params.length}`);
  }
}

// GET /api/nodal/stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT current_stage, final_status, COUNT(*)::int AS count
       FROM applications
       WHERE current_stage != 'Draft'
       GROUP BY current_stage, final_status`
    );
    const byStatus = {};
    let total = 0;
    for (const row of rows) {
      const status = STAGE_TO_STATUS[row.current_stage] ?? "pending";
      byStatus[status] = (byStatus[status] ?? 0) + row.count;
      total += row.count;
    }
    res.json({
      success: true,
      stats: {
        total,
        pending: byStatus.pending ?? 0,
        scrutiny: byStatus.scrutiny ?? 0,
        query: byStatus.query ?? 0,
        ec: byStatus.ec ?? 0,
        approved: byStatus.approved ?? 0,
        rejected: byStatus.rejected ?? 0,
        withdrawn: byStatus.withdrawn ?? 0,
        appeal: byStatus.appeal ?? 0,
        review: byStatus.review ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/applications
export const listApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const params = [];
    const conditions = [];
    if (!req.query.status) {
      params.push(["Submitted", "WithNodalOfficerA", "WithTechnicalOfficer", "QuerySent", "WithExpertCommittee", "WithNodalPointB", "DecisionPending"]);
      conditions.push(`a.current_stage = ANY($${params.length})`);
    }
    addAppFilters(req.query, params, conditions);

    const where = conditions.length ? conditions.join(" AND ") : "TRUE";
    const offset = (Number(page) - 1) * Number(limit);

    const [dataResult, countResult] = await Promise.all([
      pool.query(`${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST, a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, Number(limit), offset]),
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

// GET /api/nodal/applications/:id
export const getApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${appSelect()} WHERE a.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/nodal/applications/:id/assign
export const assignApplication = async (req, res, next) => {
  try {
    const { officer_id, remarks } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, current_stage, application_type FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["Submitted", "WithNodalOfficerA", "WithTechnicalOfficer"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be assigned in its current stage" });
      }

      if (officer_id) {
        const { rows: offRows } = await client.query(
          `SELECT u.id, r.id AS role_id
           FROM users u
           JOIN roles r ON r.id = u.role_id
           WHERE u.id = $1 AND r.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')`,
          [officer_id]
        );
        if (!offRows[0]) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, message: "Invalid Technical Officer ID" });
        }

        await client.query(
          `UPDATE officer_assignments
           SET is_current = FALSE, unassigned_at = NOW()
           WHERE application_id = $1 AND role_id = $2 AND is_current = TRUE`,
          [app.id, offRows[0].role_id]
        );
        await client.query(
          `INSERT INTO officer_assignments (application_id, officer_id, role_id, assigned_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (application_id, officer_id, role_id)
           DO UPDATE SET assigned_by = EXCLUDED.assigned_by, assigned_at = NOW(), unassigned_at = NULL, is_current = TRUE`,
          [app.id, officer_id, offRows[0].role_id, req.user.id]
        );
      }

      await client.query("UPDATE applications SET current_stage = 'WithTechnicalOfficer', updated_at = NOW() WHERE id = $1", [app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: "TechnicalOfficer",
        action_type: "Assign",
        remarks,
      });

      if (officer_id) {
        await notify(client, {
          user_id: officer_id,
          application_id: app.id,
          title: "Application assigned",
          message: "An application has been assigned to you for technical scrutiny.",
          notification_type: "System",
        });
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Application assigned to Technical Officer" });
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

// POST /api/nodal/applications/:id/forward-ec
export const forwardToEC = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT id, current_stage FROM applications WHERE id = $1 FOR UPDATE", [req.params.id]);
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["WithNodalOfficerA", "WithTechnicalOfficer", "Submitted"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only active applications can be forwarded to EC" });
      }
      await client.query("UPDATE applications SET current_stage = 'WithExpertCommittee', updated_at = NOW() WHERE id = $1", [app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: "ExpertCommittee",
        action_type: "ForwardToEC",
        remarks,
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Application forwarded to Expert Committee" });
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

async function generateApprovalNumber(client, applicationType) {
  const year = new Date().getFullYear();
  const { rows: codeRows } = await client.query("SELECT decision_code, authority_code FROM application_type_codes WHERE application_type = $1", [applicationType]);
  const decisionCode = codeRows[0]?.decision_code ?? "APP";
  const authority = codeRows[0]?.authority_code ?? "FSSAI";
  const { rows } = await client.query(
    `INSERT INTO numbering_sequences (sequence_type, application_type, year, last_serial)
     VALUES ('approval', $1, $2, 1)
     ON CONFLICT (sequence_type, application_type, year)
     DO UPDATE SET last_serial = numbering_sequences.last_serial + 1
     RETURNING last_serial`,
    [applicationType, year]
  );
  return `${authority}/${decisionCode}/${year}/${String(rows[0].last_serial).padStart(4, "0")}`;
}

// POST /api/nodal/applications/:id/grant-approval
export const grantApproval = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT id, current_stage, applicant_id, application_type FROM applications WHERE id = $1 FOR UPDATE", [req.params.id]);
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (["Draft", "Approved", "Rejected"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be approved in its current stage" });
      }

      await client.query("UPDATE applications SET current_stage = 'Approved', final_status = 'Approved', ec_status = 'Approved', updated_at = NOW() WHERE id = $1", [app.id]);
      const approvalNumber = await generateApprovalNumber(client, app.application_type);
      await client.query(
        `INSERT INTO approval_numbers (application_id, approval_number, issued_by_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (application_id) DO UPDATE SET approval_number = EXCLUDED.approval_number, issued_by_user_id = EXCLUDED.issued_by_user_id, issued_date = NOW()`,
        [app.id, approvalNumber, req.user.id]
      );
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: "Approved",
        action_type: "Dispatch",
        remarks,
      });
      await notify(client, {
        user_id: app.applicant_id,
        application_id: app.id,
        title: "Application approved",
        message: "Your application has been approved. Please log in to view the approval details.",
        notification_type: "Decisions",
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Application approved successfully", approval_number: approvalNumber });
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

// POST /api/nodal/applications/:id/reject
export const rejectApplication = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    if (!remarks) return res.status(400).json({ success: false, message: "Rejection remarks are required" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT id, current_stage, applicant_id FROM applications WHERE id = $1 FOR UPDATE", [req.params.id]);
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (["Draft", "Approved", "Rejected"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be rejected in its current stage" });
      }
      await client.query("UPDATE applications SET current_stage = 'Rejected', final_status = 'Rejected', ec_status = 'Rejected', updated_at = NOW() WHERE id = $1", [app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: "Rejected",
        action_type: "Close",
        remarks,
      });
      await notify(client, {
        user_id: app.applicant_id,
        application_id: app.id,
        title: "Application rejected",
        message: "Your application has been rejected. Please log in to view the reason.",
        notification_type: "Decisions",
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Application rejected" });
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

// POST /api/nodal/applications/:id/withdraw
export const withdrawApproval = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    if (!remarks) return res.status(400).json({ success: false, message: "Remarks required for withdrawal" });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT id, current_stage, applicant_id FROM applications WHERE id = $1 FOR UPDATE", [req.params.id]);
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.current_stage !== "Approved") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only approved applications can have approval withdrawn" });
      }
      await client.query("UPDATE applications SET current_stage = 'Withdrawn', final_status = 'Withdrawn', updated_at = NOW() WHERE id = $1", [app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: "Approved",
        to_role: "Withdrawn",
        action_type: "Withdraw",
        remarks,
      });
      await notify(client, {
        user_id: app.applicant_id,
        application_id: app.id,
        title: "Approval withdrawn",
        message: "The approval for your application has been withdrawn. Please log in for details.",
        notification_type: "Decisions",
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Approval withdrawn" });
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
  query_text: z.string().min(10, "Query must be at least 10 characters"),
  due_date: z.string().optional(),
});

// POST /api/nodal/applications/:id/queries
export const raiseQuery = async (req, res, next) => {
  try {
    const data = querySchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT id, current_stage, applicant_id FROM applications WHERE id = $1 FOR UPDATE", [req.params.id]);
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["Submitted", "WithNodalOfficerA", "WithTechnicalOfficer", "QuerySent"].includes(app.current_stage)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Cannot raise query for application in current stage" });
      }
      const dueDate = data.due_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { rows: qRows } = await client.query(
        `INSERT INTO queries (application_id, drafted_by, approved_by, query_text, due_date, status, sent_date)
         VALUES ($1, $2, $2, $3, $4, 'Sent', NOW())
         RETURNING id, query_text, status, due_date, created_at`,
        [app.id, req.user.id, data.query_text, dueDate]
      );
      await client.query("UPDATE applications SET current_stage = 'QuerySent', updated_at = NOW() WHERE id = $1", [app.id]);
      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: app.current_stage,
        to_role: "Applicant",
        action_type: "QuerySent",
        remarks: data.query_text,
      });
      await notify(client, {
        user_id: app.applicant_id,
        application_id: app.id,
        title: "Query raised",
        message: "A query has been raised on your application. Please respond before the due date.",
        notification_type: "Queries",
      });
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

// GET /api/nodal/applications/:id/queries
export const listQueries = async (req, res, next) => {
  try {
    if (!req.params.id) {
      const { status = "Draft" } = req.query;
      const { rows } = await pool.query(
        `SELECT q.*,
                a.application_ref_no AS reference_no,
                a.applicant_name AS organization_name,
                a.product_name,
                CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
                u.username AS drafted_by_name,
                au.username AS approved_by_name
         FROM queries q
         JOIN applications a ON a.id = q.application_id
         LEFT JOIN users u ON u.id = q.drafted_by
         LEFT JOIN users au ON au.id = q.approved_by
         WHERE q.status = $1
         ORDER BY q.created_at DESC`,
        [status]
      );
      return res.json({ success: true, data: rows });
    }

    const { rows } = await pool.query(
      `SELECT q.*,
              u.username AS drafted_by_name,
              au.username AS approved_by_name
       FROM queries q
       LEFT JOIN users u ON u.id = q.drafted_by
       LEFT JOIN users au ON au.id = q.approved_by
       WHERE q.application_id = $1
       ORDER BY q.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/nodal/queries/:queryId/approve
export const approveQuery = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `SELECT q.*, a.applicant_id, a.current_stage
         FROM queries q
         JOIN applications a ON a.id = q.application_id
         WHERE q.id = $1 FOR UPDATE`,
        [req.params.queryId]
      );
      const query = rows[0];
      if (!query) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Query not found" });
      }
      if (query.status !== "Draft") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only draft queries can be approved" });
      }
      const dueDate = query.due_date ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await client.query(
        "UPDATE queries SET status = 'Sent', approved_by = $1, sent_date = NOW(), due_date = $2, updated_at = NOW() WHERE id = $3",
        [req.user.id, dueDate, query.id]
      );
      await client.query("UPDATE applications SET current_stage = 'QuerySent', updated_at = NOW() WHERE id = $1", [query.application_id]);
      await logAction(client, {
        application_id: query.application_id,
        actor_id: req.user.id,
        from_role: query.current_stage,
        to_role: "Applicant",
        action_type: "ApproveQuery",
        remarks: `Query #${query.id} approved and dispatched to applicant`,
      });
      await notify(client, {
        user_id: query.applicant_id,
        application_id: query.application_id,
        title: "Query raised",
        message: "A query has been raised on your application. Please respond before the due date.",
        notification_type: "Queries",
      });
      await client.query("COMMIT");
      res.json({ success: true, message: "Query approved and sent to applicant" });
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

// GET /api/nodal/workflow/:id
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

// GET /api/nodal/extensions
export const listExtensions = async (req, res, next) => {
  try {
    const status = normalizeStatus(req.query.status ?? "Pending");
    const { rows } = await pool.query(
      `SELECT er.*,
              er.requested_new_deadline AS new_due_date,
              a.application_ref_no AS reference_no,
              CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
              ${stageCaseSql()} AS app_status,
              u.username AS requested_by_name,
              q.query_text,
              q.due_date AS current_due_date
       FROM extension_requests er
       JOIN applications a ON a.id = er.application_id
       LEFT JOIN users u ON u.id = er.requested_by
       LEFT JOIN queries q ON q.id = er.query_id
       WHERE er.status = $1
       ORDER BY er.created_at DESC`,
      [status]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

const extensionActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
  new_due_date: z.string().optional(),
});

// PATCH /api/nodal/extensions/:id
export const handleExtension = async (req, res, next) => {
  try {
    const data = extensionActionSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT * FROM extension_requests WHERE id = $1 FOR UPDATE", [req.params.id]);
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

// GET /api/nodal/notifications
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

// PATCH /api/nodal/notifications/read-all
export const markAllRead = async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/nodal/notifications/:id/read
export const markNotificationRead = async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/search
export const searchApplications = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q && !req.query.status && !req.query.app_type && !req.query.date_from && !req.query.date_to) {
      return res.status(400).json({ success: false, message: "At least one search parameter is required" });
    }
    const params = [];
    const conditions = ["a.current_stage != 'Draft'"];
    if (q) {
      params.push(`%${q}%`);
      const n = params.length;
      conditions.push(`(a.application_ref_no ILIKE $${n} OR a.product_name ILIKE $${n} OR a.applicant_name ILIKE $${n} OR u.username ILIKE $${n} OR u.email ILIKE $${n})`);
    }
    addAppFilters(req.query, params, conditions);
    const offset = (Number(page) - 1) * Number(limit);
    const where = conditions.join(" AND ");
    const { rows } = await pool.query(`${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, Number(limit), offset]);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/reports/approved
export const reportApproved = async (req, res, next) => {
  try {
    const params = [];
    const conditions = ["a.final_status = 'Approved'"];
    if (req.query.app_type) {
      params.push(normalizeType(req.query.app_type));
      conditions.push(`a.application_type = $${params.length}`);
    }
    if (req.query.date_from) {
      params.push(req.query.date_from);
      conditions.push(`d.decision_date >= $${params.length}`);
    }
    if (req.query.date_to) {
      params.push(req.query.date_to);
      conditions.push(`d.decision_date <= $${params.length}`);
    }
    const { rows } = await pool.query(`${appSelect()} WHERE ${conditions.join(" AND ")} ORDER BY decision_at DESC NULLS LAST`, params);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/reports/status
export const reportStatus = async (req, res, next) => {
  try {
    const params = [];
    const conditions = ["a.current_stage != 'Draft'"];
    if (req.query.date_from) {
      params.push(req.query.date_from);
      conditions.push(`a.submitted_date >= $${params.length}`);
    }
    if (req.query.date_to) {
      params.push(req.query.date_to);
      conditions.push(`a.submitted_date <= $${params.length}`);
    }
    const where = conditions.join(" AND ");
    const [summary, detail] = await Promise.all([
      pool.query(
        `SELECT ${stageCaseSql()} AS status,
                CASE WHEN a.application_type = 'AnyOther' THEN 'Any Other' ELSE a.application_type END AS app_type,
                COUNT(*)::int AS count
         FROM applications a
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

// GET /api/nodal/reports/by-type
export const reportByType = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT CASE WHEN application_type = 'AnyOther' THEN 'Any Other' ELSE application_type END AS app_type,
              ${stageCaseSql()} AS status,
              COUNT(*)::int AS count
       FROM applications a
       WHERE current_stage != 'Draft'
       GROUP BY app_type, status
       ORDER BY app_type, status`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/reports/track
export const trackApplication = async (req, res, next) => {
  try {
    const { reference_no } = req.query;
    if (!reference_no) return res.status(400).json({ success: false, message: "reference_no is required" });
    const { rows } = await pool.query(`${appSelect()} WHERE a.application_ref_no ILIKE $1`, [`%${reference_no}%`]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    const { rows: history } = await pool.query(
      `SELECT wa.action_type, wa.from_role AS from_status, wa.to_role AS to_status, wa.remarks, wa.action_date AS created_at,
              u.username AS performed_by_name
       FROM workflow_actions wa
       LEFT JOIN users u ON u.id = wa.actor_id
       WHERE wa.application_id = $1
       ORDER BY wa.action_date ASC`,
      [rows[0].id]
    );
    res.json({ success: true, data: rows[0], history });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/officers
export const listTechnicalOfficers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.employee_code, u.office_location
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_code IN ('TechnicalOfficer','TechnicalOfficerRPET')
         AND u.is_active = TRUE
       ORDER BY u.username`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
