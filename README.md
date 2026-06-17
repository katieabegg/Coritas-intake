# Coritas Strategies — Intake System

Agent-driven lead pipeline on Cloudflare. Public form → Turnstile → D1 → a
per-lead **LeadAgent** (Cloudflare Agents SDK / Durable Object) that classifies,
qualifies, drafts a reply in Kate's voice, notifies **Kate first** on every lead,
and schedules follow-ups. Kate routes from her phone; only then does an assignee
gain visibility.

## Layout (npm workspaces)

```
packages/intake-core   Shared plumbing (reusable across Coritas-family sites):
                       Turnstile verify, validation, D1 helpers, Resend email,
                       Slack notify, Claude client, BaseLeadAgent.
apps/coritas           The Coritas intake Worker: form, /api/submit, LeadAgent,
                       and config (service lanes, team roster, pricing bands).
```

`intake-core` stays a clean, separable package — promote it to private GitHub
Packages when cyber-contagion / lumberton adopt it.

## How it works

1. `GET /` serves the intake form (`apps/coritas/src/form.ts`).
2. `POST /api/submit` verifies Turnstile, validates, persists an **unassigned**
   `leads` row (Coritas origination), then dispatches `LeadAgent.intake(id)`.
3. **LeadAgent** (`apps/coritas/src/lead-agent.ts`) uses Claude to pick a service
   lane (Anchor A / Anchor B / Social Media), buyer type, value band (from the
   pricing config), fit score, and a draft reply. Config — not the model — owns
   `suggested_owner` and value bands. It never declines; unclear leads are flagged
   `needs_review`.
4. Kate is emailed (Resend) + Slacked with the summary, lane, value estimate, fit
   score, suggested owner, next step, and the draft. Anchor B leads include
   partnership economics (origination tag + Model 3 hybrid <$25K / Model 4 >$25K).
5. `POST /api/route` (admin-token) is Kate's phone routing; `GET /api/leads` is her
   pipeline view.
6. Follow-ups: day-3 / day-7 nudges if the prospect is quiet; hot leads re-ping
   Kate if unrouted past 4 business hours.

## Config (no code change to operate)

- **Service lanes** `apps/coritas/src/config/services.ts` — flip Social Media
  Strategy `status` from `ramping` → `active` for full rollout.
- **Team roster** `config/team.ts` — drives `suggested_owner` only; Kate always routes.
- **Pricing bands** `config/pricing.ts` — Strategic Plan Part 7 values.

## Secrets — never committed

`.dev.vars.example` names them. For production set Cloudflare Secrets (or Workers
Builds env vars):

```
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put ADMIN_TOKEN
```

Non-secret vars (`CLAUDE_MODEL`, `KATE_EMAIL`, `FROM_EMAIL`, `TURNSTILE_SITE_KEY`)
live in `apps/coritas/wrangler.jsonc`. Replace `TURNSTILE_SITE_KEY` with the real
public site key.

## Deploy (GitOps)

Connect **Workers Builds** to this repo with root directory `apps/coritas`
(matches the existing per-site pattern; cyber-contagion / lumberton already deploy
this way). Push to `main` → auto-deploy. Protect `main` with a required PR review
so Kate approves/merges (and thus deploys) from GitHub Mobile.

Apply the D1 migration once (adds `leads` + `lead_events` to the existing
`coritas_blog`; messages/clients/sessions/posts untouched):

```
npm run migrate:remote --workspace apps/coritas
```

## Local dev

```
npm install
cp .dev.vars.example apps/coritas/.dev.vars   # fill in values
npm run migrate:local --workspace apps/coritas
npm run dev                                   # wrangler dev
```

## Status

First cut: scaffold + intake-core + LeadAgent + `/api/submit` + routing/pipeline
endpoints + form. Typechecks and builds (`wrangler deploy --dry-run`). Not yet
deployed — see open items in the PR description.
