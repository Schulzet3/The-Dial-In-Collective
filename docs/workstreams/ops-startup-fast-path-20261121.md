# Startup fast-path implementation — 2026-11-21

DIC_PREFLIGHT_VERIFIED development_sha=f5db1d4035962af42299707e59c7aec53b8318ef preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Owner approved startup improvements 1–5; no publication authorization.
- Acceptance: server admission precedes private cache paint; matching owner cached coffees render before slow sync; unadmitted and foreign-owner caches never render; outbox and Community review refresh remain intact.
- Change: after verified admission, load owner cache and outbox concurrently, hydrate pending changes and render immediately; keep existing authoritative sync and review refresh.
- Tests: added focused Node regression cases. CI and merge evidence pending. This is a first implementation slice, not a READY claim.
- Remaining: auth callback deduplication, stalled startup recovery, resource-load optimization, cold/warm/offline tests, exact-source CI and queue certification.
- Source authority: development f5db1d4035962af42299707e59c7aec53b8318ef; no provider or production writes.

## Concurrent startup deduplication
- Same-session auth callbacks, visibility and online events now share one in-flight admission/connect operation. Different owner/epoch starts independently, avoiding stalled prior-user requests.
- Added focused concurrency and account-switch regressions; exact updated-head CI pending. No release or publication.

## Local-cache fault tolerance
- IndexedDB cache read/list failures no longer prevent a freshly admitted account from attempting authoritative cloud sync. Server admission still precedes all cache reads.
- Added explicit damaged-cache and admission-order regression tests. Updated-head CI required before merge/READY.

## Dual-failure recovery
- During cloud read outages, a second IndexedDB read failure no longer discards a previously loaded same-owner snapshot. New regression covers simultaneous network/storage outage without bypassing server admission.
- Required CI on this exact commit still pending; do not mark READY.

## Exact source continuity repair — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=f5db1d4035962af42299707e59c7aec53b8318ef preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Root cause: earlier incremental commits lacked a NEW preflight receipt on each code-changing commit; approval CI correctly rejected them. Rebuilt the identical source as one new commit directly from live development base, with this same-commit receipt. Supersedes earlier unmergeable PR history without force-pushing or bypassing approval checks.
- Required: exact new-head five CI jobs, regression results, merge and READY evidence. No publication.

## Immediate neutral startup shell — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=8868768e23de37c7cbeaeae3737f927adcf63f57 preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Acceptance: show a neutral, accessible loading shell before SDK/session setup; never expose private cache or member identity before authoritative admission. Existing error fallback and owner-specific cached fast path remain intact.
- Change: synchronous data-free shell paint at startCloudApp entry; no auth, storage, schema, Community or offline semantics changed.
- Tests: reuse exact prior PR #3658 cloud/approval/security/SQL/imported-source checks for unchanged paths; new exact-head CI required. No deployment or publication.

## Stalled startup recovery — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=cef6e4a951509cb0b9ca4c26fd8529310543fe4b preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- If initialization leaves the neutral startup shell unchanged for 12 seconds, replace it with a data-free recovery message and safe same-origin retry link. Timer is cleared after initialization resolves/rejects. Late auth initialization may still complete; the recovery link never grants admission or accesses private cache.
- Preserve existing session/auth, offline queue, and Community review rules. Exact CI and integration required. No publication.

## Complete startup recovery, deferred nonessential worker, regression coverage — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=049cda39aa4c17e6cae7978b7adc2f675deb820d preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Owner-authorized items 3–5: isolate neutral 12-second stalled-startup recovery in independently testable module; verify no overwrite of completed/error views and no private data in fallback. Preserve identity/admission and cached fast path.
- Defer nonessential service-worker registration to next event-loop turn instead of performing registration before auth SDK setup; registration still occurs while identity is pending, remains nonblocking, preserves offline worker and update behavior.
- Focused startup regression cases cover timeout, late successful paint, failure paint, and timer cancellation; existing cloud-fast-start and offline/security CI suites remain required. No production publication.
- Required: exact-head CI, nonforce merge, readback and queue reconciliation. NOT READY until proven.

## CI repair: asset graph and queue intake — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=049cda39aa4c17e6cae7978b7adc2f675deb820d preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Exact PR head 52ff76a3be24f3dfd12ec37297edbec8183491df: approval FAILED because newly added production module lacked queue intake; mobile-browser-qa FAILED because build allowlist omitted the imported module. Neither failure is counted as PASS.
- Fix: explicitly include startup-recovery.js in pinned public shell build asset inventory and track all three deployable paths in TESTING queue item DIC-Q-455-startup-recovery-deferred-worker. No test/build bypass. New exact-head CI required.

## Browser QA fixture dependency repair — 2026-11-21
DIC_PREFLIGHT_VERIFIED development_sha=049cda39aa4c17e6cae7978b7adc2f675deb820d preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Exact PR head 430c148df060ac9938b1b5d01e56ed12c5072126 browser QA FAILED waiting for .current-mark: browser's synthetic module bundle omitted newly imported startup-recovery.js, preventing CloudApp boot. Production build and approval fixed and passed. Add new module to existing synthetic browser fixture dependency inventory; no relaxed assertion, no new suite, no product behavior change. New exact-head CI required.

## 2026-11-22 — merged startup items 1–5: exact CI reconciled; #3347 release readiness remains HOLD [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=10a3d9d4128e49d002ab395eb1e4e7fc0be68314 preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

- Owner authority: direct November 21 instruction to complete five startup improvements. Product behavior: (1) render same-owner cached workspace immediately AFTER server admission while authoritative sync proceeds; (2) coalesce duplicate same-user/epoch admission callbacks while preserving account-switch separation, cache failure/outage recovery; (3) immediately show neutral accessible startup shell; (4) if unchanged after 12 seconds, show data-free retry without overwriting success or error state; (5) defer nonessential service-worker registration and retain offline support. Focused deterministic tests and synthetic Chromium/mobile/offline regression test coverage are present.
- Merge and byte proof: PR #3658 -> 8868768e23de37c7cbeaeae3737f927adcf63f57; #3660 -> cef6e4a951509cb0b9ca4c26fd8529310543fe4b; #3661 -> e419025863e3cd5b854968caedb3cb7ea07e6816; #3666 head f8c565532653fa0ba96986c40d1f2c0ce60835d8 -> nonforce [skip netlify] merge c9d86f460580faf71ed27a1d5ec54568ef2e2321. Current dev 10a3d9d4128e49d002ab395eb1e4e7fc0be68314. Git blobs matched final tested head and both merged/current for site/cloud/main.js 14bea9447c42822a7215c03a48be5ccc69dbace7, site/cloud/startup-recovery.js b69ac959fe0917dae845c981b38c380a0162b310, build_cloud.mjs a5834d8d1eca645470f2667e6949818b69bc883a, tests/cloud-fast-start.test.mjs 0f6d9dd86cd1586e1fefac29f865c2b5bb7a855a, tests/cloud-startup-recovery.test.mjs 04d250ae6def68cf2e34e10e7aa9d4956f27fb03, tests/browser/cloud_owner_qa.py b6367feca089f1df9666921c837e717b09c7774f.
- Five exact PR-head required jobs COMPLETED SUCCESS, source f8c56553: validate 44983899987/job 137090209796; cloud-tests + mobile-browser-qa 44983900004/jobs 137090149577 and 137090149389; approval 44983900084/job 137090149731; isolated SQL 44983900050/job 137090149531. Source security inventory 44983899994/job 137090149380 also SUCCESS. Merged push c9d86f46: validate 44984255308/job 137091241798, cloud/mobile 44984255272/jobs 137091241406 and 137091241684, approval 44984255262/job 137091241653, all SUCCESS. Merged SQL and security untriggered/NOT_APPLICABLE, not falsely PASS. Original frozen603 SKIPPED/NOT PASS. Earlier test, allowlist, browser fixture and preflight continuity failures were corrected in final tested head.
- Queue row DIC-Q-455-startup-recovery-deferred-worker previously had null merged SHA and obsolete CI pending blocker; reconcile to VERIFIED source/testing receipts, keep TESTING. The published base is 7a5b27d342c6c49bd75e8d1e4cb164a76bd2c174. Seven different unready #455 source rows overlap site/cloud/main.js; queue READY count before this update was zero (401 DEPLOYED / 51 TESTING / 6 IN_PROGRESS). The #3347 zero-blocker immutable published-byte-isolated candidate, inclusion/exclusion of tests/workflows and five native candidate-SHA SUCCESS jobs do not yet exist for startup. Do not mark READY based solely on PR/merge success or leak other unready features. No code/test/CI changed in this docs-only reconciliation; suites NOT RERUN. No publication, prod grant, provider/SQL/Auth/Edge/member/backup/schedule/spending writes.
- Next executable step: #3347 construct exact source-isolated nonpublishing candidate with only owner startup scope and verified dependencies, avoiding same-file TESTING #455 code and unrelated test/workflow imports. Run exact five candidate-SHA jobs once, fix failures, then atomically promote this queue item READY with verified candidate receipt and reconcile current status/issue. If isolation cannot be proven, remain BLOCKED/TESTING without shortcut. Issue #455 remains open for separate research, #3347 remains open for READY process.
