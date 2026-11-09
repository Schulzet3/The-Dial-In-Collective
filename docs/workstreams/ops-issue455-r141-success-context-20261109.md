# Issue #455 — R455-141 exact-recipe success evidence and Log Shot feedback context

**Date:** 2026-11-09 UTC. **Status at authoring: TESTING, not READY.** Same-commit source-bound developer receipt; do not describe unrun CI as successful.

## Recovered authority and source

Source parent `e209891c276d1ace8b9f8206092ac3f00929d343`; parent tree `eee349ae34865dc5be874f7de7ec438eef2be119`. Original engine blob `b84782d216f12d845b768c174e03b9b3ca53da30`. Development-only owner Option B, AGENTS.md, docs/ai/CONTEXT_ENTRYPOINT.md, PREFLIGHT.md, Master Specification/Decision Ledger/approval matrix, #455/#335/#267/#33/#96 and current #33/#267 PR work reviewed. Main `55c2bebcdcabda40e890ac25dcb9880ec789b5a4`; release/production `2d0bed35e67f6a745a21cbd80616ad4c9a98ed41` at intake, intentionally unchanged. Repo's temporary PUBLIC November 4–30 exception is owner-authorized #630; no visibility changes. Separate original S019 PDF remains inaccessible after explicit connected Drive and Library search; separate slow-feed PDF present. #267 V2 semantic-line credit ZERO.

## Deterministic source defect and safe correction

At `site/lib/engine.js::recommendation()`, last eligible feedback was filtered to **same coffee, setup version, style, basket, feed mode and calibration**, but the all-green veto was only same coffee, setup version and style. This allowed an actual success on a different basket, Slow Feed mode or old calibration to suppress a fresh next-shot adjustment for today's distinct recipe context, even though earlier code correctly excluded the other success from the measured `last` scope. No real-member occurrence established.

Narrow SAFE change: apply the already-used basket/feed/calibration equality to `measuredLocalSuccess`, without changing the all-green criteria, family eligibility/selection, success history, underlying dose/grind/yield/temperature, notes, Community, calibration translations or Locked numerical defaults. Exact matching green still takes precedence over a conflicting adjustment. The original personal successful recipe stays independently available; only unrelated-context success stops vetoing actionable feedback for the current context. No taste-quality effect is asserted.

**Changed paths in same code commit:** `site/lib/engine.js`, `tests/issue455-successful-recipe-context-boundary.test.mjs`, this scoped journal. **Three synthetic source regression cases:** mismatch in any basket/feed/calibration -> positive adjustment; exact matching green -> preserve precedence; missing rating/hidden/unloggable green -> does not veto. Assert all five tastes, original private notes and state unchanged. Source evidence only at authoring; direct local Node/browser/provider tests not performed due inaccessible local GitHub network. CI must verify Node22/lint, UX/mobile/offline, SQL/security only where applicable. No new user data, production writes or deployment.

## Next action

Create and compare a source-bound non-destructive PR; wait for exact PR-head CI and repair failures. Read back merged SHA and blobs; reconcile Issue #455 source evidence ledger/backlog, CURRENT_STATUS, queue item and journal after verified non-force merge. Label unexecuted checks SKIPPED/NOT_RUN rather than PASS. Do not move main/release/production or publish.
