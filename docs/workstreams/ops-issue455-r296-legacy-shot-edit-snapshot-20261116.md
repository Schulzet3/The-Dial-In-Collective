# Issue #455 R296 — legacy shot edit missing optional snapshot: SAFE source/test intake [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=fc6496d07b3126d24e12462808a5b2c7071773ed preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Source and owner authority
Original branch fc6496d07b3126d24e12462808a5b2c7071773ed; docs/ai/PREFLIGHT.md immutable Git blob 2fb236bbfa6bac48513eeb3bd157b260853af06d fetched and content verified BEFORE other project files. Source site/cloud/main.js blob 14a72a8e425d2b5f629dea17eb7b4d217cde92e6; research coverage ledger original Git blob a3d25270262a2cad2cb8c6dfe37a41077360dbee; queue original blob ae111d96ba2a919a0aa1df41d392d6a363f5fc49. Owner issue #455 Option B authorizes reproducible SAFE Locked-compatible UX bug corrections with focused tests, no separate routine approval. #267 exhaustive direct-line audit, #33 extractor, #96 security, #509 Supabase ownership unchanged.

## Reproduced source bug and bounded remedy
Edit Shot from History enters CloudApp.showLog(cid, editing). Before any form appears, `editing?.snapshot.tempUnit` attempts to read `tempUnit` on absent/null `editing.snapshot`, producing a TypeError. Shot History card already safely handles absent snapshot with `shot.snapshot?.tempUnit`. Replace only `editing?.snapshot.tempUnit` with `editing?.snapshot?.tempUnit`, preserving real original F/C unit when present and current equipment display unit when absent. No original edit record, notes, five taste ratings, future shot data, recommendation, privacy or style policy is changed. This is a deterministic possible legacy/import crash; no claim an actual member was affected.

## Atomic source, tests, provenance
Same-commit paths: `site/cloud/main.js`, `tests/issue455-r296-legacy-edit-snapshot.test.mjs`, `docs/audits/issue455-research-source-coverage-20261103.json`, `docs/RELEASE_QUEUE.json`, this journal. New source identity `LIVE-20261116-CLOUD-LEGACY-SHOT-EDIT-MISSING-SNAPSHOT-R296`, evidence `R455-EV-APP-296-A`, proposal `R455-PROP-296-EDIT-LEGACY-SHOT-MISSING-SNAPSHOT`; canonical original 161/493/226 preserved, appended to 162/494/227, with no #267 literal credit. Added one unique queue row TESTING, not READY/DEPLOYED. No source register/approval matrix update required (no new external science or owner decision).

## Negative and positive test acceptance
1. Negative prior behavior: archived shot object exists but snapshot is undefined or null; old nested dereference throws. Positive corrected behavior: Edit Shot opens, preserves exact original notes and all five ratings and does not mutate stored shot.
2. Original historical F snapshot must remain Fahrenheit even when current setup displays C (negative fallback-mislabel test).
3. New-shot flow must retain all five unselected input ratings and current unit; no historical fallback pollution.
Node22 focused test, lint, browser/mobile/offline applicable CI, SQL/privacy/security/governance, exact PR-head/merged SHA and queue READY are **NOT RUN/NOT VERIFIED** at this stage. Historical unchanged suite receipts may be reused only when actually applicable to the same source; SKIPPED never PASS.

## Guardrails and next executable action
No production provider/SQL/Auth/Edge/member writes, no new synthetic production users, no experimental telemetry, no research numeric policy, no change main/release, backup, Netlify, visibility or publication. Next: create nonforce PR, execute applicable exact-source hosted checks, correct any failures with fresh SAME-COMMIT journal receipt for new source/test commits, read back merge SHA and blobs, then reconcile CURRENT_STATUS/queue and issue checkpoint. Original S019 remains inaccessible; do not substitute other PDF or certify espresso improvement.

## Pre-CI test-only correction (same-commit continuation) [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=fc6496d07b3126d24e12462808a5b2c7071773ed preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Reviewed the staged test text before CI: regex slash escaping accidentally matched literal backslashes instead of parentheses in Fahrenheit/Celsius labels. Corrected ONLY those two assertions to match actual parentheses; no application code, test scenarios, release status or evidence changed. This is an authored test adjustment, **NOT a test run**. Hosted Node22, browser and approval checks still pending. Original R296 source/preflight SHA and issue scope unchanged.
