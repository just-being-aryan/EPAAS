import { z } from "zod";
import pool from "../config/db.js";

function stageCaseSql() {
  return `CASE
    WHEN a.current_stage = 'WithExpertCommittee' THEN 'ec'
    WHEN a.current_stage = 'DecisionPending' THEN 'ec'
    WHEN a.current_stage = 'Approved' THEN 'approved'
    WHEN a.current_stage = 'Rejected' THEN 'rejected'
    WHEN a.current_stage = 'QuerySent' THEN 'query'
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
           a.ec_status,
           a.final_status,
           a.submitted_date AS submitted_at,
           a.created_at,
           a.updated_at,
           a.applicant_name AS organization_name,
           a.product_name,
           a.food_category,
           a.kind_of_business,
           a.risk_level,
           fp.total_amount AS fee_amount,
           to_user.username AS technical_officer_name,
           latest_decision.decision_type AS ec_decision,
           latest_decision.decision_date AS ec_decision_date,
           latest_decision.remarks AS ec_remarks
           ${extra}
    FROM applications a
    LEFT JOIN LATERAL (
      SELECT *
      FROM fee_payments fp
      WHERE fp.application_id = a.id
      ORDER BY fp.created_at DESC
      LIMIT 1
    ) fp ON TRUE
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
    LEFT JOIN users to_user ON to_user.id = oa.officer_id
    LEFT JOIN LATERAL (
      SELECT d.*
      FROM decisions d
      WHERE d.application_id = a.id AND d.decision_stage = 'EC'
      ORDER BY d.decision_date DESC
      LIMIT 1
    ) latest_decision ON TRUE`;
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
    `SELECT id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.role_code IN ('NodalOfficerA','NodalOfficerARPET')
       AND u.is_active = TRUE`
  );
  for (const row of rows) {
    await client.query(
      `INSERT INTO notifications (user_id, application_id, title, message, notification_type)
       VALUES ($1, $2, $3, $4, 'Decisions')`,
      [row.id, applicationId, title, message]
    );
  }
}

function addFilters(query, params, conditions) {
  const { q, reference_no, app_type, date_from, date_to } = query;
  if (q) {
    params.push(`%${q}%`);
    const n = params.length;
    conditions.push(`(a.application_ref_no ILIKE $${n} OR a.applicant_name ILIKE $${n} OR a.product_name ILIKE $${n} OR a.food_category ILIKE $${n})`);
  }
  if (reference_no) {
    params.push(`%${reference_no}%`);
    conditions.push(`a.application_ref_no ILIKE $${params.length}`);
  }
  if (app_type) {
    params.push(app_type === "Any Other" ? "AnyOther" : app_type);
    conditions.push(`a.application_type = $${params.length}`);
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

export const getDashboardStats = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT current_stage, ec_status, COUNT(*)::int AS count
       FROM applications
       WHERE current_stage IN ('WithExpertCommittee','DecisionPending')
          OR ec_status IN ('Approved','Rejected','Clarification')
       GROUP BY current_stage, ec_status`
    );
    const stats = { total: 0, queue: 0, decided: 0, approved: 0, rejected: 0, clarification: 0 };
    for (const row of rows) {
      stats.total += row.count;
      if (row.current_stage === "WithExpertCommittee") stats.queue += row.count;
      if (row.ec_status === "Approved") stats.approved += row.count;
      if (row.ec_status === "Rejected") stats.rejected += row.count;
      if (row.ec_status === "Clarification") stats.clarification += row.count;
      if (["Approved", "Rejected", "Clarification"].includes(row.ec_status)) stats.decided += row.count;
    }
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

export const listApplications = async (req, res, next) => {
  try {
    const { status = "queue", page = 1, limit = 50 } = req.query;
    const params = [];
    const conditions = [];
    if (status === "queue") conditions.push("a.current_stage = 'WithExpertCommittee'");
    if (status === "decided") conditions.push("a.ec_status IN ('Approved','Rejected','Clarification')");
    if (status === "approved") conditions.push("a.ec_status = 'Approved'");
    if (status === "rejected") conditions.push("a.ec_status = 'Rejected'");
    if (status === "clarification") conditions.push("a.ec_status = 'Clarification'");
    addFilters(req.query, params, conditions);
    const where = conditions.length ? conditions.join(" AND ") : "TRUE";
    const offset = (Number(page) - 1) * Number(limit);
    const [dataResult, countResult] = await Promise.all([
      pool.query(`${appSelect()} WHERE ${where} ORDER BY a.submitted_date DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, Number(limit), offset]),
      pool.query(`SELECT COUNT(*)::int AS total FROM applications a WHERE ${where}`, params),
    ]);
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: { total: countResult.rows[0].total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const getApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${appSelect()} WHERE a.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

const decisionSchema = z.object({
  decision_type: z.enum(["Approved", "Rejected", "Clarification"]),
  remarks: z.string().min(3),
  letter_ref: z.string().optional(),
});

export const recordDecision = async (req, res, next) => {
  try {
    const data = decisionSchema.parse(req.body);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT id, current_stage FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.current_stage !== "WithExpertCommittee") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only applications with Expert Committee can be decided" });
      }

      await client.query(
        `INSERT INTO decisions (application_id, decision_stage, decision_type, decision_authority, decided_by, letter_ref, remarks)
         VALUES ($1, 'EC', $2, 'ExpertCommittee', $3, $4, $5)`,
        [app.id, data.decision_type, req.user.id, data.letter_ref ?? null, data.remarks]
      );

      await client.query(
        `UPDATE applications
         SET ec_status = $1,
             current_stage = 'DecisionPending',
             updated_at = NOW()
         WHERE id = $2`,
        [data.decision_type, app.id]
      );

      await logAction(client, {
        application_id: app.id,
        actor_id: req.user.id,
        from_role: "ExpertCommittee",
        to_role: "NodalOfficerA",
        action_type: "RecordECDecision",
        remarks: `${data.decision_type}: ${data.remarks}`,
      });
      await notifyNodal(client, app.id, "Expert Committee decision recorded", `EC decision: ${data.decision_type}. ${data.remarks}`);

      await client.query("COMMIT");
      res.json({ success: true, message: "Expert Committee decision recorded" });
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

export const getAgenda = async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${appSelect()}
       WHERE a.current_stage = 'WithExpertCommittee'
       ORDER BY a.submitted_date ASC NULLS LAST`
    );
    res.json({ success: true, data: rows });
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
