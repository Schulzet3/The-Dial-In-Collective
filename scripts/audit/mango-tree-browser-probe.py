"""Public-only browser diagnostic; never uses owner cookies, secrets or accounts."""
import json
import re
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

TARGET = "https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068"
result = {"url": TARGET, "private_auth": False, "stored_html": False, "frames": []}

def redact_url(url):
    try:
        p = urlsplit(url)
        return p.scheme + "://" + p.netloc + p.path[:170]
    except Exception:
        return "unavailable"

def crop(text, keyword, maxchars=500):
    pos = text.lower().find(keyword.lower())
    return text[max(0, pos - 80):pos + maxchars].replace("\n", " ") if pos >= 0 else ""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    try:
        page.goto(TARGET, wait_until="domcontentloaded", timeout=45000)
        page.wait_for_timeout(12000)
        result["page_title"] = page.title()[:160]
        for index, frame in enumerate(page.frames[:25]):
            item = {"frame_index": index, "public_url_without_query": redact_url(frame.url)}
            try:
                text = frame.locator("body").inner_text(timeout=3500)[:16000]
                item["mentions_product"] = "mango tree blend" in text.lower()
                item["product_public_text"] = crop(text, "Mango Tree Blend", 850)[:850]
                sources = frame.evaluate("""() => [...document.querySelectorAll('script[src]')].map(x => x.src).filter(x => /ecwid/i.test(x)).slice(0,12)""")
                item["ecwid_scripts"] = [redact_url(x) for x in sources]
                ids = []
                for src in sources:
                    found = re.search(r"app\.ecwid\.com/script\.js\?(\d{5,14})", src, flags=re.I)
                    if found:
                        ids.append(found.group(1))
                item["public_ecwid_store_ids"] = list(dict.fromkeys(ids))
                details = frame.evaluate("""() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => x.textContent).filter(Boolean).slice(0,10)""")
                item["public_jsonld_product_names"] = []
                for piece in details:
                    if len(piece)>50000: continue
                    try:
                        parsed = json.loads(piece)
                        entries = parsed if isinstance(parsed, list) else parsed.get("@graph", [parsed]) if isinstance(parsed,dict) else []
                        for candidate in entries[:30]:
                            if isinstance(candidate,dict) and str(candidate.get("@type","")).lower()=="product":
                                item["public_jsonld_product_names"].append(str(candidate.get("name",""))[:140])
                    except Exception:
                        continue
            except Exception as err:
                item["frame_inspection_error"] = type(err).__name__
            result["frames"].append(item)
    except Exception as err:
        result["page_error"] = type(err).__name__
    finally:
        browser.close()
print("[DIC MANGO PUBLIC BROWSER] " + json.dumps(result, ensure_ascii=False))
