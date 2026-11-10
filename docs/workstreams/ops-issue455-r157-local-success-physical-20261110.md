# Issue #455 — R455-157 Coffee overview measured-grind/temperature integrity

Authority: owner-approved Option B, safe Locked-compatible measured data-integrity fix only. No product policy, taste target, new input, user data mutation, database/auth/provider change or deployment.

Recovered base development e951531567825ca688c9772628a4d8f09736487f; original site/lib/model.js Git blob 5ea712305d9ba0f948ef3aa2d576dd27aa51b31c. Directly compared model::hasLocalSuccess with engine::recommendation and ui::lastRecipeContextShot. The Coffee overview previously marked all-five-green imported historical shots with invalid grind or temperature as a usable Dialed In Window although recommendation refused those shots as physical evidence. Code inspection reproduces the discrepancy without production data. Frozen/current literal audit #267 receives ZERO line credit; #33, #335 and #96 ownership undisturbed.

SAME-COMMIT files: site/lib/model.js, tests/issue455-local-success-grind-temperature-eligibility.test.mjs, this scoped journal. Narrow change: extend the existing bounds checks to require a finite nonnegative measured grinder setting in the setup's recorded espresso range and a recorded optional temperature within existing CONFIG bounds; no invented grinder range for a legacy setup. Original measured dose/yield/time, notes, five ratings and private History preserved, independent Turbo/Fast-Flow preserved, no altered recipe families, offline persistence, Community/RLS or one-variable guidance.

Synthetic regression tests: invalid grinder missing/NaN/string/negative/out-of-range; invalid optional temperature including nonfinite/string; inclusive endpoints and optional absent temperature; unrelated style and coffee; valid older success amid invalid newer imported row; never mutate archived shot/notes. Original negative behavior previously passed model::hasLocalSuccess erroneously (source directly inspected); positive invariants retained. No local Node executable/source checkout, all CI PENDING at writing; do not count unrun tests as PASS.

Next: scoped queue IN_PROGRESS intake and ledger evidence; exact PR-head Node22 + appropriate checks, nonforce merge, merged-source readback. READY only if independently verified. Standalone S019 original remains inaccessible; Issue #455 OPEN.

## Post-commit governance correction

Initial PR-head approval [42785313945](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42785313945) **FAILED** its release-queue intake because a test file was erroneously listed as a deployable queue scope path. Corrected queue scope to only site/lib/model.js (deployable) while preserving focused test evidence separately. This is a docs-only following commit; earlier failure is retained, no unrun PASS. Exact new head CI required.

## R157 FINAL merged-source CI receipt (following docs-only reconciliation)

Initial PR approval failure 42785313945 was corrected by limiting queue deployable scope to site/lib/model.js; full focused tests remain evidence-only. Exact PR-head 1a5fb02bcc453fca310272c0d935d5ed3715ff6e Node22 42785553513 3,385 PASS/0 FAIL/6 SKIP, all five R157 PASS, lint PASS, approval 42785553860, security 42785553845, isolated SQL 42785553520, cloud/browser 42785553935 SUCCESS (applicable browser steps genuinely executed). Original frozen603 SKIPPED. PR #1802 nonforce squash merged 1df0a4dae38fcc2937bab18d8428b10a383aea42 onto development; exact six original merged Git blob hashes identical to tested head; merged Node22 42786065900 3,385 PASS/0 FAIL/6 SKIP, merged approval 42786065890, browser 42786066030 SUCCESS. Queued READY in DEVELOPMENT only, with no publication or production writes. Next disjoint source/UX review; Issue #455 remains OPEN.
