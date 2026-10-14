"""Build insights/ (article index + one page per article) from the internal article exports.

Usage: python scripts/build-insights.py
Config: scripts/insights-articles.json (selection, category, kept images, editorial replacements).
Only images listed in "keep" are published (team-made concept illustrations). Every replace/drop
target must match, and forbidden strings must not survive; otherwise the build stops.
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

import markdown
from PIL import Image

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "insights"
CFG = json.loads((SITE / "scripts" / "insights-articles.json").read_text(encoding="utf-8"))
ROOT = Path(CFG["source_root"])
DATE = CFG["date"]
BASE = "https://anvol.dev"
OG_DEFAULT = BASE + "/assets/img/og-anvol-dev.png"
CSS_V = "20261014a"
JS_V = "20261014a"
HASH = re.compile(r"[0-9a-f]{64}")
LINKS = {"https://anvol.dev/#contact": "/#quote", "https://anvol.dev/#how": "/how-it-works/"}


def fail(msg):
    sys.exit("build-insights: " + msg)


def esc(s):
    return html.escape(s, quote=True)


NAV = """<header class="nav" id="nav">
  <div class="nav-inner">
    <a class="brand" href="/" aria-label="anvol home">
      <img class="brand-mark" src="/assets/img/anvol-mark.svg" alt="" width="26" height="26">
      <span class="brand-name">anvol</span>
    </a>
    <nav class="nav-links" id="nav-links" aria-label="Main">
      <a href="/services/">Services</a>
      <a href="/cases/">Cases</a>
      <a href="/costs/">Costs</a>
      <a href="/how-it-works/">How it works</a>
      <a href="/quality/">Quality</a>
      <a href="/insights/">Insights</a>
      <a href="/about/">About</a>
    </nav>
    <a class="btn" href="/#quote">Review my project</a>
    <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Menu" aria-controls="nav-links" aria-expanded="false"><span></span><span></span></button>
  </div>
</header>"""

CLOSING = """  <section class="section closing">
    <div class="container">
      <h2>Have a similar <em>project?</em></h2>
      <a class="btn" href="/#quote">Review my project</a>
      <p>Or email <a href="mailto:chris@anvol.dev">chris@anvol.dev</a> · <a href="https://wa.me/13237193730" target="_blank" rel="noopener">WhatsApp +1 (323) 719-3730</a></p>
    </div>
  </section>"""

FOOTER = """<footer class="footer">
  <div class="container footer-grid">
    <a class="brand" href="/">
      <img class="brand-mark" src="/assets/img/anvol-mark.svg" alt="" width="26" height="26">
      <span class="brand-name">anvol</span>
    </a>
    <span>Anvol, Inc. · 2261 Market Street STE 82014, San Francisco, CA 94114</span>
    <div class="footer-links">
      <a href="/services/">Services</a>
      <a href="/costs/">Costs</a>
      <a href="/about/">About</a>
      <a href="mailto:chris@anvol.dev">chris@anvol.dev</a>
      <a href="https://block-less.com/">Blockless</a>
    </div>
  </div>
</footer>"""


def page(title, desc, url, og_type, og_image, ld, main):
    lds = "\n".join('<script type="application/ld+json">%s</script>' % json.dumps(x, ensure_ascii=False) for x in ld)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{og_image}">
<meta name="twitter:card" content="summary_large_image">
{lds}
<link rel="icon" href="/assets/img/anvol-mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v={CSS_V}">
</head>
<body>

{NAV}

<main>
{main}
{CLOSING}

</main>

{FOOTER}

<script src="/js/main.js?v={JS_V}"></script>
</body>
</html>
"""


def crumbs(*items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def publish_image(src, dest_dir, n):
    """Copy an SVG, or downscale a raster to WebP. Returns (filename, width, height)."""
    if src.suffix.lower() == ".svg":
        text = src.read_text(encoding="utf-8")
        vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', text)
        if not vb:
            fail(f"SVG without viewBox: {src}")
        name = f"fig-{n}.svg"
        shutil.copyfile(src, dest_dir / name)
        return name, round(float(vb.group(1))), round(float(vb.group(2)))
    im = Image.open(src).convert("RGB")
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    name = f"fig-{n}.webp"
    im.save(dest_dir / name, "WEBP", quality=80, method=6)
    if (dest_dir / name).stat().st_size > 300_000:
        fail(f"{name} for {dest_dir.name} is over 300KB")
    return name, im.width, im.height


def inline_md(text):
    out = markdown.markdown(text, extensions=["tables", "fenced_code"])
    for old, new in LINKS.items():
        out = out.replace(f'href="{old}"', f'href="{new}"')
    out = re.sub(r'href="(https?://(?!anvol\.dev)[^"]+)"', r'href="\1" rel="noopener"', out)
    out = out.replace("<table>", '<div class="table-wrap"><table class="cost-table">').replace("</table>", "</table></div>")
    return out


def build_article(a, cat_name):
    md_path = ROOT / a["src"]
    text = md_path.read_text(encoding="utf-8").replace("\r\n", "\n")
    for old, new in a.get("replace", []):
        if old not in text:
            fail(f"{a['slug']}: replace target not found: {old[:60]}")
        text = text.replace(old, new)
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    if not blocks[0].startswith("# "):
        fail(f"{a['slug']}: first block is not the title")
    title = blocks[0][2:].strip()
    desc = a.get("description") or json.loads((md_path.parent / "metadata.json").read_text(encoding="utf-8"))["description"]
    dest = OUT / a["slug"]
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    keep, drops = list(a.get("keep", [])), list(a.get("drop", []))
    used_keep, used_drop, body, images = set(), set(), [], []
    i = 1
    while i < len(blocks):
        b = blocks[i]
        if b.startswith("![") or b.startswith("<div"):
            h = HASH.search(b)
            cap = blocks[i + 1] if i + 1 < len(blocks) and blocks[i + 1].startswith("*") else None
            i += 2 if cap else 1
            k = next((k for k in keep if h and h.group(0).startswith(k)), None)
            if not k:
                continue
            used_keep.add(k)
            src = (md_path.parent / re.search(r"\]\(([^)]+)\)", b).group(1)).resolve()
            alt = re.match(r"!\[([^\]]*)\]", b).group(1)
            name, w, hgt = publish_image(src, dest, len(images) + 1)
            images.append(name)
            capt = inline_md(cap.strip("*")).replace("<p>", "").replace("</p>", "") if cap else ""
            body.append(f'<figure><img src="{name}" alt="{esc(alt)}" width="{w}" height="{hgt}" loading="lazy">'
                        + (f"<figcaption>{capt}</figcaption>" if capt else "") + "</figure>")
            continue
        d = next((d for d in drops if b.startswith(d)), None)
        i += 1
        if d:
            used_drop.add(d)
            continue
        if re.fullmatch(r"\*[^*].*\*", b, re.S) and "\n" not in b:
            body.append(inline_md(b).replace("<p>", '<p class="note">', 1))
        else:
            body.append(inline_md(b))
    if set(keep) - used_keep:
        fail(f"{a['slug']}: kept images not found: {set(keep) - used_keep}")
    if set(drops) - used_drop:
        fail(f"{a['slug']}: drop targets not found: {set(drops) - used_drop}")
    href, label = a["service"]
    body.append(f'<p class="related">Related service: <a href="{href}">{esc(label)}</a> · <a href="/insights/#{a["category"]}">More on {esc(cat_name.lower())}</a></p>')
    article_html = "\n".join(body)
    for bad in CFG["forbidden"]:
        if bad.lower() in article_html.lower():
            fail(f"{a['slug']}: forbidden text survived: {bad}")
    url = f"{BASE}/insights/{a['slug']}/"
    raster = [n for n in images if n.endswith(".webp")]
    og_image = url + raster[0] if raster else OG_DEFAULT
    ld_article = {"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc,
                  "image": og_image, "datePublished": DATE, "dateModified": DATE, "mainEntityOfPage": url,
                  "articleSection": cat_name,
                  "author": {"@type": "Organization", "name": "Anvol", "url": BASE + "/"},
                  "publisher": {"@type": "Organization", "name": "Anvol", "url": BASE + "/",
                                "logo": {"@type": "ImageObject", "url": BASE + "/assets/img/anvol-mark.svg"}}}
    ld_crumbs = crumbs(("Anvol", BASE + "/"), ("Insights", BASE + "/insights/"), (title, url))
    main = f"""
  <header class="page-head article-head">
    <h1>{esc(title)}</h1>
  </header>
  <article class="article">
{article_html}
  </article>
"""
    (dest / "index.html").write_text(page(f"{title} | Anvol", desc, url, "article", og_image, [ld_article, ld_crumbs], main),
                                     encoding="utf-8")
    return {"slug": a["slug"], "title": title, "desc": desc, "category": a["category"]}


def build_index(items):
    rows = []
    for cid, cname in CFG["categories"]:
        entries = [x for x in items if x["category"] == cid]
        if not entries:
            continue
        lis = "\n".join(f'          <li><a href="/insights/{x["slug"]}/">{esc(x["title"])}</a><p>{esc(x["desc"])}</p></li>'
                        for x in entries)
        rows.append(f'        <div class="row" id="{cid}"><h2>{esc(cname)}</h2>\n        <ul class="insight-list">\n{lis}\n        </ul></div>')
    title = "Insights | Anvol hardware engineering notes"
    desc = "Engineering notes for teams taking a working hardware prototype to user trials and a small batch: PCB and power, enclosure, firmware handover and manufacturing readiness."
    url = BASE + "/insights/"
    main = f"""
  <header class="page-head">
    <h1>Before the next build, <em>check these.</em></h1>
    <p>Engineering notes for teams taking a working prototype to user trials and a small batch.</p>
  </header>
  <section class="section" style="padding-top:24px">
    <div class="container">
      <div class="rows">
{chr(10).join(rows)}
      </div>
    </div>
  </section>
"""
    (OUT / "index.html").write_text(page(title, desc, url, "website", OG_DEFAULT,
                                         [crumbs(("Anvol", BASE + "/"), ("Insights", url))], main), encoding="utf-8")


def main():
    OUT.mkdir(exist_ok=True)
    cats = dict(CFG["categories"])
    slugs = [a["slug"] for a in CFG["articles"]]
    for p in OUT.iterdir():
        if p.is_dir() and p.name not in slugs:
            shutil.rmtree(p)
    items = [build_article(a, cats[a["category"]]) for a in CFG["articles"]]
    build_index(items)
    print(f"built {len(items)} articles + index into {OUT}")


if __name__ == "__main__":
    main()
