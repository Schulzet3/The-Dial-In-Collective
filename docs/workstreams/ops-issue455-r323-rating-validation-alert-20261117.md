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

## Corrected existing UX test expectation before CI [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=cebdd9e7b5c67521df54c6b0d95dda8e05fc7b6a preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Previously existing tests/cloud-shot-rating-focus.test.mjs asserts the now-removed unconditional inline aria-invalid clear statement. That is a static test expectation for the old behavior; update it to the new specific acknowledgement helper without changing any existing rating interactions or assertions elsewhere. Exact hosted CI still pending; do not label PASS, READY or deployed. Preserve earlier source/test changes and original audit history.

## R323 final source and exact-source CI acceptance — November 17, 2026 [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=a0dd123f7b98c9fd25e2206c3efe53967cbdf8ca preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

[PR #3143](https://github.com/Schulzet3/The-Dial-In-Collective/pull/3143) final reviewed head `2eaa2af3711b02672a6e43b57e3ebc4f59c64132`, nonforce [skip netlify] squash merged `a0dd123f7b98c9fd25e2206c3efe53967cbdf8ca`. All SIX changed original Git blobs equal exact PR head to source merge: site/lib/ui.js `0faf87694eeafb0dff619b5be7a8c7cf34da2581`, site/cloud/main.js `e3464243bcbbf4477127e81f9b21e95a2fae2833`, tests/cloud-shot-rating-focus.test.mjs `d3538fd1bd8894d77ace3d928fda0f003cdec4c7`, six-case new test `b7e42bf00704bd1ca14d75fdd28daf85b2d2be3a`, TESTING queue `15d46b9a006a13742b0fb9efcd8971823da76668`, initial same-commit journal `08309b8d0cc71f2376d5ad8afd5681e7eb6b863e`. The original stale R218 static test assertion was updated in a SECOND source commit with its own new standalone same-commit preflight receipt BEFORE final head CI; superseded first head jobs NOT claimed PASS.

Exact PR-head [Node22 44060009594](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060009594) SUCCESS **5,372 PASS/0 FAIL/6 intentional SKIP**, new six checks #4803–4808 all individually PASS; [browser/mobile/offline/cloud 44060009418](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060009418), isolated [SQL 44060009459](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060009459), [security 44060009381](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060009381), [governance 44060009638](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060009638) SUCCESS. Exact merged push [Node22 44060901851](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060901851) **5,372 PASS/0 FAIL/6 SKIP**, all six scoped cases PASS; [real cloud/mobile/Chromium/offline/a11y 44060902016](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060902016) and [governance 44060902031](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/44060902031) SUCCESS. Source-frozen603 SKIPPED, not PASS; merged SQL/security not separately triggered and only head evidence credited. No real member or taste-quality experiment, provider data write, deployment, Locked policy change or #267 direct historical lines. R323 docs-only reconciliation 399 queue rows/188 histories; 187/557/251 source ledger, source register/approval matrix unchanged (no new external science or owner decision); docs PR/merge governance **PENDING at this authorship**, not PASS. #455 stays OPEN. No owner approval needed.
