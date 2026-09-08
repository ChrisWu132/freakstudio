# anvol — landing page

Marketing site for anvol, a contract-manufacturing partner with entities in the US and China. Static site: no build step, no framework — HTML + CSS + GSAP.

## Run locally

Any static server works:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Stack

- `index.html` — single landing page, semantic HTML
- `css/style.css` — custom properties, responsive at 1024px / 768px breakpoints
- `js/main.js` — nav shadow, mobile menu, FAQ accordion, contact form AJAX; GSAP 3 + ScrollTrigger (CDN) only for light scroll reveals. Native scroll, no pinned sections (2026-09-08)
- `assets/img/` — real photos only: `case-*.jpg` our own products, `f-*.jpg` our benches and partner lines in Shenzhen, `anvol-mark.svg` the logo (source in `../brand/`). The AI-generated images were removed 2026-09-08; `IMAGE-PROMPTS.md` is history
- `original-export/` — untouched Figma Make export this page was rebuilt from

## Email collection (contact form)

The form posts to [FormSubmit](https://formsubmit.co) — no account, no backend, free:

- Endpoint is set in `js/main.js` (`FORM_ENDPOINT`) and uses the activated random alias, so the destination inbox is not exposed in this public repo.
- To change the destination address later, point `FORM_ENDPOINT` at the new address, submit once, click the activation link FormSubmit emails you, then swap in the new alias it gives you.
- Spam protection: honeypot field `_honey` is already wired.

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
