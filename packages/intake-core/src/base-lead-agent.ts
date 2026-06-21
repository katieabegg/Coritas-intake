// BaseLeadAgent: shared per-lead workflow built on the Cloudflare Agents SDK.
// Each lead gets its own Durable-Object-backed agent instance (addressed as
// `lead-<id>`), giving it durable state and a scheduler for follow-ups.
//
// Site Workers subclass this and implement classify() + buildNotification();
// the base owns the lifecycle: classify → persist → notify Kate → schedule
// nudges and the hot-lead re-ping.
import { Agent } from "agents";
import { applyClassification, getLead, recordEvent } from "./d1.js";
import { sendEmail } from "./email.js";
import { notifySlack } from "./slack.js";
import { createAsanaTask } from "./asana.js";
import { addBusinessHours } from "./time.js";
import type { LeadClassification, LeadRecord } from "./types.js";

/** Environment bindings every intake agent needs. Sites extend this. */
export interface IntakeEnv {
  DB: D1Database;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  SLACK_WEBHOOK_URL: string;
  CLAUDE_MODEL: string;
  // Who receives every lead first, and the From address for outbound mail.
  KATE_EMAIL: string;
  FROM_EMAIL: string;
  // Optional: mirror each new lead into an Asana board. The push only happens
  // when ASANA_TOKEN + ASANA_LEADS_PROJECT are set, so it's fully opt-in.
  ASANA_TOKEN?: string;
  ASANA_LEADS_PROJECT?: string;
  ASANA_LEADS_SECTION?: string;
}

export interface NotificationContent {
  subject: string;
  html: string;
  text: string;
  slack: string;
}

export interface BaseLeadState {
  leadId: number | null;
  qualification: string | null;
  notifiedAt: string | null;
  routedAt: string | null;
}

const DAY_SECONDS = 24 * 60 * 60;

export abstract class BaseLeadAgent<
  Env extends IntakeEnv,
  State extends BaseLeadState = BaseLeadState,
> extends Agent<Env, State> {
  initialState = {
    leadId: null,
    qualification: null,
    notifiedAt: null,
    routedAt: null,
  } as State;

  /** Site-specific: classify + qualify the lead (typically via Claude). */
  abstract classify(lead: LeadRecord): Promise<LeadClassification>;

  /** Site-specific: compose the owner-facing notification (Kate first). */
  abstract buildNotification(
    lead: LeadRecord,
    c: LeadClassification,
  ): NotificationContent;

  // --- Lifecycle -----------------------------------------------------------

  /** Entry point invoked by the Worker right after a lead is persisted. */
  async intake(leadId: number): Promise<void> {
    const lead = await getLead(this.env.DB, leadId);
    if (!lead) throw new Error(`intake: lead ${leadId} not found`);

    const classification = await this.classify(lead);
    await applyClassification(this.env.DB, leadId, classification);
    await recordEvent(
      this.env.DB,
      leadId,
      "classified",
      `${classification.lane} · ${classification.qualification} · fit ${classification.fit_score}`,
    );

    const enriched: LeadRecord = { ...lead, ...classification };
    await this.notifyOwner(enriched, classification);

    this.setState({
      ...this.state,
      leadId,
      qualification: classification.qualification,
      notifiedAt: new Date().toISOString(),
    } as State);

    await this.scheduleFollowUps(leadId, classification);
  }

  /** Notify Kate first, and only Kate, on every lead. */
  private async notifyOwner(
    lead: LeadRecord,
    c: LeadClassification,
  ): Promise<void> {
    const note = this.buildNotification(lead, c);
    const sent = await sendEmail(this.env.RESEND_API_KEY, {
      from: this.env.FROM_EMAIL,
      to: this.env.KATE_EMAIL,
      subject: note.subject,
      html: note.html,
      text: note.text,
      reply_to: lead.email,
    });
    // The whole system exists to notify Kate first — a silent email failure is the
    // worst outcome. Record it and, if Slack is wired, raise a visible alert so a
    // missed lead never just vanishes.
    if (!sent.ok) {
      await recordEvent(
        this.env.DB,
        lead.id,
        "error",
        `email notify failed: ${sent.error ?? "unknown"}`,
      );
      if (this.env.SLACK_WEBHOOK_URL) {
        await notifySlack(
          this.env.SLACK_WEBHOOK_URL,
          `⚠️ Lead #${lead.id} (${lead.name} <${lead.email}>) arrived but the email notification FAILED — check the pipeline. Error: ${sent.error ?? "unknown"}`,
        ).catch(() => {});
      }
    }
    if (this.env.SLACK_WEBHOOK_URL) {
      await notifySlack(this.env.SLACK_WEBHOOK_URL, note.slack);
    }
    // Opt-in: mirror the lead onto the Asana pipeline board. Never block on it.
    if (this.env.ASANA_TOKEN && this.env.ASANA_LEADS_PROJECT) {
      try {
        await createAsanaTask({
          token: this.env.ASANA_TOKEN,
          projectGid: this.env.ASANA_LEADS_PROJECT,
          sectionGid: this.env.ASANA_LEADS_SECTION,
          name: note.subject,
          notes: note.text,
        });
        await recordEvent(this.env.DB, lead.id, "asana", "card created");
      } catch (err) {
        await recordEvent(this.env.DB, lead.id, "asana_error", String(err));
      }
    }
    await recordEvent(
      this.env.DB,
      lead.id,
      "notified",
      sent.ok ? "kate" : "kate (email send failed — see error event)",
    );
  }

  private async scheduleFollowUps(
    leadId: number,
    c: LeadClassification,
  ): Promise<void> {
    // Quiet-prospect nudges at day 3 and day 7.
    await this.schedule(3 * DAY_SECONDS, "followUp", { leadId, day: 3 });
    await this.schedule(7 * DAY_SECONDS, "followUp", { leadId, day: 7 });
    // Hot leads: re-ping Kate if still unrouted after 4 business hours.
    if (c.qualification === "hot") {
      const when = addBusinessHours(new Date(), 4);
      await this.schedule(when, "repingHot", { leadId });
    }
  }

  // --- Scheduled callbacks (invoked by the Agents runtime) -----------------

  /** Day 3 / Day 7 nudge: if the prospect is still quiet, prompt the owner. */
  async followUp(payload: { leadId: number; day: number }): Promise<void> {
    const lead = await getLead(this.env.DB, payload.leadId);
    if (!lead) return;
    // "Quiet" == not yet booked/won/lost/cold. Owner approves the actual send.
    if (lead.status !== "new" && lead.status !== "contacted") return;

    const owner = lead.assigned_to ?? "Kate";
    const subject = `Follow-up nudge (day ${payload.day}): ${lead.name}${lead.organization ? ` · ${lead.organization}` : ""}`;
    const body =
      `${lead.name} has been quiet since intake (${lead.created_at}). ` +
      `Lane: ${lead.lane ?? "?"} · ${lead.qualification ?? "?"}. ` +
      `Suggested: send a day-${payload.day} check-in. Owner: ${owner}.`;

    await sendEmail(this.env.RESEND_API_KEY, {
      from: this.env.FROM_EMAIL,
      to: this.env.KATE_EMAIL,
      subject,
      text: body,
    });
    await recordEvent(this.env.DB, lead.id, "followup", `day ${payload.day}`);
  }

  /** Re-ping Kate if a hot lead is still unrouted past 4 business hours. */
  async repingHot(payload: { leadId: number }): Promise<void> {
    const lead = await getLead(this.env.DB, payload.leadId);
    if (!lead) return;
    if (lead.assigned_to) return; // already routed
    if (lead.status !== "new") return;

    await sendEmail(this.env.RESEND_API_KEY, {
      from: this.env.FROM_EMAIL,
      to: this.env.KATE_EMAIL,
      subject: `⏰ HOT lead still unrouted: ${lead.name}`,
      text:
        `A hot lead has been waiting >4 business hours without routing.\n\n` +
        `${lead.name} · ${lead.email}\nLane: ${lead.lane ?? "?"}\nNeed: ${lead.need}`,
    });
    await recordEvent(this.env.DB, lead.id, "reping", "hot unrouted >4bh");
  }
}
