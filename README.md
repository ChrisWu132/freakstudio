# anvol — landing page

Marketing site for Anvol, a US company that turns working prototypes into repeatable small-batch production in Shenzhen. Static site: no build step, no framework, just HTML and CSS.

## Run locally

Any static server works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Stack

- `index.html` — single landing page, semantic HTML. Rebuilt 2026-10-08: quote form in the hero, then sponsors line, builds with real prices, capabilities, process, Shenzhen photos, founder, FAQ, closing CTA. Sections follow what PCBWay / Fictiv / Xometry / MacroFab / china-pcba all have; client testimonials are left out because we have no nameable clients yet
- `css/style.css` — the Anvol visual system shared with block-less.com (`blockless-app` `landing.css`: bone/ink/rust, Instrument Serif + Instrument Sans). Responsive at 960px / 640px. No scroll animations
- `js/main.js` — nav shadow, mobile menu, FAQ accordion, contact form AJAX. GSAP is no longer loaded, so the reveal block at the end is a no-op
- `assets/img/` — `*-t4-flatlay.jpg` are our real products cut out onto a generated wood-table backdrop (same images as block-less.com, recipe in `research/anvol-repositioning-2026-09-22/design/retouch3.mjs`); `f-*.jpg` our benches and partner lines in Shenzhen, unedited; `anvol-mark.svg` is the Anvol character (shape A, 2026-09-22), a static copy of the design source. The older `case-*.jpg` stay for links that may point at them; `IMAGE-PROMPTS.md` is history
- `original-export/` — untouched Figma Make export this page was rebuilt from

## Deploying

`npx wrangler pages deploy . --project-name=freakstudio --commit-dirty=true` from this directory. Pages serves css/js with a
4-hour browser cache, so **bump the `?v=` on the two asset links in `index.html` every time `style.css` or `main.js`
changes** — otherwise returning visitors get the new HTML with the old stylesheet (seen 2026-09-08: black circle step
numbers and unstyled photo grid). Then open anvol.dev and check it, not the preview URL.

Domain (2026-10-08): the canonical domain is **anvol.dev** again (Chris, 2026-10-08). anvolsupply.com (+ www) serves the same Pages project. The 10-05 plan to move anvol.dev to blockless-app was dropped.

## Email collection (contact form)

The form posts to [FormSubmit](https://formsubmit.co) — no account, no backend, free:

- Endpoint is set in `js/main.js` (`FORM_ENDPOINT`): `chris@anvol.dev`, activated 2026-09-27, with `_cc` to Zisheng's Anvol box `zisheng@getanvol.com` (was his personal Gmail until 2026-09-29). The old random alias delivered only to Chris's personal Gmail, which no pipeline reads; three enquiries sat there unanswered for up to ten days.
- To change the destination address later, point `FORM_ENDPOINT` at the new address, submit once, click the activation link FormSubmit emails you, then swap in the new alias it gives you.
- Spam protection: honeypot field `_honey` is already wired.
- Attachments (2026-09-28): FormSubmit's AJAX endpoint carries no files, so `js/main.js` first posts each file to `functions/api/upload.js`, which stores it in the R2 bucket `anvol-quote-attachments` (binding in `wrangler.toml`), and the email's `attachments` field carries the `anvol.dev/files/...` links. Downloads are always served as `application/octet-stream` attachments so an uploaded HTML file never runs on anvol.dev. Limits: 5 files, 20 MB each, enforced in both places. Anyone holding a link can download it; the key contains a random UUID. `compatibility_date` is capped by the local wrangler's workerd, so raise it only after updating wrangler.

## Before launch checklist

- [x] Activate FormSubmit (done — alias endpoint in place)
- [x] Contact address on the page must be a mailbox that exists. There is no `hello@` on this domain —
      only `chris@anvol.dev` — so both links point there now (2026-08-05). Cloudflare Email Routing is
      NOT an option here: the MX already points at Google Workspace and redirecting it would take the
      real mailbox down. To get `hello@` back, add it as an alias on chris@ in the Workspace admin.
- [x] Placeholder stats, AI testimonial, illustrative case studies and unverified certification badges were all
      removed on 2026-09-08 rather than replaced. Rule since then: the page only says what a document we hold
      supports (same rule as the cold-email bodies, see `../../outreach/data/regen/evidence-sheet.md`). The
      copy was written by Opus 4.6 from a brief; the brief's fact list is the only source of claims.

## Sales Desk and form verification

`/sales-desk/` redirects to https://anvolworks.com/. The active bilingual outreach page lives in `../salesdesk-site/` (HammerMail repository), deployed to the separate `anvol-sales-desk` Pages project. Do not maintain an older copy in this site.

Run `node --test test/contact-form.test.cjs`. A rejected JSON response must preserve the visitor's input and show the fallback email address. Native email validation runs before any network request. Local desktop/mobile rendering, language switching and FAQ expansion were checked without submitting a real inquiry.
