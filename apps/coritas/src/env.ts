import type { IntakeEnv } from "@coritas/intake-core";
import type { AgentNamespace } from "agents";
import type { LeadAgent } from "./lead-agent.js";

export interface Env extends IntakeEnv {
  // Turnstile: public site key (var, injected into the form) + secret (verify).
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  // Shared token guarding Kate's routing endpoint (set as a Cloudflare secret).
  ADMIN_TOKEN: string;
  // Public scheduling link (Cal.com / Calendly) dropped into hot-lead reply
  // drafts. Optional: if unset, drafts read "(scheduling link to follow)" rather
  // than exposing the raw placeholder token.
  SCHEDULER_URL?: string;
  // Agents-SDK namespace for the per-lead agent (Durable Object under the hood).
  LEAD_AGENT: AgentNamespace<LeadAgent>;
  // Off-site backup bucket. The daily cron snapshots leads + lead_events here;
  // a TrueNAS Cloud Sync task pulls it down for the local 3-2-1 copy.
  BACKUPS: R2Bucket;
}
