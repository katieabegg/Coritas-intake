# Pro bono ("Giving Back") intake path — spec

Reference for the pro bono support path through the Rise Together intake form.
Reflects what is implemented in the repo (see **Related files** at the bottom).

## Purpose

Let nonprofits and early-stage small businesses request **pro bono support**
through the same intake form, captured and tagged so Kate can spot and triage
those requests separately from paid inquiries.

## Entry points

There are two ways a visitor lands on the pro bono path:

1. **Service-area option** — selecting **"Pro bono support (nonprofits &
   early-stage small businesses)"** from the *Service area* dropdown.
2. **Deep link** — loading the form at **`/?path=probono`** (the "Giving Back"
   CTA elsewhere on the site). On load this pre-selects the Pro bono option and
   reveals the intro + extra fields.

## Form behavior

- When the pro bono path is active, a short **intro banner** appears:
  > **You're applying for pro bono support.** We take on a select few each year,
  > and we read every request. Tell us about your organization below.
- Two **conditional fields** are revealed (hidden otherwise) and made
  **required** only while the path is active:
  - **Organization type** — radio: *Nonprofit* / *Early-stage small business*.
  - **Mission — what do you do?** — textarea.
- **Attribution is sticky.** If a visitor arrives via `?path=probono`, the
  submission stays tagged `source=giving-back` even if they later switch the
  Service area to a paid option (they came from the Giving Back CTA).
- Standard fields (name, email, organization, "what do you need help with", etc.)
  are unchanged and still apply.

## Fields captured

| Field | Form input | Required | Notes |
|---|---|---|---|
| Organization name | `organization` | no | existing field |
| Organization type | `org_type` | yes (pro bono) | `nonprofit` \| `small_business` |
| Mission / what you do | `mission` | yes (pro bono) | pro-bono-specific |
| What you need help with | `need` | yes | existing field |
| Source tag | `source` (hidden) | — | set to `giving-back` |

## Data model & tagging

Added by migration **`apps/coritas/migrations/0002_probono.sql`** (additive):

- `leads.source TEXT` — `giving-back` for pro bono submissions (else NULL).
- `leads.org_type TEXT` — `nonprofit` | `small_business`.
- `leads.mission TEXT` — the org's mission / description.
- Index `idx_leads_source` on `leads(source)`.

A submission is treated as pro bono (→ `source = 'giving-back'`) when **either**
the Service area is "Pro bono support" **or** the request arrived with
`source=giving-back` (the deep link). This is normalized server-side in
`validateLead`, so the client cannot mistag arbitrary values:

- `org_type` is constrained to the known tokens `nonprofit` / `small_business`
  (anything else → NULL).
- `source` is forced to `giving-back` on the pro bono path.

## Admin visibility

- **`GET /api/leads`** (admin-token guarded) returns `source` and `org_type`, so
  pro bono requests are easy to spot in the inbox view.
- The intake event in **`lead_events`** is annotated
  `website form — pro bono (giving-back)` for pro bono submissions.

## Unchanged

- **Cloudflare Turnstile** bot protection on `POST /api/submit` is untouched.
- The LeadAgent classification/notification flow is unchanged. (Follow-up:
  surface `mission` / `org_type` in Kate's notification — tracked in Asana.)

## Bonus: "Help me decide"

The old "Not sure / other" option is relabeled **"Not sure / Other — help me
decide"**, and selecting it shows a short helper note inviting the visitor to
describe their situation so Kate can point them to the right fit.

## Related files

- `apps/coritas/src/form.ts` — form markup, styles, and the deep-link / toggle JS.
- `packages/intake-core/src/validation.ts` — pro bono normalization + tagging.
- `packages/intake-core/src/types.ts` — `source` / `org_type` / `mission` fields.
- `packages/intake-core/src/d1.ts` — `insertLead` writes the new columns.
- `apps/coritas/src/index.ts` — `/api/leads` projection + intake event annotation.
- `apps/coritas/migrations/0002_probono.sql` — additive schema migration.
