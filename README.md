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
- `js/main.js` — GSAP 3 + ScrollTrigger (CDN): hero line reveal, scroll reveals, stat count-ups, process line scrub-draw, parallax, testimonial wipe; FAQ accordion; contact form AJAX
- `assets/img/` — 6 AI-generated images (regenerate with the prompts in `IMAGE-PROMPTS.md`)
- `original-export/` — untouched Figma Make export this page was rebuilt from

## Email collection (contact form)

The form posts to [FormSubmit](https://formsubmit.co) — no account, no backend, free:

- Endpoint is set in `js/main.js` (`FORM_ENDPOINT`) and uses the activated random alias, so the destination inbox is not exposed in this public repo.
- To change the destination address later, point `FORM_ENDPOINT` at the new address, submit once, click the activation link FormSubmit emails you, then swap in the new alias it gives you.
- Spam protection: honeypot field `_honey` is already wired.

## Before launch checklist

- [x] Activate FormSubmit (done — alias endpoint in place)
- [ ] `hello@anvol.dev` is used across the page — set up Cloudflare Email Routing so it actually receives mail
- [ ] Replace placeholder stats (120+ factories / 300+ projects / 22% / 15 countries) with real numbers
- [ ] Replace the testimonial (name, quote, avatar) with a real client — the current avatar is AI-generated
- [ ] Case-study copy is illustrative — replace with real projects
- [ ] Add real Privacy / Terms pages (footer links currently point at #faq)
