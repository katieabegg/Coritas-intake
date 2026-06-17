// Self-contained intake form served at GET /. The Turnstile site key is public,
// so it is injected at request time from the TURNSTILE_SITE_KEY var.
export function renderForm(turnstileSiteKey: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Work with Coritas Strategies</title>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>
  :root { --ink:#11233a; --accent:#1f6feb; --line:#d7dee8; }
  * { box-sizing:border-box; }
  body { font:16px/1.5 system-ui,sans-serif; color:var(--ink); margin:0; background:#f6f8fb; }
  main { max-width:640px; margin:0 auto; padding:2.5rem 1.25rem 4rem; }
  h1 { font-size:1.6rem; margin:0 0 .25rem; }
  p.sub { color:#5b6b80; margin:0 0 2rem; }
  label { display:block; font-weight:600; margin:1rem 0 .35rem; font-size:.93rem; }
  input, select, textarea { width:100%; padding:.65rem .7rem; border:1px solid var(--line);
    border-radius:8px; font:inherit; background:#fff; }
  textarea { min-height:120px; resize:vertical; }
  .row { display:flex; gap:1rem; } .row > div { flex:1; }
  .consent { display:flex; gap:.5rem; align-items:flex-start; margin-top:1.25rem; font-weight:400; }
  .consent input { width:auto; margin-top:.2rem; }
  button { margin-top:1.5rem; background:var(--accent); color:#fff; border:0; border-radius:8px;
    padding:.8rem 1.4rem; font:inherit; font-weight:600; cursor:pointer; }
  button:disabled { opacity:.6; cursor:not-allowed; }
  .note { font-size:.8rem; color:#5b6b80; margin-top:.3rem; font-weight:400; }
  #status { margin-top:1rem; font-weight:600; }
  .ok { color:#1a7f37; } .err { color:#b3261e; }
</style>
</head>
<body>
<main>
  <h1>Work with Coritas Strategies</h1>
  <p class="sub">Tell us what you need. Kate reviews every inquiry personally.</p>
  <form id="intake">
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
      <option>Resilience &amp; Emergency Management (FEMA / disaster)</option>
      <option>Healthcare cyber resilience</option>
      <option>Township grant readiness / grant writing</option>
      <option>Community advocacy</option>
      <option>Homeowner mitigation audit</option>
      <option>Strategic leadership advisory</option>
      <option>Political / policy project work</option>
      <option>Executive education</option>
      <option>Social media strategy</option>
      <option>Not sure / other</option>
    </select>
    <label for="need">What do you need help with? *</label>
    <textarea id="need" name="need" required placeholder="Briefly describe your situation, goals, and any deadlines."></textarea>
    <div class="row">
      <div>
        <label for="timeline">Timeline</label>
        <select id="timeline" name="timeline">
          <option value="">— Select —</option>
          <option>Urgent (&lt; 2 weeks)</option>
          <option>This quarter</option>
          <option>Next quarter</option>
          <option>Exploratory / no date</option>
        </select>
      </div>
      <div>
        <label for="budget_band">Budget band (optional)</label>
        <select id="budget_band" name="budget_band">
          <option value="">— Prefer not to say —</option>
          <option>Under $5K</option>
          <option>$5K–$25K</option>
          <option>$25K–$75K</option>
          <option>$75K+</option>
        </select>
      </div>
    </div>
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
</main>
<script>
  const form = document.getElementById('intake');
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('submit');
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
