/* language toggle: swaps every [data-zh] element between its English text and the Chinese in data-zh */
  (function () {
    var btn = document.getElementById("lang-btn");
    var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-zh]"));
    nodes.forEach(function (el) { el.setAttribute("data-en", el.innerHTML); });
    function apply(lang) {
      nodes.forEach(function (el) { el.innerHTML = el.getAttribute(lang === "zh" ? "data-zh" : "data-en"); });
      document.documentElement.setAttribute("lang", lang);
      btn.textContent = lang === "zh" ? "EN" : "中文";
      try { localStorage.setItem("sd-lang", lang); } catch (e) { console.warn("Language preference was not saved", e); }
    }
    var initial = "en";
    try {
      var q = new URLSearchParams(location.search).get("lang");
      var stored = localStorage.getItem("sd-lang");
      if (q === "zh" || q === "en") initial = q;
      else if (stored === "zh" || stored === "en") initial = stored;
      else if (/^zh/i.test(navigator.language || "")) initial = "zh";
    } catch (e) { console.warn("Language preference could not be read", e); }
    if (initial === "zh") apply("zh");
    btn.addEventListener("click", function () {
      apply(document.documentElement.getAttribute("lang") === "zh" ? "en" : "zh");
    });
  })();
