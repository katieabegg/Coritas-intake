// Shared types for the Coritas intake pipeline. Site Workers extend these.

/** Raw, untrusted payload as submitted by a public intake form. */
export interface RawLeadSubmission {
  name?: unknown;
  email?: unknown;
  organization?: unknown;
  role?: unknown;
  need?: unknown;
  service_area?: unknown;
  timeline?: unknown;
  budget_band?: unknown;
  how_heard?: unknown;
  consent?: unknown;
  location?: unknown;
  // Pro bono ("Giving Back") path.
  source?: unknown; // marketing source, e.g. 'giving-back'
  org_type?: unknown; // 'nonprofit' | 'small_business'
  mission?: unknown; // what the org does / its mission
  // Cloudflare Turnstile token from the widget.
  "cf-turnstile-response"?: unknown;
}

/** A validated, normalized lead ready to persist. */
export interface LeadInput {
  name: string;
  email: string;
  organization: string | null;
  role: string | null;
  need: string;
  service_area: string | null;
  timeline: string | null;
  budget_band: string | null;
  how_heard: string | null;
  consent: boolean;
  location: string | null;
  // Pro bono ("Giving Back") path.
  source: string | null;
  org_type: string | null;
  mission: string | null;
}

export type Qualification = "hot" | "warm" | "cool";

export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "won"
  | "lost"
  | "cold";

/** Output of the classify/qualify step. Site agents fill this in. */
export interface LeadClassification {
  anchor: string; // config-driven lane key, e.g. "anchor_a"
  lane: string; // human-readable lane label
  practice_area: string | null;
  buyer_type: string | null;
  est_value_band: string | null;
  est_value_low: number | null;
  est_value_high: number | null;
  qualification: Qualification;
  fit_score: number; // 0-100
  suggested_owner: string | null;
  needs_review: boolean;
  next_action: string | null;
  agent_notes: string | null;
  /** Draft reply in the founder's voice, awaiting human approval. */
  draft_reply: string | null;
  rationale: string | null;
}

/** A persisted lead row (form fields + classification + pipeline state). */
export interface LeadRecord extends LeadInput, Partial<LeadClassification> {
  id: number;
  originator: string;
  status: LeadStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: LeadInput;
}
