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


## R455-141 recovery continuation: genuine intake failure corrected (2026-11-09 UTC)

**Recovered latest source before authoring:** development `09df3820a08809382dab8bf81b00249c0557488d` tree `5e70f889d1d21fb8e4027c9f395ee48194807004`, main `55c2bebcdcabda40e890ac25dcb9880ec789b5a4`, release/production `2d0bed35e67f6a745a21cbd80616ad4c9a98ed41`. Original PR #1702 headed at `260c605cd552811d1efb62f6194c720eb8d0f185`, 16 intervening development commits and a concurrent `docs/RELEASE_QUEUE.json` update; do NOT overwrite those commits. Engine source before fix remains Git blob `b84782d216f12d845b768c174e03b9b3ca53da30`; same verified proposed engine/test blobs `c91656d7cef5fd0621d883d433f0c0b519359dbe` / `ce88688a6b40773932bb3f9d8f8bedfa84f47df7` brought forward unchanged. Original R141 source logic and three synthetic positive/negative/immutability tests are retained verbatim.

**Actual first PR CI:** Node22/lint 42669095534 SUCCESS; UX/mobile/browser 42669095359 SUCCESS; isolated SQL 42669095309 SUCCESS; security 42669095492 SUCCESS; frozen603 42669095202 SKIPPED (NOT PASS); approval/governance 42669095298 **FAILED** during release queue intake with diagnostic `Untracked app change; add an IN_PROGRESS/TESTING/READY queue item: site/lib/engine.js`. It did not fail a Lock/taste scientific rule. Source checkpoint requires repairing the missing queue item; do not merge failing source or call it READY.

**This recovery commit:** Rebase onto the actual concurrent development tree using immutable existing engine/test blob SHAs, plus this same-commit journal and a non-destructive appended `DIC-Q-455-success-veto-current-recipe-context` TESTING queue item. Keep latest other queue entries, baseline, history and all unrelated source bytes untouched. No changes to models, Locked ratings, previous shots or user data. New PR-head CI and merge remain NOT_RUN at authoring. Next: verify actual PR diff; require CI approval/Node/UX/SQL/security; non-force merge and read back source SHA/blobs; reconcile journal/queue/CURRENT_STATUS and traceability ledger; leave Issue #455 open. No production, main, release branch, Netlify or SQL/Auth/Edge/member/provider writes.
