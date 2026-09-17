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
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/e18b2a98f7d6ed1df42fe37b8c24eb5d";
  var form = document.getElementById("quote-form");
  if (form) {
    var btn = document.getElementById("submit-btn");
    var note = document.getElementById("form-note");
    var BTN_LABEL = btn.innerHTML;
    var NOTE_DEFAULT = note.textContent;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        note.textContent = "Please fill in your name, email and what you need built.";
        note.className = "form-note err";
        return;
      }
      if (form._honey.value) return; /* bot */
      btn.disabled = true;
      btn.textContent = "Sending…";
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name.value,
          email: form.email.value,
          link: form.link.value,
          message: form.message.value,
          _subject: "New project enquiry: anvol.dev"
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (result) {
          if (result.success !== true && result.success !== "true") throw new Error("Form submission rejected");
          note.textContent = "Thanks. Chris will reply from chris@anvol.dev.";
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
