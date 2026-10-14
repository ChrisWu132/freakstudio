/* Records one site event (page view, CTA click, form step) in D1 so we can see which pages and channels
   bring enquiries (spec §17.3, task 2.2.7.5). No cookies and no IP stored: a random per-tab session id,
   the country Cloudflare already resolved, and the traffic source js/main.js keeps for the visit.
   Read it with scripts/analytics.mjs. */
const EVENTS = new Set([
  "page_view", "review_project_click", "whatsapp_click", "email_click", "calendar_click",
  "stage_card_click", "service_card_click", "case_view", "cost_example_view", "faq_open",
  "project_form_start", "project_form_submit", "project_form_error", "file_upload_success", "file_upload_fail",
  "brief_step_complete", "brief_submit", "estimate_complete"
]);
const FIELDS = ["path", "sid", "landing_page", "referrer", "utm_source", "utm_medium", "utm_campaign",
  "first_source", "device", "detail"];

function fromOurPage(request) {
  const self = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return origin === self;
  return (request.headers.get("Referer") || "").startsWith(self + "/");
}

export async function onRequestPost({ request, env }) {
  if (!fromOurPage(request)) return new Response(null, { status: 403 });
  if (Number(request.headers.get("Content-Length")) > 4096) return new Response(null, { status: 413 });
  const body = JSON.parse(await request.text());
  if (!EVENTS.has(body.event)) return new Response(null, { status: 400 });
  const row = FIELDS.map((k) => String(body[k] ?? "").slice(0, 300));
  const country = request.headers.get("CF-IPCountry") || "";
  await env.EVENTS.prepare(
    "INSERT INTO events (ts, event, path, sid, landing_page, referrer, utm_source, utm_medium, utm_campaign, " +
    "first_source, device, detail, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(new Date().toISOString(), body.event, ...row, country).run();
  return new Response(null, { status: 204 });
}
