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

- Endpoint is set in `js/main.js` (`FORM_ENDPOINT`), currently `https://formsubmit.co/ajax/chriswhp04@gmail.com`.
- **Activation:** the first submission triggers a confirmation email to that address — click the link once and every later submission is delivered to the inbox.
- **Recommended after activation:** FormSubmit's confirmation email gives you a random alias endpoint (`https://formsubmit.co/ajax/<random-string>`). Swap it into `FORM_ENDPOINT` so your raw email address is not exposed in the public repo.
- To change the destination address later, just edit `FORM_ENDPOINT`.
- Spam protection: honeypot field `_honey` is already wired.

## Before launch checklist

- [ ] Activate FormSubmit (submit the form once, click the confirmation link, then switch to the alias endpoint)
- [ ] `hello@anvol.dev` is used across the page — set up this mailbox or replace it
- [ ] Replace placeholder stats (120+ factories / 300+ projects / 22% / 15 countries) with real numbers
- [ ] Replace the testimonial (name, quote, avatar) with a real client — the current avatar is AI-generated
- [ ] Case-study copy is illustrative — replace with real projects
- [ ] Add real Privacy / Terms pages (footer links currently point at #faq)
