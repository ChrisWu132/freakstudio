/* anvol — GSAP + ScrollTrigger + Lenis animations */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var small = window.matchMedia("(max-width: 760px)").matches;
  var hasGsap = typeof gsap !== "undefined";
  var NAV_H = 76;

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
  var BTN_LABEL = 'Book 20 minutes <span class="arrow">→</span>';
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = document.getElementById("submit-btn");
      var note = document.getElementById("form-note");
      if (!form.name.value.trim() || !form.email.value.trim() || !form.message.value.trim()) {
        note.textContent = "Please fill in your name, email and what people ask you to make.";
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
          _subject: "New launch conversation — anvol"
        })
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () {
          note.textContent = "Thanks — Chris will email you to find a time.";
          note.className = "form-note ok";
          form.reset();
        })
        .catch(function () {
          note.textContent = "Something went wrong. Email us at chris@anvol.dev instead.";
          note.className = "form-note err";
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = BTN_LABEL;
        });
    });
  }

  /* ---------- animations ---------- */
  if (!hasGsap || reduced) return;

  gsap.registerPlugin(ScrollTrigger);
  var EASE = "power3.out";

  /* smooth scroll (Lenis) — pinned sections scrub off its scroll events */
  var lenis = null;
  if (typeof Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.11 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function goTo(target) {
    if (lenis) lenis.scrollTo(target, { offset: -NAV_H });
    else target.scrollIntoView({ behavior: "smooth" });
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href").slice(1);
      var target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      goTo(target);
    });
  });

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

  /* manifesto: pinned two-beat word reveal */
  function wrapWords(el) {
    el.innerHTML = el.innerHTML.split(/(<[^>]+>)/g).map(function (tok) {
      if (tok.charAt(0) === "<") return tok;
      return tok.split(/( +)/).map(function (w) {
        return /^ *$/.test(w) ? w : '<span class="wrd">' + w + "</span>";
      }).join("");
    }).join("");
    return el.querySelectorAll(".wrd");
  }
  var m1 = document.getElementById("mline1");
  var m2 = document.getElementById("mline2");
  if (m1 && m2) {
    var w1 = wrapWords(m1);
    var w2 = wrapWords(m2);
    if (!small) {
      gsap.timeline({
        scrollTrigger: { trigger: "#manifesto .stage", start: "top " + NAV_H + "px", end: "+=1800", scrub: 0.6, pin: true, anticipatePin: 1 }
      })
        .to(w1, { opacity: 1, stagger: 0.06, duration: 0.8, ease: "none" })
        .to("#mline1", { opacity: 0, y: -50, duration: 1, ease: "power2.in" }, "+=.6")
        .to("#mline2", { opacity: 1, duration: 0.01 }, "-=.3")
        .to(w2, { opacity: 1, stagger: 0.12, duration: 0.8, ease: "none" })
        .to({}, { duration: 0.8 });
    } else {
      gsap.to(w1, { opacity: 1, stagger: 0.04, duration: 0.5, scrollTrigger: { trigger: m1, start: "top 85%" } });
      gsap.to(w2, { opacity: 1, stagger: 0.06, duration: 0.5, scrollTrigger: { trigger: m2, start: "top 85%" } });
    }
  }

  /* the whole launch: one beat on stage at a time (loop.js) */
  if (typeof anvolLoopSection === "function" && document.querySelector(".loopchat")) {
    anvolLoopSection(reduced, small, NAV_H);
  }

  /* we handle the rest: autoplay carousel + stamps land row by row */
  var hvImgs = document.querySelectorAll(".hv-img");
  var hvI = 0;
  function setHv(i) { hvI = i; hvImgs.forEach(function (img, k) { img.classList.toggle("on", k === i); }); }
  if (hvImgs.length) setInterval(function () { setHv((hvI + 1) % hvImgs.length); }, 3200);
  gsap.utils.toArray(".hrow").forEach(function (row, i) {
    var tl = gsap.timeline({ scrollTrigger: { trigger: row, start: "top 86%" } });
    tl.to(row, { opacity: 1, y: 0, duration: 0.5, ease: EASE, delay: i * 0.04 })
      .to(row.querySelector(".stamp2"), { opacity: 1, scale: 1, rotate: 0, duration: 0.45, ease: "back.out(2.8)" }, "-=.1")
      .add(function () { row.classList.add("done"); }, "-=.1");
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
