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


## October 24, 2026 UTC — real hosted postrelease integrity readback

Issue #10's internal recipe migration is now applied in release DIC-20261024-READY-QUEUE-06. Production read-only counts: 23 shots, 23 notes, four personal recipe families, four preferences. No invalid favorites or cross-owner/coffee/style family mismatches found (zero each). The hosted database still contains exactly ZERO real admitted member+coffee+style+setup-version combinations with two distinct eligible successful families. Thus live authenticated switching Current back/forth, reload, equipment-change handling and offline replay cannot be demonstrated honestly on existing natural records. Retain prior rollback-only PostgreSQL tests and synthetic browser tests as separate evidence; they passed on PR #106, not real authenticated live usage. Do not insert test shots, alter real member preferences, or silently close this issue. Full cross-user #12 and experiment #13 integration remain distinct.

New safe public postrelease HTTP/JWT denial workflow is scoped to both issues but does not establish hosted personal recipe acceptance. Source only, no new deployable code/Netlify publication/production mutation. Exact-source CI outcome pending.

## Post-publication smoke CI receipt

Source b13596d456914eaf5f14c07bdf99ebf27017f973 live anonymous/site safety run 40058958473 passed all six checks. Build 40058958447, browser/mobile 40058958450 and approval 40058958454 SUCCESS. Read-only production: four personal families/four preferences; zero cross-owner/coffee/style mismatches, zero invalid favorites, and zero legitimate dual-eligible-family groups for one owner/coffee/style/setup version. No synthetic production shots. Issue remains OPEN strictly for real hosted authenticated multi-family switching/reload/offline/equipment acceptance and distinct #12/#13 integrations. No deployment in this test-only commit.

## October 24 2026 UTC — authenticated disposable PostgREST acceptance experiment

Owner authorized synthesizing an isolated, production-shape test environment to complete as much of Issues #5 and #10 as possible, without changing live member data or publishing another release. Existing rollback-only SQL dual-family and trusted-worker tests remain valid; previous real-public smoke checked 401 but could not exercise authenticated server operations. New `tests/sql/issue-5-10-signed-http-fixture.sql` adds a synthetic admitted owner (email at `ci.example.invalid`), four real disposable SQL shots across two confirmed same-coffee/style/setup families, separate Pending exact-release sources, and a test-only grant letting the locally HMAC-authenticated PostgREST authenticator assume `service_role`. All data and service keys are strictly local to the disposable `dic_ci` PostgreSQL17.11 and containerized PostgREST12.2 environment; no production account or actual service JWT is used. Signed HTTP acceptance extends `tests/qa/signed-http-acceptance.mjs`: owner make_current switch, stale revision, back-switch, state reload, foreign denial, source target/claim/official provenance and idempotent service replay, foreign/stale member Pending Retry and exact owner reassociation with stable library UUID, private notes unchanged. HTML product evidence is synthetic, never attributed to an actual roaster site. This covers contract-level equivalent behavior, not live Supabase GoTrue login, actual Edge external fetch or owner physical device.

This checkpoint is **not yet PASS**. Exact-source CI isolated SQL, signed HTTP, Node/lint/build and approval must run, failures must be repaired, PR merged nonforce with readback, then final readiness/closure scope reconciled. No application or migration changes, no Netlify publication, no changes to existing member data, specs, Locked decisions or original Issue #10 requirement for a genuinely real member with two naturally eligible families.

## PR107 failure recovery: HTTP stale retry

First signed local JWT/PostgREST run 40059377581 passed 47 assertions, including two-family switch, source promotion and foreign denial. A stale Pending retry then timed out after 10 seconds. Source raised retryable SQLSTATE 40001, which did not yield a prompt HTTP response. Fixed narrowly by staged function replacement 20261024034800_dic_pending_retry_http_conflict.sql, returning a safe nonmutating {ok:false,code:'conflict'} response before writes. Updated SQL and HTTP tests. Separate ESLint duplicate import fixed. Queue item DIC-Q-5-pending-retry-http-conflict in TESTING; exact-source CI and merge pending. No production mutation or publication; genuine production member acceptance remains unverified.

## CI reconciliation: PR107

Run 40059619954 passed isolated PostgreSQL 17.11 and all 50 signed local PostgREST JWT checks. Node run 40059620028 failed a historical receipt test that selected a new TESTING issue item before an already DEPLOYED historical item. Corrected receipt selection to bind the four previously deployed items to exact release DIC-20261024-READY-QUEUE-06. New stale-retry migration remains unpublished. Await CI rerun.

## Owner test-evidence substitution, October 23/24 2026

Owner explicitly accepts PR107 isolated signed-JWT integration testing in place of real-member session acceptance for Issues #5/#10 only (decision TEST-ACCEPTANCE-ISOLATED-JWT-ISSUES-5-10-20261023, recorded in both canonical files). All 50 synthetic signed PostgREST HTTP assertions passed; no hosted GoTrue login. Issue #10 remains OPEN because the original criterion for contributor-balanced Community source/provenance hierarchy is unfinished in Issue #12. Issue #13 experiment lifecycle remains independent; no feature or release is waived beyond the exact test modality. The separate #5 stale retry migration is READY but unpublished. No production operation authorized.

## Proactive ownership directive (owner Oct 23/24, 2026)

Owner wants an Issue #10 closure request treated as end-to-end development authorization. Investigate and implement relevant #12 Community evidence integration instead of handing back a list of tasks. Resolve failed CI and retest immediately, verify exact source and merge, record evidence, queue READY without publishing. Do not treat the owner-approved isolated signed-JWT evidence as blanket waiver of #12 source/provenance behavior. Current #5 migration remains separately READY/unpublished. CI completion monitoring is configured hourly (not instant) and no project setting can provide unattended unscheduled execution.

## October 24, 2026 — owner-authorized Issue #12 dependency implementation for #10

Source recovery development `e6d874510448f6cd3d0f21f5edabc3d2863a14ed`, Issue #10 and #12 original acceptance, Section 25.2, current approved single visible recipe and all prior evidence reviewed. Owner instruction: "get issues 5 and 10 closed please"; proactively pursue previously approved #12 contributor-balanced Community evidence hierarchy rather than hand the dependency back to owner. #5 ready stale retry migration remains untouched and unpublished.

Implementation candidate: service-side admitted-only `dic_community_recommendation_evidence(uuid,text)` using only eligible validated, verified canonical Community projections, owned library-entry lookup, exact/related release/similar metadata tiers and one median per contributor per approximate ratio bucket. No private contributor, shot IDs, notes, grinder setting or identity are included in the response. The local recommendation accepts only signed-source shaped aggregate data, ranks Section 25.2 tiers conservatively, never overrides an owned exact family, never cross-copies style or grinder calibration, and always treats Community output as unproven. Network call is lazily made on coffee expansion, cache is account-epoch isolated and optional so Log Shot never blocks; no extra routine UI step.

Added Node precedence, forged provenance and owner-override tests and isolated SQL fixture privacy checks. New migration remains source-staged. **TESTING** until CI passes. Do not publish or close #10 simply because source exists; read back tested PR merge and account/Community correctness first. Issue #12 may have additional durable provenance through Use Recommendation and hydration to address in followup; do not claim coverage of that before implementation. No product decision or Locked rule was changed.

## CI recovery — October 24, 2026

PR108 initial Node and visual CI identified a missing explicit production asset allowlist entry for newly imported site/lib/community-evidence.js. The source graph deliberately fails closed. Fixed by including the exact new module in build_cloud.mjs allowlist; this also copies and hashes it as part of the PWA shell. Source/Node and private browser checks need a new exact-SHA rerun. No deployment or hosted SQL applied.

## CI intake recovery

The first retry fixed the site graph by explicitly copying site/lib/community-evidence.js into production assets. Exact-source approval then correctly failed closed because the related build_cloud.mjs change was missing from queue scope_paths. Reconciled the new deployable build path in the same Issue #12 TESTING queue item, preserving Issue #5 READY. Rerun combined exact-source CI; do not publish until READY and separately authorized.

## CI browser recovery — October 24 UTC

PR108 post-allowlist exact tests passed all Node/build and SQL, but 390px browser QA bundle transpiler required the new community-evidence module registered before engine. It had initialized `Modules.engine` before `Modules.community_evidence`, producing a JavaScript destructuring error, not an application product failure. Corrected the explicitly ordered browser module list and added the optional read-only Community RPC fixture. This does not loosen test assertions. Rerun exact-source CI; staging only.

## October 24, 2026 — scoped release candidate for #5/#10/#12

Owner authorized one release needed to finish these issues. Development branch 2f4668f includes separately TESTING extractor #33 (merged PR109), so the existing release gate correctly rejects publishing its full tree. This isolated source builds from the post-PR108 9135e06 ancestor and carries only in-scope PR110/PR113 changes; unready extractor work remains untouched on development. This commit applies PR110 client provenance-only hunks to existing source; subsequent migration/tests integration and CI are pending. No Netlify/Supabase publication or data writes. Preserve #5 READY, single visible recipe, owner isolation, offline queues and no new paid services. Do not mark source READY until scoped exact-source CI passes.

### Scoped candidate migration and regression fixture reconstruction

Applied unchanged, previously source-verified PR110 provenance SQL and the final PR113 Community SQL, including independently member-confirmed families, owner exclusion and anonymous source counts. Reused PR110/113 signed HTTP, rollback-only PostgreSQL and Node regression tests without changing expected outcomes, and included the appropriate private display/shot payload modules from the prior provenance commit. No extractor #33 deployable paths added to this scoped candidate; comprehensive candidate CI and branch isolation verification still pending. No live provider mutation, publication or member-data changes.
