# Issue #3781 — returning-session background admission (2026-11-22)

DIC_PREFLIGHT_VERIFIED development_sha=c70825e63c862e8388d0e5da6684426bfc35ca84 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

- Authority: owner explicitly approved showing previously admitted returning member's saved workspace before each fresh server access check, with background revocation; current development c70825e63c862e8388d0e5da6684426bfc35ca84, PREFLIGHT blob c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f; Master Specification and Decision Ledger narrow Locked supersession in THIS commit.
- Acceptance: same-owner unexpired session and prior server-admitted cached state paints before RPC; preview read-only; no Community/Admin/remote sync/writes; negative gate for first login/expired/no cache/pending/rejected/denied/password recovery; background explicit denial erases private UI/cache preserving owner-bound outbox; cross-account epoch fence, periodic retry, offline unchanged.
- Changed paths: site/cloud/main.js, site/cloud/client.js, tests/cloud-background-admission.test.mjs, docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, this scoped journal.
- Precommit check: full source fetched from exact SHA, single-anchor transforms, JSON.parse ledger PASS. CI status at commit creation: NOT YET RUN; report exact hosted statuses after PR and merge. This is a HIGH Auth/privacy change; no shortcut to source-bound CI.
- Release/provider: NOT_APPLICABLE; development only, no Netlify/Supabase writes, production and release branch untouched. Queue status remains subject to strict #3347 frozen-source candidate certification; do NOT label READY before five exact SUCCESS checks.
- Next action: run focused Node and applicable hosted CI; fix failures; nonforce integrate only after exact PASS, then reconcile issue, queue and current source evidence; NEW owner Publish required for production.

## Nov 22 — PR #3782 initial CI and cheap intake repair
DIC_PREFLIGHT_VERIFIED development_sha=c70825e63c862e8388d0e5da6684426bfc35ca84 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

- First source d5e1eb5f: GitHub cloud-tests job 137259625780 and mobile-browser-qa job 137259626108 FAILED before heavy tests due to missing queue scope site/cloud/client.js; step reported DIC queue HOLD: Untracked app change. Not a test PASS; correct by adding 3781 TESTING item with both runtime paths.
- Approval coverage also requires inventory of the new current_owner_background_admission_20261122 Locked ledger key. Add sorted key to the matrix in this commit; no authorization or test gate loosened.
- PR final exact CI after correction PENDING; 3781 remains TESTING until source-bound CI and frozen READY candidate certificate. No production/provider change.

## Nov 22 — HIGH validate shard test-fixture regression fix [skip netlify]
DIC_PREFLIGHT_VERIFIED development_sha=c70825e63c862e8388d0e5da6684426bfc35ca84 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f
- Second PR head `4168fcb264a211f98a4c6118b92b95465a40540a`: queue intake, coverage matrix, build/browser, SQL and security SUCCESS. Actual validate job `137260099463` FAILED 1/2224 due to an old static test requiring constructor text `localOfflineOwner:null,appliedRecommendationValues:{}})` adjacent, whose only disruption was newly inserted `localStartupOwner:null` between them. No legitimate Log Shot behavior regression.
- Minimal source-only repair moves `this.localStartupOwner=null` to the next constructor line, preserving required initializer and previous exact attribution grouping; no user behavior changed. The failing existing assertion remains intact, not weakened or skipped. Rerun exact hosted checks on new SHA. Other runs on old head cannot be used as PASS on new SHA.
- No production change or publication; queue remains TESTING.

## November 22 — merge and exact hosted readback [skip netlify]
DIC_PREFLIGHT_VERIFIED development_sha=088d72957392e07cb98562f3fa5932cd5bac85dd preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f
- Head `cb9a4faf3a6d6a031ccd4ac59f90503b266d23d9` first-party PR validate 45039621942, cloud/mobile 45039621871, approval 45039621920, isolated SQL 45039621979 all completed SUCCESS; unrelated selected/coffee checks also SUCCESS. Frozen603 SKIPPED is not PASS. The earlier queue-intake and constructor-text failures were repaired and remain auditable.
- GitHub PR #3782 nonforce two-parent [skip netlify] merged `088d72957392e07cb98562f3fa5932cd5bac85dd` with exact review head; ref read back. Exact merged-source validate 45039837781, cloud/mobile 45039837803, approval 45039837783, imported regressions 45039837798 SUCCESS. CI runner optimization changed independently on first parent; merged CI validates combination.
- App Auth/read-only cached preview and preserved account revocation/offline outbox requirements checked in six new Node regressions and existing account tests. No real device/performance timing or production runtime claimed.
- Queue updated to tested merged SHA and TESTING; independent #3347 frozen candidate/5 exact native jobs not completed. No new Publish, release ref or provider write; next action safely source-isolate and run candidate checks before READY.

DIC_PREFLIGHT_VERIFIED development_sha=428fb01daaa5b29eb9eb984e4b038eab29432d8f preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

## November 22 — source freeze ancestry integration [skip netlify]
- Owner-authorized #3781 background admission release scope; production currently unchanged. Fresh development first parent 428fb01daaa5b29eb9eb984e4b038eab29432d8f; immutable second parent source-freeze 354ddd99ef0ce8f03b2f74544782e4e977201a31 stores exact clean PR #3782 main.js/client.js against independently verified published app source 64d6f50de9562c0442a05e865e9ed33f0cd2925a.
- Two-parent NONFORCE history integration retains first-parent app runtime/tests/workflows/queue/source tree byte for byte; this journal alone changes on first-parent diff. Older unready espresso/CI/SQL source preserved, no deletion. The freeze serves as a reviewed exact-source pin for later #3347 candidate; NOT a release, not tested frozen batch, not READY.
- Verified original #3782 tests: PR validate 45039621942, cloud/mobile 45039621871, approval 45039621920, SQL 45039621979 SUCCESS; merged-source validate 45039837781, cloud/mobile 45039837803, approval 45039837783 SUCCESS. New frozen-source exact CI NOT YET RUN, never infer PASS.
- Next: stage published-base-isolated #3781 candidate with all other unfinished executable/tests/workflows excluded, five exact native checks, strict READY certification, one approved release claim and provider readback. No production/provider writes here.
