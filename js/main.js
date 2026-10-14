/* anvol — nav, mobile menu, FAQ accordion, contact form, light scroll reveals (native scroll) */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined";

  /* ---------- nav shadow ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function () {
      nav.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".acc-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".acc-btn").forEach(function (b) {
        b.setAttribute("aria-expanded", "false");
      });
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
  });

  /* ---------- stage cards preselect the form's stage ---------- */
  document.querySelectorAll("[data-stage]").forEach(function (card) {
    card.addEventListener("click", function () {
      var select = document.getElementById("stage");
      if (select) select.value = card.getAttribute("data-stage");
    });
  });

  /* ---------- traffic source: kept from the first page of the visit, sent with every form ---------- */
  var SOURCE_KEY = "anvol-source";
  var source = null;
  try { source = JSON.parse(window.sessionStorage.getItem(SOURCE_KEY)); }
  catch (err) { source = null; }
  if (!source) {
    var params = new URLSearchParams(window.location.search);
    source = { landing_page: window.location.pathname, referrer: document.referrer || "direct" };
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(function (k) {
      source[k] = params.get(k) || "none";
    });
    try { window.sessionStorage.setItem(SOURCE_KEY, JSON.stringify(source)); }
    catch (err) { source.source_note = "storage blocked, source is from this page only"; }
  }

  /* ---------- conversion events → /api/event (D1), read with scripts/analytics.mjs ---------- */
  /* First touch survives across visits so a later enquiry can be tied to the channel that first brought them. */
  var FIRST_KEY = "anvol-first-source";
  var firstSource = null;
  try {
    firstSource = window.localStorage.getItem(FIRST_KEY);
    if (!firstSource) {
      firstSource = (source.utm_source !== "none" ? source.utm_source : source.referrer) + " → " + source.landing_page;
      window.localStorage.setItem(FIRST_KEY, firstSource);
    }
  } catch (err) { firstSource = "storage blocked"; }
  var SID_KEY = "anvol-sid";
  var sid = null;
  try {
    sid = window.sessionStorage.getItem(SID_KEY);
    if (!sid) { sid = Math.random().toString(36).slice(2, 12); window.sessionStorage.setItem(SID_KEY, sid); }
  } catch (err) { sid = "no-storage"; }
  var device = window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
  function track(event, detail) {
    var body = JSON.stringify({
      event: event, path: window.location.pathname, sid: sid, landing_page: source.landing_page,
      referrer: source.referrer, utm_source: source.utm_source, utm_medium: source.utm_medium,
      utm_campaign: source.utm_campaign, first_source: firstSource, device: device, detail: detail || ""
    });
    navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
  }
  window.anvolTrack = track;
  track("page_view");
  var caseMatch = window.location.pathname.match(/^\/cases\/([^/]+)\/$/);
  if (caseMatch) track("case_view", caseMatch[1]);
  /* One delegated listener names every CTA by where its link goes, so new pages are tracked without markup. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a, .acc-btn");
    if (!a) return;
    if (a.classList.contains("acc-btn")) { track("faq_open", a.textContent.trim().slice(0, 80)); return; }
    var href = a.getAttribute("href") || "";
    var where = (a.closest("[data-place]") || a.closest("section, header, footer") || {}).id || a.className || "";
    if (/wa\.me/.test(href)) track("whatsapp_click", href.replace(/^.*wa\.me\//, "") + " @ " + where);
    else if (/^mailto:/.test(href)) track("email_click", where);
    else if (/calendly|cal\.com|calendar/.test(href)) track("calendar_click", where);
    else if (/#quote$|\/brief\/?$/.test(href)) track("review_project_click", href + " @ " + where);
    else if (a.hasAttribute("data-stage")) track("stage_card_click", a.getAttribute("data-stage"));
    else if (/^\/services\/[^/]+\/$/.test(href)) track("service_card_click", href);
  });

  /* ---------- phone: Review my project + WhatsApp always in reach (spec §5.1, §15.3) ---------- */
  /* Not on /brief/: the visitor is already filling in the long form there. */
  if (window.location.pathname !== "/brief/") {
    var bar = document.createElement("div");
    bar.className = "mobile-cta";
    bar.setAttribute("data-place", "mobile-bar");
    bar.innerHTML = '<a class="btn" href="/#quote">Review my project</a>' +
      '<a class="btn btn-ghost" href="https://wa.me/13237193730" target="_blank" rel="noopener">WhatsApp</a>';
    document.body.appendChild(bar);
    document.body.classList.add("has-mobile-cta");
  }

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  /* chris@anvol.dev is the business inbox the reply pipeline reads (activated 2026-09-27). */
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/chris@anvol.dev";
  /* Zisheng's Anvol box gets a copy as the alert; enquiries once sat unread for days (2026-09-27, moved off his Gmail 09-29). */
  var FORM_CC = "zisheng@getanvol.com";
  var MAX_FILES = 5;
  var MAX_FILE_BYTES = 20 * 1024 * 1024;
  var form = document.getElementById("quote-form");
  /* A half-dead connection never settles the fetch, and the enquiry sat in "Uploading files…" for good.
     Past the limit the upload is aborted: the file is listed as failed and the enquiry still goes. */
  var UPLOAD_TIMEOUT_MS = 120000;
  function uploadFile(file) {
    var data = new FormData();
    data.append("file", file);
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, UPLOAD_TIMEOUT_MS);
    return fetch("/api/upload", { method: "POST", body: data, signal: controller.signal })
      .then(function (r) { if (!r.ok) throw new Error("Upload failed: " + r.status); return r.json(); })
      .then(function (result) { return result.url; })
      .finally(function () { clearTimeout(timer); });
  }
  function withSource(payload) {
    Object.keys(source).forEach(function (k) { payload[k] = source[k]; });
    return payload;
  }
  /* Gmail threads mails with the same subject and sender, so a fixed subject piled every enquiry into
     one conversation (2026-10-14). Sender + UTC minute keeps each submission its own thread. */
  function subjectFor(base, email) {
    return base + " · " + email + " · " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }
  /* js/brief.js (the /brief/ page) sends through the same endpoint, upload and source. */
  window.anvolForms = { endpoint: FORM_ENDPOINT, cc: FORM_CC, uploadFile: uploadFile, withSource: withSource,
    subjectFor: subjectFor, maxFiles: MAX_FILES, maxFileBytes: MAX_FILE_BYTES };
  if (form) {
    var started = false;
    form.addEventListener("focusin", function () {
      if (!started) { started = true; track("project_form_start", form.id); }
    });
    var btn = document.getElementById("submit-btn");
    var note = document.getElementById("form-note");
    var BTN_LABEL = btn.innerHTML;
    var NOTE_DEFAULT = note.textContent;
    /* After a confirmed send, show back what we received and the next step instead of only "thanks". */
    var received = document.getElementById("received");
    function showReceived() {
      if (!received) return;
      var stage = form.stage.options[form.stage.selectedIndex];
      var items = [
        ["Your stage", form.stage.value ? stage.text : "Not given"],
        ["Quantity / date", (form.quantity.value || "Quantity not given") + " · " + (form.target_date.value || "date not given")],
        ["What you sent", form.message.value.slice(0, 280)],
        ["Next step", "Zisheng Li, our engineering lead, reviews it, lists what is missing and suggests the next build step." +
          (form.nda_required.checked ? " We send the NDA first." : "")]
      ];
      /* Spec §10.4: name what is still missing instead of only saying thanks. */
      var missing = [];
      if (!form.files.files.length) missing.push("photos or files of what works today");
      if (!form.quantity.value) missing.push("how many units you need");
      if (!form.target_date.value) missing.push("when you need them");
      if (missing.length) items.push(["To speed up the review", "Reply with " + missing.join(", ") + "."]);
      var dl = received.querySelector("dl");
      dl.textContent = "";
      items.forEach(function (pair) {
        var dt = document.createElement("dt"); dt.textContent = pair[0];
        var dd = document.createElement("dd"); dd.textContent = pair[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      received.hidden = false;
      /* The received block carries its own WhatsApp link; one is enough. */
      var alt = form.querySelector(".form-alt");
      if (alt) alt.hidden = true;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        note.textContent = "Please fill in what you need built and your email.";
        note.className = "form-note err";
        return;
      }
      if (form._honey.value) return; /* bot */
      var files = Array.prototype.slice.call(form.files.files);
      if (files.length > MAX_FILES || files.some(function (f) { return f.size > MAX_FILE_BYTES; })) {
        note.textContent = "Up to 5 files, 20 MB each. Larger files: email chris@anvol.dev.";
        note.className = "form-note err";
        return;
      }
      btn.disabled = true;
      btn.textContent = files.length ? "Uploading files…" : "Sending…";
      /* Files go to our own R2 (functions/api/upload.js); the email carries their links. A file that
         fails must not cost us the enquiry: it is sent anyway and names the files that didn't arrive. */
      var failed = [];
      /* Only message on WhatsApp when this is "yes": WhatsApp requires opt-in, and there must be a number. */
      var whatsappOk = !!form.whatsapp.value.trim() && form.whatsapp_ok.checked;
      Promise.allSettled(files.map(uploadFile))
        .then(function (results) {
          var urls = [];
          results.forEach(function (r, i) {
            if (r.status === "fulfilled") { urls.push(r.value); track("file_upload_success", String(files[i].name).split(".").pop()); }
            else { failed.push(files[i].name); track("file_upload_fail", String(files[i].name).split(".").pop()); }
          });
          btn.textContent = "Sending…";
          var payload = {
            name: form.name.value || "not given",
            company: form.company.value || "not given",
            nda_required: form.nda_required.checked ? "yes" : "no",
            email: form.email.value,
            whatsapp: form.whatsapp.value || "none",
            whatsapp_ok: whatsappOk ? "yes" : "no",
            stage: form.stage.value || "not given",
            quantity: form.quantity.value || "not given",
            target_date: form.target_date.value || "not given",
            message: form.message.value,
            attachments: urls.length ? urls.join("\n") : "none",
            _subject: subjectFor("New project enquiry: anvol.dev", form.email.value),
            _cc: FORM_CC
          };
          if (failed.length) payload.attachments_failed = failed.join("\n");
          return fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(withSource(payload))
          });
        })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (result) {
          if (result.success !== true && result.success !== "true") throw new Error("Form submission rejected");
          note.textContent = (whatsappOk ? "Received. We'll message you on WhatsApp." : "Received. We'll reply by email.") +
            (failed.length ? " These files didn't upload, please email them to chris@anvol.dev: " + failed.join(", ") : "");
          note.className = failed.length ? "form-note err" : "form-note ok";
          track("project_form_submit", (form.stage.value || "no stage") + (files.length ? " · " + (files.length - failed.length) + " files" : ""));
          showReceived();
          form.reset();
        })
        .catch(function (err) {
          track("project_form_error", String(err).slice(0, 120));
          note.textContent = "Something went wrong. Email chris@anvol.dev instead.";
          note.className = "form-note err";
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = BTN_LABEL;
          if (note.className === "form-note") note.textContent = NOTE_DEFAULT;
        });
    });
  }

  /* ---------- scroll reveals ---------- */
  if (!hasGsap || typeof ScrollTrigger === "undefined" || reduced) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 28,
      duration: 0.6,
      ease: "power3.out",
      delay: parseFloat(el.getAttribute("data-delay") || "0"),
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });
})();
