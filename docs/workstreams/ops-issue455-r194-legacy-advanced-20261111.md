# #455 R455-194 — missing optional legacy advanced controls; same-commit receipt

**UTC date:** 2026-11-11. **Authority:** Issue #455 owner Option B, safe Locked-compatible correctness regression only; development only; no deploy.

**Source pinned before change:** development commit `e249930f1b20f3d663bbbc26b0a5e30aea60cab3` Git tree `12771dfada95a7849520c978162a22ed9b8b7a2d`; model Git blob `e1d160b9309341cffc6866fa6061b9c5387f5add`; engine Git blob `0252db33598abb7c7bf6d11feac36793c5b14ec9`. Target branch `research/issue455-r194-legacy-advanced-safe-20261111`.

**Observed source defect and limitation:** Schema-1 `validateBackup` permits restored equipment versions with no optional `advanced` object. `feedMode`, Log Shot `prefill`/`saveShot`, taste advice's temperature branch, and explicit Setup revision/add-basket use direct `v.advanced.*` and can throw a TypeError on such a legacy record. Current cloud `hydrate` explicitly creates an `advanced` object, so this is a **legacy import compatibility source-path regression**, not evidence of a real member incident or espresso sensory outcome.

**Safe fix:** Default *missing optional tracking controls* off when reading; initialize the object only during an explicit Setup/basket edit. Preserve recorded original shots, notes, raw historic feed, calibration/version, all five taste inputs, green status, distinct Turbo/Fast-Flow, explicit Slow Feed choices, member privacy, recommendations' numeric Locked heuristics and no new data capture. No research claim was elevated.

**Same commit changed paths:** `site/lib/model.js`, `site/lib/engine.js`, `tests/issue455-legacy-missing-advanced.test.mjs`, this journal. Positive/negative synthetic direct-module tests cover backward-compatible backup acceptance, read-only prefill/starting recommendation, five-green save and original private notes, explicit Setup edit/add basket, and intact modern optional temperature/Slow Feed behavior.

**Tests:** NOT RUN at authored commit: use exact PR-head Node22/lint/build, Chromium/mobile/offline/accessibility, isolated SQL/privacy/source security and governance as applicable. Inspect actual CI status; SKIPPED/not started is not PASS. After any verified nonforce merge, read back actual merged SHA and exact-source checks, then reconcile Issue #455 research/live-ledger, CURRENT_STATUS and release queue in separate source-bound docs-only receipt. No READY assertion before complete evidence. #267 literal-line review credit **zero**.

**Next:** verify branch/PR exact bytes, run/fix risk-appropriate tests, nonforce merge with checked head and contemporaneous dev SHA if successful; preserve all concurrent changes. No production/Auth/Edge/SQL/provider/member writes, no release/production/main move, no forced Git, purchases or visibility changes.
