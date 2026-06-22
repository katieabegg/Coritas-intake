// Self-contained intake form served at GET /. The Turnstile site key is public,
// so it is injected at request time from the TURNSTILE_SITE_KEY var. Styled to the
// Coritas brand system (navy/cream/gold/rust, Cormorant Garamond + Montserrat),
// with the phoenix mark in the header and as a faint watermark behind the form.
import { LOGO_DATA_URI } from "./logo.js";

// `probono` is true only when the visitor arrived via the Giving Back page
// (?path=probono). The pro-bono service option is rendered solely in that case,
// so it is absent from the page source for every other visitor.
export function renderForm(turnstileSiteKey: string, probono = false): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Work with Coritas Strategies</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
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
  /* No floating panel — content sits directly on the page cream, like the
     coritasstrategies.com pages. (Form inputs keep their own white fill.) */
  .card { position:relative; overflow:hidden; background:transparent; }
  /* faint phoenix watermark behind the fields */
  .card::before { content:""; position:absolute; inset:0;
    background:var(--logo) center 38% / 62% no-repeat; opacity:.045;
    pointer-events:none; z-index:0; }
  header, form { position:relative; z-index:1; }
  header { text-align:center; padding:2.25rem 1.5rem 1.5rem;
    border-bottom:1px solid var(--line); }
  .brandmark { width:74px; height:74px; margin:0 auto .75rem;
    background:var(--logo) center/contain no-repeat; }
  .wordmark { font-family:'Cormorant Garamond',serif; font-weight:600;
    font-size:1.7rem; letter-spacing:.18em; color:var(--navy); margin:0;
    text-transform:uppercase; }
  .tagline { font-style:italic; color:var(--gray); margin:.35rem 0 0; font-size:1rem; }
  .pillars { margin:.9rem 0 0; font-size:.66rem; letter-spacing:.32em; font-weight:600;
    text-transform:uppercase; color:var(--gold); }
  .pillars span { color:var(--line); margin:0 .35rem; }
  form { padding:1.75rem 1.75rem 2.25rem; }
  h1 { font-family:'Cormorant Garamond',serif; font-weight:600; font-size:1.7rem;
    margin:0 0 .25rem; color:var(--navy); }
  p.sub { color:var(--gray); margin:0 0 1.75rem; }
  label { display:block; font-weight:600; margin:1rem 0 .35rem; font-size:.86rem;
    letter-spacing:.01em; color:var(--navy); }
  input, select, textarea { width:100%; padding:.7rem .75rem; border:1px solid var(--line);
    border-radius:8px; font:inherit; color:var(--navy); background:#fff; transition:border-color .15s,box-shadow .15s; }
  input:focus, select:focus, textarea:focus { outline:none; border-color:var(--gold);
    box-shadow:0 0 0 3px rgba(201,168,76,.22); }
  textarea { min-height:120px; resize:vertical; }
  .row { display:flex; gap:1rem; } .row > div { flex:1; }
  @media (max-width:520px){ .row { flex-direction:column; gap:0; } }
  .consent { display:flex; gap:.55rem; align-items:flex-start; margin-top:1.25rem;
    font-weight:400; font-size:.9rem; color:var(--gray); }
  .consent input { width:auto; margin-top:.25rem; }
  button { margin-top:1.6rem; background:var(--navy); color:var(--cream); border:0;
    border-radius:8px; padding:.85rem 1.6rem; font:inherit; font-weight:600;
    letter-spacing:.02em; cursor:pointer; transition:background .15s,transform .05s; }
  button:hover:not(:disabled) { background:#22304f; }
  button:active:not(:disabled) { transform:translateY(1px); }
  button:disabled { opacity:.6; cursor:not-allowed; }
  .note { font-size:.78rem; color:var(--gray); margin-top:.3rem; font-weight:400; }
  #status { margin-top:1rem; font-weight:600; }
  .ok { color:#1a7f37; } .err { color:var(--rust); }
  /* Pro bono ("Giving Back") path: intro banner + conditional fields, hidden
     until the Pro bono option is chosen or the ?path=probono deep link loads. */
  .intro { display:none; margin:0 0 1.5rem; padding:.95rem 1.1rem;
    background:rgba(44,59,98,.05); border:1px solid var(--line);
    border-left:3px solid var(--gold); border-radius:8px;
    font-size:.92rem; color:var(--navy); }
  .intro strong { font-weight:600; }
  #probono-fields { display:none; }
  .choice { display:flex; flex-wrap:wrap; gap:1.25rem; margin-top:.35rem; }
  .choice label { display:flex; align-items:center; gap:.45rem; margin:0;
    font-weight:400; font-size:.92rem; color:var(--navy); cursor:pointer; }
  .choice input { width:auto; }
  .decide-note { display:none; }
</style>
</head>
<body>
<main>
  <div class="card">
    <header>
      <div class="brandmark" role="img" aria-label="Coritas Strategies phoenix mark"></div>
      <p class="wordmark">Coritas Strategies</p>
      <p class="tagline">Where resilience becomes direction.</p>
      <p class="pillars">Vision<span>&bull;</span>Leadership<span>&bull;</span>Innovation</p>
    </header>
    <form id="intake">
      <h1>Rise Together</h1>
      <p class="sub">Tell us where you are and where you want to go — Kate reads every inquiry personally and replies herself.
        <span class="note">Fields marked * are required.</span></p>
      <div id="probono-intro" class="intro">
        <strong>You're applying for pro bono support.</strong> We take on a select few
        each year, and we read every request. Tell us about your organization below.
      </div>
      <input type="hidden" id="source" name="source" value="" />
      <div class="row">
        <div><label for="name">Name *</label><input id="name" name="name" required /></div>
        <div><label for="email">Email *</label><input id="email" name="email" type="email" required /></div>
      </div>
      <div class="row">
        <div><label for="organization">Organization</label><input id="organization" name="organization" /></div>
        <div><label for="role">Role / title</label><input id="role" name="role" /></div>
      </div>
      <label for="service_area">Service area</label>
      <select id="service_area" name="service_area">
        <option value="">— Select —</option>
        <option>Strategic Leadership Advisory</option>
        <option>Executive Education</option>
        <option>Website Development &amp; Business Process Automation</option>
        <option>Political / Policy Project</option>
        <option>Grant Readiness &amp; Grant Writing</option>
        <option>Social Media Strategy &amp; Management</option>
        <option>Homeowner Preparedness / Disaster Mitigation Audit</option>
        <option>Healthcare Cyber Resilience Audit</option>
        <option>Affordable Housing Feasibility &amp; Policy Report</option>
        <option>Emergency Management &amp; Disaster Recovery (FEMA)</option>
        ${probono ? `<option value="Pro bono support">Pro bono support (nonprofits &amp; early-stage small businesses)</option>` : ``}
        <option value="Not sure / Other — help me decide">Not sure / Other — help me decide</option>
      </select>
      <p id="decide-note" class="note decide-note">No problem — describe your situation below and Kate will point you to the right fit.</p>
      <div id="probono-fields">
        <label>Are you a nonprofit or a small business? *</label>
        <div class="choice">
          <label><input type="radio" name="org_type" value="nonprofit" /> Nonprofit</label>
          <label><input type="radio" name="org_type" value="small_business" /> Early-stage small business</label>
        </div>
        <label for="mission">Your mission — what do you do? *</label>
        <textarea id="mission" name="mission" placeholder="Tell us about your organization and the people you serve."></textarea>
      </div>
      <label for="need">What do you need help with? *</label>
      <textarea id="need" name="need" required placeholder="Briefly describe your situation, goals, and any deadlines."></textarea>
      <label for="timeline">Timeline</label>
      <select id="timeline" name="timeline">
        <option value="">— Select —</option>
        <option>Urgent (&lt; 2 weeks)</option>
        <option>This quarter</option>
        <option>Next quarter</option>
        <option>Exploratory / no date</option>
      </select>
      <div class="row">
        <div><label for="how_heard">How did you hear about us?</label><input id="how_heard" name="how_heard" /></div>
        <div><label for="location">Location (optional)</label><input id="location" name="location" /></div>
      </div>
      <label class="consent">
        <input type="checkbox" id="consent" name="consent" required />
        <span>I consent to Coritas Strategies contacting me about my inquiry. *</span>
      </label>
      <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" style="margin-top:1.25rem"></div>
      <button type="submit" id="submit">Send inquiry</button>
      <div id="status"></div>
    </form>
  </div>
</main>
<script>
  const form = document.getElementById('intake');
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('submit');

  // --- Pro bono ("Giving Back") path ---------------------------------------
  const serviceSel = document.getElementById('service_area');
  const probonoIntro = document.getElementById('probono-intro');
  const probonoFields = document.getElementById('probono-fields');
  const decideNote = document.getElementById('decide-note');
  const sourceInput = document.getElementById('source');
  const missionEl = document.getElementById('mission');
  const orgTypeInputs = form.querySelectorAll('input[name="org_type"]');
  // Did the visitor arrive via the Giving Back CTA (?path=probono)? If so the
  // submission stays tagged giving-back regardless of later edits.
  const fromGivingBack = new URLSearchParams(location.search).get('path') === 'probono';

  function syncInquiry() {
    const isProbono = serviceSel.value === 'Pro bono support';
    probonoIntro.style.display = isProbono ? 'block' : 'none';
    probonoFields.style.display = isProbono ? 'block' : 'none';
    decideNote.style.display =
      serviceSel.value === 'Not sure / Other — help me decide' ? 'block' : 'none';
    // Only require the pro-bono fields when that path is active.
    missionEl.required = isProbono;
    orgTypeInputs.forEach((r) => { r.required = isProbono; });
    sourceInput.value = (isProbono || fromGivingBack) ? 'giving-back' : '';
  }
  serviceSel.addEventListener('change', syncInquiry);

  if (fromGivingBack) serviceSel.value = 'Pro bono support';
  syncInquiry();
  // -------------------------------------------------------------------------

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = ''; statusEl.className = '';
    btn.disabled = true;
    const data = Object.fromEntries(new FormData(form).entries());
    data.consent = form.consent.checked;
    const token = form.querySelector('[name="cf-turnstile-response"]');
    data['cf-turnstile-response'] = token ? token.value : '';
    try {
      const res = await fetch('/api/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok) {
        statusEl.textContent = 'Thanks — your inquiry is in. Kate will be in touch shortly.';
        statusEl.className = 'ok'; form.reset();
        if (window.turnstile) window.turnstile.reset();
      } else {
        statusEl.textContent = (json.errors || ['Something went wrong.']).join(' ');
        statusEl.className = 'err'; btn.disabled = false;
        if (window.turnstile) window.turnstile.reset();
      }
    } catch (err) {
      statusEl.textContent = 'Network error — please try again.';
      statusEl.className = 'err'; btn.disabled = false;
    }
  });
</script>
</body>
</html>`;
}
