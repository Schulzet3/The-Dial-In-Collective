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

## October 24, 2026 UTC — post-publication closure tests, current round

Owner authorized all safe work to close Issues #5/#10, without authorizing another release or fabricated production member actions. Verified Netlify deploy 6adc20c03a07673c4dd08035 READY/current at commit 65ee38609db6bd5977dd0f2b393e7791a5e1b766, Supabase dic-verify-coffee v7 ACTIVE with verify_jwt=true, and applied producer-target migration. Read-only production role grants: both public trusted-source RPCs permit service_role, deny anon and authenticated. Current Supabase source counts: seven member label sources, three historical roaster_page sources, newest roaster_page checked October 14 (none prove new v7 behavior). Source attempts currently zero; exactly one Pending submission remains and it has no source_url or release_label. There is no eligible existing Pending submission to drive the new official verification/retry without inventing a product, real signed-in JWT, or changing member data. Four function-edge log entries for dic-verify-coffee in past 24 hours are not evidence of successful signed-in verification.

New nonpublishing GitHub public-hosted smoke workflow tests website/admin HTML and rejects anonymous/forged JWT against both published Edge endpoints. It performs only safe requests and logs no member data; it cannot prove real signed-in approval or fresh official source parsing. CI outcome to be recorded after exact-source run. Preserve issue OPEN until genuine new official-source signed-in acceptance exists. No production database or authentication changes in this round.

## Post-publication smoke CI receipt

Source b13596d456914eaf5f14c07bdf99ebf27017f973 passed 6/6 live site/admin and anonymous/forged-JWT verifier+preview denial in run 40058958473. Build 40058958447, browser/mobile 40058958450 and approval 40058958454 SUCCESS. Post-test production inventory 23 shots, 23 notes, 2 Community and 52 mutation receipts unchanged. Single Pending row still lacks URL/release, so cannot use it for genuine source-backed member Retry. roaster_page source records predate Edge v7. Issue stays OPEN strictly for naturally available authenticated official-source verification/Retry acceptance. No deployment in this test-only commit.
