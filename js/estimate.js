/* Quick Estimate on /costs/ (redesign spec 9.3). Runs in the browser only and sends nothing.
   Output is never a price: fit, engineering modules involved, what drives cost, whether a paid
   evaluation is advised, and the way to the project form. */
(function () {
  "use strict";

  var form = document.getElementById("est-form");
  var out = document.getElementById("est-out");
  if (!form || !out) throw new Error("estimate.js: #est-form or #est-out missing from the page");

  var SERVICES = {
    evaluation: ["/services/project-evaluation/", "Project evaluation"],
    hardware: ["/services/hardware-engineering-prototype/", "Hardware engineering & prototype"],
    pcb: ["/services/pcb-pcba-sourcing/", "PCB / PCBA & component sourcing"],
    firmware: ["/services/firmware-embedded/", "Firmware & embedded systems"],
    enclosure: ["/services/enclosure-integration/", "Enclosure & product integration"],
    testing: ["/services/testing-quality/", "Testing, quality & documentation"],
    pilot: ["/services/pilot-small-batch/", "Pilot & small-batch assembly"],
    fulfillment: ["/services/fulfillment/", "Fulfillment"]
  };
  var ORDER = ["evaluation", "hardware", "pcb", "firmware", "enclosure", "testing", "pilot", "fulfillment"];

  function answers() {
    var a = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.name) a[el.name] = el.value;
    });
    return a;
  }

  function el(tag, text) {
    var n = document.createElement(tag);
    if (text) n.textContent = text;
    return n;
  }

  function list(items) {
    var ul = el("ul");
    items.forEach(function (item) {
      var li = el("li");
      if (typeof item === "string") li.textContent = item;
      else li.appendChild(item);
      ul.appendChild(li);
    });
    return ul;
  }

  function link(href, text) {
    var a = el("a", text);
    a.href = href;
    return a;
  }

  function modulesFor(a) {
    var m = {};
    if (a.stage === "idea") { m.evaluation = true; m.hardware = true; }
    if (a.stage === "partial_design") m.hardware = true;
    if (a.pcb === "devboard" || a.pcb === "none") m.pcb = true;
    if (a.bom === "partial" || a.bom === "none" || a.sourcing === "yes") m.pcb = true;
    if (a.firmware === "new" || a.firmware === "changes") m.firmware = true;
    if (a.enclosure === "new" || a.enclosure === "changes") m.enclosure = true;
    if (a.testing === "unit" || a.testing === "proto" || a.stage === "working_prototype") m.testing = true;
    if (a.quantity === "small" || a.quantity === "mid" || a.quantity === "large" || a.stage === "repeat_batch") m.pilot = true;
    if (a.packaging === "retail" || a.packaging === "protect") m.fulfillment = true;
    var engineering = ["pcb", "firmware", "enclosure"].filter(function (k) { return m[k]; }).length;
    if (engineering >= 2 && (a.stage === "idea" || a.stage === "partial_design")) m.hardware = true;
    return ORDER.filter(function (k) { return m[k]; });
  }

  function drivers(a, mods) {
    var d = ["Development fee: follows the engineering work, not the unit count."];
    var has = function (k) { return mods.indexOf(k) !== -1; };
    if (has("pcb")) d.push("Boards: complexity, number of revisions and part availability.");
    if (a.bom === "partial" || a.bom === "none") d.push("A BOM still to be built: which parts are available decides cost and dates.");
    if (has("firmware")) d.push("Firmware: number of features, connectivity, and how much existing code can be reused.");
    if (has("enclosure")) d.push("Enclosure: process (printing, CNC or molding), finish and quantity.");
    if (has("testing")) d.push("Testing: how many functions need testing, test time, and whether a test fixture is needed.");
    if (has("pilot")) d.push("Quantity: each board-assembly run pays a fixed setup charge, and the development fee is spread over the units.");
    if (has("fulfillment")) d.push("Packaging, and what goes in the box.");
    if (a.date) d.push("Your target date: set against part availability in the written scope.");
    d.push("Not included: shipping and import duties, and certification.");
    return d;
  }

  function evaluationReasons(a, mods) {
    var r = [];
    if (a.stage === "idea") r.push("it starts from an idea or sketch");
    var engineering = ["hardware", "pcb", "firmware", "enclosure"].filter(function (k) { return mods.indexOf(k) !== -1; }).length;
    if (engineering >= 3) r.push("three or more engineering areas are involved");
    if (a.stage !== "idea" && a.pcb === "none" && a.bom === "none") r.push("there is no board or BOM yet");
    return r;
  }

  function render() {
    var a = answers();
    out.textContent = "";
    if (!a.stage) {
      out.appendChild(el("p", "Choose your stage to start. Leave anything you are unsure of as it is.")).className = "est-empty";
      return;
    }
    var mods = modulesFor(a);

    out.appendChild(el("h3", "Does Anvol fit?"));
    if (!mods.length) {
      out.appendChild(el("p", "Nothing you chose needs engineering or production work from us yet. If you need something not listed here, describe it in the project form."));
    } else {
      out.appendChild(el("p", "Yes. We take projects from an idea to small batches, with no minimum order."));
      if (a.quantity === "large") out.appendChild(el("p", "For 100 units or more, our published small-batch prices do not apply; the batch is quoted for its own quantity after review."));
      if (a.market === "us" || a.market === "eu") out.appendChild(el("p", "If the product needs FCC or CE certification, a test lab does it and it is quoted separately."));
    }

    if (mods.length) {
      out.appendChild(el("h3", "Engineering work involved"));
      out.appendChild(list(mods.map(function (k) { return link(SERVICES[k][0], SERVICES[k][1]); })));
    }

    out.appendChild(el("h3", "What will drive the price"));
    out.appendChild(list(drivers(a, mods)));

    out.appendChild(el("h3", "Paid evaluation first?"));
    var reasons = evaluationReasons(a, mods);
    var p = el("p");
    if (reasons.length) {
      p.appendChild(document.createTextNode("Advised, because " + reasons.join(" and ") + ". A "));
      p.appendChild(link("/services/project-evaluation/", "detailed engineering review"));
      p.appendChild(document.createTextNode(" comes before any fixed quote; it is scoped and priced after the free quick check."));
    } else {
      p.textContent = "Not needed to start. The free quick check is enough; we say if a detailed review is needed.";
    }
    out.appendChild(p);

    var btn = link("/#quote", "Review my project");
    btn.className = "btn";
    out.appendChild(btn);
    out.appendChild(el("p", "Nothing here is sent. Put what matters in the project form.")).className = "est-empty";
  }

  form.addEventListener("change", render);
  render();
})();
