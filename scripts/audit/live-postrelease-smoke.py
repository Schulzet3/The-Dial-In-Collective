"""Credential-free postrelease browser checks of the ACTUAL Netlify deployment.

This deliberately does not authenticate, mutate shots, invoke the extractor,
create community records, or use user data. It verifies publicly served
production assets and signed-out page initialization at two viewport sizes.
"""
import os
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

LIVE = "https://app.dialincollective.com"
DEPLOY = "https://6adabcecd4a2a68e94cdc09a--the-dial-in-collective.netlify.app"

def exercise(browser, origin, width, height):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  service_workers="block", ignore_https_errors=False)
    # No Auth, PostgREST or other hosted data request leaves this test.
    context.route("**/*.supabase.co/**", lambda route: route.abort())
    failures = []
    javascript_errors = []
    host = urlsplit(origin).netloc

    def watch(page):
        page.on("pageerror", lambda error: javascript_errors.append(str(error)))
        def response_seen(response):
            if urlsplit(response.url).netloc == host and response.status >= 400:
                failures.append((response.status, urlsplit(response.url).path))
        page.on("response", response_seen)

    try:
        member = context.new_page()
        watch(member)
        home = member.goto(origin + "/", wait_until="domcontentloaded", timeout=30000)
        assert home is not None and home.status == 200, f"Home page: {home}"
        member.locator("#app .welcome").wait_for(state="visible", timeout=20000)
        assert "Welcome Back" in member.locator("#app").inner_text()
        assert "Cloud setup in progress" not in member.locator("#app").inner_text()
        assert member.evaluate("typeof window.supabase?.createClient") == "function"
        assert member.locator('script[type="module"][src="./cloud/main.js"]').count() == 1
        assert member.locator('link[rel="stylesheet"][href="./visual.css"]').count() == 1

        admin = context.new_page()
        watch(admin)
        resp = admin.goto(origin + "/admin.html", wait_until="domcontentloaded", timeout=30000)
        assert resp is not None and resp.status == 200, f"Admin page: {resp}"
        admin.get_by_role("heading", name="Admin Access Unavailable").wait_for(
            state="visible", timeout=20000)
        assert admin.locator("#admin-root").is_visible()
        assert admin.evaluate("typeof window.supabase?.createClient") == "function"
        assert not failures, f"Real deploy returned failed same-origin assets: {failures}"
        assert not javascript_errors, f"Real deploy raised browser errors: {javascript_errors}"
        print(f"PASS {origin} {width}x{height}: member/login, signed-out Admin and assets")
    finally:
        context.close()

def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
        try:
            for origin in (LIVE, DEPLOY):
                for width, height in ((390, 844), (1440, 900)):
                    exercise(browser, origin, width, height)
        finally:
            browser.close()
    print("PASS: live production Chromium smoke, four contexts; no credentials or writes")

if __name__ == "__main__":
    main()
