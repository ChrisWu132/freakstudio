/* /brief/: the detailed project brief. One fieldset per step, answers kept in localStorage until sent,
   files go through /api/upload, the email goes through the same FormSubmit endpoint as the homepage form
   (window.anvolForms from main.js). After Send the page shows js/brief-summary.js's summary and gap list. */
(function () {
  "use strict";

  var form = document.getElementById("brief-form");
  if (!form || !window.anvolForms || !window.anvolBriefSummary) return;
  var forms = window.anvolForms;
  var STORE_KEY = "anvol-brief";
  var steps = Array.prototype.slice.call(form.querySelectorAll("fieldset[data-step]"));
  var back = document.getElementById("brief-back");
  var next = document.getElementById("brief-next");
  var send = document.getElementById("brief-send");
  var count = document.getElementById("brief-count");
  var note = document.getElementById("brief-note");
  var NOTE_DEFAULT = note.textContent;
  var current = 0;

  /* Every named control except files and the honeypot. Checkbox groups (value set) become arrays,
     single checkboxes become "yes"/"no". */
  function controls() {
    return Array.prototype.filter.call(form.elements, function (el) {
      return el.name && el.name !== "_honey" && el.type !== "file" && el.type !== "submit" && el.type !== "button";
    });
  }
  function isGroup(el) { return el.type === "checkbox" && el.value !== "on"; }
  function collect() {
    var f = {};
    controls().forEach(function (el) {
      if (isGroup(el)) {
        f[el.name] = f[el.name] || [];
        if (el.checked) f[el.name].push(el.value);
      } else if (el.type === "checkbox") {
        f[el.name] = el.checked ? "yes" : "no";
      } else if (el.type === "radio") {
        if (el.checked) f[el.name] = el.value;
        else if (!(el.name in f)) f[el.name] = "";
      } else {
        f[el.name] = el.value.trim();
      }
    });
    return f;
  }
  function fill(f) {
    controls().forEach(function (el) {
      if (!(el.name in f)) return;
      var v = f[el.name];
      if (isGroup(el)) el.checked = Array.isArray(v) && v.indexOf(el.value) !== -1;
      else if (el.type === "checkbox") el.checked = v === "yes";
      else if (el.type === "radio") el.checked = v === el.value;
      else el.value = v;
    });
  }

  /* Storage can be blocked (private mode); the form still works, it just won't survive a reload. */
  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify({ step: current, fields: collect() })); }
    catch (err) { note.textContent = NOTE_DEFAULT + " (This browser won't keep answers if you reload.)"; }
  }
  function restore() {
    var saved = null;
    try { saved = JSON.parse(window.localStorage.getItem(STORE_KEY)); }
    catch (err) { saved = null; }
    if (!saved || !saved.fields) return 0;
    fill(saved.fields);
    return Math.min(Math.max(parseInt(saved.step, 10) || 0, 0), steps.length - 1);
  }
  function forget() {
    try { window.localStorage.removeItem(STORE_KEY); return true; }
    catch (err) { return false; } /* storage blocked: nothing was kept, so nothing to clear */
  }

  function show(i) {
    current = i;
    steps.forEach(function (fs, j) { fs.hidden = j !== i; });
    back.hidden = i === 0;
    next.hidden = i === steps.length - 1;
    send.hidden = i !== steps.length - 1;
    count.textContent = (i + 1) + " / " + steps.length;
  }
  /* First invalid control in a step, or null. */
  function invalidIn(fs) {
    return Array.prototype.find.call(fs.elements, function (el) { return el.willValidate && !el.checkValidity(); }) || null;
  }
  function err(text) { note.textContent = text; note.className = "form-note err"; }
  function clearErr() { note.textContent = NOTE_DEFAULT; note.className = "form-note"; }

  next.addEventListener("click", function () {
    var bad = invalidIn(steps[current]);
    if (bad) { bad.reportValidity(); err(bad.type === "email" ? "We need an email to reply to." : "Please fill in this field."); return; }
    clearErr();
    show(current + 1);
    save();
    form.scrollIntoView({ block: "start" });
  });
  back.addEventListener("click", function () { clearErr(); show(current - 1); save(); });
  form.addEventListener("input", function () {
    if (note.className !== "form-note") clearErr();
    save();
  });
  form.addEventListener("change", save);

  function list(id, items) {
    var ul = document.getElementById(id);
    ul.textContent = "";
    items.forEach(function (text) { var li = document.createElement("li"); li.textContent = text; ul.appendChild(li); });
  }
  function showSummary(sum) {
    document.getElementById("sum-stage").textContent = sum.stage;
    list("sum-have", sum.have.map(function (p) { return p[0] + ": " + p[1]; }));
    list("sum-missing", sum.missing.length
      ? sum.missing.map(function (m) { return m.label + ". " + m.why; })
      : ["Nothing from our checklist."]);
    document.getElementById("sum-next").textContent = sum.next;
    form.hidden = true;
    var done = document.getElementById("brief-done");
    done.hidden = false;
    done.scrollIntoView({ block: "start" });
  }

  function text(v) { return Array.isArray(v) ? (v.length ? v.join(", ") : "none") : (v || "not given"); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form._honey.value) return; /* bot */
    for (var i = 0; i < steps.length; i++) {
      var bad = invalidIn(steps[i]);
      if (bad) { show(i); bad.reportValidity(); err("Step " + (i + 1) + " needs this field."); return; }
    }
    var files = Array.prototype.slice.call(form.files.files);
    if (files.length > forms.maxFiles || files.some(function (f) { return f.size > forms.maxFileBytes; })) {
      err("Up to 5 files, 20 MB each. Larger files: put a link above or email chris@anvol.dev.");
      return;
    }
    send.disabled = true;
    send.textContent = files.length ? "Uploading files…" : "Sending…";
    var fields = collect();
    var summary;
    Promise.all(files.map(forms.uploadFile))
      .catch(function (e2) { throw new Error("upload: " + e2.message); })
      .then(function (urls) {
        send.textContent = "Sending…";
        fields.attachments = urls;
        summary = window.anvolBriefSummary.summarize(fields);
        var payload = { form_type: "detailed_brief" };
        Object.keys(fields).forEach(function (k) { payload[k] = text(fields[k]); });
        if (!fields.whatsapp) payload.whatsapp = "none";
        payload.attachments = urls.length ? urls.join("\n") : "none";
        payload.summary = summary.text;
        payload._subject = "New project brief: anvol.dev";
        payload._cc = forms.cc;
        return fetch(forms.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(forms.withSource(payload))
        });
      })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (result) {
        if (result.success !== true && result.success !== "true") throw new Error("Form submission rejected");
        forget();
        showSummary(summary);
      })
      .catch(function (e3) {
        err(String(e3.message).indexOf("upload") === 0
          ? "A file didn't upload. Your answers are kept; try again, or put a link instead."
          : "Something went wrong. Your answers are kept; try again or email chris@anvol.dev.");
      })
      .finally(function () { send.disabled = false; send.textContent = "Send"; });
  });

  show(restore());
})();
