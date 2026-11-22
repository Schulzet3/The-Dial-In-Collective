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
