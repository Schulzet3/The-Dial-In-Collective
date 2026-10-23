"""Browser smoke test against the ACTUAL dist/ production package, not site/ source.

No real sign-in, provider credentials, production requests, or member data.
The workflow builds dist with deliberately nonfunctional public coordinates.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run():
    if not (DIST / "index.html").is_file() or not (DIST / "admin.html").is_file():
        raise AssertionError("Build the packaged app before running built_app_qa.py")
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(DIST))
    )
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    failures = []
    errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                service_workers="block",
            )
            # Authentication calls must never touch the real Supabase instance.
            context.route("**/*.supabase.co/**", lambda route: route.abort())
            page = context.new_page()
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on(
                "response",
                lambda response: failures.append(
                    (response.url, response.status)
                ) if urlsplit(response.url).netloc == urlsplit(origin).netloc
                and response.status >= 400 else None,
            )
            page.goto(origin + "/", wait_until="domcontentloaded")
            page.locator("#app .welcome").wait_for(timeout=15000)
            content = page.locator("#app").inner_text()
            assert "Welcome Back" in content, "Packaged member entry did not initialize"
            assert "Cloud setup in progress" not in content
            assert page.evaluate("typeof window.supabase?.createClient") == "function"
            assert page.locator('script[type="module"][src="./cloud/main.js"]').count() == 1
            assert page.locator('link[rel="stylesheet"][href="./visual.css"]').count() == 1

            # Verify the actual included CSS and ES modules load without 404s.
            admin = context.new_page()
            admin.on("pageerror", lambda err: errors.append(str(err)))
            admin.on(
                "response",
                lambda response: failures.append(
                    (response.url, response.status)
                ) if urlsplit(response.url).netloc == urlsplit(origin).netloc
                and response.status >= 400 else None,
            )
            admin.goto(origin + "/admin.html", wait_until="domcontentloaded")
            admin.get_by_role("heading", name="Admin Access Unavailable").wait_for(
                timeout=15000
            )
            assert admin.locator("#admin-root").count() == 1
            assert admin.evaluate("typeof window.supabase?.createClient") == "function"
            assert page.locator("#app").is_visible(), "Member entry was hidden"
            assert admin.locator("#admin-root").is_visible(), "Admin entry was hidden"
            assert not failures, f"Packaged local asset failures: {failures}"
            assert not errors, f"Packaged JS runtime failures: {errors}"
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    run()
    print("PASS: packaged member and admin entry pages load real modules/assets")
