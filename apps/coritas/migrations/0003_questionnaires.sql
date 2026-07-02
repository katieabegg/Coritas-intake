-- Funnel Phase 1: per-lead questionnaires (docs/FUNNEL.md steps 2-3).
-- One row per (lead, product line). The link token is stored only as a
-- SHA-256 hash so a D1 leak can't be replayed into live questionnaire URLs.

CREATE TABLE IF NOT EXISTS lead_questionnaires (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER NOT NULL,
  lane_key      TEXT NOT NULL,              -- anchor_a | anchor_b | social_media | general
  token_hash    TEXT NOT NULL,              -- SHA-256 hex of the per-lead link token
  status        TEXT NOT NULL DEFAULT 'sent', -- sent | completed
  answers       TEXT,                       -- JSON {questionId: answer} once completed
  sent_at       TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at  TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_lq_lead ON lead_questionnaires(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lq_lead_lane ON lead_questionnaires(lead_id, lane_key);

-- Booking email (funnel step 4) is sent at most once per lead. The column is an
-- atomic claim: UPDATE ... WHERE booking_email_at IS NULL — whichever concurrent
-- completion wins the row sends the email; everyone else sees 0 changes.
ALTER TABLE leads ADD COLUMN booking_email_at TEXT;
