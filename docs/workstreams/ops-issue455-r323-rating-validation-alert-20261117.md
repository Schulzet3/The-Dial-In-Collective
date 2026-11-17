# #455 R323 — Preserve unresolved Log Shot validation feedback [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=cebdd9e7b5c67521df54c6b0d95dda8e05fc7b6a preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Authority, reproduced live defect and scope
Owner-authorized Option B SAFE defect repair only. Live immutable source parent cebdd9e7b5c67521df54c6b0d95dda8e05fc7b6a; PREFLIGHT.md separately fetched and Git blob/content matched 2fb236bbfa6bac48513eeb3bd157b260853af06d before AGENTS, issues, research and providers. Original site/lib/ui.js blob d9127077364ec8d234666aa9d9fce1a87e3a5515, site/cloud/main.js blob 0a5274ec660ad435b499d58c9b5985ae400f37ea, release queue blob 9f9b96a2bc3b79e181ada51d77604831e7b3011e. Main 3b372215ac7ccfd6db406f27090706e8cb8f3e80 and release/production 0f3641b4fff07e2a88d7747e621304ec2cf0ead5 not authorized for writes.

After Save validation marks missing taste groups and invalid dose/yield/time/notes, live rate tap previously cleared shared #shot-validation-feedback UNCONDITIONALLY despite remaining invalid marked controls. This independently observed source-level defect differs from previously fixed R295 ordinary-input handler. No real member incident evidenced.

## Actual changed paths (SAME COMMIT)
- site/lib/ui.js: narrow acknowledgeShotRating() only clears alert when tapped group was invalid and no other marked invalid form control remains; never blanks unrelated sync/cloud error from valid tap.
- site/cloud/main.js: rating handler delegates specific feedback acknowledgement rather than unconditional clear.
- tests/issue455-r323-rating-validation-alert.test.mjs: six direct negative/positive synthetic cases for partial ratings, invalid measurement/notes, last missing rating, unrelated cloud error, detached group and exact live handler call.
- docs/RELEASE_QUEUE.json: unique TESTING intake DIC-Q-455-r323-rating-validation-alert-integrity, 398 prior items/187 histories preserved, READY denied until exact tests/merged source.
- this mandatory SAME-COMMIT journal.

Original five taste entries, single-controllable-change advice, notes/history, grinder calibration/versions, Turbo vs Fast-Flow, slow-feed, offline/Community/privacy/RLS and all Locked numeric policies unchanged. No new user data, telemetry or science rule. External Oct29 ZIP/S019 original bytes still inaccessible; #267 line-credit zero.

## Test status at authoring
Node22, browser/mobile/offline/a11y, cloud, SQL/security, approval/governance and real-member tests **NOT YET EXECUTED**. Source PR and CI not yet created. No PASS/READY/DEPLOYED or empirical espresso improvement claim. Next: verify five-path non-destructive compare, run exact PR-head suite/repair failures and same-commit journal, nonforce [skip netlify] PR merge only after checks, read back merge blobs and exact merged CI; then update evidence ledger, CURRENT_STATUS and queue appropriately without deployment.
