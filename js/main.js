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

  /* ---------- contact form (FormSubmit AJAX) ---------- */
  /* chris@anvol.dev is the business inbox the reply pipeline reads (activated 2026-09-27). */
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/chris@anvol.dev";
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
  if (form) {
    var btn = document.getElementById("submit-btn");
    var note = document.getElementById("form-note");
    var BTN_LABEL = btn.innerHTML;
    var NOTE_DEFAULT = note.textContent;
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
      /* Files go to our own R2 (functions/api/upload.js); the email carries their links. */
      Promise.all(files.map(uploadFile))
        .then(function (urls) {
          btn.textContent = "Sending…";
          return fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              email: form.email.value,
              whatsapp: form.whatsapp.value || "none",
              /* Only message on WhatsApp when this is "yes" (WhatsApp requires explicit opt-in). */
              whatsapp_ok: form.whatsapp_ok.checked ? "yes" : "no",
              message: form.message.value,
              attachments: urls.length ? urls.join("\n") : "none",
              _subject: "New project enquiry: anvol.dev",
              /* Zisheng's Anvol box gets a copy as the alert; enquiries once sat unread for days (2026-09-27, moved off his Gmail 09-29). */
              _cc: "zisheng@getanvol.com"
            })
          });
        })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (result) {
          if (result.success !== true && result.success !== "true") throw new Error("Form submission rejected");
          note.textContent = form.whatsapp.value && form.whatsapp_ok.checked
            ? "Received. We'll message you on WhatsApp."
            : "Received. We'll reply by email.";
          note.className = "form-note ok";
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
