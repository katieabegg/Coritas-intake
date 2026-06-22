// Validation + normalization for raw intake submissions. No framework deps so
// every site Worker can share it.
import type { LeadInput, RawLeadSubmission, ValidationResult } from "./types.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The "Pro bono support" service option and the "Giving Back" deep-link CTA both
// mark a submission as a pro bono request. We normalize either signal to a single
// `source` tag so these are trivial to spot in the admin inbox.
const PROBONO_SERVICE = "Pro bono support";
const GIVING_BACK = "giving-back";
const ORG_TYPES = new Set(["nonprofit", "small_business"]);

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

  const service_area = str(raw.service_area, 200);

  // A submission is "pro bono" if they either picked the Pro bono service option
  // or arrived via the Giving Back CTA (which posts source=giving-back). Either
  // way we tag it `giving-back` so Kate can filter the inbox for it.
  const rawSource = str(raw.source, 50);
  const isProbono =
    service_area === PROBONO_SERVICE || rawSource === GIVING_BACK;
  const source = isProbono ? GIVING_BACK : rawSource;

  // org_type only carries meaning on the pro bono path; constrain to known tokens.
  const rawOrgType = str(raw.org_type, 50)?.toLowerCase().replace(/\s+/g, "_");
  const org_type =
    rawOrgType && ORG_TYPES.has(rawOrgType) ? rawOrgType : null;

  const value: LeadInput = {
    name: name!,
    email: email!,
    organization: str(raw.organization, 300),
    role: str(raw.role, 200),
    need: need!,
    service_area,
    timeline: str(raw.timeline, 200),
    budget_band: str(raw.budget_band, 100),
    how_heard: str(raw.how_heard, 300),
    consent: true,
    location: str(raw.location, 300),
    source,
    org_type,
    mission: str(raw.mission, 5000),
  };

  return { ok: true, errors: [], value };
}
