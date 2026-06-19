# CLAUDE.md

Guidance for Claude Code (and any AI assistant) working in this repository.

## Working with the maintainer

Kate (kate.abegg@coritasstrategies.com) is the owner and primary maintainer.
She is a **beginner/intermediate developer learning as she goes**. When helping:

- **Give exact, click-by-click steps.** For any dashboard (Cloudflare, GitHub,
  Resend, etc.) or CLI action, spell out where to click and what to type — don't
  assume familiarity with git internals, the terminal, or Cloudflare concepts.
- **Explain the "why,"** briefly, so it's a learning moment — not just the "what."
- **Don't assume prior knowledge** of jargon; define terms the first time.
- **Prefer PRs for changes** so Kate can review/merge from her phone. Treat the
  merge as her approval gate. Avoid pushing directly to `main`.
- **Be honest about state** — if a deploy/build failed, say so and show the log.
- **Secrets:** never ask Kate to paste a secret value into chat. Public values
  (e.g. a Turnstile *site* key) are fine; private ones (API keys, *secret* keys,
  tokens) go straight into Cloudflare as Worker Secrets.
- **Brand email:** use **`innovationlab@coritasstrategies.com`** (the real,
  monitored Coritas inbox) on all outward-facing Coritas work — site contact,
  system send-from, copy, etc. `intake@` is only an internal alias and should not
  be shown publicly. Lead notifications are delivered to `kate.abegg@` (Outlook).

## What this is

Agent-driven lead intake pipeline for Coritas Strategies, on Cloudflare.
Public form → Turnstile → D1 → a per-lead **LeadAgent** (Durable Object) that
classifies, qualifies, drafts a reply in Kate's voice, notifies Kate first, and
schedules follow-ups. Kate routes leads from her phone before anyone else gains
visibility.

## Layout (npm workspaces)

- `packages/intake-core` — shared plumbing (Turnstile verify, validation, D1
  helpers, Resend email, Slack notify, Claude client, constant-time crypto,
  `BaseLeadAgent`). Reusable across Coritas-family sites.
- `apps/coritas` — the intake Worker (public form, `POST /api/submit`,
  `POST /api/route`, `GET /api/leads`, the `LeadAgent` Durable Object).

## Deploy / CI-CD

- **Cloud-first; no local-machine dependency.** Building and deploying happen in
  Cloudflare's cloud via **Workers Builds**, not on any local machine.
- Connected repo: `katieabegg/Coritas-intake`. **Production branch: `main`.**
  Every merge to `main` auto-builds and deploys.
- Workers Builds config: **Root directory `/`**, **Build command `npm install`**,
  **Deploy command `npm run deploy`** (this runs `wrangler deploy` inside
  `apps/coritas` — running wrangler at the repo root fails for an npm workspace).
- Deployed Worker name: **`coritas-intake`** (must match the `name` in
  `apps/coritas/wrangler.jsonc`, or Workers Builds rejects the deploy).
- Live URL: `https://coritas-intake.kate-abegg.workers.dev`.

## Local commands

- `npm install` — install all workspaces (from repo root).
- `npm run dev` — local dev server (`wrangler dev`) for `apps/coritas`.
- `npm run deploy` — deploy (normally done by Workers Builds, not by hand).
- `npm run migrate:remote --workspace apps/coritas` — apply D1 migrations to prod.
- `npm run typecheck` — type-check all workspaces.

## Data

Reuses the existing `coritas_blog` D1 database. This project only adds the
`leads` and `lead_events` tables (via `apps/coritas/migrations/`); the existing
`messages` / `clients` / `sessions` / `posts` tables are left untouched.

## Capturing to-dos to Asana

When a to-do or action item surfaces during **any** session — something Kate needs
to do, a follow-up, or a deferred fix — **proactively create it as an Asana task**
(don't wait to be asked), then tell Kate it was added, with the project name/link.

- Use the Asana MCP tools (`mcp__Asana__create_tasks`); assign to Kate (`me`) and
  include a short note with context.
- File it in the **most relevant project**. If it doesn't clearly fit one, default
  to **"Inbox / To-Sort"** (GID `1215816761829467`) for Kate to triage.
- Projects (Asana workspace "Kate's first team"): Coritas Intake — Backlog ·
  Coritas Strategies — Website · Lumberton Republicans · Cyber Contagion ·
  Marketing & Content · Business Operations · Inbox / To-Sort.
- This is a guideline Claude follows (CLAUDE.md is read each session), not a
  mechanical hook — so it applies to sessions working in this repo. To extend it
  everywhere, add the same note to other repos' `CLAUDE.md` or a global
  `~/.claude/CLAUDE.md`.

