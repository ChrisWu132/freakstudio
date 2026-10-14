"""Browser test for /brief/ and the homepage form. Nothing leaves the machine: FormSubmit and /api/upload
are intercepted and their payloads asserted.

Run:  python test/brief_e2e.py [--shots DIR]     (needs `pip install playwright` + `playwright install chromium`)
--shots saves /brief/ screenshots at 390px and 1440px for a human to look at.
"""
import functools
import http.server
import json
import sys
import threading
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

SITE = Path(__file__).resolve().parent.parent
UPLOAD_URL = "https://anvol.dev/files/2026-10-13/x/board.pdf"


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(Quiet, directory=str(SITE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def intercept(page, sent):
    """FormSubmit answers success and records the JSON; uploads return a fixed link."""
    def formsubmit(route):
        sent.append(json.loads(route.request.post_data))
        route.fulfill(status=200, content_type="application/json", body='{"success":"true"}')
    page.route("https://formsubmit.co/**", formsubmit)
    page.route("**/api/upload", lambda r: r.fulfill(status=200, content_type="application/json",
                                                   body=json.dumps({"url": UPLOAD_URL})))


def visible_step(page):
    return page.locator("fieldset[data-step]:not([hidden])").get_attribute("data-step")


def shot(page, shots, name):
    if shots:
        page.screenshot(path=str(Path(shots) / name), full_page=True)


def test_brief(base, browser, shots, width):
    ctx = browser.new_context(viewport={"width": width, "height": 900})
    page = ctx.new_page()
    sent = []
    intercept(page, sent)
    page.goto(f"{base}/brief/?utm_source=test_src&utm_campaign=c1")
    tag = f"brief-{width}"
    shot(page, shots, f"{tag}-1-contact.png")

    # Step 1 needs an email before Next works.
    page.click("#brief-next")
    assert visible_step(page) == "1", "Next passed step 1 without an email"
    page.fill("input[name=email]", "buyer@example.com")
    page.fill("input[name=whatsapp]", "+1 555 000 1111")
    page.check("input[name=whatsapp_ok]")
    page.fill("input[name=name]", "Test Buyer")
    page.select_option("select[name=business_type]", "B2B")
    page.click("#brief-next")
    assert visible_step(page) == "2"
    page.check("input[name=current_stage][value=working_prototype]")
    page.fill("textarea[name=what_works_today]", "ESP32 dev board reads the sensor")

    # Reload: answers and step come back from localStorage.
    page.reload()
    assert visible_step(page) == "2", "reload lost the step"
    assert page.input_value("input[name=email]") == "buyer@example.com"
    assert page.is_checked("input[name=whatsapp_ok]")
    assert page.is_checked("input[name=current_stage][value=working_prototype]")
    assert page.input_value("textarea[name=what_works_today]") == "ESP32 dev board reads the sensor"
    assert page.input_value("select[name=business_type]") == "B2B"

    page.click("#brief-next")
    assert visible_step(page) == "3"
    page.click("#brief-next")
    assert visible_step(page) == "3", "Next passed step 3 without the main function"
    page.fill("textarea[name=product_description]", "Handheld soil meter")
    page.check("input[name=features][value=Sensors]")
    page.check("input[name=features][value=Battery]")
    shot(page, shots, f"{tag}-3-requirements.png")
    for step in ("4", "5", "6"):
        page.click("#brief-next")
        assert visible_step(page) == step
    page.click("#brief-next")
    assert visible_step(page) == "7"
    assert page.is_visible("#brief-send") and not page.is_visible("#brief-next")
    page.check("input[name=files_available][value=BOM]")
    page.set_input_files("input[name=files]", files=[{"name": "board.pdf", "mimeType": "application/pdf",
                                                      "buffer": b"%PDF-1.4 test"}])
    shot(page, shots, f"{tag}-7-files.png")
    page.click("#brief-send")
    page.wait_for_selector("#brief-done:not([hidden])")

    assert len(sent) == 1, f"expected one FormSubmit request, got {len(sent)}"
    p = sent[0]
    expect = {"form_type": "detailed_brief", "email": "buyer@example.com", "whatsapp": "+1 555 000 1111",
              "whatsapp_ok": "yes", "name": "Test Buyer", "business_type": "B2B",
              "current_stage": "working_prototype", "product_description": "Handheld soil meter",
              "features": "Sensors, Battery", "files_available": "BOM", "attachments": UPLOAD_URL,
              "company": "not given", "certification_requirements": "none",
              "utm_source": "test_src", "utm_campaign": "c1", "utm_medium": "none", "landing_page": "/brief/",
              "referrer": "direct", "_cc": "zisheng@getanvol.com"}
    for k, v in expect.items():
        assert p.get(k) == v, f"payload {k}={p.get(k)!r}, expected {v!r}"
    assert "_honey" not in p and "files" not in p
    assert p["_subject"].startswith("New project brief: anvol.dev · buyer@example.com · "), p["_subject"]
    assert "Current stage: Working prototype" in p["summary"]
    assert "- Target size:" in p["summary"] and "- Main function:" not in p["summary"].split("Missing")[1]

    # The visitor sees the same summary.
    assert page.inner_text("#sum-stage") == "Working prototype"
    assert "Target size" in page.inner_text("#sum-missing")
    assert "Main function: Handheld soil meter" in page.inner_text("#sum-have")
    assert "on WhatsApp" in page.inner_text("#sum-next")
    assert page.evaluate("localStorage.getItem('anvol-brief')") is None, "sent brief still stored"
    shot(page, shots, f"{tag}-done.png")
    ctx.close()


def test_upload_failure_still_sends_brief(base, browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    sent = []
    page.route("https://formsubmit.co/**", lambda r: (sent.append(json.loads(r.request.post_data)),
                                                      r.fulfill(status=200, body='{"success":"true"}')))
    page.route("**/api/upload", lambda r: r.fulfill(status=500, body="{}"))
    page.goto(f"{base}/brief/")
    page.evaluate("""localStorage.setItem('anvol-brief', JSON.stringify({step: 6,
        fields: {email: 'x@example.com', product_description: 'Thing', whatsapp_ok: 'yes'}}))""")
    page.reload()
    assert visible_step(page) == "7"
    page.set_input_files("input[name=files]", files=[{"name": "a.zip", "mimeType": "application/zip", "buffer": b"PK"}])
    page.click("#brief-send")
    page.wait_for_selector("#brief-done", state="visible")
    assert len(sent) == 1, "a failed upload must not stop the brief"
    assert sent[0]["attachments"] == "none" and sent[0]["attachments_failed"] == "a.zip", sent[0]
    assert sent[0]["whatsapp_ok"] == "no", "consent without a number must not be sent as yes"
    assert "a.zip" in page.inner_text("#sum-missing")
    ctx.close()


def test_send_jumps_to_missing_required(base, browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    sent = []
    intercept(page, sent)
    page.goto(f"{base}/brief/")
    page.evaluate("localStorage.setItem('anvol-brief', JSON.stringify({step: 6, fields: {email: 'x@example.com'}}))")
    page.reload()
    page.click("#brief-send")
    assert visible_step(page) == "3", "Send with no main function should go back to step 3"
    assert sent == []
    ctx.close()


def test_homepage_form_carries_source_and_brief_link(base, browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    sent = []
    intercept(page, sent)
    page.goto(f"{base}/?utm_source=newsletter&utm_medium=email")
    page.goto(f"{base}/services/project-evaluation/")  # source is kept from the first page
    assert page.locator("a[href='/brief/']").count() == 1
    page.goto(f"{base}/")
    page.fill("#quote-form textarea[name=message]", "A sensor")
    page.fill("#quote-form input[name=email]", "q@example.com")
    page.click("#submit-btn")
    page.wait_for_selector("#received:not([hidden])")
    p = sent[0]
    assert p["utm_source"] == "newsletter" and p["utm_medium"] == "email" and p["landing_page"] == "/", p
    assert page.locator("#received a[href='/brief/']").is_visible()
    assert page.locator("a[href='/brief/']").count() == 1, "homepage should link /brief/ only from the success screen"
    ctx.close()


def main():
    shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
    if shots:
        Path(shots).mkdir(parents=True, exist_ok=True)
    server, base = serve()
    failed = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        cases = [("brief 390px", lambda: test_brief(base, browser, shots, 390)),
                 ("brief 1440px", lambda: test_brief(base, browser, shots, 1440)),
                 ("upload failure still sends brief", lambda: test_upload_failure_still_sends_brief(base, browser)),
                 ("send jumps to missing required", lambda: test_send_jumps_to_missing_required(base, browser)),
                 ("homepage source + brief link", lambda: test_homepage_form_carries_source_and_brief_link(base, browser))]
        for name, fn in cases:
            try:
                fn()
                print(f"ok - {name}")
            except Exception:  # a timeout or KeyError is a failure too
                failed += 1
                print(f"not ok - {name}\n{traceback.format_exc(limit=-1)}")
        browser.close()
    server.shutdown()
    print(f"{len(cases) - failed}/{len(cases)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
