// Customer-facing funnel emails (docs/FUNNEL.md steps 2 & 4) — the first mail
// the system sends to anyone other than Kate. Same constraints as
// email-template.ts: table layout, inline styles, web-safe fonts, brand palette.
// Copy is drafted in Kate's voice; sent from FROM_EMAIL with reply-to Kate.
import { escapeHtml } from "./email-template.js";
import type { Questionnaire } from "./config/questionnaires.js";

const navy = "#2C3B62";
const cream = "#F5F0E8";
const gold = "#C9A84C";
const rust = "#823927";
const gray = "#737373";
const line = "#E3DDD0";

/** Shared shell: header band, body slot, quiet footer. */
function shell(bodyHtml: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${cream};-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cream};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#FFFFFF;border:1px solid ${line};border-radius:10px;overflow:hidden">
        <tr><td style="background:${navy};padding:20px 24px">
          <div style="color:${cream};font:600 15px Georgia,'Times New Roman',serif;letter-spacing:3px;text-transform:uppercase">Coritas Strategies</div>
          <div style="color:#C9B79A;font:italic 13px Georgia,'Times New Roman',serif;margin-top:3px">Where resilience becomes direction.</div>
        </td></tr>
        <tr><td style="padding:26px 24px">${bodyHtml}</td></tr>
        <tr><td style="background:${cream};border-top:1px solid ${line};padding:14px 24px;color:${gray};font:12px Arial,Helvetica,sans-serif">
          Coritas Strategies &middot; You're receiving this because you reached out via coritasstrategies.com. Just reply to this email to reach Kate directly.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? name;

export interface QuestionnaireLink {
  questionnaire: Questionnaire;
  url: string;
}

/** Email #1 — right after the form: thanks + questionnaire link(s). */
export function questionnaireEmail(
  name: string,
  links: QuestionnaireLink[],
): { subject: string; html: string; text: string } {
  const esc = escapeHtml;
  const multiple = links.length > 1;

  const linkBlocksHtml = links
    .map(
      (l) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px">
        <tr><td style="background:${cream};border:1px solid ${line};border-left:3px solid ${gold};border-radius:0 6px 6px 0;padding:14px 16px">
          <div style="color:${navy};font:600 15px Georgia,'Times New Roman',serif">${esc(l.questionnaire.title)}</div>
          <div style="margin-top:10px"><a href="${esc(l.url)}" style="display:inline-block;background:${navy};color:${cream};font:600 14px Arial,Helvetica,sans-serif;text-decoration:none;padding:10px 18px;border-radius:6px">Answer a few questions</a></div>
        </td></tr>
      </table>`,
    )
    .join("");

  const html = shell(`
    <div style="color:${navy};font:700 20px Georgia,'Times New Roman',serif">Thank you for reaching out, ${esc(firstName(name))}.</div>
    <div style="color:${navy};font:15px/1.6 Arial,Helvetica,sans-serif;margin-top:14px">
      I read every inquiry personally, and I'd like to make our first conversation count.
      Before we talk, would you answer a few short questions${multiple ? " for each area you asked about" : ""}?
      It takes about five minutes, and it means I come to the call already thinking about your situation instead of asking you to start from the beginning.
    </div>
    ${linkBlocksHtml}
    <div style="color:${gray};font:13px/1.6 Arial,Helvetica,sans-serif;margin-top:18px">
      The link is personal to you — no account or password needed. As soon as you're done, I'll send you a link to grab a time on my calendar.
    </div>
    <div style="color:${navy};font:15px/1.6 Arial,Helvetica,sans-serif;margin-top:18px">
      — Kate Abegg<br><span style="color:${gray};font-size:13px">Founder, Coritas Strategies</span>
    </div>`);

  const text = [
    `Thank you for reaching out, ${firstName(name)}.`,
    "",
    "I read every inquiry personally, and I'd like to make our first conversation count.",
    `Before we talk, would you answer a few short questions${multiple ? " for each area you asked about" : ""}? It takes about five minutes.`,
    "",
    ...links.map((l) => `${l.questionnaire.title}: ${l.url}`),
    "",
    "The link is personal to you — no account or password needed. As soon as you're done, I'll send you a link to grab a time on my calendar.",
    "",
    "— Kate Abegg",
    "Founder, Coritas Strategies",
  ].join("\n");

  return {
    subject: "Thank you — a few questions before we talk",
    html,
    text,
  };
}

/** Kate-facing: a lead returned their questionnaire — answers inline. */
export function questionnaireReturnedEmail(
  leadName: string,
  leadEmail: string,
  questionnaire: Questionnaire,
  answers: Record<string, string>,
): { subject: string; html: string; text: string } {
  const esc = escapeHtml;

  // Every question renders, answered or not — a dash marks what they skipped.
  const answered = questionnaire.questions.map((q) => ({
    label: q.label,
    value: answers[q.id]?.trim() || "—",
  }));

  const rowsHtml = answered
    .map(
      (a) => `<tr>
        <td style="padding:8px 0 2px;color:${gray};font:600 12px Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.5px">${esc(a.label)}</td></tr>
        <tr><td style="padding:0 0 8px;color:${navy};font:14px/1.55 Arial,Helvetica,sans-serif;border-bottom:1px solid ${line}">${esc(a.value).replace(/\n/g, "<br>")}</td>
      </tr>`,
    )
    .join("");

  const html = shell(`
    <div style="color:${navy};font:700 18px Georgia,'Times New Roman',serif">Questionnaire returned — ${esc(leadName)}</div>
    <div style="margin-top:4px"><a href="mailto:${esc(leadEmail)}" style="color:${rust};font:14px Arial,Helvetica,sans-serif;text-decoration:none">${esc(leadEmail)}</a>
      <span style="color:${gray};font:13px Arial,Helvetica,sans-serif"> &middot; ${esc(questionnaire.title)}</span></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px">${rowsHtml}</table>
    <div style="color:${gray};font:13px/1.6 Arial,Helvetica,sans-serif;margin-top:16px">The booking email went out to them automatically (or will not, if one was already sent for another questionnaire).</div>`);

  const text = [
    `Questionnaire returned — ${leadName} <${leadEmail}>`,
    `Questionnaire: ${questionnaire.title}`,
    "",
    ...answered.map((a) => `${a.label}\n  ${a.value}`),
  ].join("\n");

  return {
    subject: `Questionnaire returned: ${leadName} — ${questionnaire.title}`,
    html,
    text,
  };
}

/** Email #2 — after the questionnaire: warm thanks + the booking link. */
export function bookingEmail(
  name: string,
  bookingUrl: string | null,
): { subject: string; html: string; text: string } {
  const esc = escapeHtml;

  const bookHtml = bookingUrl
    ? `<div style="margin-top:16px"><a href="${esc(bookingUrl)}" style="display:inline-block;background:${rust};color:#FFFFFF;font:600 15px Arial,Helvetica,sans-serif;text-decoration:none;padding:12px 22px;border-radius:6px">Grab a time that works for you</a></div>`
    : `<div style="color:${navy};font:15px/1.6 Arial,Helvetica,sans-serif;margin-top:16px;background:${cream};border:1px solid ${line};border-radius:6px;padding:12px 16px">I'll reach out personally within one business day to find a time that works.</div>`;

  const html = shell(`
    <div style="color:${navy};font:700 20px Georgia,'Times New Roman',serif">Got it — thank you, ${esc(firstName(name))}.</div>
    <div style="color:${navy};font:15px/1.6 Arial,Helvetica,sans-serif;margin-top:14px">
      Your answers are in front of me, and they're exactly what I needed. The next step is a short discovery call — we'll talk through your situation, what a path forward looks like, and whether we're the right partner for it.
    </div>
    ${bookHtml}
    <div style="color:${gray};font:13px/1.6 Arial,Helvetica,sans-serif;margin-top:18px">
      If anything changes in the meantime, just reply to this email — it comes straight to me.
    </div>
    <div style="color:${navy};font:15px/1.6 Arial,Helvetica,sans-serif;margin-top:18px">
      — Kate Abegg<br><span style="color:${gray};font-size:13px">Founder, Coritas Strategies</span>
    </div>`);

  const text = [
    `Got it — thank you, ${firstName(name)}.`,
    "",
    "Your answers are in front of me, and they're exactly what I needed. The next step is a short discovery call — we'll talk through your situation, what a path forward looks like, and whether we're the right partner for it.",
    "",
    bookingUrl
      ? `Grab a time that works for you: ${bookingUrl}`
      : "I'll reach out personally within one business day to find a time that works.",
    "",
    "If anything changes in the meantime, just reply to this email — it comes straight to me.",
    "",
    "— Kate Abegg",
    "Founder, Coritas Strategies",
  ].join("\n");

  return {
    subject: "Thank you — let's find a time to talk",
    html,
    text,
  };
}
