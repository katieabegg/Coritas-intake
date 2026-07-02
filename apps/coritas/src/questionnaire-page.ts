// Questionnaire page served at GET /q/<slug>?lead=<id>&t=<token>. Same brand
// system as form.ts (navy/cream/gold/rust, Cormorant Garamond + Montserrat,
// phoenix watermark). Access is gated by the per-lead token, verified again on
// POST — the page itself embeds no secrets beyond what arrived in the URL.
import { LOGO_DATA_URI } from "./logo.js";
import { escapeHtml } from "./email-template.js";
import type { Question, Questionnaire } from "./config/questionnaires.js";

function renderQuestion(q: Question): string {
  const esc = escapeHtml;
  const req = q.required ? " *" : "";
  const requiredAttr = q.required ? " required" : "";
  const label = `<label for="${esc(q.id)}">${esc(q.label)}${req}</label>`;

  switch (q.type) {
    case "textarea":
      return `${label}<textarea id="${esc(q.id)}" name="${esc(q.id)}"${requiredAttr} placeholder="${esc(q.placeholder ?? "")}"></textarea>`;
    case "select":
      return `${label}<select id="${esc(q.id)}" name="${esc(q.id)}"${requiredAttr}>
        <option value="">— Select —</option>
        ${(q.options ?? []).map((o) => `<option>${esc(o)}</option>`).join("")}
      </select>`;
    case "radio":
      return `<label>${esc(q.label)}${req}</label>
      <div class="choice">
        ${(q.options ?? [])
          .map(
            (o) =>
              `<label><input type="radio" name="${esc(q.id)}" value="${esc(o)}"${requiredAttr} /> ${esc(o)}</label>`,
          )
          .join("")}
      </div>`;
    default:
      return `${label}<input id="${esc(q.id)}" name="${esc(q.id)}"${requiredAttr} placeholder="${esc(q.placeholder ?? "")}" />`;
  }
}

export function renderQuestionnairePage(
  questionnaire: Questionnaire,
  leadId: number,
  token: string,
  alreadyCompleted: boolean,
): string {
  const esc = escapeHtml;
  const body = alreadyCompleted
    ? `<h1>Already received — thank you.</h1>
       <p class="sub">You've completed this questionnaire, and your answers are with Kate. Watch your inbox for the next step; if anything changed, just reply to her email.</p>`
    : `<h1>${esc(questionnaire.title)}</h1>
      <p class="sub">${esc(questionnaire.intro)} <span class="note">Fields marked * are required.</span></p>
      <form id="questionnaire">
        ${questionnaire.questions.map(renderQuestion).join("\n")}
        <button type="submit" id="submit">Send my answers</button>
        <div id="status"></div>
      </form>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${esc(questionnaire.title)} — Coritas Strategies</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root {
    --navy:#2C3B62; --cream:#F5F0E8; --gold:#C9A84C; --rust:#823927;
    --gray:#737373; --line:#e3ddd0; --logo:url("${LOGO_DATA_URI}");
  }
  * { box-sizing:border-box; }
  body { font:16px/1.6 'Montserrat',system-ui,sans-serif; color:var(--navy);
    margin:0; background:var(--cream); }
  main { max-width:660px; margin:2.5rem auto; padding:0 1.25rem 4rem; }
  .card { position:relative; overflow:hidden; background:transparent; }
  .card::before { content:""; position:absolute; inset:0;
    background:var(--logo) center 38% / 62% no-repeat; opacity:.045;
    pointer-events:none; z-index:0; }
  header, form, h1, p.sub { position:relative; z-index:1; }
  header { text-align:center; padding:2.25rem 1.5rem 1.5rem;
    border-bottom:1px solid var(--line); margin-bottom:1.5rem; }
  .brandmark { width:74px; height:74px; margin:0 auto .75rem;
    background:var(--logo) center/contain no-repeat; }
  .wordmark { font-family:'Cormorant Garamond',serif; font-weight:600;
    font-size:1.7rem; letter-spacing:.18em; color:var(--navy); margin:0;
    text-transform:uppercase; }
  .tagline { font-style:italic; color:var(--gray); margin:.35rem 0 0; font-size:1rem; }
  h1 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.7rem;
    margin:0 0 .25rem; color:var(--navy); }
  p.sub { color:var(--gray); margin:0 0 1.75rem; }
  label { display:block; font-weight:600; margin:1.15rem 0 .35rem; font-size:.86rem;
    letter-spacing:.01em; color:var(--navy); }
  input, select, textarea { width:100%; padding:.7rem .75rem; border:1px solid var(--line);
    border-radius:8px; font:inherit; color:var(--navy); background:#fff;
    transition:border-color .15s,box-shadow .15s; }
  input:focus, select:focus, textarea:focus { outline:none; border-color:var(--gold);
    box-shadow:0 0 0 3px rgba(201,168,76,.22); }
  textarea { min-height:110px; resize:vertical; }
  .choice { display:flex; flex-direction:column; gap:.55rem; margin-top:.35rem; }
  .choice label { display:flex; align-items:center; gap:.45rem; margin:0;
    font-weight:400; font-size:.92rem; color:var(--navy); cursor:pointer; }
  .choice input { width:auto; }
  .note { font-size:.78rem; color:var(--gray); font-weight:400; }
  button { margin-top:1.6rem; background:var(--navy); color:var(--cream); border:0;
    border-radius:8px; padding:.85rem 1.6rem; font:inherit; font-weight:600;
    letter-spacing:.02em; cursor:pointer; transition:background .15s,transform .05s; }
  button:hover:not(:disabled) { background:#22304f; }
  button:disabled { opacity:.6; cursor:not-allowed; }
  #status { margin-top:1rem; font-weight:600; }
  .ok { color:#1a7f37; } .err { color:var(--rust); }
</style>
</head>
<body>
<main>
  <div class="card">
    <header>
      <div class="brandmark" role="img" aria-label="Coritas Strategies phoenix mark"></div>
      <p class="wordmark">Coritas Strategies</p>
      <p class="tagline">Where resilience becomes direction.</p>
    </header>
    ${body}
  </div>
</main>
${
  alreadyCompleted
    ? ""
    : `<script>
  const form = document.getElementById('questionnaire');
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('submit');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = ''; statusEl.className = '';
    btn.disabled = true;
    const answers = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch('/api/questionnaire', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead: ${leadId},
          slug: ${JSON.stringify(questionnaire.slug)},
          t: ${JSON.stringify(token)},
          answers,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        form.innerHTML = '<p class="ok" style="font-weight:600">Thank you — your answers are with Kate. Check your inbox for the next step.</p>';
      } else {
        statusEl.textContent = (json.errors || ['Something went wrong.']).join(' ');
        statusEl.className = 'err'; btn.disabled = false;
      }
    } catch {
      statusEl.textContent = 'Network error — please try again.';
      statusEl.className = 'err'; btn.disabled = false;
    }
  });
</script>`
}
</body>
</html>`;
}
