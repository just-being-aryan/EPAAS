import { z } from "zod";
import pool from "../config/db.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function logAction(client, { application_id, from_status, to_status, action_type, performed_by, remarks }) {
  await client.query(
    `INSERT INTO workflow_actions (application_id, from_status, to_status, action_type, performed_by, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [application_id, from_status ?? null, to_status ?? null, action_type, performed_by, remarks ?? null]
  );
}

async function notify(client, { user_id, application_id, message }) {
  await client.query(
    `INSERT INTO notifications (user_id, application_id, message) VALUES ($1, $2, $3)`,
    [user_id, application_id, message]
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

// GET /api/nodal/stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM applications
       WHERE status != 'draft'
       GROUP BY status`
    );

    const c = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const total = rows.reduce((s, r) => s + r.count, 0);

    res.json({
      success: true,
      stats: {
        total,
        pending:  c.pending  ?? 0,
        scrutiny: c.scrutiny ?? 0,
        query:    c.query    ?? 0,
        ec:       c.ec       ?? 0,
        approved: c.approved ?? 0,
        rejected: c.rejected ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Applications Queue ───────────────────────────────────────────────────────

// GET /api/nodal/applications
export const listApplications = async (req, res, next) => {
  try {
    const { status, app_type, reference_no, date_from, date_to, page = 1, limit = 20 } = req.query;

    const params = [];
    const conditions = [];

    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    } else {
      params.push(["pending", "scrutiny", "query", "ec"]);
      conditions.push(`a.status = ANY($${params.length})`);
    }
    if (app_type) {
      params.push(app_type);
      conditions.push(`a.app_type = $${params.length}`);
    }
    if (reference_no) {
      params.push(`%${reference_no}%`);
      conditions.push(`a.reference_no ILIKE $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.submitted_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.submitted_at <= $${params.length}`);
    }

    const where = conditions.join(" AND ");
    const offset = (Number(page) - 1) * Number(limit);

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT a.id, a.reference_no, a.app_type, a.status, a.current_stage,
                a.submitted_at, a.created_at, a.assigned_to,
                d.product_name, d.food_category, d.organization_name, d.fee_amount,
                u.username AS applicant_name, u.email AS applicant_email,
                tu.username AS assigned_officer_name
         FROM applications a
         LEFT JOIN application_details d ON d.application_id = a.id
         LEFT JOIN users u ON u.id = a.applicant_id
         LEFT JOIN users tu ON tu.id = a.assigned_to
         WHERE ${where}
         ORDER BY a.submitted_at DESC NULLS LAST
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

// GET /api/nodal/applications/:id
export const getApplication = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*,
              d.product_name, d.food_category, d.organization_name, d.address,
              d.manufacturing_address, d.authorized_person, d.mobile_number,
              d.contact_email, d.license_no, d.ingredients, d.regulatory_status_text,
              d.safety_info, d.gst_no, d.fee_amount,
              u.username AS applicant_name, u.email AS applicant_email,
              tu.username AS assigned_officer_name
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       LEFT JOIN users u ON u.id = a.applicant_id
       LEFT JOIN users tu ON tu.id = a.assigned_to
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── Workflow Actions ─────────────────────────────────────────────────────────

// POST /api/nodal/applications/:id/assign
// Moves application to scrutiny and optionally assigns a Technical Officer
export const assignApplication = async (req, res, next) => {
  try {
    const { officer_id, remarks } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["pending", "scrutiny"].includes(app.status)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be assigned in its current status" });
      }

      if (officer_id) {
        const { rows: offRows } = await client.query(
          `SELECT u.id FROM users u
           JOIN roles r ON r.id = u.role_id
           WHERE u.id = $1 AND r.role_code = 'TECHNICAL_OFFICER'`,
          [officer_id]
        );
        if (!offRows[0]) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, message: "Invalid Technical Officer ID" });
        }
      }

      await client.query(
        `UPDATE applications
         SET status = 'scrutiny', assigned_to = $1, nodal_officer_a_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [officer_id ?? null, req.user.id, req.params.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: app.status,
        to_status: "scrutiny",
        action_type: "assign",
        performed_by: req.user.id,
        remarks,
      });

      if (officer_id) {
        await notify(client, {
          user_id: officer_id,
          application_id: req.params.id,
          message: `Application #${req.params.id} has been assigned to you for technical scrutiny.`,
        });
      }

      await client.query("COMMIT");
      res.json({ success: true, message: "Application moved to scrutiny" });
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
// Forward application to Expert Committee
export const forwardToEC = async (req, res, next) => {
  try {
    const { remarks } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["pending", "scrutiny"].includes(app.status)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only pending or scrutiny applications can be forwarded to EC" });
      }

      await client.query(
        `UPDATE applications SET status = 'ec', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: app.status,
        to_status: "ec",
        action_type: "forward_ec",
        performed_by: req.user.id,
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

// POST /api/nodal/applications/:id/grant-approval
// Approve the application (direct or after EC recommendation)
export const grantApproval = async (req, res, next) => {
  try {
    const { remarks, letter_ref } = req.body;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status, applicant_id FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status === "draft" || app.status === "approved" || app.status === "rejected") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be approved in its current status" });
      }

      await client.query(
        `UPDATE applications SET status = 'approved', decision_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await client.query(
        `INSERT INTO decisions (application_id, decision_stage, decision_type, decision_authority, decision_date, letter_ref, remarks, decided_by)
         VALUES ($1, 'nodal_a', 'approved', 'nodal_officer_a', NOW(), $2, $3, $4)`,
        [req.params.id, letter_ref ?? null, remarks ?? null, req.user.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: app.status,
        to_status: "approved",
        action_type: "decision",
        performed_by: req.user.id,
        remarks,
      });

      await notify(client, {
        user_id: app.applicant_id,
        application_id: req.params.id,
        message: `Your application has been approved. Please log in to view and download your approval letter.`,
      });

      await client.query("COMMIT");
      res.json({ success: true, message: "Application approved successfully" });
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
// Reject the application
export const rejectApplication = async (req, res, next) => {
  try {
    const { remarks, letter_ref } = req.body;
    if (!remarks) return res.status(400).json({ success: false, message: "Rejection remarks are required" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status, applicant_id FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status === "draft" || app.status === "approved" || app.status === "rejected") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Application cannot be rejected in its current status" });
      }

      await client.query(
        `UPDATE applications SET status = 'rejected', decision_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await client.query(
        `INSERT INTO decisions (application_id, decision_stage, decision_type, decision_authority, decision_date, letter_ref, remarks, decided_by)
         VALUES ($1, 'nodal_a', 'rejected', 'nodal_officer_a', NOW(), $2, $3, $4)`,
        [req.params.id, letter_ref ?? null, remarks, req.user.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: app.status,
        to_status: "rejected",
        action_type: "decision",
        performed_by: req.user.id,
        remarks,
      });

      await notify(client, {
        user_id: app.applicant_id,
        application_id: req.params.id,
        message: `Your application has been rejected. Please log in to view the reason.`,
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
// Withdraw a previously granted approval
export const withdrawApproval = async (req, res, next) => {
  try {
    const { remarks } = req.body;
    if (!remarks) return res.status(400).json({ success: false, message: "Remarks required for withdrawal" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status, applicant_id FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (app.status !== "approved") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only approved applications can have approval withdrawn" });
      }

      await client.query(
        `UPDATE applications SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: "approved",
        to_status: "rejected",
        action_type: "withdraw",
        performed_by: req.user.id,
        remarks,
      });

      await notify(client, {
        user_id: app.applicant_id,
        application_id: req.params.id,
        message: `The approval for your application has been withdrawn. Please log in for details.`,
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

// ── Query Management ─────────────────────────────────────────────────────────

const querySchema = z.object({
  query_text: z.string().min(10, "Query must be at least 10 characters"),
  due_date: z.string().optional(),
});

// POST /api/nodal/applications/:id/queries
// Raise and immediately send a query (Nodal Officer A drafts and approves in one step)
export const raiseQuery = async (req, res, next) => {
  try {
    const data = querySchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, status, applicant_id FROM applications WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );
      const app = rows[0];
      if (!app) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Application not found" });
      }
      if (!["pending", "scrutiny", "query"].includes(app.status)) {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Cannot raise query for application in current status" });
      }

      const { rows: qRows } = await client.query(
        `INSERT INTO queries (application_id, drafted_by, approved_by, query_text, due_date, status)
         VALUES ($1, $2, $2, $3, $4, 'sent')
         RETURNING id, query_text, status, due_date, created_at`,
        [req.params.id, req.user.id, data.query_text, data.due_date ?? null]
      );

      await client.query(
        `UPDATE applications SET status = 'query', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await logAction(client, {
        application_id: req.params.id,
        from_status: app.status,
        to_status: "query",
        action_type: "query",
        performed_by: req.user.id,
        remarks: data.query_text,
      });

      await notify(client, {
        user_id: app.applicant_id,
        application_id: req.params.id,
        message: `A query has been raised on your application. Please log in and respond before the due date.`,
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
    const { rows } = await pool.query(
      `SELECT q.*,
              u.username  AS drafted_by_name,
              au.username AS approved_by_name
       FROM queries q
       LEFT JOIN users u  ON u.id  = q.drafted_by
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
// Approve a query drafted by a Technical Officer → sends it to the applicant
export const approveQuery = async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT q.*, a.applicant_id, a.status AS app_status
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
      if (query.status !== "draft") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Only draft queries can be approved" });
      }

      await client.query(
        `UPDATE queries SET status = 'sent', approved_by = $1, updated_at = NOW() WHERE id = $2`,
        [req.user.id, query.id]
      );

      await client.query(
        `UPDATE applications SET status = 'query', updated_at = NOW() WHERE id = $1`,
        [query.application_id]
      );

      await logAction(client, {
        application_id: query.application_id,
        from_status: query.app_status,
        to_status: "query",
        action_type: "query",
        performed_by: req.user.id,
        remarks: `Query #${query.id} approved and dispatched to applicant`,
      });

      await notify(client, {
        user_id: query.applicant_id,
        application_id: query.application_id,
        message: `A query has been raised on your application. Please log in and respond before the due date.`,
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

// ── Workflow History ──────────────────────────────────────────────────────────

// GET /api/nodal/workflow/:id
export const getWorkflowHistory = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT wa.*, u.username AS performed_by_name
       FROM workflow_actions wa
       LEFT JOIN users u ON u.id = wa.performed_by
       WHERE wa.application_id = $1
       ORDER BY wa.created_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── Extension Requests ───────────────────────────────────────────────────────

// GET /api/nodal/extensions
export const listExtensions = async (req, res, next) => {
  try {
    const { status = "pending" } = req.query;

    const { rows } = await pool.query(
      `SELECT er.*,
              a.reference_no, a.app_type, a.status AS app_status,
              u.username AS requested_by_name,
              q.query_text, q.due_date AS current_due_date
       FROM extension_requests er
       JOIN applications a ON a.id = er.application_id
       LEFT JOIN users u   ON u.id  = er.requested_by
       LEFT JOIN queries q ON q.id  = er.query_id
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
  action:       z.enum(["approve", "reject"]),
  remarks:      z.string().optional(),
  new_due_date: z.string().optional(),
});

// PATCH /api/nodal/extensions/:id
export const handleExtension = async (req, res, next) => {
  try {
    const data = extensionActionSchema.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `SELECT er.* FROM extension_requests er WHERE er.id = $1 FOR UPDATE`,
        [req.params.id]
      );
      const ext = rows[0];
      if (!ext) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, message: "Extension request not found" });
      }
      if (ext.status !== "pending") {
        await client.query("ROLLBACK");
        return res.status(409).json({ success: false, message: "Extension request already processed" });
      }

      const newStatus = data.action === "approve" ? "approved" : "rejected";
      await client.query(
        `UPDATE extension_requests SET status = $1, approved_by = $2 WHERE id = $3`,
        [newStatus, req.user.id, ext.id]
      );

      if (data.action === "approve" && data.new_due_date && ext.query_id) {
        await client.query(
          `UPDATE queries SET due_date = $1, updated_at = NOW() WHERE id = $2`,
          [data.new_due_date, ext.query_id]
        );
      }

      await logAction(client, {
        application_id: ext.application_id,
        from_status: null,
        to_status: null,
        action_type: "extension",
        performed_by: req.user.id,
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

// ── Notifications ─────────────────────────────────────────────────────────────

// GET /api/nodal/notifications
export const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, a.reference_no
       FROM notifications n
       LEFT JOIN applications a ON a.id = n.application_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread_count = rows.filter((r) => !r.is_read).length;
    res.json({ success: true, data: rows, unread_count });
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
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── Search ────────────────────────────────────────────────────────────────────

// GET /api/nodal/search
export const searchApplications = async (req, res, next) => {
  try {
    const { q, status, app_type, date_from, date_to, page = 1, limit = 20 } = req.query;

    if (!q && !status && !app_type && !date_from && !date_to) {
      return res.status(400).json({ success: false, message: "At least one search parameter is required" });
    }

    const params = [];
    const conditions = ["a.status != 'draft'"];

    if (q) {
      params.push(`%${q}%`);
      const n = params.length;
      conditions.push(
        `(a.reference_no ILIKE $${n} OR d.product_name ILIKE $${n} OR d.organization_name ILIKE $${n} OR u.username ILIKE $${n} OR u.email ILIKE $${n})`
      );
    }
    if (status) {
      params.push(status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (app_type) {
      params.push(app_type);
      conditions.push(`a.app_type = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.submitted_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.submitted_at <= $${params.length}`);
    }

    const where = conditions.join(" AND ");
    const offset = (Number(page) - 1) * Number(limit);

    const { rows } = await pool.query(
      `SELECT a.id, a.reference_no, a.app_type, a.status, a.submitted_at, a.decision_at,
              d.product_name, d.organization_name, d.food_category,
              u.username AS applicant_name, u.email AS applicant_email
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       LEFT JOIN users u ON u.id = a.applicant_id
       WHERE ${where}
       ORDER BY a.submitted_at DESC NULLS LAST
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ── Reports ───────────────────────────────────────────────────────────────────

// GET /api/nodal/reports/approved
export const reportApproved = async (req, res, next) => {
  try {
    const { date_from, date_to, app_type } = req.query;
    const params = ["approved"];
    const conditions = ["a.status = $1"];

    if (app_type) {
      params.push(app_type);
      conditions.push(`a.app_type = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`a.decision_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.decision_at <= $${params.length}`);
    }

    const { rows } = await pool.query(
      `SELECT a.id, a.reference_no, a.app_type, a.submitted_at, a.decision_at,
              d.product_name, d.organization_name, d.food_category, d.fee_amount,
              u.username AS applicant_name
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       LEFT JOIN users u ON u.id = a.applicant_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.decision_at DESC`,
      params
    );

    res.json({ success: true, data: rows, total: rows.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/reports/status
export const reportStatus = async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const params = [];
    const conditions = ["a.status != 'draft'"];

    if (date_from) {
      params.push(date_from);
      conditions.push(`a.submitted_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`a.submitted_at <= $${params.length}`);
    }

    const where = conditions.join(" AND ");

    const [summary, detail] = await Promise.all([
      pool.query(
        `SELECT a.status, a.app_type, COUNT(*)::int AS count
         FROM applications a
         WHERE ${where}
         GROUP BY a.status, a.app_type
         ORDER BY a.status, a.app_type`,
        params
      ),
      pool.query(
        `SELECT a.id, a.reference_no, a.app_type, a.status, a.submitted_at,
                d.product_name, d.organization_name,
                u.username AS applicant_name
         FROM applications a
         LEFT JOIN application_details d ON d.application_id = a.id
         LEFT JOIN users u ON u.id = a.applicant_id
         WHERE ${where}
         ORDER BY a.submitted_at DESC`,
        params
      ),
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
      `SELECT app_type, status, COUNT(*)::int AS count
       FROM applications
       WHERE status != 'draft'
       GROUP BY app_type, status
       ORDER BY app_type, status`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/nodal/reports/track
// Track a specific application by reference number
export const trackApplication = async (req, res, next) => {
  try {
    const { reference_no } = req.query;
    if (!reference_no) return res.status(400).json({ success: false, message: "reference_no is required" });

    const { rows } = await pool.query(
      `SELECT a.id, a.reference_no, a.app_type, a.status, a.submitted_at, a.decision_at,
              d.product_name, d.organization_name,
              u.username AS applicant_name
       FROM applications a
       LEFT JOIN application_details d ON d.application_id = a.id
       LEFT JOIN users u ON u.id = a.applicant_id
       WHERE a.reference_no ILIKE $1`,
      [`%${reference_no}%`]
    );

    if (!rows[0]) return res.status(404).json({ success: false, message: "Application not found" });

    const { rows: history } = await pool.query(
      `SELECT wa.action_type, wa.from_status, wa.to_status, wa.remarks, wa.created_at,
              u.username AS performed_by_name
       FROM workflow_actions wa
       LEFT JOIN users u ON u.id = wa.performed_by
       WHERE wa.application_id = $1
       ORDER BY wa.created_at ASC`,
      [rows[0].id]
    );

    res.json({ success: true, data: rows[0], history });
  } catch (err) {
    next(err);
  }
};

// ── Supporting Data ───────────────────────────────────────────────────────────

// GET /api/nodal/officers
// List Technical Officers available for assignment
export const listTechnicalOfficers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_code = 'TECHNICAL_OFFICER'
       ORDER BY u.username`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
