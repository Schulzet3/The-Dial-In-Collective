# Issue #455 R455-068 — same-commit SAFE family-evidence gate [skip netlify]

Source parent `caa0501be23ceea477ab0aef6434bbbcd8069274` on `development/backend-foundation`, pinned engine Git blob `d9dee12deee5400ff38393abf5ee1e3dc1adfc8f`. Owner Option B allows independently verified, Locked-compatible narrow repair; not new taste policy and not publication.

## Reproduction / defect
At source `site/lib/engine.js`, `familyShots` filtered by truthy archived `dialedIn` alone. A local Node 22.16.0 evaluation of the exact original source function with a synthetic missing-sweetness legacy shot returned 1 eligible family shot instead of 0. This is a source-fixture reproduction, not observed member incidence. `familyStats`, `familiesFor` and `chooseRecipeFamily` consume this history and could let invalid history anchor a recipe or affect its ratio. Previous #455 safety fixes protected the history card, favorite selection and `hasLocalSuccess`, not this separate family-history selector.

## Single-commit changed paths and authority
- `site/lib/engine.js`: require `dialedIn===true` and existing canonical `isDialed(original tasteScales)` before inclusion in `familyShots`. No numeric taste target change or data rewrite.
- `tests/issue455-family-stale-success-evidence.test.mjs`: actual imported-module positive/negative regressions for missing/nonideal/invalid ratings, truthy flags, genuine successes in Traditional/Turbo/Fast-Flow/Ristretto/Lungo/historical Custom, mixed family ratio, hidden/wrong-family exclusion and exact historical immutability.
- This scoped journal in the same Git commit as code/tests.

All five original taste inputs, private shot notes/history, equipment/grinder/feed/version, alternative successful recipe families and separate styles preserved. Downstream `grindGuidance` and other independent archived-success selectors remain separate review targets and are **not** falsely claimed fixed. No #267 direct semantic line credit; coordinate #335/#33/#96 without touching their files.

## Exact verification state and next action
Before-patch synthetic exact-function Node22 regression: defect reproduced (eligible count 1, expected 0). Patched imported-module Node22, browser/mobile/offline/a11y, SQL/JWT, governance and exact-source GitHub Actions have **NOT RUN YET** at this same-commit checkpoint; SKIPPED != PASS. Source risk MEDIUM, limited app logic. Create code PR [skip netlify], run proportionate checks, repair any failures with same-commit journal, nonforce merge only on passing exact head, then readback merged SHA and applicable CI. Reconcile Issue #455 proposal ledger, scoped workstream journal, CURRENT_STATUS, approval matrix (only if rule authority changed), source register (only if new source verified) and release queue from TESTING to READY only when fully verified. Do not deploy or modify main/release/production/provider/member data. Original S019 PDF not available; 58 curated sources/123 checks retained without invented increases. #455 remains OPEN.
