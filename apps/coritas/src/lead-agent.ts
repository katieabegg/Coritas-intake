// Coritas LeadAgent: classifies + qualifies each lead with Claude, drafts a
// reply in Kate's voice, and hands the lifecycle (notify / schedule) to the base.
import {
  BaseLeadAgent,
  callClaude,
  extractJson,
  type LeadClassification,
  type LeadRecord,
  type NotificationContent,
} from "@coritas/intake-core";
import type { Env } from "./env.js";
import { renderLeadEmailHtml } from "./email-template.js";
import { bandByKey, pricingSummary, type AnchorKey } from "./config/pricing.js";
import {
  BUYER_TYPES,
  lanesSummary,
  laneByKey,
  partnershipEconomics,
} from "./config/services.js";
import { rosterSummary, suggestedOwnerFor } from "./config/team.js";

const SCHEDULER_PLACEHOLDER = "{{SCHEDULER_LINK}}"; // Kate swaps for Cal.com/Calendly

/** Shape we ask Claude to return. Post-processed against config before persisting. */
interface ModelVerdict {
  anchor: AnchorKey;
  practice_area: string | null; // a PRICE_BANDS key when identifiable
  buyer_type: string;
  qualification: "hot" | "warm" | "cool";
  fit_score: number;
  needs_review: boolean;
  next_action: string;
  rationale: string;
  draft_reply: string;
}

export class LeadAgent extends BaseLeadAgent<Env> {
  async classify(lead: LeadRecord): Promise<LeadClassification> {
    const system = this.buildSystemPrompt();
    const prompt = this.buildLeadPrompt(lead);

    let verdict: ModelVerdict;
    try {
      const raw = await callClaude({
        apiKey: this.env.ANTHROPIC_API_KEY,
        model: this.env.CLAUDE_MODEL,
        system,
        prompt,
        maxTokens: 1800,
        temperature: 0.4,
      });
      verdict = extractJson<ModelVerdict>(raw);
    } catch (err) {
      // Never block: fall back to a review-flagged, conservative classification.
      return this.fallbackClassification(lead, String(err));
    }

    return this.reconcile(lead, verdict);
  }

  /** Enforce config truth over the model: ownership, value bands, originator. */
  private reconcile(lead: LeadRecord, v: ModelVerdict): LeadClassification {
    const lane = laneByKey(v.anchor);
    const band = v.practice_area ? bandByKey(v.practice_area) : undefined;
    const owner = suggestedOwnerFor(v.anchor);

    // Ramping lanes are captured + routed to Kate, tagged early-stage.
    const ramping = lane?.status === "ramping";
    const notes = [
      v.rationale,
      ramping ? `[early-stage: ${lane?.label} is ramping]` : null,
    ]
      .filter(Boolean)
      .join(" ");

    // Hot leads carry a scheduler link in the draft. The model is told to emit a
    // placeholder token; we resolve it to the real SCHEDULER_URL here so a draft
    // never ships the raw {{SCHEDULER_LINK}} text. If no link is configured yet,
    // fall back to a neutral phrase Kate can fill in.
    const schedulerUrl = this.env.SCHEDULER_URL?.trim() || null;
    let draft = v.draft_reply ?? "";
    if (v.qualification === "hot" && !draft.includes(SCHEDULER_PLACEHOLDER)) {
      draft += `\n\nGrab a time that works for you: ${SCHEDULER_PLACEHOLDER}`;
    }
    draft = draft
      .split(SCHEDULER_PLACEHOLDER)
      .join(schedulerUrl ?? "(scheduling link to follow)");

    const valueBand = band
      ? band.scoped || band.low == null || band.high == null
        ? "Scoped per engagement — value TBD"
        : `$${band.low.toLocaleString()}–$${band.high.toLocaleString()} / ${band.unit}`
      : null;

    return {
      anchor: v.anchor,
      lane: lane?.label ?? v.anchor,
      practice_area: band?.label ?? v.practice_area ?? null,
      buyer_type: v.buyer_type,
      est_value_band: valueBand,
      est_value_low: band && !band.scoped ? band.low : null,
      est_value_high: band && !band.scoped ? band.high : null,
      qualification: v.qualification,
      fit_score: clamp(v.fit_score, 0, 100),
      suggested_owner: owner,
      needs_review: Boolean(v.needs_review) || ramping,
      next_action: v.next_action ?? null,
      agent_notes: notes || null,
      draft_reply: draft || null,
      rationale: v.rationale ?? null,
    };
  }

  private fallbackClassification(
    lead: LeadRecord,
    error: string,
  ): LeadClassification {
    return {
      anchor: "anchor_a",
      lane: "Unclassified — needs review",
      practice_area: null,
      buyer_type: "other",
      est_value_band: null,
      est_value_low: null,
      est_value_high: null,
      qualification: "warm",
      fit_score: 50,
      suggested_owner: "Kate Abegg",
      needs_review: true,
      next_action: "Manual review — automated classification failed.",
      agent_notes: `Classifier error: ${error}`,
      draft_reply: null,
      rationale: "Fell back to manual review; the model call did not succeed.",
    };
  }

  private buildSystemPrompt(): string {
    return [
      "You are the intake analyst for Coritas Strategies, a national consultancy.",
      "Classify each inbound lead into exactly one service lane, identify the buyer type,",
      "estimate a value band, score ICP fit, and draft a warm, concise reply in the founder",
      "Kate Abegg's voice (direct, credible, no fluff, first person).",
      "",
      "RULES:",
      "- All work is national. There are NO geographic limits and NO partisan/topic exclusions.",
      "- Coritas does FEMA disaster/EM work broadly and bipartisan political project work.",
      "- Never decline a lead. If genuinely unclear, set needs_review=true; never block.",
      "- Kate owns and routes every lead. In 'rationale' you may flag which specialist could be a good fit (e.g., Dr. Howard for leadership/policy, Ryan for social), but never treat anyone but Kate as the owner.",
      "- Some services are scoped per client with no fixed price (e.g., healthcare cyber resilience audit, affordable housing feasibility & policy report, website development & business process automation). For those, do not invent a figure — the value is TBD/scoped.",
      "- Pick practice_area from the pricing keys below when you can identify the work; else null.",
      "- Qualification: hot = strong ICP fit + clear budget/timeline; warm = good fit, soft signals;",
      "  cool = weak fit or very early. Base value on the pricing bands.",
      "",
      "SERVICE LANES:",
      lanesSummary(),
      "",
      "PRICING BANDS (use the key for practice_area):",
      pricingSummary(),
      "",
      `BUYER TYPES (pick one): ${BUYER_TYPES.join(", ")}`,
      "",
      "TEAM (for context only — routing is done by Kate, not you):",
      rosterSummary(),
      "",
      "Respond with ONLY a JSON object:",
      "{",
      '  "anchor": "anchor_a|anchor_b|social_media",',
      '  "practice_area": "pricing key or null",',
      '  "buyer_type": "one of the buyer types",',
      '  "qualification": "hot|warm|cool",',
      '  "fit_score": 0-100,',
      '  "needs_review": boolean,',
      '  "next_action": "the single best next step",',
      '  "rationale": "1-2 sentences",',
      `  "draft_reply": "reply in Kate's voice; for hot leads include the token ${SCHEDULER_PLACEHOLDER}"`,
      "}",
    ].join("\n");
  }

  private buildLeadPrompt(lead: LeadRecord): string {
    return [
      "New lead from the Coritas website intake form:",
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Organization: ${lead.organization ?? "—"}`,
      `Role: ${lead.role ?? "—"}`,
      `Service area selected: ${lead.service_area ?? "—"}`,
      `Timeline: ${lead.timeline ?? "—"}`,
      `Budget band (self-reported): ${lead.budget_band ?? "—"}`,
      `How heard: ${lead.how_heard ?? "—"}`,
      `Location (informational): ${lead.location ?? "—"}`,
      "",
      "Their need (free text):",
      lead.need,
    ].join("\n");
  }

  buildNotification(
    lead: LeadRecord,
    c: LeadClassification,
  ): NotificationContent {
    const flag = c.needs_review ? " ⚠️ needs review" : "";
    const subject = `New lead [${c.qualification.toUpperCase()}] ${c.lane} — ${lead.name}${flag}`;

    const lines = [
      `New ${c.qualification} lead — Coritas origination.`,
      "",
      `Name: ${lead.name} <${lead.email}>`,
      `Org / role: ${lead.organization ?? "—"} / ${lead.role ?? "—"}`,
      `Lane: ${c.lane}`,
      `Practice area: ${c.practice_area ?? "—"}`,
      `Buyer type: ${c.buyer_type ?? "—"}`,
      `Estimated value: ${c.est_value_band ?? "TBD"}`,
      `Fit score: ${c.fit_score}/100`,
      `Suggested owner: ${c.suggested_owner} (you route — nobody is contacted until you do)`,
      `Recommended next step: ${c.next_action ?? "—"}`,
      "",
      `Their need:\n${lead.need}`,
    ];

    // Strategic-leadership leads: include partnership economics.
    if (c.anchor === "anchor_b") {
      lines.push("", "Partnership economics:", partnershipEconomics(c.est_value_high));
    }

    lines.push(
      "",
      "Suggested reply draft (approve / edit / send from your phone):",
      "----------------------------------------",
      c.draft_reply ?? "(no draft — needs manual reply)",
      "----------------------------------------",
    );

    const text = lines.join("\n");
    const html = renderLeadEmailHtml(lead, c);
    const slack =
      `*New ${c.qualification.toUpperCase()} lead* — ${c.lane}\n` +
      `${lead.name} (${lead.organization ?? "—"}) · fit ${c.fit_score} · ${c.est_value_band ?? "value TBD"}\n` +
      `Suggested owner: ${c.suggested_owner}. Route from your phone.`;

    return { subject, html, text, slack };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
