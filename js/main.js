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

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  /* chris@anvol.dev is the business inbox the reply pipeline reads (activated 2026-09-27). */
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/chris@anvol.dev";
  /* Zisheng's Anvol box gets a copy as the alert; enquiries once sat unread for days (2026-09-27, moved off his Gmail 09-29). */
  var FORM_CC = "zisheng@getanvol.com";
  var MAX_FILES = 5;
  var MAX_FILE_BYTES = 20 * 1024 * 1024;
  var form = document.getElementById("quote-form");
  function uploadFile(file) {
    var data = new FormData();
    data.append("file", file);
    return fetch("/api/upload", { method: "POST", body: data })
      .then(function (r) { if (!r.ok) throw new Error("Upload failed: " + r.status); return r.json(); })
      .then(function (result) { return result.url; });
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
        ["Next step", "Zisheng Li, our engineering lead, reviews it, lists what is missing and suggests the next build step."]
      ];
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
            if (r.status === "fulfilled") urls.push(r.value);
            else failed.push(files[i].name);
          });
          btn.textContent = "Sending…";
          var payload = {
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
          showReceived();
          form.reset();
        })
        .catch(function () {
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
