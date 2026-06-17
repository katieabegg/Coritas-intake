// Service-lane configuration. Status drives rollout WITHOUT code changes:
//   active  — fully sold + delivered
//   ramping — captured + routed to Kate, suggested owner tagged, flagged early-stage
//   planned — not yet offered
// Flip Social Media Strategy to "active" here for full rollout.
import type { AnchorKey } from "./pricing.js";

export type ServiceStatus = "active" | "ramping" | "planned";

export interface ServiceLane {
  key: AnchorKey;
  label: string;
  status: ServiceStatus;
  /** What belongs in this lane — also fed to the classifier. */
  scope: string[];
}

export const SERVICE_LANES: ServiceLane[] = [
  {
    key: "anchor_a",
    label: "Anchor A — Resilience & Emergency Management",
    status: "active",
    scope: [
      "FEMA disaster / emergency management project work (national, no geographic limits)",
      "Healthcare cyber resilience",
      "Township grant readiness → grant writing",
      "Community advocacy",
      "Homeowner mitigation audit",
      "Expert witness / advisory",
    ],
  },
  {
    key: "anchor_b",
    label: "Anchor B — Strategic Leadership Advisory",
    status: "active",
    scope: [
      "Strategic leadership advisory",
      "Bipartisan political project work (national)",
      "Policy advisory",
      "Executive education",
    ],
  },
  {
    key: "social_media",
    label: "Social Media Strategy",
    status: "ramping",
    scope: ["Standalone social media strategy engagements"],
  },
];

/** Buyer types the classifier may assign. Extensible. */
export const BUYER_TYPES = [
  "township_municipal_government",
  "federal_state_agency",
  "healthcare_organization",
  "homeowner",
  "nonprofit_advocacy",
  "political_campaign_committee",
  "corporate_executive",
  "other",
] as const;

export function laneByKey(key: AnchorKey): ServiceLane | undefined {
  return SERVICE_LANES.find((l) => l.key === key);
}

export function lanesSummary(): string {
  return SERVICE_LANES.map(
    (l) =>
      `### ${l.key} — ${l.label} [status: ${l.status}]\n` +
      l.scope.map((s) => `  - ${s}`).join("\n"),
  ).join("\n");
}

/**
 * Strategic-leadership partnership economics (Anchor B only).
 * Model 3 (hybrid split) for engagements < $25K; Model 4 (negotiate) for > $25K.
 * Website-form leads carry Coritas origination with no individual origination fee.
 */
export function partnershipEconomics(estValueHigh: number | null): string {
  const tag = "Origination: Coritas (website form — no individual origination fee)";
  if (estValueHigh == null) {
    return `${tag}\nSplit model: TBD once value is scoped (Model 3 hybrid <$25K, Model 4 negotiate >$25K).`;
  }
  const model =
    estValueHigh < 25_000
      ? "Model 3 — hybrid split (engagement < $25K)"
      : "Model 4 — negotiated split (engagement > $25K)";
  return `${tag}\nSuggested split: ${model}.`;
}
