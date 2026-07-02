// Per-lead questionnaire plumbing (funnel steps 2-3, docs/FUNNEL.md).
// Each questionnaire link carries a random token tied to one (lead, lane) row;
// only the SHA-256 of the token is stored, so the D1 rows can't be turned back
// into live URLs. Reusable across Coritas-family sites.
import { constantTimeEqual } from "./crypto.js";

export interface QuestionnaireRow {
  id: number;
  lead_id: number;
  lane_key: string;
  token_hash: string;
  status: "sent" | "completed";
  answers: string | null;
  sent_at: string;
  completed_at: string | null;
}

/** 32 random bytes as 64 hex chars — unguessable questionnaire link token. */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create (or refresh) the questionnaire row for one lead+lane and return the
 * raw token for the emailed link. Re-inserting for the same lead+lane replaces
 * the token, invalidating any previously sent link.
 */
export async function createQuestionnaire(
  db: D1Database,
  leadId: number,
  laneKey: string,
): Promise<string> {
  const token = generateToken();
  const hash = await sha256Hex(token);
  await db
    .prepare(
      `INSERT INTO lead_questionnaires (lead_id, lane_key, token_hash)
       VALUES (?, ?, ?)
       ON CONFLICT(lead_id, lane_key)
       DO UPDATE SET token_hash = excluded.token_hash, sent_at = datetime('now')`,
    )
    .bind(leadId, laneKey, hash)
    .run();
  return token;
}

/** Fetch a questionnaire row only if the presented token is valid for it. */
export async function getQuestionnaireByToken(
  db: D1Database,
  leadId: number,
  laneKey: string,
  token: string,
): Promise<QuestionnaireRow | null> {
  const row = await db
    .prepare(`SELECT * FROM lead_questionnaires WHERE lead_id = ? AND lane_key = ?`)
    .bind(leadId, laneKey)
    .first<QuestionnaireRow>();
  if (!row) return null;
  const hash = await sha256Hex(token);
  if (!(await constantTimeEqual(hash, row.token_hash))) return null;
  return row;
}

/** Persist answers and mark completed. Returns false if already completed. */
export async function completeQuestionnaire(
  db: D1Database,
  id: number,
  answersJson: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE lead_questionnaires
       SET answers = ?, status = 'completed', completed_at = datetime('now')
       WHERE id = ? AND status != 'completed'`,
    )
    .bind(answersJson, id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/** How many questionnaires this lead has completed (drives "send booking once"). */
export async function countCompleted(db: D1Database, leadId: number): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM lead_questionnaires
       WHERE lead_id = ? AND status = 'completed'`,
    )
    .bind(leadId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}
