// D1 helpers for the shared `leads` schema. Site Workers may add columns; these
// helpers stick to the common ones plus a JSON patch for classification.
import type { LeadClassification, LeadInput, LeadRecord } from "./types.js";

/** Insert a new, unassigned lead. Returns the new row id. */
export async function insertLead(
  db: D1Database,
  lead: LeadInput,
  originator: string,
): Promise<number> {
  const res = await db
    .prepare(
      `INSERT INTO leads
        (name, email, organization, role, need, service_area, timeline,
         budget_band, how_heard, consent, location, originator, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    )
    .bind(
      lead.name,
      lead.email,
      lead.organization,
      lead.role,
      lead.need,
      lead.service_area,
      lead.timeline,
      lead.budget_band,
      lead.how_heard,
      lead.consent ? 1 : 0,
      lead.location,
      originator,
    )
    .run();

  const id = res.meta.last_row_id;
  if (!id) throw new Error("insertLead: no last_row_id returned");
  return id;
}

export async function getLead(
  db: D1Database,
  id: number,
): Promise<LeadRecord | null> {
  const row = await db
    .prepare(`SELECT * FROM leads WHERE id = ?`)
    .bind(id)
    .first<LeadRecord>();
  return row ?? null;
}

/** Persist classification + pipeline fields produced by the agent. */
export async function applyClassification(
  db: D1Database,
  id: number,
  c: LeadClassification,
): Promise<void> {
  await db
    .prepare(
      `UPDATE leads SET
        anchor = ?, lane = ?, practice_area = ?, buyer_type = ?,
        est_value_band = ?, est_value_low = ?, est_value_high = ?,
        qualification = ?, fit_score = ?, suggested_owner = ?,
        needs_review = ?, next_action = ?, agent_notes = ?, draft_reply = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .bind(
      c.anchor,
      c.lane,
      c.practice_area,
      c.buyer_type,
      c.est_value_band,
      c.est_value_low,
      c.est_value_high,
      c.qualification,
      c.fit_score,
      c.suggested_owner,
      c.needs_review ? 1 : 0,
      c.next_action,
      c.agent_notes,
      c.draft_reply,
      id,
    )
    .run();
}

/** Route a lead to an owner (Kate's action). Only then does the assignee gain visibility. */
export async function assignLead(
  db: D1Database,
  id: number,
  assignee: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE leads SET assigned_to = ?, status = 'contacted',
        updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(assignee, id)
    .run();
}

export async function recordEvent(
  db: D1Database,
  leadId: number,
  kind: string,
  detail?: string,
): Promise<void> {
  await db
    .prepare(`INSERT INTO lead_events (lead_id, kind, detail) VALUES (?, ?, ?)`)
    .bind(leadId, kind, detail ?? null)
    .run();
}
