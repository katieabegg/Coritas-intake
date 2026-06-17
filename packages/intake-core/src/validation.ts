// Validation + normalization for raw intake submissions. No framework deps so
// every site Worker can share it.
import type { LeadInput, RawLeadSubmission, ValidationResult } from "./types.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Validate and normalize a raw form submission into a LeadInput. */
export function validateLead(raw: RawLeadSubmission): ValidationResult {
  const errors: string[] = [];

  const name = str(raw.name, 200);
  const email = str(raw.email, 320);
  const need = str(raw.need, 5000);
  const consent = raw.consent === true || raw.consent === "true" || raw.consent === "on";

  if (!name) errors.push("name is required");
  if (!email) errors.push("email is required");
  else if (!EMAIL_RE.test(email)) errors.push("email is invalid");
  if (!need) errors.push("need is required");
  if (!consent) errors.push("consent is required");

  if (errors.length > 0) return { ok: false, errors };

  const value: LeadInput = {
    name: name!,
    email: email!,
    organization: str(raw.organization, 300),
    role: str(raw.role, 200),
    need: need!,
    service_area: str(raw.service_area, 200),
    timeline: str(raw.timeline, 200),
    budget_band: str(raw.budget_band, 100),
    how_heard: str(raw.how_heard, 300),
    consent: true,
    location: str(raw.location, 300),
  };

  return { ok: true, errors: [], value };
}
