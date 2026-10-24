# The Dial In Collective — deferred combined release handoff

**Checkpoint:** October 24, 2026 UTC. **Source of truth:** private GitHub `Schulzet3/The-Dial-In-Collective` and live provider readbacks. **Latest owner instruction:** “Since you've marked the issues closed, you don't need to continue with deployment. I will do a deployment when the extractor changes are ready. Please document your progress so another chat can publish all the pending changes.”

## Decision and boundaries

- **STOP publication now.** This instruction supersedes the earlier conditional approval to publish immediately. No Netlify release, release-branch push, release request/grant/consumption, or additional production SQL is authorized by this handoff. Obtain a NEW explicit publish instruction after the extractor is READY. The user wants the pending READY changes and extractor in ONE later batch.
- This document is a checkpoint, not proof that all later conditions remain true. Re-read current refs, CI, queue, releases, provider state, Master Specification, Decision Ledger, approval coverage, `AGENTS.md`, active journal and release controls before publication. Keep GitHub private on Free; use non-force, single-use serialized release mechanics. No paid-service purchases.
- Do not weaken source acceptance, share private member data, erase shots, notes, Community evidence, offline queues, account identity, receipts, or historical data. Do not alter Locked decisions or invent global Community family identities.

## Verified state as this handoff was written

| Surface | Evidence |
|---|---|
| Development | `development/backend-foundation` at `488fc83db7ebdcf19b3efc8fc427848fabf90ebd` when this handoff branch was created. Concurrent extractor work may move it. |
| Operations | `main` at `d4a4098a454adcf931a93615566eb82433f5346e` at recovery. |
| Publication Git branch | `release/production` at `65ee38609db6bd5977dd0f2b393e7791a5e1b766`. |
| Actual Netlify publication | Site `the-dial-in-collective`; deploy `6adc20c03a07673c4dd08035` READY/current. That deploy corresponds to the last released app, **not** #12's new frontend. |
| Release-queue published baseline | Tested app `28f908dc9828a45558bd56b532fed17022cef3d8`, release SHA `65ee38609db6bd5977dd0f2b393e7791a5e1b766`. |
| GitHub issue states | **#5 CLOSED, #10 CLOSED, #12 CLOSED**; extractor **#33 OPEN / TESTING**. Closure of source work is not proof of Netlify delivery. |

## Production Supabase SQL already delivered — NEVER REPLAY

The owner-approved production change applied exactly three source-verified migrations using connected Supabase. The provider assigned **different migration version numbers** from their GitHub filenames. The provider migration ledger and installed function/trigger behavior were independently read back:

| Checked-in source migration | Actual production migration version/name | Tested source blob |
|---|---|---|
| `20261024034800_dic_pending_retry_http_conflict.sql` | `20261024052303 dic_pending_retry_http_conflict` | `2a9eca5b32e37dd937a5257a02981dd6113b84f7` |
| `20261024041100_dic_community_recommendation_evidence.sql` | `20261024052411 dic_community_recommendation_evidence` | `bb235321c44cf0da960226fe80fdbf8629779f29` |
| `20261024041800_dic_recommendation_use_provenance.sql` | `20261024052419 dic_recommendation_use_provenance` | `65117164c599a6cc2722536bd509fbdff9bc1bce` |

- Verified: Pending Retry has structured non-mutating conflict instead of retryable `40001`; member-only Community recommendation RPC exists; private provenance trigger is enabled; `dic_apply_client_change` still uses the protected mutation pathway.
- Production aggregate readback: **23 shots, 23 notes, 2 Community rows, 4 personal recipe families, 10 library entries and 4 recipe preferences**. No historical member rows were intentionally changed. This is **not** a full row-by-row cryptographic proof or real authenticated member-browser test.
- **Critical migration-history mismatch:** these source filenames may still appear *pending* to tooling that only compares SQL filename versions to provider migration history. On the next release, examine the exact SQL and installed function/trigger and reconcile the deployment mechanism; **never blindly rerun `supabase db push`, these three source files, or equivalent migrations.** Only execute still-unapplied, separately approved migration work. Do not falsify a migration ledger or silently repeat DDL.
- The earlier isolated cryptographically signed JWT/PostgREST acceptance was explicitly approved as the substitute for real-member tests for #5/#10. PR #107 had 50 signed HTTP assertions; PR #110 had 53. These are accepted source evidence, not live GoTrue member-session tests.

## Queue at the handoff (code publication versus SQL delivery)

- `DIC-Q-5-pending-retry-http-conflict`, GitHub #5 **CLOSED**: SQL **DELIVERED** as actual production migration `20261024052303`; queue should remain **READY solely for its as-yet-unpublished migration file in the next release Git source**. Do not apply SQL again. This source-only queued state is intentional: release queue audits all source changes since the last published app; setting the item only `DEPLOYED` prematurely made `supabase/migrations/20261024034800_dic_pending_retry_http_conflict.sql` an unqueued deployable diff and failed extractor approval intake.
- `DIC-Q-12-community-prior-hierarchy`, #12 **CLOSED**, **READY web/source**: PR #108 exact/related/similar evidence, PR #110 use-source provenance, PR #113 confirmed personal-family evidence, PR #114 acceptance/release records all merged and originally verified. Both #12 SQL migrations are already live; **the new web UI, hydration, offline/reload and saved-source display are not on Netlify production**. Do not replay SQL.
- `DIC-Q-33-expanded-603-audit`, #33 **OPEN / TESTING**: frozen benchmark **603 coffees from 201 U.S. roasters, three each**. Preserve original captures, expected oracle and scoring. PR #109 was merged; subsequent source parity repairs reached merged development SHA `1800187cf0980f30d555d71134bde3c0f8e059a7`, while final exact merged-source validation and queue intake were still being resolved. During this handoff, PR #115 was merged and PR #116 was open; refresh actual latest PRs/runs, don't assume these statuses remain. **Do not mark READY without full source/acceptance evidence.**
- The queue's other historical `DEPLOYED` items and actual previous release receipts are immutable historical evidence. No additional READY items were seen at this checkpoint, but check the latest queue again before a later release.

## Superseded scoped candidate — DO NOT MERGE

- Temporary [PR #117](https://github.com/Schulzet3/The-Dial-In-Collective/pull/117), branch `work/release-scoped-issues-5-10-12-20261024`, was a TEST-ONLY cherry-picked/isolated candidate to avoid the still-TESTING extractor. Its HEAD was `ffe80229ca31cfc83c9e0a2300e3a1bc224e0275`. It never obtained exact-source CI, never merged, and never published.
- The owner later chose to **wait and release the combined queue after the extractor is ready**. PR #117 has therefore been **CLOSED UNMERGED**. Leave its historical branch alone; **do not use that candidate for production**, because a future combined batch must include verified extractor source and all READY dependencies.

## Exact next-chat release sequence (after owner explicitly requests publishing)

1. Recover current `development/backend-foundation`, `main`, `release/production`, active work journal, `AGENTS.md`, canonical spec/decisions, release-queue JSON, outstanding PRs/issues, latest CI, and actual Netlify/Supabase provider state. Do not trust this dated snapshot if later source advanced.
2. Finish **#33** first, preserving the immutable 603/201 benchmark. Diagnose and repair remaining public-source/parity or frozen-score failures, merge non-force, read back its real final source SHA, run applicable exact-source CI, and only then mark its release-queue entry **READY** with precise tests, files and zero blockers. Do not backfill a speculative `merged_source_sha` or relabel arbitrary checks as PASSED.
3. Validate combined source-to-published diff against the **actual last published tested SHA `28f908dc...`** using the release queue gate (`scripts/release/release-queue.mjs`). Every deployable path must belong to an eligible READY item. The #5 SQL file is still an unpublished source path, **even though SQL is already live**. Verify #12 and #33 scopes cover every code/SQL/Netlify function change. Reuse valid exact-source CI; do only risk-appropriate combined preflight.
4. Verify live SQL migration history and installed functions FIRST. The three actual versions above are ALREADY APPLIED. Map repo filenames to their provider equivalents and exclude them from any new SQL execution. Review any truly new migration/Edge/Auth work, backups and data integrity independently. Never perform destructive database work without required verified recovery evidence. Previously verified encrypted offsite archive is historical; revalidate coverage/freshness when needed. Do not ask for Netlify credits or purchase a plan.
5. When the owner sends a **new publish/deploy queue command**, create a unique source-SHA-bound one-use grant/release record and run the serialized guarded non-force production publication of the precisely selected READY batch. Do not treat today's paused permission as reusable. `main` owns operations/backups and `release/production` is the only publication branch; no direct development auto-publish.
6. Independently read Netlify current/READY deploy ID, commit/SHA and affected behavior. Read Supabase migration/function/security and unchanged member-record integrity after publication. Mark the relevant queue items `DEPLOYED` only with exact published/source/provider receipts, update `CURRENT_STATUS`, release records, active/scoped journals and relevant GitHub issues. Do not conflate deployed SQL, passed CI and published frontend.

## Verified limitations

At this checkpoint, production **SQL is live but new Community frontend is not**; full end-to-end app acceptance is not newly verified. Browser/mobile checks from prior PR heads/merges do not replace real Netlify postflight. Separate extractor source acceptance remains TESTING. No new Netlify deployment, release request, release grant, data deletion, purchase or plan change was performed for this handoff.

**Historical references:** [Issue #5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5), [Issue #10](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10), [Issue #12](https://github.com/Schulzet3/The-Dial-In-Collective/issues/12), [Issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33), [PR #113](https://github.com/Schulzet3/The-Dial-In-Collective/pull/113), [PR #114](https://github.com/Schulzet3/The-Dial-In-Collective/pull/114), [closed PR #117](https://github.com/Schulzet3/The-Dial-In-Collective/pull/117), `docs/PRODUCTION_RELEASE_2026-10-24_READY_QUEUE_VERIFIED.json`, and the canonical `docs/RELEASE_QUEUE.json`.
