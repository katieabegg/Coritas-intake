// Pricing bands used for value-band qualification (Strategic Plan Part 7).
// Amounts in USD. `unit` distinguishes project / retainer / day-rate sizing.

export type PriceUnit = "project" | "retainer_month" | "day";

export interface PriceBand {
  key: string;
  anchor: AnchorKey;
  label: string;
  low: number;
  high: number;
  unit: PriceUnit;
}

export type AnchorKey = "anchor_a" | "anchor_b" | "social_media";

export const PRICE_BANDS: PriceBand[] = [
  // Anchor A — Resilience & Emergency Management
  { key: "homeowner_audit", anchor: "anchor_a", label: "Homeowner mitigation audit", low: 500, high: 1_500, unit: "project" },
  { key: "township_grant_readiness", anchor: "anchor_a", label: "Township grant readiness", low: 3_500, high: 7_500, unit: "project" },
  { key: "grant_writing", anchor: "anchor_a", label: "Grant writing", low: 8_000, high: 25_000, unit: "project" },
  { key: "fema_elevation_pm", anchor: "anchor_a", label: "FEMA elevation rescue PM", low: 25_000, high: 45_000, unit: "project" },
  { key: "community_advocacy", anchor: "anchor_a", label: "Community advocacy", low: 20_000, high: 40_000, unit: "project" },
  { key: "healthcare_cyber", anchor: "anchor_a", label: "Healthcare cyber resilience", low: 70_000, high: 120_000, unit: "project" },
  { key: "expert_witness", anchor: "anchor_a", label: "Expert witness / advisory", low: 20_000, high: 60_000, unit: "project" },

  // Anchor B — Strategic Leadership Advisory
  { key: "founder_day_rate", anchor: "anchor_b", label: "Founder day rate", low: 2_400, high: 3_200, unit: "day" },
  { key: "howard_day_rate", anchor: "anchor_b", label: "Dr. Howard day rate", low: 2_800, high: 3_500, unit: "day" },
  { key: "strategic_leadership_project", anchor: "anchor_b", label: "Strategic leadership (project)", low: 25_000, high: 100_000, unit: "project" },
  { key: "strategic_leadership_retainer", anchor: "anchor_b", label: "Strategic leadership (retainer)", low: 5_000, high: 25_000, unit: "retainer_month" },
  { key: "executive_education", anchor: "anchor_b", label: "Executive education", low: 5_000, high: 15_000, unit: "day" },
];

export function bandByKey(key: string): PriceBand | undefined {
  return PRICE_BANDS.find((b) => b.key === key);
}

/** Compact, model-readable summary of all bands for the classifier prompt. */
export function pricingSummary(): string {
  return PRICE_BANDS.map(
    (b) =>
      `- ${b.key} (${b.anchor}): ${b.label} — $${b.low.toLocaleString()}–$${b.high.toLocaleString()} per ${b.unit}`,
  ).join("\n");
}
