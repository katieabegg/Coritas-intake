// Questionnaire content — one per product line, plus a general fallback.
// DRAFT copy written for Kate's review (her original per-service questionnaires
// were not in this repo); swap question text freely — the funnel only depends
// on the ids and shapes. Config, not code: edit here to change any questionnaire.
import type { AnchorKey } from "./pricing.js";

export type QuestionType = "text" | "textarea" | "select" | "radio";

export interface Question {
  id: string; // stable key answers are stored under
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[]; // for select / radio
  placeholder?: string;
}

export interface Questionnaire {
  key: QuestionnaireKey;
  slug: string; // URL path segment: /q/<slug>
  title: string;
  intro: string;
  questions: Question[];
}

export type QuestionnaireKey = AnchorKey | "general";

const BUDGET_OPTIONS = [
  "Under $5,000",
  "$5,000 – $25,000",
  "$25,000 – $100,000",
  "Over $100,000",
  "Not yet determined",
];

const TIMELINE_OPTIONS = [
  "Urgent (< 2 weeks)",
  "This quarter",
  "Next quarter",
  "Exploratory / no date",
];

const DECISION_OPTIONS = [
  "I can approve this myself",
  "I recommend; someone else approves",
  "A board / council / committee decides",
  "Still figuring that out",
];

export const QUESTIONNAIRES: Questionnaire[] = [
  {
    key: "anchor_a",
    slug: "resilience",
    title: "Resilience & Emergency Management",
    intro:
      "A few questions so our call starts at the real work, not the basics. Takes about 5 minutes.",
    questions: [
      {
        id: "situation",
        label: "What's the situation you're facing?",
        type: "textarea",
        required: true,
        placeholder:
          "A disaster or incident, a grant you're pursuing, an audit or compliance need, a risk you want ahead of…",
      },
      {
        id: "service_focus",
        label: "Which of these is closest to what you need?",
        type: "select",
        required: true,
        options: [
          "FEMA / disaster & emergency management",
          "Grant readiness or grant writing",
          "Healthcare cyber resilience audit",
          "Homeowner preparedness / mitigation audit",
          "Community advocacy",
          "Expert witness / advisory",
          "A mix — I'll explain above",
        ],
      },
      {
        id: "deadlines",
        label: "Are there hard deadlines? (Grant windows, compliance dates, hearing dates…)",
        type: "text",
        placeholder: "e.g. application due August 15",
      },
      {
        id: "prior_efforts",
        label: "What have you already tried or applied for, if anything?",
        type: "textarea",
        placeholder: "Prior FEMA applications, past grants, existing plans or audits…",
      },
      {
        id: "funding",
        label: "How would this work be funded?",
        type: "select",
        options: [
          "Operating budget",
          "Grant-funded (existing or pending)",
          "Insurance / recovery funds",
          "Personal funds (homeowner)",
          "Not yet determined",
        ],
      },
      { id: "budget", label: "Rough budget comfort", type: "select", options: BUDGET_OPTIONS },
      { id: "decision", label: "Who signs off on engaging us?", type: "radio", options: DECISION_OPTIONS },
      {
        id: "success",
        label: "Six months from now, what does success look like?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    key: "anchor_b",
    slug: "leadership",
    title: "Strategic Leadership Advisory",
    intro:
      "A few questions so Kate can come to the call already thinking about your situation. Takes about 5 minutes.",
    questions: [
      {
        id: "challenge",
        label: "What's the challenge or decision in front of you?",
        type: "textarea",
        required: true,
        placeholder:
          "A leadership transition, a policy question, a growth or turnaround moment, a project that needs a strategist…",
      },
      {
        id: "service_focus",
        label: "Which of these is closest to what you need?",
        type: "select",
        required: true,
        options: [
          "Strategic leadership advisory",
          "Political / policy project",
          "Affordable housing feasibility & policy",
          "Website development & business process automation",
          "Executive education",
          "A mix — I'll explain above",
        ],
      },
      {
        id: "stakes",
        label: "What happens if this doesn't get solved?",
        type: "textarea",
        placeholder: "What's riding on it — for the organization and for you.",
      },
      { id: "timeline", label: "When does this need to move?", type: "select", options: TIMELINE_OPTIONS },
      { id: "budget", label: "Rough budget comfort", type: "select", options: BUDGET_OPTIONS },
      { id: "decision", label: "Who signs off on engaging us?", type: "radio", options: DECISION_OPTIONS },
      {
        id: "advisors",
        label: "Who else is advising you on this, if anyone?",
        type: "text",
        placeholder: "Board, consultants, counsel — so we complement rather than duplicate.",
      },
      {
        id: "success",
        label: "What would make this engagement clearly worth it?",
        type: "textarea",
        required: true,
      },
    ],
  },
  {
    key: "social_media",
    slug: "social-media",
    title: "Social Media Strategy",
    intro:
      "A few questions about where your social presence stands. Takes about 3 minutes.",
    questions: [
      {
        id: "goals",
        label: "What do you want social media to do for you?",
        type: "textarea",
        required: true,
        placeholder: "Visibility, credibility, leads, community, recruiting…",
      },
      {
        id: "platforms",
        label: "Where are you active today (if anywhere)?",
        type: "text",
        placeholder: "LinkedIn, Facebook, Instagram, X, TikTok, YouTube — and handles if you'd like.",
      },
      {
        id: "audience",
        label: "Who are you trying to reach?",
        type: "textarea",
        required: true,
      },
      {
        id: "capacity",
        label: "Who would run this day to day?",
        type: "radio",
        options: [
          "We have someone in-house",
          "We'd want it managed for us",
          "Not sure yet",
        ],
      },
      { id: "timeline", label: "When do you want to start?", type: "select", options: TIMELINE_OPTIONS },
      { id: "budget", label: "Rough monthly budget comfort", type: "select", options: [
        "Under $1,000 / month",
        "$1,000 – $3,000 / month",
        "$3,000 – $7,500 / month",
        "Over $7,500 / month",
        "Not yet determined",
      ] },
    ],
  },
  {
    key: "general",
    slug: "general",
    title: "Tell us more",
    intro:
      "You said you weren't sure where your need fits — that's fine. A few questions so Kate can point you to the right place. Takes about 3 minutes.",
    questions: [
      {
        id: "situation",
        label: "Describe the situation in your own words.",
        type: "textarea",
        required: true,
      },
      {
        id: "trigger",
        label: "What prompted you to reach out now?",
        type: "textarea",
        placeholder: "A deadline, an incident, a decision point, a nudge from someone…",
      },
      { id: "timeline", label: "When does this need to move?", type: "select", options: TIMELINE_OPTIONS },
      { id: "budget", label: "Rough budget comfort", type: "select", options: BUDGET_OPTIONS },
      { id: "decision", label: "Who signs off on engaging outside help?", type: "radio", options: DECISION_OPTIONS },
      {
        id: "success",
        label: "If this goes well, what changes for you?",
        type: "textarea",
        required: true,
      },
    ],
  },
];

/** Map each Service-area form option to the questionnaire that covers it. */
const SERVICE_TO_KEY: Record<string, QuestionnaireKey> = {
  "Strategic Leadership Advisory": "anchor_b",
  "Executive Education": "anchor_b",
  "Website Development & Business Process Automation": "anchor_b",
  "Political / Policy Project": "anchor_b",
  "Affordable Housing Feasibility & Policy Report": "anchor_b",
  "Grant Readiness & Grant Writing": "anchor_a",
  "Homeowner Preparedness / Disaster Mitigation Audit": "anchor_a",
  "Healthcare Cyber Resilience Audit": "anchor_a",
  "Emergency Management & Disaster Recovery (FEMA)": "anchor_a",
  "Social Media Strategy & Management": "social_media",
  "Not sure / Other — help me decide": "general",
};

export function questionnaireBySlug(slug: string): Questionnaire | undefined {
  return QUESTIONNAIRES.find((q) => q.slug === slug);
}

export function questionnaireByKey(key: string): Questionnaire | undefined {
  return QUESTIONNAIRES.find((q) => q.key === key);
}

/**
 * Which questionnaires to send for a submission's selected service areas
 * (comma-joined string as persisted on the lead). Multiple selections map to
 * the union of their lanes; nothing recognized falls back to the general one.
 * Pro bono ("giving-back") submissions are handled personally — no questionnaire.
 */
export function questionnairesForServiceArea(serviceArea: string | null): Questionnaire[] {
  const keys = new Set<QuestionnaireKey>();
  for (const part of (serviceArea ?? "").split(",")) {
    const key = SERVICE_TO_KEY[part.trim()];
    if (key) keys.add(key);
  }
  if (keys.size === 0) keys.add("general");
  return QUESTIONNAIRES.filter((q) => keys.has(q.key));
}
