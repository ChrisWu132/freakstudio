/* anvol — GSAP + ScrollTrigger animations */
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = document.getElementById("submit-btn");
      var note = document.getElementById("form-note");
      if (!form.name.value.trim() || !form.email.value.trim() || !form.message.value.trim()) {
        note.textContent = "Please fill in your name, email and message.";
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
          company: form.company.value,
          message: form.message.value,
          _subject: "New quote request — anvol"
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () {
          note.textContent = "Thanks — we'll get back to you within 5 working days.";
          note.className = "form-note ok";
          form.reset();
        })
        .catch(function () {
          note.textContent = "Something went wrong. Email us at chris@anvol.dev instead.";
          note.className = "form-note err";
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = 'Get my quote <span class="arrow">→</span>';
        });
    });
  }

  /* ---------- animations ---------- */
  if (!hasGsap || reduced) return;

  gsap.registerPlugin(ScrollTrigger);
  var EASE = "power3.out";

  /* hero entrance */
  var heroTl = gsap.timeline({ defaults: { ease: EASE } });
  heroTl
    .from("[data-hero-line]", { yPercent: 105, duration: 0.8, stagger: 0.1 }, 0.05)
    .from("[data-hero]", { opacity: 0, y: 16, duration: 0.7, stagger: 0.09 }, 0.45)
    .from("[data-hero-img]", { opacity: 0, x: 48, scale: 1.05, duration: 0.9 }, 0.25);

  /* scroll reveals */
  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 40,
      duration: 0.7,
      ease: EASE,
      delay: parseFloat(el.getAttribute("data-delay") || "0"),
      scrollTrigger: { trigger: el, start: "top 88%", once: true }
    });
  });

  /* stats: count-up + top line draw */
  gsap.utils.toArray("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.4,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
      onUpdate: function () { el.textContent = Math.round(obj.v) + suffix; }
    });
  });
  gsap.utils.toArray("[data-draw]").forEach(function (el) {
    gsap.to(el, {
      scaleX: 1,
      duration: 0.9,
      ease: EASE,
      scrollTrigger: { trigger: el, start: "top 92%", once: true }
    });
  });

  /* process: line draws with scroll, steps pop in sequence */
  var processFill = document.querySelector("[data-process-draw]");
  if (processFill) {
    gsap.to(processFill, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".process",
        start: "top 75%",
        end: "bottom 60%",
        scrub: 0.6
      }
    });
  }
  ScrollTrigger.batch("[data-step]", {
    start: "top 85%",
    once: true,
    onEnter: function (batch) {
      gsap.from(batch, {
        opacity: 0,
        scale: 0.8,
        duration: 0.55,
        ease: EASE,
        stagger: 0.19,
        delay: 0.25
      });
    }
  });

  /* parallax images */
  gsap.utils.toArray("[data-parallax]").forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6,
      ease: "none",
      scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* final CTA scale-in */
  var cta = document.querySelector("[data-cta]");
  if (cta) {
    gsap.from(cta, {
      scale: 0.95,
      duration: 0.8,
      ease: EASE,
      scrollTrigger: { trigger: cta, start: "top 85%", once: true }
    });
  }
})();
