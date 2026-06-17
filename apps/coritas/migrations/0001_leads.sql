-- Coritas intake: leads pipeline. Extends the thin `messages` table concept
-- into a full lead record. Existing messages/clients/sessions/posts untouched.

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Form fields
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  organization    TEXT,
  role            TEXT,
  need            TEXT NOT NULL,
  service_area    TEXT,
  timeline        TEXT,
  budget_band     TEXT,
  how_heard       TEXT,
  consent         INTEGER NOT NULL DEFAULT 0,
  location        TEXT,

  -- LeadAgent classification / qualification
  anchor          TEXT,            -- anchor_a | anchor_b | social_media
  lane            TEXT,            -- human-readable lane label
  practice_area   TEXT,
  buyer_type      TEXT,
  est_value_band  TEXT,
  est_value_low   INTEGER,
  est_value_high  INTEGER,
  originator      TEXT NOT NULL DEFAULT 'coritas',
  qualification   TEXT,            -- hot | warm | cool
  fit_score       INTEGER,

  -- Pipeline state (Kate's automated weekly tracker)
  status          TEXT NOT NULL DEFAULT 'new',  -- new/contacted/booked/won/lost/cold
  suggested_owner TEXT,
  assigned_to     TEXT,            -- NULL until Kate routes; then assignee gains visibility
  needs_review    INTEGER NOT NULL DEFAULT 0,
  next_action     TEXT,
  target_close    TEXT,
  agent_notes     TEXT,
  draft_reply     TEXT,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created  ON leads(created_at);

-- Per-lead audit trail (intake/classified/notified/routed/followup/reping/...).
CREATE TABLE IF NOT EXISTS lead_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id     INTEGER NOT NULL,
  kind        TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
