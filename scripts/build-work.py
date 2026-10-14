"""Build project pages from scripts/work-data/[a-z].json (extracted from the partner's case deck).

- cases/<slug>/index.html for every project without a hand-written page
- for the hand-written cost pages (logic-analyzer, lidar-car, tracked-robot): the block between
  <!-- work:start --> and <!-- work:end --> (photos, tech stack, what we built, reference figures, next steps)
- the card grids between <!-- work-grid:start/end --> on cases/index.html (all) and index.html (first 4)

Deck figures (`commercial`) are the engineers' REFERENCE numbers for a similar build, never a past invoice:
the hand-written pages carry the DELIVERED totals and are not touched outside their work block.
It also writes scripts/work-data/related-services.json ({slug: [service paths]}) for the services pages to link back.

Rerun: python scripts/build-work.py
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HAND_WRITTEN = {"logic-analyzer", "lidar-car", "tracked-robot"}
HOME_CARDS = 4
TEMPLATE_PAGE = os.path.join(ROOT, "cases", "logic-analyzer", "index.html")


def esc(s):
    return html.escape(s, quote=True)


def load_projects():
    projects = []
    for path in sorted(glob.glob(os.path.join(ROOT, "scripts", "work-data", "[a-z].json"))):
        with open(path, encoding="utf-8") as f:
            projects.extend(json.load(f))
    order_path = os.path.join(ROOT, "scripts", "work-data", "order.txt")
    if os.path.exists(order_path):
        order = [l.strip() for l in open(order_path, encoding="utf-8") if l.strip() and not l.startswith("#")]
        by_slug = {p["slug"]: p for p in projects}
        missing = [s for s in order if s not in by_slug]
        if missing:
            sys.exit(f"order.txt names unknown slugs: {missing}")
        projects = [by_slug[s] for s in order]
    for p in projects:
        for key in ("slug", "name", "one_liner", "intro", "tech_stack", "photos"):
            if not p.get(key):
                sys.exit(f"{p.get('slug')}: missing {key}")
        for ph in p["photos"]:
            if not os.path.exists(os.path.join(ROOT, ph["file"].lstrip("/"))):
                sys.exit(f"{p['slug']}: photo not found {ph['file']}")
    return projects


def chrome():
    """Nav and footer copied from a hand-written page so every page shares them."""
    page = open(TEMPLATE_PAGE, encoding="utf-8").read()
    nav = re.search(r'<header class="nav".*?</header>', page, re.S).group(0)
    footer = re.search(r'<footer class="footer">.*?</footer>', page, re.S).group(0)
    css = re.search(r'/css/style\.css\?v=([0-9a-z]+)', page).group(1)
    return nav, footer, css


def img_size(path):
    from PIL import Image
    with Image.open(os.path.join(ROOT, path.lstrip("/"))) as im:
        return im.size


def photo_tag(ph, lazy=True, cls=""):
    w, h = img_size(ph["file"])
    attrs = f' class="{cls}"' if cls else ""
    load = ' loading="lazy"' if lazy else ""
    return f'<img{attrs} src="{ph["file"]}" alt="{esc(ph["alt"])}" width="{w}" height="{h}"{load}>'


def stack_line(p, n=3):
    """Short keywords for cards: each value cut at its first ; , ( or ' with '."""
    short = [re.split(r"[;,(]| with | running ", r["value"])[0].strip() for r in p["tech_stack"][:n]]
    return " · ".join(s for s in short if s)


SERVICES = {
    "/services/project-evaluation/": "Project evaluation",
    "/services/hardware-engineering-prototype/": "Hardware engineering and prototypes",
    "/services/pcb-pcba-sourcing/": "PCB, PCBA and component sourcing",
    "/services/firmware-embedded/": "Firmware and embedded systems",
    "/services/enclosure-integration/": "Enclosure design and integration",
    "/services/testing-quality/": "Testing, quality and documentation",
    "/services/pilot-small-batch/": "Pilot and small-batch assembly",
    "/services/fulfillment/": "Packaging and shipping preparation",
}
REFERENCE_NOTE = ("Reference figures from our engineers for a similar build. Not a past invoice and not a fixed quote; "
                  "a written quote follows a review of your files.")
GENERIC_START = ["Send what you have: sketches, a reference product, files or a written idea.",
                 "We review it and list the gaps and open questions.",
                 "You get a written scope and quote."]


def ul(items, tag="ul"):
    return f'<{tag} class="plain case-text">' + "".join(f"<li>{esc(i)}</li>" for i in items) + f"</{tag}>"


def row(title, body):
    return f'  <div class="row"><h2>{title}</h2>{body}</div>'


def commercial_row(p):
    """Deck reference figures. On hand-written pages the development time is a delivered fact, so it stays
    in its own row and the reference block only carries what the delivered price section does not."""
    c = p.get("commercial")
    own_time = p.get("dev_time") and (not c or p["slug"] in HAND_WRITTEN)
    time_row = row("Development time", f'<p class="section-note case-text">{esc(p["dev_time"])}</p>') if own_time else ""
    if not c:
        return time_row
    lines = []
    if p.get("dev_time") and not own_time:
        lines.append(("Development time", [p["dev_time"]]))
    if c.get("dev_fee"):
        lines.append((c.get("fee_label", "Development fee"), c["dev_fee"]))
    if c.get("unit_cost"):
        lines.append((c["unit_label"], c["unit_cost"]))
    if c.get("quantity"):
        lines.append(("Quantity basis", [c["quantity"]]))
    for label, value in c.get("extra", []):
        lines.append((label, [value]))
    if c.get("included"):
        lines.append(("Included", ["; ".join(c["included"])]))
    if c.get("excluded"):
        lines.append(("Not included", ["; ".join(c["excluded"])]))
    dl = "".join(f"<dt>{esc(k)}</dt><dd>{'<br>'.join(esc(v) for v in vs)}</dd>" for k, vs in lines)
    ref = row("Commercial reference", f'<div><dl>{dl}</dl><p class="section-note">{esc(REFERENCE_NOTE)}</p></div>')
    return "\n".join(x for x in (time_row, ref) if x)


def detail_block(p):
    """Photos + facts + reference figures + next steps; used on generated pages and inside hand-written ones."""
    photos = p["photos"]
    out = ['<figure class="case-photo">', "  " + photo_tag(photos[0], lazy=False),
           f'  <figcaption class="photo-cap">{esc(photos[0]["caption"])}</figcaption>', "</figure>"]
    rows = "".join(f"<dt>{esc(r['label'])}</dt><dd>{esc(r['value'])}</dd>" for r in p["tech_stack"])
    out.append('<div class="rows">')
    out.append(row("Tech stack", f"<dl>{rows}</dl>"))
    if p.get("scope"):
        out.append(row("What we built", ul(p["scope"])))
    if p.get("challenge"):
        out.append(row("Main challenges", ul(p["challenge"])))
    out.append(commercial_row(p))
    out.append(row("Start a similar project", ul(p.get("start_similar") or GENERIC_START, "ol")))
    if p.get("deliverables"):
        out.append(row("Deliverables", ul(p["deliverables"])))
    links = "".join(f'<li><a href="{s}">{esc(SERVICES[s])}</a></li>' for s in p["related_services"])
    out.append(row("Related services", f'<ul class="plain case-text">{links}</ul>'))
    out.append("</div>")
    if len(photos) > 1:
        out.append('<h2 class="gallery-head">Photos and design files</h2>')
        out.append('<div class="case-gallery">')
        for ph in photos[1:]:
            out.append(f'  <figure>{photo_tag(ph)}<figcaption>{esc(ph["caption"])}</figcaption></figure>')
        out.append("</div>")
    return "\n".join(x for x in out if x)


def page(p, nav, footer, css):
    url = f"https://anvol.dev/cases/{p['slug']}/"
    title = f"{p['name']}: {p.get('category', 'Hardware')} build | Anvol"
    desc = f"{p['one_liner']} Built by our engineers. Tech stack: {stack_line(p, 4)}."
    crumbs = json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "Anvol", "item": "https://anvol.dev/"},
        {"@type": "ListItem", "position": 2, "name": "Cases", "item": "https://anvol.dev/cases/"},
        {"@type": "ListItem", "position": 3, "name": p["name"], "item": url}]}, separators=(",", ":"))
    og_img = "https://anvol.dev" + p["photos"][0]["file"]
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{og_img}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{crumbs}</script>
<link rel="icon" href="/assets/img/anvol-mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v={css}">
</head>
<body>

{nav}

<main>

  <header class="page-head">
    <h1>{esc(p['name'])}</h1>
    <p>{esc(p['intro'])}</p>
  </header>
  <section class="section" style="padding-top:24px">
    <div class="container">
{detail_block(p)}
      <p class="more"><a href="/cases/">All builds →</a></p>
    </div>
  </section>

  <section class="section closing">
    <div class="container">
      <h2>Building something <em>similar?</em></h2>
      <a class="btn" href="/#quote">Review my project</a>
      <p>Or email <a href="mailto:chris@anvol.dev">chris@anvol.dev</a> · <a href="https://wa.me/13237193730" target="_blank" rel="noopener">WhatsApp +1 (323) 719-3730</a></p>
    </div>
  </section>

</main>

{footer}

<script src="/js/main.js?v={css}"></script>
</body>
</html>
"""


def card(p):
    t = f'\n          <p class="work-time">{esc(p["card_line"][0].upper() + p["card_line"][1:])}</p>' if p.get("card_line") else ""
    return f"""        <a class="work" href="/cases/{p['slug']}/">
          {photo_tag(p['photos'][0])}
          <h3>{esc(p['name'])}</h3>
          <p>{esc(p['one_liner'])}</p>
          <p class="work-stack">{esc(p.get("card_stack") or stack_line(p))}</p>{t}
        </a>"""


def replace_between(path, start, end, body):
    text = open(path, encoding="utf-8").read()
    pat = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    if not pat.search(text):
        sys.exit(f"{path}: markers {start} / {end} not found")
    text = pat.sub(lambda m: f"{start}\n{body}\n{end}", text, count=1)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def main():
    projects = load_projects()
    nav, footer, css = chrome()
    for p in projects:
        target = os.path.join(ROOT, "cases", p["slug"], "index.html")
        if p["slug"] in HAND_WRITTEN:
            replace_between(target, "<!-- work:start -->", "<!-- work:end -->", detail_block(p))
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8", newline="\n") as f:
            f.write(page(p, nav, footer, css))
    cards = [p for p in projects if p["slug"] not in HAND_WRITTEN]
    replace_between(os.path.join(ROOT, "cases", "index.html"), "<!-- work-grid:start -->",
                    "<!-- work-grid:end -->", "\n".join(card(p) for p in cards))
    replace_between(os.path.join(ROOT, "index.html"), "<!-- work-grid:start -->",
                    "<!-- work-grid:end -->", "\n".join(card(p) for p in cards[:HOME_CARDS]))
    related = {p["slug"]: p["related_services"] for p in projects}
    with open(os.path.join(ROOT, "scripts", "work-data", "related-services.json"), "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(related, indent=2) + "\n")
    print(f"{len(projects)} projects, {len(cards)} cards")


if __name__ == "__main__":
    main()
