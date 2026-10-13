/* Project summary and gap list for the detailed brief (/brief/). Deterministic rules, no AI:
   the same text is shown after Send and goes into the team's email. Tested by test/brief-summary.test.cjs. */
(function (root) {
  "use strict";

  var STAGES = {
    idea: "Idea",
    dev_board: "Development board",
    partial_design: "Partial design",
    working_prototype: "Working prototype",
    pilot_batch: "Pilot batch",
    existing_production: "Existing production",
    design_revision: "Design revision"
  };

  /* What we echo back, in the order of the brief's steps (spec 10.3). */
  var LABELS = [
    ["name", "Name"], ["company", "Company"], ["country", "Country"], ["website", "Website"],
    ["business_type", "Sells to"], ["product_category", "Product category"],
    ["what_works_today", "What works today"], ["what_help_is_needed", "Help needed"],
    ["product_description", "Main function"], ["features", "Includes"], ["feature_details", "Details"],
    ["environment", "Where it is used"],
    ["size", "Target size"], ["weight", "Weight"], ["material", "Material"], ["processes", "Build methods"],
    ["waterproof", "Water resistance"], ["drop", "Drop"], ["assembly_constraints", "Assembly constraints"],
    ["prototype_qty", "Prototype units"], ["pilot_qty", "Pilot units"], ["annual_volume", "Yearly volume"],
    ["target_unit_cost", "Target unit cost"], ["target_retail_price", "Target retail price"],
    ["target_date", "Needed by"], ["budget_range", "Budget"],
    ["target_market", "Markets"], ["certification_requirements", "Certifications"],
    ["packaging", "Packaging"], ["destination", "Ships to"],
    ["files_available", "Files you have"], ["file_links", "Links"], ["attachments", "Uploaded files"]
  ];

  function empty(v) {
    return v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
  }
  function pastIdea(f) { return !empty(f.current_stage) && f.current_stage !== "idea"; }

  /* A field is a gap when it is empty and the rule applies. "why" is what the visitor reads. */
  var GAPS = [
    { field: "current_stage", label: "Current stage",
      why: "Tells us whether the next step is a feasibility review, a custom board or a pilot run." },
    { field: "product_description", label: "Main function",
      why: "Without it we can't judge the architecture or the parts." },
    { field: "what_works_today", label: "What works today", when: pastIdea,
      why: "We build on what already works instead of redesigning it." },
    { field: "features", label: "Parts and interfaces",
      why: "Sensors, radio, battery and screen drive the board design and most of the BOM cost." },
    { field: "environment", label: "Where it is used",
      why: "Outdoor, wet or hot use changes the enclosure, connectors and part grades." },
    { field: "size", label: "Target size",
      why: "Size sets the board shape, the battery and the enclosure." },
    { field: "processes", label: "Build method",
      why: "3D printing, CNC and injection molding differ by weeks of lead time and by tooling cost." },
    { field: "prototype_qty", label: "Prototype units",
      why: "The count decides between hand-built units and a quick-turn assembly run." },
    { field: "annual_volume", label: "Yearly volume",
      why: "Volume decides whether tooling and test fixtures pay back." },
    { field: "target_unit_cost", label: "Target unit cost",
      why: "A cost target steers part choices from the first schematic." },
    { field: "target_date", label: "Needed by",
      why: "The date decides which parts we order early and which steps run in parallel." },
    { field: "budget_range", label: "Budget",
      why: "We can propose a scope that fits instead of a quote you have to cut down." },
    { field: "target_market", label: "Markets",
      why: "Where it sells decides which certifications and plugs apply." },
    { field: "certification_requirements", label: "Certifications", when: function (f) { return !empty(f.target_market); },
      why: "Certification planned now avoids a board respin later." },
    { field: "destination", label: "Final destination",
      why: "Sets packaging, duties and the battery shipping rules." },
    { field: "files", label: "Design files", when: pastIdea,
      test: function (f) { return empty(f.files_available) && empty(f.attachments) && empty(f.file_links); },
      why: "You are past the idea stage, so a schematic, PCB, BOM or CAD lets us review the real design instead of guessing." }
  ];

  function show(v) { return Array.isArray(v) ? v.join(", ") : String(v).trim(); }

  function summarize(f) {
    var stage = STAGES[f.current_stage] || "Not given";
    var have = [];
    LABELS.forEach(function (pair) { if (!empty(f[pair[0]])) have.push([pair[1], show(f[pair[0]])]); });
    var missing = GAPS.filter(function (g) {
      if (g.when && !g.when(f)) return false;
      return g.test ? g.test(f) : empty(f[g.field]);
    }).map(function (g) { return { field: g.field, label: g.label, why: g.why }; });
    var viaWhatsApp = f.whatsapp_ok === "yes" && !empty(f.whatsapp);
    var next = "Zisheng Li, our engineering lead, reviews the brief and replies " +
      (viaWhatsApp ? "on WhatsApp" : "by email") + " with what to build first" +
      (missing.length ? " and the questions above." : ".");
    var lines = ["Project summary (built from the form by fixed rules, not AI)", "", "Current stage: " + stage, "", "What we have:"];
    have.forEach(function (p) { lines.push("- " + p[0] + ": " + p[1]); });
    lines.push("", missing.length ? "Missing (" + missing.length + "):" : "Missing: nothing from our checklist");
    missing.forEach(function (m) { lines.push("- " + m.label + ": " + m.why); });
    lines.push("", "Next step: " + next);
    return { stage: stage, have: have, missing: missing, next: next, text: lines.join("\n") };
  }

  var api = { summarize: summarize, STAGES: STAGES, GAPS: GAPS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.anvolBriefSummary = api;
})(this);
