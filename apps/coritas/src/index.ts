// Coritas intake Worker. Routes:
//   GET  /            → public intake form
//   POST /api/submit  → Turnstile + validate + persist + dispatch LeadAgent
//   POST /api/route   → Kate routes a lead to an owner (admin-token guarded)
//   GET  /api/leads   → Kate's pipeline view (admin-token guarded)
import {
  assignLead,
  constantTimeEqual,
  getLead,
  insertLead,
  recordEvent,
  validateLead,
  verifyTurnstile,
  type RawLeadSubmission,
} from "@coritas/intake-core";
import { getAgentByName } from "agents";
import type { Env } from "./env.js";
import { renderForm } from "./form.js";
import { LeadAgent } from "./lead-agent.js";

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function authorized(req: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_TOKEN) return false; // fail closed if unset
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  return constantTimeEqual(token, env.ADMIN_TOKEN);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(renderForm(env.TURNSTILE_SITE_KEY ?? ""), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/submit") {
      return handleSubmit(req, env, ctx);
    }

    if (req.method === "POST" && url.pathname === "/api/route") {
      if (!(await authorized(req, env))) return json({ error: "unauthorized" }, 401);
      return handleRoute(req, env);
    }

    if (req.method === "GET" && url.pathname === "/api/leads") {
      if (!(await authorized(req, env))) return json({ error: "unauthorized" }, 401);
      const { results } = await env.DB.prepare(
        `SELECT id, name, email, organization, source, org_type, lane,
                qualification, fit_score, est_value_band, status, suggested_owner,
                assigned_to, needs_review, next_action, created_at
         FROM leads ORDER BY created_at DESC LIMIT 200`,
      ).all();
      return json({ leads: results });
    }

    return json({ error: "not found" }, 404);
  },
};

async function handleSubmit(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let raw: RawLeadSubmission;
  try {
    raw = (await req.json()) as RawLeadSubmission;
  } catch {
    return json({ errors: ["invalid JSON body"] }, 400);
  }

  // 1) Bot check.
  const turnstile = await verifyTurnstile(
    typeof raw["cf-turnstile-response"] === "string"
      ? (raw["cf-turnstile-response"] as string)
      : null,
    env.TURNSTILE_SECRET_KEY,
    req.headers.get("CF-Connecting-IP"),
  );
  if (!turnstile.success) {
    return json({ errors: ["bot verification failed, please retry"] }, 400);
  }

  // 2) Validate + normalize.
  const result = validateLead(raw);
  if (!result.ok || !result.value) {
    return json({ errors: result.errors }, 422);
  }

  // 3) Persist as a new, unassigned lead (Coritas origination).
  const id = await insertLead(env.DB, result.value, "coritas");
  const intakeDetail =
    result.value.source === "giving-back"
      ? "website form — pro bono (giving-back)"
      : "website form";
  await recordEvent(env.DB, id, "intake", intakeDetail);

  // 4) Dispatch the per-lead agent (classify → notify Kate → schedule) async.
  const agent = await getAgentByName(env.LEAD_AGENT, `lead-${id}`);
  ctx.waitUntil(
    agent.intake(id).catch(async (err: unknown) => {
      await recordEvent(env.DB, id, "error", `agent.intake failed: ${String(err)}`);
    }),
  );

  return json({ ok: true, id });
}

async function handleRoute(req: Request, env: Env): Promise<Response> {
  let body: { leadId?: number; assignee?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ errors: ["invalid JSON body"] }, 400);
  }
  if (!body.leadId || !body.assignee) {
    return json({ errors: ["leadId and assignee are required"] }, 422);
  }
  const lead = await getLead(env.DB, body.leadId);
  if (!lead) return json({ errors: ["lead not found"] }, 404);

  // Routing is Kate's action; only now does the assignee gain visibility.
  await assignLead(env.DB, body.leadId, body.assignee);
  await recordEvent(env.DB, body.leadId, "routed", `→ ${body.assignee}`);
  return json({ ok: true, leadId: body.leadId, assignee: body.assignee });
}

export { LeadAgent };
