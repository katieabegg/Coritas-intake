# Automated lead funnel + CRM — design spec

Status: **proposal for review.** Nothing here is built yet; this is the plan
Kate asked for so the whole flow can be seen in one place before coding.

## The goal

Automate everything from "stranger fills out the contact form" up to "Kate gets
on a call" — so that by the time Kate talks to anyone, she already has the full
picture and her time isn't wasted on tire-kickers.

## The flow (what we're building)

```
1. Contact form, with a product-line choice            → lead saved to D1
2. Auto-email the customer the product-specific
   questionnaire link                                  → CRM card created ("New")
3. Customer completes the questionnaire (on our site)  → answers saved to D1
                                                          CRM card → "Questionnaire returned"
                                                          Kate notified
4. Auto-email the customer the booking link + a warm
   "thanks for reaching out"                           → CRM card → "Awaiting booking"
5. Customer books a time                               → CRM card → "Call booked"
                                                          a dedicated project is created
                                                          under the Customer Portfolio
6. Kate takes the call with everything already in hand
```

Steps 1–5 are hands-off. Kate only steps in at step 6.

## Architecture — who does what

No new/separate CRM system. The pieces we already have cover it:

- **Cloudflare D1 (database) = the system of record.** Every lead and every
  questionnaire answer already lives here. Single source of truth; everything
  else mirrors it.
- **Asana = the CRM you actually work in.** A card per lead moving across stage
  columns; a real project per *customer* once they convert.
- **Microsoft stays for what it's best at:** Bookings for scheduling, Outlook
  for mail. We do **not** add a Microsoft CRM (Dynamics/Lists/Dataverse) — for a
  solo operator that's one more system to maintain and break.
- **The Cloudflare Worker = the automation engine** that wires these together.

Why not "CRM in Cloudflare"? D1 is the data; a custom dashboard would be one
more thing to maintain. Asana is a better day-to-day surface than anything we'd
hand-roll — so Cloudflare is the engine, Asana is the face.

## Asana CRM design

**Pre-call: one task per lead** in the existing **"Coritas — Leads"** project.
- Stage columns (sections). Existing: New · Contacted · Booked · Won · Lost.
  Add: **Questionnaire sent · Questionnaire returned · Awaiting booking** so the
  card visibly advances as the funnel does.
- Add **custom fields** so the card is a real CRM record at a glance:
  Email · Organization · Product line · Qualification (hot/warm/cool) ·
  Fit score · Booking status · Lead ID (links back to D1).
- The returned questionnaire is attached to the card (or posted as a comment).

**On conversion (they book): one project per customer** under a new
**"Customer Portfolio."**
- Created from a project template so every customer engagement starts identical.
- The contact info + questionnaire travel onto the project.
- This is the point a "portfolio of customers" is meaningful — not for every
  tire-kicker, only for people who actually booked.

> Tooling note: a portfolio can't be created through the tools available in this
> session, so the **"Customer Portfolio" is created once** — either Kate makes it
> in the Asana UI (≈30s) or the Worker creates/manages it via the Asana REST API
> at runtime (the REST API supports `POST /portfolios` and `addItem`). The board,
> sections, custom fields, and per-customer projects are all automatable.

## The questionnaires (step 2–3)

Recommendation: **build them into the Coritas site**, one page per product line
(e.g. `/q/<product-line>?lead=<id>&t=<token>`). This is the only way to make
"send the booking link *after* they finish" fully automatic — our site knows the
moment they submit, so it can fire step 4 itself and drop the answers into D1 +
Asana. (Linking out to e.g. Microsoft Forms means an outside system can't tell us
when they finished, so step 4 would have to be handled inside that platform with
Power Automate — automation split across two tools.)

- **Input needed from Kate:** the content (fields/questions) of each
  product-line questionnaire she already built (currently on her Mac mini, not in
  this repo).
- Each questionnaire link carries a **per-lead token** so the form is tied to one
  lead and can't be guessed/enumerated by strangers.
- Answers save to a new D1 table (`lead_questionnaire`) keyed by lead ID.

## The product-line choice (step 1)

The contact form already has a **Service area** dropdown. We map each selectable
product line to its questionnaire.

**Decision (Kate): multiple — allow the customer to pick more than one product
line.** Consequence: if multiple lines are selected, the default is to send the
questionnaire for **each** selected line; if that's too much for the customer,
fall back to a single combined questionnaire. (Finalize at build.)

## The customer emails (new)

Two new customer-facing emails (today the system emails **only Kate**):
- **After form submit:** "Thanks — here's a short questionnaire so I can make our
  time count: <link>."
- **After questionnaire:** "Thank you for reaching out — grab a time that works:
  <booking link>."

Both sent via Resend from `innovationlab@coritasstrategies.com`, reply-to Kate,
in the same branded style as the lead-notification email. Copy drafted in Kate's
voice and shown to her before going live.

## Bookings → Asana (step 5)

Microsoft Bookings can't natively call our Worker when someone books, so to move
the card to "Call booked" and create the customer project automatically:

**Decision (Kate): use Power Automate (option a).** Keeps the existing Microsoft
Bookings setup (availability, calendar, confirmations, reminders — already built)
and bridges it with a low-code flow Kate can manage inside M365: on a new
booking, the flow pings a Worker endpoint that advances the pipeline.

- Caveat: Power Automate's outbound **HTTP action can require a premium license**
  tier. If that's a snag, the fallback is for the **Worker to poll the Bookings
  calendar** (Microsoft Graph) on its daily schedule — same result, no Power
  Automate. Choose at build time based on the license.
- Rejected: building our own scheduler into the site — it would reproduce, worse,
  what Bookings already does.

## What's needed to build (inputs / decisions)

1. **Questionnaire content** for each product line (from the Mac mini).
2. **The booking link** URL (and confirm it's the Microsoft Bookings page).
3. **Asana token** set as a Worker secret (turns on all the auto-Asana steps).
4. ~~Decision: **Bookings bridge**~~ → **DECIDED: Power Automate** (Worker-polls-
   Graph as fallback if a premium license is a snag).
5. ~~Decision: product-line choice **single or multiple**~~ → **DECIDED: multiple**
   (send a questionnaire per selected line; combined as fallback).
6. Who creates the **"Customer Portfolio"** — Kate once in the UI, or the Worker.

## Suggested build order

1. **Funnel core** — product-line mapping + questionnaire pages + the two
   customer emails (steps 1–4). Delivers the biggest win first.
2. **Asana CRM** — turn on the lead→card mirror; add the new stage columns +
   custom fields; advance cards as the funnel progresses (steps 2–4 in Asana).
3. **Conversion** — booking bridge + auto-create the customer project under the
   Customer Portfolio (step 5).

Each phase ships as its own PR Kate can review and merge from her phone.
