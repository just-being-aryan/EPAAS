-- ============================================================
-- E-PAAS Nodal Officer A workflow migration
-- Run this against your PostgreSQL database
-- ============================================================

-- 1. Ensure required roles exist
INSERT INTO roles (role_code, role_name)
VALUES
  ('NODAL_OFFICER_A',   'Nodal Officer A'),
  ('TECHNICAL_OFFICER', 'Technical Officer'),
  ('EXPERT_COMMITTEE',  'Expert Committee'),
  ('NODAL_OFFICER_B',   'Nodal Officer B'),
  ('CEO',               'CEO'),
  ('CHAIRPERSON',       'Chairperson')
ON CONFLICT (role_code) DO NOTHING;

-- 2. Extend applications table
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS assigned_to        INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS nodal_officer_a_id INTEGER REFERENCES users(id);

-- 3. Workflow audit trail
CREATE TABLE IF NOT EXISTS workflow_actions (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    VARCHAR(50),
  to_status      VARCHAR(50),
  action_type    VARCHAR(50) NOT NULL,
  performed_by   INTEGER REFERENCES users(id),
  remarks        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_application ON workflow_actions(application_id);

-- 4. Queries (raised by Nodal/TO, responded by applicant)
CREATE TABLE IF NOT EXISTS queries (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  drafted_by     INTEGER REFERENCES users(id),
  approved_by    INTEGER REFERENCES users(id),
  query_text     TEXT NOT NULL,
  response_text  TEXT,
  response_date  TIMESTAMPTZ,
  status         VARCHAR(20) NOT NULL DEFAULT 'draft',
  due_date       DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_queries_application ON queries(application_id);

-- 5. Decisions (EC / CEO / Chairperson stage decisions)
CREATE TABLE IF NOT EXISTS decisions (
  id                 SERIAL PRIMARY KEY,
  application_id     INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  decision_stage     VARCHAR(30) NOT NULL,
  decision_type      VARCHAR(30) NOT NULL,
  decision_authority VARCHAR(30) NOT NULL,
  decision_date      TIMESTAMPTZ,
  letter_ref         VARCHAR(100),
  remarks            TEXT,
  decided_by         INTEGER REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appeals
CREATE TABLE IF NOT EXISTS appeals (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  appeal_type     VARCHAR(50),
  filed_date      TIMESTAMPTZ DEFAULT NOW(),
  filed_by        INTEGER REFERENCES users(id),
  decided_by      INTEGER REFERENCES users(id),
  decision        VARCHAR(20),
  decision_date   TIMESTAMPTZ,
  grounds         TEXT,
  remarks         TEXT
);

-- 7. Reviews (Chairperson level)
CREATE TABLE IF NOT EXISTS reviews (
  id                    SERIAL PRIMARY KEY,
  application_id        INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  appeal_id             INTEGER REFERENCES appeals(id),
  filed_by              INTEGER REFERENCES users(id),
  review_reason         TEXT,
  filed_at              TIMESTAMPTZ DEFAULT NOW(),
  chairperson_decision  VARCHAR(20),
  decided_at            TIMESTAMPTZ
);

-- 8. Extension requests
CREATE TABLE IF NOT EXISTS extension_requests (
  id               SERIAL PRIMARY KEY,
  application_id   INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  query_id         INTEGER REFERENCES queries(id),
  requested_by     INTEGER REFERENCES users(id),
  requested_date   DATE,
  reason           TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by      INTEGER REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  message        TEXT NOT NULL,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
