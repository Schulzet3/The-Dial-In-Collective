# Issue #10: Internal recipe family reliability

## October 23, 2026 — scope-limited development checkpoint

Owner authorization: finish internal reliability while preserving locked `RECIPE-FAMILY-INTERNAL-ONE-VISIBLE-20261020`. No alternate recipe UI, no threshold invention, no publication or production migration.

Starting development SHA: `a724a3f4fa84c03638dbc0d4c305b6b763b1240f`. Separate queued READY changes for #33 and #100 preserved.

Found an issue in the local recipe engine's correction path: when the owner explicitly chose a successful shot with Make Current, correcting that shot's yield could move it into another existing internal ratio family, while `currentFamilies` and `favoriteShots` still referenced its old family. The chooser then silently fell back to automatic selection. This violates the owner-approved manual override.

Change: move the explicit favorite pointer with that same shot when it remains green and changes family; clear the invalid favorite when a correction makes the shot non-green; do not change preferences when an unrelated shot moves. Do not mutate other shots, names, scores, or styles. Add three regression cases in `tests/recipe-family-selection.test.mjs`. No SQL, UI or public API changes.

Verification state at commit creation: **not yet tested**. Run exact-source Node/lint/build and browser-relevant CI; inspect the results and merge to development only after tests pass. Further Issue #10 lifecycle and hosted two-family acceptance criteria remain open; coordinate with #12/#13, do not assert full issue completion.

Release disposition: **IN_PROGRESS / not READY**. No Netlify publication or production changes.

## CI follow-up: intake bookkeeping

PR103 initial source checks: review, validate, cloud-tests, mobile-browser QA, security-inventory and SQL **SUCCESS**; approval job **FAIL** solely because untracked deployable path `site/lib/engine.js` lacked a queue item (approval coverage itself PASS). Add issue 10 TESTING queue item in this same corrective commit. Recheck exact commit after write; merge only after all applicable checks complete SUCCESS.

## Verified non-force integration

PR #103 head `1663ec6f30895976895bc5df86883d77e26bbffa`: 7/7 checks SUCCESS, including approval intake after queue registration. GitHub nonforce merged PR #103 at `6c82e4e5c9d48f2ecc8301e661d6617fb2e2890d`; development HEAD independently confirmed. Merged-source approval, cloud tests and validate PASS at journal update; final review and mobile QA still pending. Keep TESTING pending final readback. No release.

## October 23/24 — full lifecycle and significance work

Authorization: owner explicitly requests server-side family lifecycle, same-ratio/non-ratio significance handling, and two-family admitted-account verification. Distinct ratio-family logic stays internal; no UI changes and no new automatic time/temperature family threshold.

Source change under isolated branch `work/issue10-server-family-lifecycle-20261023`:
- Add pending versioned migration `20261024021000_dic_personal_family_lifecycle_integrity.sql`: preserve a manual favorite when its corrected green shot enters an existing other family, clear favorites of hidden/non-green shots, retain candidate/confirmed/retired lifecycle, retain original historical family IDs of hidden shots.
- Treat different times or temperatures at exactly the same ratio as **observed, unproven variation**, not proven preference or automatic family creation; persist accurate internal summary. No new visible UI.
- Add `supabase/tests/recipe_family_lifecycle.sql`: disconnected `dic_ci` only, admitted synthetic account with two confirmed families and four saved all-green shots; authenticated Make Current RPC, correction, candidate/retired transitions, hidden provenance, cross-member privacy; entire test ROLLBACK.
- Extend `tests/recipe-family-selection.test.mjs` to ensure the client evaluator records same-ratio unproven variation without altering recommendations or data.

**Acceptance boundary:** Isolated admitted-account testing proves exact SQL and simulated JWT/RLS, not a live hosted user sign-in. Do not insert synthetic shots into production. The currently staged migration must never be applied to production until separately authorized. Do not assert hosted live-account acceptance, full #12 community evidence or #13 experiment lifecycle without independent proof.

CI/merge status at this commit: NOT YET TESTED. Check new exact-source tests/SQL and security/release checks before any nonforce integration, then update journal/queue/status accordingly.

## CI failure and immediate repair — SQL suite dispatch

PR104 first exact-source validate failed **1/785**: `tests/sql-runner-coverage.test.mjs` correctly detected that the new `supabase/tests/recipe_family_lifecycle.sql` was not registered in `scripts/audit/isolated-sql-regression.sh`. The separate SQL CI initially passed but did not yet execute the new test, so it is NOT evidence of lifecycle acceptance. Fixed runner dispatch in this commit and made synthetic beta admission idempotent (existing auth-user trigger may precreate membership). Rerun ALL exact-source checks, especially the actual isolated SQL suite. No hosted operations or publication.

## Approval intake repair

Second PR104 attempt: approval gate failed `DIC-Q-10-recipe-favorite-correction scope paths must be exact deployable files` because the SQL CI runner script was incorrectly placed in the release item's deployable `scope_paths`. The runner remains changed and CI-tracked but is NOT a deployable file. Removed it only from queue scope; preserve `site/lib/engine.js` and the pending migration, and retest.
