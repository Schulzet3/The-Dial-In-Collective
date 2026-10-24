# Issue 5: trusted-source identity assurance

## October 23, 2026 MDT

Authorization: owner requested complete remaining focused tests and repairs, no production publication. Recovered from live development `b64bbfe642ef69a0232955ea5a993137ff0e306b`, Issue #5 history and October 23 owner-observed real two-account Arbey Cordoba approval/deduplication with independent read-only Supabase evidence. Previously existing trusted-source tests cover false domains, harvested release mismatch, reused URL, stale revision, revoke, service-only JWT and Pending retry; the latter are synthetic, NOT real logged-in negative evidence.

Confirmed gap: source parser checked explicit Process but not explicit Origin/Producer, and trusted server-only source target omitted proposed Producer. Narrow fix compares only independently stated JSON-LD Product additionalProperty fields, rejects ambiguous/conflicting facts, allows country-only versus region+country, never invents missing values. SQL target wrapper is service_role-only and read-only. Add Node negative tests and rollback-only SQL assertion. Preserve source host, release, role, freshness, retries, ownership, canonical identity, history and provenance.

Staged migration `20261024020500_dic_source_target_producer.sql` is NOT applied. Supabase Edge/frontend remain unchanged live. No production records, credentials or provider settings touched. Source exact-SHA CI/merge and release readiness must be read back before calling this READY; real production negative observations unverified.

## CI recovery
Initial PR105 approval job 40052296053 failed because release queue scope_paths incorrectly listed two nondeployable test files. Approval coverage itself passed. Removed test-only paths from scope_paths while preserving test coverage, staged implementation and no-release boundary. Rerun exact-source PR checks required.

## October 24, 2026 UTC — PR105 merged, source READY

PR #105 successfully nonforce merged into `development/backend-foundation` at `a034fb727f7fa7a0fbbfd74bbbca40d2fce9a651` (read back as exact branch head; merge tree `6877a821f34eec1bb352675695f1ca3fce04831b`). Two unrelated Issue #10 concurrent queue changes were carefully reconciled without overwriting their READY work. Initial approval CI failed solely on erroneous inclusion of test-only files in deployable scope_paths; corrected and rerun.

All six final PR-source checks on `060387a5e360cadc3fa4e38bad45284bab2ae101` SUCCESS: approval `40052571214`, security `40052571219`, isolated SQL `40052571240`, Node/lint/build `40052571343`, cloud/mobile `40052571307`, visual/browser `40052571296`. Exact merge-source checks SUCCESS: approval `40052834393`, Node/lint/build `40052834378`, isolated SQL `40052834521`, cloud/mobile `40052834386`. Unchanged implementation code preserves passing premerge security/visual results. These are staged source/isolated checks, not hosted authenticated negative tests.

Queue `DIC-Q-5-source-fact-integrity` is now READY, no scoped prepublication blockers. Production NOT changed: migration is STAGED ONLY; published Edge and Netlify unchanged. Full Issue #5 closure is deferred until separately authorized release and appropriate authenticated provider readback for remaining official-source and Pending retry cases; do not count unrelated extracted product coverage or admin review twice.
