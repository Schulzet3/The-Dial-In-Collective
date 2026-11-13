# Issue #33 — Huckleberry /shop/products Size query and product metadata
DIC_PREFLIGHT_VERIFIED development_sha=6572d8f80e6ccb447152ffd81be70790c8fafd47 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Owner scope and acceptance
On Nov 12 owner requires the exact India Gundikhan Washed /shop/products URL to work in Add Coffee. Scope: MEDIUM product metadata; development-only until new owner Publish. Active route is Netlify /api/coffee-preview, not legacy curated Supabase Edge. Preserve Log Shot -> Rate -> Recommendation, Auth/admission, offline, privacy, original603 frozen oracle (603 coffees/201 roasters/1197 captures), all prior releases and queues.

Acceptance: chosen product with ?Size=12+OZ must match its canonical JSON-LD and exact selected name; safe /shop/products/<handle> must reach same-host exact Shopify Ajax product JSON if offered; name, roaster, Washed, directly supported flavor notes must populate Add Coffee/Source Review without borrowing India Gundikhan Natural; empty/unpublished fields stay blank. One bounded guarded current official HTTPS source + actual parser afterproof and focused adversarial tests required. No arbitrary query selector, catalog, private IP, DNS/TLS/timeout/size or member quota bypass.

## Pre-fix diagnosis
Public shop page lists the product. In the current generic active metadata parser, samePage treated bag Size=12 OZ as another product identity, excluding canonical/JSON-LD selected facts. Shopify public Ajax allowed /products but not the headless /shop/products alias. Live Netlify observability returned three HTTP 200 preview requests and two HTTP 429 cooldown rejections; without response bodies the 200 entries do not prove successful parsed coffee. Legacy Supabase official roaster directory is not used on the current Add Coffee path, so no registration or Edge/provider mutation is appropriate.

## Implementation and testing checkpoint
The scoped change adjusts same-page equality only for numeric bag-size selectors on exact /shop/products/<handle>, and permits exact-handle same-host public Shopify Ajax lookup via that path. Includes 7 positive/hostile Node cases, one strict official-source proof and scoped GitHub Actions workflow. Files: src/server/coffee-page-metadata.mjs, src/server/coffee-shopify-ajax.mjs, tests/coffee-issue33-huckleberry-shop-products.test.mjs, scripts/audit/issue33-huckleberry-current-check.mjs, .github/workflows/issue33-huckleberry-shop-products.yml, and this SAME-COMMIT journal. Initial state TESTING, NOT READY until current live source, exact PR CI and merged-source acceptance are independently checked.

No Netlify release, production SQL, Supabase Edge/Auth/records changes, new provider credentials, member content, purchases or costs. Preserve #267/#96 concurrent scope. Next: run source-bound CI and inspect exact raw official source and any afterproof failures; repair and retest safely, then nonforce merge and update source-bound evidence/queue only if READY.
