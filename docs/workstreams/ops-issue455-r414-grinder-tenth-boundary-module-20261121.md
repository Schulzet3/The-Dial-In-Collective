# #455 R414 — executable-module reproduction of fractional grinder-boundary advice

DIC_PREFLIGHT_VERIFIED development_sha=7e4ff817ce9965019410e2686e34f493d943e3c8 preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

**Date:** 2026-11-21 UTC. **Scope:** owner-approved #455 independent SAFE research and UX verification. **State:** reproduced against immutable development modules, implementation NOT COMMITTED, NOT READY; no Publish or provider/member writes.

## Fresh authority, source identity and concurrency

Before any issue/docs/Drive reads, independently resolved the live development commit `7e4ff817ce9965019410e2686e34f493d943e3c8`, fetched `docs/ai/PREFLIGHT.md` at that immutable commit, recomputed canonical Git SHA-1 over `blob 5718\\0` + full UTF-8 bytes, and matched `3742fed0176c809b115320c698a0e8b1675b2d3e`. Rechecked the live development branch unchanged immediately before creating this documentation branch. Read-only `main=57adc419ed4b106e158435b465971f5986537b41`, `release/production=07f054f6470b2ae36b36faef8fb9a8161dd3bfb5`. Relevant scoped issue #455 R413 and #335/#267/#33/#96 ownership were reviewed. No #267 exhaustive physical-line credit.

Exactly retrieved and evaluated real immutable application source:
- `site/lib/constants.js` blob `d3559dc1c9560c4d68fbcad1dc91e3a792a100a2`
- `site/lib/model.js` blob `baafc8fa64fa3e359d8e42094e41c5d72a3b22df`
- `site/lib/community-evidence.js` blob `2f4c8e2d473d767445369af5af810aa473722aec`
- `site/lib/engine.js` blob `bdec2d5c00783cc0394667cae112e9a0ad9f2c98`
- `site/cloud/main.js` blob `725865beb790043dfc047ec2ab770734b1d16760` defines Log Shot grind numeric input `step:'.1'`.

## Actual module-level negative reproduction (new beyond R413 arithmetic)

Loaded the four **actual GitHub module bodies** in an isolated JavaScript execution harness by resolving their declared imports/exports; instantiated a real `blankState/createSetup/activeVersion/nextAdvice` route. No fixture, fake substitute recommendation function, changed production member, browser or CI was involved. `time.low=20`, `time.high=30`, actual 18 g in / 36 g out and all five ratings supplied unless noted. Original state/shot/notes/history were checked unchanged.

| Case | Valid espresso range / recorded grind | Actual current nextAdvice | Defect or control |
| --- | --- | --- | --- |
| Fractional floor, under-extracted fast | 0.15–2.55 / 0.20 | Title **Try a little finer**, copy **Try grind 0.1**, `next.grindSetting=0.2`, `next.yieldCenter=36` | **CONFIRMED misleading no-op**: next setting remains original; text promises a different setting below min |
| Fractional ceiling, over-extracted slow | 0.15–2.55 / 2.50 | Title **Try a little coarser**, copy **Try grind 2.5**, `next.grindSetting=2.55`, yield 36 | **CONFIRMED inconsistent 0.05-step target** (new grind not on input tenths, copy says 2.5) |
| Feasible in-range step | 0.15–2.55 / 0.30 | Finer `0.2`, yield 36 | Existing positive control preserved |
| Narrow fractional range | 0.15–0.25 / 0.20 | Claims finer `0.1` but next remains `0.2` | Reproduces no-action masquerading as change |
| All five ideal/green | 0.15–2.55 / 0.20 | **Dialed in**, `next=null` | Locked control preserved |
| Fifth rating missing | 0.15–2.55 / 0.20 | **Finish your taste ratings**, `next=null` | Locked control preserved |

The first case is **more definite** than the prior R413 pure-arithmetic suspicion: `nextAdviceRaw` clamps a freshly rounded finer value to fractional floor `0.15`, then the public `nextAdvice` round/clamp returns unchanged `0.20` while keeping earlier contradictory copy. The ceiling can surface `2.55` as a new adjustment. Source and JS-module reproduction **PASS for reproducing these defects**, not application regression PASS, not actual UI/mobile/offline proof, and not measured taste improvement.

## Proposed narrow SAFE fix and non-deployed dry-run validation

Proposed `site/lib/engine.js` single branch guard: after bounding a proposed changed grind, round to existing tenths and **return a grind-change recommendation only if that tenth is within the real range AND moves in the requested finer/coarser direction**. Otherwise allow the **existing, already-approved yield fallback**; keep original measured shot, private notes and history immutable, one truly changed controllable variable, complete-green/missing-rating behavior and all style/coffee/calibration evidence unchanged. Do not widen calibration bounds or invent numeric espresso optima.

Executed the **same actual four modules** again with ONLY this replacement applied in-memory (never GitHub or provider). Six source-bound control cases produced:
- fractional floor: next `grind=0.2, yield=41`, titled **Try a longer yield**, no false finer claim;
- fractional ceiling: next `grind=2.5, yield=31`, titled **Try a shorter yield**, no invalid 2.55 step;
- valid finer: unchanged good `grind=0.2, yield=36`;
- narrow range: next `grind=0.2, yield=41`;
- all-green and missing fifth rating: `next=null` unchanged.
All six preserved the source-created shot, notes and empty history, and proposed at most one setting change. This is **in-memory JS executable-module check only**; it is **NOT Node 22 hosted tests, actual DOM/offline/mobile/a11y, SQL/Auth or GitHub CI**, and cannot certify a deployed app fix.

**Next exact action:** Commit the one-branch guard in `site/lib/engine.js` plus focused Node22 regressions covering both fractional boundaries, feasible tenth, narrow range, original-shot immutability, all five ratings and single-variable rule. SAME-COMMIT journal must contain the *new run's* exact preflight dev SHA and Git blob. Include a properly TESTING new queue item before submitting executable code; the GitHub Contents connector currently returned an **empty body with real blob SHA** for oversized `docs/RELEASE_QUEUE.json` (`68ef828f734463e4b04d2a13b32ebf7bb40fda45`), including ranged/base64 fetches. Do **not** overwrite or fabricate the queue. Find a byte-complete authorized read route or coordinate existing queue-owner change first; avoid provoking an unqueued app intake failure. Run focused tests and risk-proportionate exact-source CI, then nonforce merge and verify actual resulting SHAs. No owner product approval requested: this would enforce existing input/one-change limits, not add science. If future tests expose a policy choice about fractional grinder precision, hold and route concrete options to existing digest.

## Research, source access and scope limits

Downloaded owner-only October 29 original ZIP through authenticated Google Drive, independently recomputed **66,421-byte SHA-256 `7d562a4536cf4f79bfa17898672ff6a2ec30aa6c1147e7a33f3d06017776bf1d`**, confirmed the ZIP header; pack is **RESEARCH ONLY**, not policy, scientific efficacy or app CI. Drive reported `shared=false`; no raw archive, file ID or private bytes committed. The separate original S019 PDF remains unverified/unavailable; original science citations and real user recommendation outcomes are still incomplete. No changes to Locked targets, queue, READY, app code/tests, production, main/release, Netlify, live SQL/Auth/Edge/member/provider, backup, repo visibility, automations or notifications.

**Checkpoint:** #455 remains OPEN. This is a substantially improved module-level reproduction and safe patch design, not implemented-code completion. [skip netlify]
