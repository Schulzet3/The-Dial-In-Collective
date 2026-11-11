# Issue #455 — R455-173 same-style family recorded-control evidence guard

Date: 2026-11-10 UTC. **Authority:** owner Option B SAFE, existing Locked product behavior only. **Source parent:** `3e60b5acdc069fdc315d910a77dcf06a3590cd1d` on `development/backend-foundation`. Existing engine Git blob `336d9e1b4dbda27474bc9948701031993b60ee23`; current model Git blob `00c027c5f10d938fa2cc050572286eb9570817de`. Main `11e1e8c7c36dad488519476d8a969bb682915d31` and production `a106f5fc0f5208b6d56710e5ccaa9d1af68c47b0` read-only.

## Direct reproducible source gap
Current engine `familyStats`, `familiesFor` and `chooseRecipeFamily` previously used `measuredRecipeShots`, checking dose/yield/time only. An archived five-green row with impossible explicitly recorded grinder or temperature could still establish a same-style family interval, while recent R166/R171/R172 corrections excluded such rows from separate recommendation paths. Preserving archived green badges is **not** evidence that impossible controls are valid recipes. No real member incident or cup improvement claimed.

## Scoped SAFE code and test change — SAME COMMIT
- `site/lib/engine.js`: add `familyEvidenceShots` using existing measured physical-entry and temperature bounds. For recorded grinders require numeric finite nonnegative and respect original snapshot's espresso range, falling back to matching historical calibration registry and only matching live calibration. Missing legacy optional controls remain admissible; `familyShots` and all stored original rows unchanged.
- `tests/issue455-family-recorded-controls.test.mjs`: six synthetic positive/negative groups covering malformed grinder/temp, inclusive limits/missing optionals, former range snapshots, historical calibration fallback, invalid chosen vs valid alternate family, physical/five-green eligibility.
- `docs/audits/issue455-research-source-coverage-20261103.json`: two evidence checks and one proposal, **94 source documents / 262 bounded evidence checks / 134 proposals**; no #267 literal-line credit.
- This same-commit journal documents parent SHA, exact path changes, authority, test plan and next action.

**Test truth at authoring:** NOT RUN / CI NOT VERIFIED. No PR merge, READY queue item or completion claimed yet. The October 29 research pack's 48 reference cases are NOT app CI. The standalone original S019 PDF remains inaccessible/unreviewed. No owner-Locked science change, SQL/Auth/Edge/member/provider write, main/release movement, GitHub visibility change or Netlify deploy.

**Next executable action:** read back branch commit and all four Git blobs, open non-force PR; inspect exact Node22/lint/build and relevant browser/mobile/offline/SQL/security/governance PR-head checks, repair failures, nonforce merge only with verified evidence. Verify merged SHA/blobs and applicable exact merged-source CI. Create separate scoped READY/STATUS/queue reconciliation after all required checks succeed, keep #455 OPEN.
