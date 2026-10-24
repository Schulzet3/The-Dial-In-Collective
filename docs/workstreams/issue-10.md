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

## Final scoped source result — PR #104 merge and exact-source verification

PR104 HEAD `903b27ecc02ac09834cd1a7d03f11be0694c6cf3`: all seven required CI jobs SUCCESS after repairing SQL runner dispatch and queue scope. Explicit disposable PostgreSQL17.11 regression `recipe_family_lifecycle.sql` PASSED, including JWT-path owner Make Current, two confirmed eligible same-coffee/style families, correction/retirement and guest privacy; ROLLBACK verified. Latest Node/lint/build validates 785 tests, all passed. Mobile, review browser/visual/offline and security/approval passed.

Nonforce PR #104 merge `8542286bb52a600a5c1c7ee962b5ad45ff3cd2aa` independently confirmed as development HEAD; matching tree `501aec8db406ac83d95b57bbce08e5e33abc40a9` versus tested HEAD. Merged-source validate `40052429083`, approval `40052429043`, cloud/browser/mobile `40052429176`, SQL `40052429177`, review `40052429034` all SUCCESS. Existing independently READY #33 and #100 untouched.

Queue item `DIC-Q-10-recipe-favorite-correction` marked **READY for source release only** with PR104. Pending migration `20261024021000_dic_personal_family_lifecycle_integrity.sql` not applied on hosted Supabase. No Netlify release, changes to Auth/member-data or spending.

**Issue #10 remains OPEN:** live hosted account contains zero coffee/style/setup groups with two eligible families (read-only aggregated check; no account IDs used). Thus actual signed-in hosted two-family switch/reload/offline/equipment acceptance cannot presently be verified without impermissible fabricated production data. Preserve explicit #10 live acceptance and distinct #12 community and #13 experiment work as outstanding. One visible recipe remains locked. Release readiness of the scoped tested code must not be misreported as live hosted verification or completed issue acceptance.

## October 24 follow-up: extended Issue #10 closure-oriented acceptance

Owner explicitly requested to perform every safe test toward Issue #10 closure. Latest development branch inspected at `a034fb727f7fa7a0fbbfd74bbbca40d2fce9a651`, including concurrent independent #5 TESTING queue changes. Hosted Supabase read-only aggregation still finds **zero real account+coffee+style+setup-version groups with two eligible families**; staged #10 SQL migration has not been applied live. Therefore no test can truthfully establish the explicitly required real hosted two-family result without natural owner data and authorized publication. No synthetic data were inserted into production.

This test-only work adds:
- Disconnected PostgreSQL `supabase/tests/recipe_family_lifecycle.sql`: revision-conflict rejection, authenticated switching to the second family and back, authenticated state readback to simulate reload, old-version Make Current rejection after equipment versioning, and unchanged earlier correction/retirement/privacy checks. ROLLBACK.
- Node `tests/recipe-family-selection.test.mjs`: fresh owner hydration preserves selected family and original shots; hardware versioning leaves historical data intact, avoids claiming cross-setup calibrated time, and restores old version manual preference when selected.
- Injected 390px synthetic browser `tests/browser/cloud_owner_qa.py`: reload and offline-network-view continuity for the single displayed recipe, without alternate recipes UI or member-data writes. This is **not** a real hosted browser login, nor native physical device acceptance.

These are **tests only**. The already READY #10 source slice, two independent READY #33/#100 items, and unrelated #5 TESTING remain unchanged. Exact-source CI and nonforce merge required before calling these new checks complete. Issue #10 real hosted acceptance, #12 community source/provenance integration and #13 experiment coverage must not be fabricated, waived or silently moved. No release, SQL execution on hosted database, or issue closure authorized without verified acceptance.

## October 24 extended acceptance completed — PR #106

Owner requested to perform all feasible tests to close Issue #10. PR106 head `fd7f55048a29b8b47d882d4923dcbf45958888ee` passed 788/788 Node tests (0 failures), complete isolated PostgreSQL 17.11 test suite including `recipe_family_lifecycle.sql` for two-family authenticated switching, revision-conflict denial, state readback, equipment-version isolation, corrections, retirement and cross-member privacy, all rolled back. Injected 390px browser tests checked persisted single visible recommendation through synthetic reload and offline network state. Browser/mobile, full review/visual/PWA/offline, approval and cloud tests all passed. GitHub PR106 nonforce merged `1a6570ed8c43dacf6bca7a6239b8c5fae1f06130`. All SIX merged-source check runs (`validate`, `mobile-browser-qa`, `review`, `sql`, `approval`, `cloud-tests`) independently confirmed SUCCESS. This is a test-only change; current Issue #10 source READY status is preserved with original release item tested merge SHA `8542286bb52a600a5c1c7ee962b5ad45ff3cd2aa`.

**Remaining blocker to closing Issue #10:** no real live admitted member currently has two eligible families for the same coffee/style/setup version (read-only aggregate = 0), and the staged SQL lifecycle migration is not applied live. Cannot honestly mark real hosted owner switching/reload/offline/equipment acceptance PASS without authorized publication and naturally available legitimate multiple successful approaches. Also #12 contributor/source evidence and #13 lifecycle integration remain separately scoped. No fabricated production test records, production SQL, Netlify publication or Locked decision changes.

