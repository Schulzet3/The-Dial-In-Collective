# Issue #455 R295 — SAFE Log Shot stale validation feedback [skip netlify]
Date: 2026-11-16 UTC

DIC_PREFLIGHT_VERIFIED development_sha=2cb0d03b90fc3bcc207b58064044f7bb07f4e356 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Source, authority and specific reproducible discrepancy
- Owner #455 Option B authorizes narrow, Locked-compatible source and accessibility correctness with same-commit regression and no Publish.
- Live immutable development source 2cb0d03b90fc3bcc207b58064044f7bb07f4e356; PREFLIGHT.md Git blob 2fb236bbfa6bac48513eeb3bd157b260853af06d fetched by commit and full raw Git blob exactly equal **before** AGENTS/issues/other providers. Rechecked development/ref and blob immediately before authoring.
- Original source Git blobs: site/lib/ui.js bdaf4e9292229aeac4b03fc3f9da51c5497d76e5, site/cloud/main.js 28c6f6026d0ff1e6fd6575d3813b76c06a29bb47, research ledger 84079ef73659b6f4d8fb934031384d430a9a9101, release queue 3f2f2f415a5d8d09fde1c97dbab2ec15b329a2b8.
- Real CloudApp.showLog renders role=alert #shot-validation-feedback. On invalid Save, the error() path populates it and focusShotValidationError marks invalid numeric inputs. Actual CloudApp.input removes aria-invalid and its validation-describedby upon field edits but leaves the original stale error text visible; rating taps already clear the error message. This is source-reproduced, NOT a demonstrated incident on a real user's device.
- SAFE correction: exported UI helper acknowledgeShotInput checks only a previously locally invalid input and removes that stale local feedback, keeping unrelated noninvalid-input cloud/server errors intact. CloudApp.input invokes helper within #shot only. No changes to rule validation, rating click, five taste entries, taste targets, dose/yield/time/grind/temp values, recommendation engine, setup, versions/calibration, Turbo/Fast-Flow/slow feed, private notes/history, Community or RLS.

## Changed paths and positive/negative regression before CI
- site/lib/ui.js: new guard for local validation invalid marking, null-safe, preserves unrelated describedby and alert on ordinary valid field.
- site/cloud/main.js: replace inline numeric input cleanup with tested helper, still only within Log Shot.
- tests/issue455-r295-shot-validation-feedback.test.mjs: five tests covering invalid field cleared, ordinary input cloud error preserved, other invalid field preserved, null/legacy input guard, and exact CloudApp call-site/validation/five taste intact.
- docs/audits/issue455-research-source-coverage-20261103.json: append 1 current source, 2 bounded actual-code checks, 1 SAFE proposal; preserve prior 160/491/225 entries; now 161/493/226 on this candidate only.
- docs/RELEASE_QUEUE.json: append one unique TESTING row, not READY or DEPLOYED. Every prior item/history remains unchanged.
- This SAME-COMMIT scoped journal carries the newly fetched preflight receipt, negative old call-chain, positive new handling, unknown real-device acceptance and next action.

## Verification / not-yet-run
- At commit authoring, all five new Node22 assertions, browser/mobile/offline, SQL/privacy/security, governance and full app acceptance are NOT_RUN/PENDING; original603 SKIPPED not PASS; no claimed cup-quality outcomes or real member data investigation. No scientific or numeric-policy change.
- NEXT: inspect exact PR-head CI; diagnose failures and repair on a new source-bound same-commit journal, nonforce merge only when relevant checks PASS, read back actual merged source/test/ledger/queue/journal blobs and merged CI, then reconcile READY/current status in a separate CI-gated change. Preserve #33/#267/#96 workstream ownership, S019 missing provenance, no provider writes or deployment.
