# Universal Roaster Extractor — Corvus Echo Gesha expansion (2026-10-19 UTC)

## Authority and current state
Owner asked to read complete roaster product-page copy intelligently and maximize source-backed facts for Corvus and other roasters. Work is **development source only**, no Netlify production publication, Supabase schema/data, Edge deployment, API credentials, chargeable hosted AI or established Locked decision changed.

## Exact live source and regression evidence
- Official current public product: https://www.corvuscoffee.com/products/echo-gesha
- Live anonymous GitHub runner using the actual bounded HTTPS connection-time DNS-pinned extractor: https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39314728764 — **SUCCESS**.
- Corvus public HTML 169,498 bytes, SHA256 `66b3c79b8d970b05ce178dfc531b02552088abe39353d08ac564deed238224c1`. Actual result: name Echo Gesha; Corvus Coffee; origin Panama; producer canonical Finca Deborah; variety Gesha; process Anaerobic as an explicitly interpreted carbonic-maceration method; tasting notes Jasmine, Cabernet Grape, and Tropical; supplemental farm Finca Deborah; grower Jamison Savage; processing detail `Cascara Infused Carbonic Maceration; washed finish`. Roast level, altitude and espresso recipe intentionally blank, not roaster facts.
- 25 exact public URL targets tested, 20 parsed; 5 safely blocked/not currently available (expected Queen City homepage negative; Picky Chemist >900KB bounded refusal; unavailable Queen City Natural, Sonia Bolanos, Sweet Bloom Felix Zaragoza).
- Existing extensive real-roaster probe checks for PERC, Proud Mary, Onyx, SEY, Queen City, Sweet Bloom, Black & White, Little Wolf and Heart continued to pass.
- Full app code tests, ESLint zero warnings and static cloud build: https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39314795745 — SUCCESS, HEAD `bd5930c91b6e20b8e79ad792417c8087b1687b3b` (before this documentation-only housekeeping; later probe script had already passed independently at `e582c7b4`). Prior transient CI failures at `af97018` (test fixtures) and `bf650ad` (unused test import) were corrected and **not** final source failures.

## Source changes
- `src/server/coffee-narrative-evidence.mjs`: new bounded selected-product story interpreter, farm/country heading, named grower, explicitly corroborated title variety, multi-stage carbonic-processing detail.
- `src/server/coffee-page-metadata.mjs`: merges narratives after existing structured/visible label extraction without replacing higher-confidence explicit source fields or bypassing conflict safety.
- `site/cloud/coffee-url-autofill.js`: display provenance-rich farm and named grower only in noncanonical Other Published Details, never save them silently as unsupported fields.
- `tests/coffee-narrative-evidence.test.mjs`: Corvus positive and unrelated-content/no-guess/explicit-field priority negative fixtures.
- `scripts/audit/coffee-roaster-live-probe.mjs`: actual Corvus URL added and asserted in existing 25-source independent runner.

## Semantics and security
- Canonical process has only fixed selections; carbonic maceration is reasonably interpreted as anaerobic, BUT the actual roaster process label and washed finish appear separately for review. Farm/estate remains the canonical producer fallback, named human grower is supplementary, avoiding conflating two distinct entities.
- Existing 12 per rolling 24h account preview budget, >=30-second cooldown, same-origin authenticated admitted-member gate, public HTTPS only, SSRF/pinned DNS, 900 KB page cap, no unverified→Verified promotion, no automatic save/merge, XSS escaping, blank-only one-click Autofill and separate Add Coffee confirmation all remain unchanged.
- Regex/evidence-driven parsing is not full-language AI comprehension. Real semantic extraction should be an optional bounded model fallback when deterministic extraction is incomplete, with exact page/release scope, JSON schema, per-field supporting quotes/evidence, consistency checking, user review, no hallucinated facts, and spend/rate limits. Owner has **not yet selected or authorized** a provider, cost model or rollout. Do not hardwire API keys, expand quota or automatically scrape the broader web. No screenshot/OCR change.
- Full private authenticated browser Autofill for Corvus, direct Netlify deployment verification and other roaster sites not among the 25 live targets remain **unverified**.

## Next
1. Obtain one product decision: optional AI semantic fallback enabled under a capped budget, or remain deterministic/no model charges. Clarify one at a time.
2. Expand the live-source matrix by changed storefront type and official roaster cases. Keep evidence/source snippets and noncanonical details bounded; no blind guessing.
3. On explicitly approved separate release, run acceptance and publish one credit-efficient Netlify production bundle. Revalidate UX, admin/session safeguards and unchanged data. Never use this record as implicit publication consent.
