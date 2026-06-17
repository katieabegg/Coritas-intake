// Team roster. Drives `suggested_owner` ONLY — Kate always routes manually and
// no team member is contacted before she does. Extensible: add members here.
import type { AnchorKey } from "./pricing.js";

export interface TeamMember {
  name: string;
  anchors: AnchorKey[];
  focus: string;
  isGate?: boolean; // Kate is the founder + routing gate
}

export const TEAM: TeamMember[] = [
  {
    name: "Kate Abegg",
    anchors: ["anchor_a"],
    focus: "Resilience/EM, FEMA/disaster, healthcare cyber, township grants, homeowner",
    isGate: true,
  },
  {
    name: "Dr. Adam Howard",
    anchors: ["anchor_b"],
    focus: "Strategic leadership, bipartisan political, policy advisory, executive education",
  },
  {
    name: "Ryan Clevenger",
    anchors: ["social_media"],
    focus: "Social Media Strategy",
  },
];

/**
 * Suggested owner. Kate owns every service line and routes each lead to the
 * best-fit person herself, so the model never pre-assigns away from her. The
 * roster still feeds the prompt so the model can flag a possible specialist fit.
 */
export function suggestedOwnerFor(_anchor: AnchorKey): string {
  return "Kate Abegg";
}

export function rosterSummary(): string {
  return TEAM.map((t) => `- ${t.name}: ${t.focus}`).join("\n");
}
