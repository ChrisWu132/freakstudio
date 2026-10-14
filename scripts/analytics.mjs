// Which channels and pages bring enquiries (task 2.2.7.5): visits, CTA clicks and form submits from D1.
// Usage: node scripts/analytics.mjs [days=30]
import { execFileSync } from "node:child_process";

const days = Number(process.argv[2] || 30);
const since = `datetime('now', '-${days} days')`;
const QUERIES = {
  "Visits by channel (sessions, first page of the visit)": `
    SELECT CASE WHEN utm_source != 'none' THEN utm_source ELSE referrer END AS channel,
           COUNT(DISTINCT sid) AS sessions,
           COUNT(DISTINCT CASE WHEN event = 'project_form_submit' THEN sid END) AS enquiries
    FROM events WHERE ts >= ${since} GROUP BY channel ORDER BY sessions DESC LIMIT 25`,
  "Funnel": `
    SELECT event, COUNT(*) AS n, COUNT(DISTINCT sid) AS sessions FROM events
    WHERE ts >= ${since} AND event != 'page_view' GROUP BY event ORDER BY n DESC`,
  "Landing pages that led to an enquiry or WhatsApp click": `
    SELECT landing_page, COUNT(DISTINCT sid) AS sessions,
           COUNT(DISTINCT CASE WHEN event IN ('project_form_submit','brief_submit') THEN sid END) AS enquiries,
           COUNT(DISTINCT CASE WHEN event = 'whatsapp_click' THEN sid END) AS whatsapp
    FROM events WHERE ts >= ${since} GROUP BY landing_page ORDER BY enquiries DESC, whatsapp DESC, sessions DESC LIMIT 25`,
  "Most viewed pages": `
    SELECT path, COUNT(*) AS views FROM events WHERE ts >= ${since} AND event = 'page_view'
    GROUP BY path ORDER BY views DESC LIMIT 20`,
  "Countries and devices": `
    SELECT country, device, COUNT(DISTINCT sid) AS sessions FROM events WHERE ts >= ${since}
    GROUP BY country, device ORDER BY sessions DESC LIMIT 15`
};

// A user-level token would override the wrangler login (see memory blockless-deploy-cloudflare-token-trap).
const env = { ...process.env };
delete env.CLOUDFLARE_API_TOKEN;
delete env.CLOUDFLARE_ACCOUNT_ID;
for (const [title, sql] of Object.entries(QUERIES)) {
  console.log(`\n## ${title} (last ${days} days)`);
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "anvol-site-events", "--remote", "--json",
    "--command", sql.replace(/\s+/g, " ").trim()], { env, encoding: "utf8", shell: true });
  console.table(JSON.parse(out)[0].results);
}
