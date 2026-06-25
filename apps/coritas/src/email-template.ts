// Owner-facing lead notification, as a polished HTML email.
//
// Email clients (Outlook especially) are unforgiving: no external CSS, no flex
// layout, patchy <pre>/<div> handling. So this uses a table layout with inline
// styles only — the previous version wrapped the plain-text dump in a single
// <pre>, which rendered as jumbled monospace. Brand palette: navy / cream /
// gold / rust, web-safe fonts (Georgia for headings, Arial for body).
import type { LeadClassification, LeadRecord } from "@coritas/intake-core";
import { partnershipEconomics } from "./config/services.js";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderLeadEmailHtml(
  lead: LeadRecord,
  c: LeadClassification,
): string {
  const navy = "#2C3B62";
  const cream = "#F5F0E8";
  const gold = "#C9A84C";
  const rust = "#823927";
  const gray = "#737373";
  const line = "#E3DDD0";

  const esc = escapeHtml;
  const nl2br = (s: string): string => esc(s).replace(/\n/g, "<br>");

  const q = c.qualification;
  const badgeBg = q === "hot" ? rust : q === "warm" ? gold : "#5B6472";
  const badgeFg = q === "warm" ? navy : "#FFFFFF";

  // `value` may carry trusted inline markup (assembled below); raw lead data is
  // escaped at each call site.
  const row = (label: string, value: string): string =>
    `<tr>
        <td style="padding:7px 0;color:${gray};font:13px Arial,Helvetica,sans-serif;width:160px;vertical-align:top">${esc(label)}</td>
        <td style="padding:7px 0;color:${navy};font:14px Arial,Helvetica,sans-serif;vertical-align:top">${value}</td>
      </tr>`;

  const reviewBanner = c.needs_review
    ? `<tr><td style="background:#FBE7E4;border:1px solid ${rust};color:${rust};padding:10px 14px;border-radius:6px;font:600 13px Arial,Helvetica,sans-serif">&#9888; Needs review — automated confidence is low; give this one a closer look.</td></tr>
         <tr><td style="height:16px;line-height:16px">&nbsp;</td></tr>`
    : "";

  const econ =
    c.anchor === "anchor_b"
      ? `<tr><td style="height:18px;line-height:18px">&nbsp;</td></tr>
           <tr><td style="color:${navy};font:600 13px Arial,Helvetica,sans-serif;padding-bottom:6px">Partnership economics</td></tr>
           <tr><td style="color:${navy};font:14px/1.5 Arial,Helvetica,sans-serif;background:${cream};border:1px solid ${line};border-radius:6px;padding:12px 14px">${nl2br(partnershipEconomics(c.est_value_high) ?? "")}</td></tr>`
      : "";

  const ownerValue = `${esc(c.suggested_owner ?? "—")} <span style="color:${gray}">— you route; nobody is contacted until you do</span>`;
  const draft = c.draft_reply ?? "(no draft — this one needs a manual reply)";

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${cream};-webkit-text-size-adjust:100%">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cream};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#FFFFFF;border:1px solid ${line};border-radius:10px;overflow:hidden">
        <tr><td style="background:${navy};padding:20px 24px">
          <div style="color:${cream};font:600 15px Georgia,'Times New Roman',serif;letter-spacing:3px;text-transform:uppercase">Coritas Strategies</div>
          <div style="color:#C9B79A;font:13px Arial,Helvetica,sans-serif;margin-top:3px">New lead — routed to you first</div>
        </td></tr>
        <tr><td style="padding:24px">
          <div>
            <span style="display:inline-block;background:${badgeBg};color:${badgeFg};font:700 12px Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;padding:5px 12px;border-radius:999px">${esc(q)}</span>
            <span style="color:${navy};font:600 16px Georgia,'Times New Roman',serif;padding-left:8px">${esc(c.lane)}</span>
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px">
            ${reviewBanner}
            <tr><td>
              <div style="color:${navy};font:700 18px Georgia,'Times New Roman',serif">${esc(lead.name)}</div>
              <div style="margin-top:3px"><a href="mailto:${esc(lead.email)}" style="color:${rust};font:14px Arial,Helvetica,sans-serif;text-decoration:none">${esc(lead.email)}</a></div>
              <div style="color:${gray};font:13px Arial,Helvetica,sans-serif;margin-top:5px">${esc(lead.organization ?? "—")}${lead.role ? " &middot; " + esc(lead.role) : ""}</div>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;border-top:1px solid ${line};border-bottom:1px solid ${line}">
            ${row("Practice area", esc(c.practice_area ?? "—"))}
            ${row("Buyer type", esc(c.buyer_type ?? "—"))}
            ${row("Estimated value", esc(c.est_value_band ?? "TBD"))}
            ${row("Fit score", `${c.fit_score} / 100`)}
            ${row("Suggested owner", ownerValue)}
            ${row("Recommended next step", esc(c.next_action ?? "—"))}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px">
            <tr><td style="color:${navy};font:600 13px Arial,Helvetica,sans-serif;padding-bottom:6px">Their need</td></tr>
            <tr><td style="color:${navy};font:14px/1.55 Arial,Helvetica,sans-serif;background:${cream};border-left:3px solid ${gold};border-radius:0 6px 6px 0;padding:12px 14px">${nl2br(lead.need)}</td></tr>
            ${econ}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px">
            <tr><td style="color:${navy};font:600 13px Arial,Helvetica,sans-serif;padding-bottom:6px">Suggested reply draft <span style="color:${gray};font-weight:400">— approve, edit, or send from your phone</span></td></tr>
            <tr><td style="color:${navy};font:14px/1.6 Arial,Helvetica,sans-serif;background:#FFFFFF;border:1px solid ${line};border-radius:6px;padding:14px 16px">${nl2br(draft)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:${cream};border-top:1px solid ${line};padding:14px 24px;color:${gray};font:12px Arial,Helvetica,sans-serif">
          Coritas Strategies &middot; automated lead intake. Replying to this email reaches <a href="mailto:${esc(lead.email)}" style="color:${rust};text-decoration:none">${esc(lead.email)}</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
