import type { IntakeEnv } from "@coritas/intake-core";
import type { AgentNamespace } from "agents";
import type { LeadAgent } from "./lead-agent.js";

export interface Env extends IntakeEnv {
  // Turnstile: public site key (var, injected into the form) + secret (verify).
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  // Shared token guarding Kate's routing endpoint (set as a Cloudflare secret).
  ADMIN_TOKEN: string;
  // Agents-SDK namespace for the per-lead agent (Durable Object under the hood).
  LEAD_AGENT: AgentNamespace<LeadAgent>;
}
