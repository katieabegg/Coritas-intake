// Coritas intake Worker. Routes:
//   GET  /                     → public intake form
//   POST /api/submit           → Turnstile + validate + persist + dispatch LeadAgent
//   GET  /q/<slug>             → per-lead questionnaire (token-gated)
//   POST /api/questionnaire    → save questionnaire answers (token-gated)
//   POST /api/route            → Kate routes a lead to an owner (admin-token guarded)
//   GET  /api/leads            → Kate's pipeline view (admin-token guarded)
import {
  assignLead,
  completeQuestionnaire,
  constantTimeEqual,
  countCompleted,
  createQuestionnaire,
  getLead,
  getQuestionnaireByToken,
  insertLead,
  recordEvent,
  sendEmail,
  validateLead,
  verifyTurnstile,
  type LeadRecord,
  type RawLeadSubmission,
} from "@coritas/intake-core";
import { getAgentByName } from "agents";
import { runBackup } from "./backup.js";
import {
  questionnaireBySlug,
  questionnairesForServiceArea,
  type Questionnaire,
} from "./config/questionnaires.js";
import {
  bookingEmail,
  questionnaireEmail,
  questionnaireReturnedEmail,
  type QuestionnaireLink,
} from "./customer-emails.js";
import type { Env } from "./env.js";
import { renderForm } from "./form.js";
import { LeadAgent } from "./lead-agent.js";
import { renderQuestionnairePage } from "./questionnaire-page.js";

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
      // The pro-bono path is only offered to visitors arriving from the Giving
      // Back page (?path=probono); everyone else never sees the option.
      const probono = url.searchParams.get("path") === "probono";
      return new Response(renderForm(env.TURNSTILE_SITE_KEY ?? "", probono), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/submit") {
      return handleSubmit(req, env, ctx);
    }

    // Per-lead questionnaire (funnel steps 2-3). Access requires the exact
    // lead id + token pair from the emailed link; anything else is a 404 so
    // the URL space can't be probed for which leads exist.
    const qMatch = /^\/q\/([a-z-]+)$/.exec(url.pathname);
    if (req.method === "GET" && qMatch) {
      return handleQuestionnairePage(qMatch[1]!, url, env);
    }

    if (req.method === "POST" && url.pathname === "/api/questionnaire") {
      return handleQuestionnaireSubmit(req, env, ctx);
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

  // Daily off-site backup of the lead pipeline → R2 (see backup.ts). Cron is
  // configured in wrangler.jsonc; failures surface in Workers logs/observability.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runBackup(env)
        .then((r) =>
          console.log(
            `backup ok: ${r.key} (leads=${r.counts.leads ?? 0}, ` +
              `events=${r.counts.lead_events ?? 0}, pruned=${r.pruned})`,
          ),
        )
        .catch((err: unknown) => console.error(`backup failed: ${String(err)}`)),
    );
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

  // 5) Funnel step 2: auto-email the customer their questionnaire link(s).
  //    Pro bono requests stay a personal touch — no automated funnel.
  if (result.value.source !== "giving-back") {
    const origin = new URL(req.url).origin;
    const lead = result.value;
    ctx.waitUntil(
      sendQuestionnaireLinks(env, id, lead.name, lead.email, lead.service_area, origin).catch(
        async (err: unknown) => {
          await recordEvent(env.DB, id, "error", `questionnaire email failed: ${String(err)}`);
        },
      ),
    );
  }

  return json({ ok: true, id });
}

/** Create token-gated questionnaire rows and email the links (customer email #1). */
async function sendQuestionnaireLinks(
  env: Env,
  leadId: number,
  name: string,
  email: string,
  serviceArea: string | null,
  origin: string,
): Promise<void> {
  const questionnaires = questionnairesForServiceArea(serviceArea);
  const links: QuestionnaireLink[] = [];
  for (const q of questionnaires) {
    const token = await createQuestionnaire(env.DB, leadId, q.key);
    links.push({
      questionnaire: q,
      url: `${origin}/q/${q.slug}?lead=${leadId}&t=${token}`,
    });
  }

  const msg = questionnaireEmail(name, links);
  const sent = await sendEmail(env.RESEND_API_KEY, {
    from: env.FROM_EMAIL,
    to: email,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    reply_to: env.KATE_EMAIL,
  });
  if (!sent.ok) throw new Error(sent.error ?? "resend failed");
  await recordEvent(
    env.DB,
    leadId,
    "questionnaire_sent",
    questionnaires.map((q) => q.key).join(", "),
  );
}

async function handleQuestionnairePage(
  slug: string,
  url: URL,
  env: Env,
): Promise<Response> {
  const questionnaire = questionnaireBySlug(slug);
  const leadId = Number(url.searchParams.get("lead"));
  const token = url.searchParams.get("t") ?? "";
  if (!questionnaire || !Number.isInteger(leadId) || leadId <= 0 || !token) {
    return json({ error: "not found" }, 404);
  }
  const row = await getQuestionnaireByToken(env.DB, leadId, questionnaire.key, token);
  if (!row) return json({ error: "not found" }, 404);

  return new Response(
    renderQuestionnairePage(questionnaire, leadId, token, row.status === "completed"),
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handleQuestionnaireSubmit(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  let body: { lead?: unknown; slug?: unknown; t?: unknown; answers?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ errors: ["invalid JSON body"] }, 400);
  }

  const leadId = Number(body.lead);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const token = typeof body.t === "string" ? body.t : "";
  const questionnaire = questionnaireBySlug(slug);
  if (!questionnaire || !Number.isInteger(leadId) || leadId <= 0 || !token) {
    return json({ errors: ["not found"] }, 404);
  }
  const row = await getQuestionnaireByToken(env.DB, leadId, questionnaire.key, token);
  if (!row) return json({ errors: ["not found"] }, 404);
  if (row.status === "completed") return json({ ok: true, already: true });

  // Keep only answers to questions this questionnaire actually asks; enforce
  // required ones server-side (the client's `required` is advisory only).
  const rawAnswers = (body.answers ?? {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  for (const q of questionnaire.questions) {
    const v = rawAnswers[q.id];
    if (typeof v === "string" && v.trim()) answers[q.id] = v.trim().slice(0, 5000);
  }
  const missing = questionnaire.questions.filter((q) => q.required && !answers[q.id]);
  if (missing.length > 0) {
    return json({ errors: missing.map((q) => `"${q.label}" is required`) }, 422);
  }

  const updated = await completeQuestionnaire(env.DB, row.id, JSON.stringify(answers));
  if (!updated) return json({ ok: true, already: true });
  await recordEvent(env.DB, leadId, "questionnaire_completed", questionnaire.key);

  const lead = await getLead(env.DB, leadId);
  if (lead) {
    ctx.waitUntil(
      afterQuestionnaire(env, lead, questionnaire, answers).catch(async (err: unknown) => {
        await recordEvent(env.DB, leadId, "error", `post-questionnaire failed: ${String(err)}`);
      }),
    );
  }
  return json({ ok: true });
}

/** Funnel after a questionnaire lands: notify Kate, then (once) email the booking link. */
async function afterQuestionnaire(
  env: Env,
  lead: LeadRecord,
  questionnaire: Questionnaire,
  answers: Record<string, string>,
): Promise<void> {
  const note = questionnaireReturnedEmail(lead.name, lead.email, questionnaire, answers);
  await sendEmail(env.RESEND_API_KEY, {
    from: env.FROM_EMAIL,
    to: env.KATE_EMAIL,
    subject: note.subject,
    html: note.html,
    text: note.text,
    reply_to: lead.email,
  });

  // Funnel step 4 — at most once per lead, even if several questionnaires land
  // concurrently: the UPDATE below is an atomic claim on the lead row.
  const claim = await env.DB.prepare(
    `UPDATE leads SET booking_email_at = datetime('now')
     WHERE id = ? AND booking_email_at IS NULL`,
  )
    .bind(lead.id)
    .run();
  if ((claim.meta.changes ?? 0) === 0) return; // someone else already sent it

  const bookingUrl = env.SCHEDULER_URL?.trim() || null;
  const msg = bookingEmail(lead.name, bookingUrl);
  const sent = await sendEmail(env.RESEND_API_KEY, {
    from: env.FROM_EMAIL,
    to: lead.email,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    reply_to: env.KATE_EMAIL,
  });
  await recordEvent(
    env.DB,
    lead.id,
    sent.ok ? "booking_email_sent" : "error",
    sent.ok
      ? bookingUrl
        ? "with booking link"
        : "fallback copy — SCHEDULER_URL not set"
      : `booking email failed: ${sent.error ?? "unknown"}`,
  );
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
