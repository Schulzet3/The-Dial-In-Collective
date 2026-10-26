# Development Conductor — parallel workstream contract
Owner authorization: October 26, 2026; tracker #133. This document coordinates work; it does not supersede Locked product decisions or authorize publication.

## Boundaries
| Workstream | Primary owned paths | Required cross-review |
| --- | --- | --- |
| Extractor (#33) | `src/server/coffee-*.mjs`, `src/server/roast-level-evidence.mjs`, extractor-specific tests, `docs/workstreams/issue-33.md` | `netlify/functions/coffee-url-preview.mjs`, `supabase/functions/*/evidence.mjs`, source schema/consumer changes need Backend and UI review |
| UI/UX | `site/` components, styles, interaction/browser/mobile/accessibility tests, own indexed journal | `site/cloud/` API/RPC/outbox and `site/lib/engine.js` need Backend/Extractor review where their contracts or evidence change |
| Backend | `supabase/migrations/`, `supabase/functions/`, RLS/Auth/RPC, SQL and permission tests, own indexed journal | Coffee verification and source facts need Extractor review; frontend contract changes need UI review |
| Conductor (#133) | `docs/RELEASE_QUEUE.json`, `docs/CURRENT_STATUS.md`, approval matrix, release handoffs, cross-workstream tracking | Workstreams submit their PR/issue evidence and proposed queue intake; Conductor remains primary writer |
| Operations | `main` backup and scheduled workflow changes and ops journal | Conductor coordinates any release-source or readiness impact |

A change to `docs/MASTER_SPECIFICATION.md` and `docs/DECISION_LEDGER.json` requires the same explicitly approved Locked-decision change in both; not an informal coordination preference. `release/production` is exclusively for separately authorized publication, never ordinary development reconciliation.

## Protocol
1. Each contributor rechecks development branch SHA and other open PR paths before starting and before merge. Claim scope on the relevant GitHub issue. No duplicated feature work.
2. Work on a scoped feature branch. Do not directly write shared records. Add the owner authorization, changed paths, evidence, test failures and fixes in the same commit's indexed scoped journal for code/test/CI changes.
3. Before merge, conductor checks overlap at the file and behavior-contract levels, exact-source applicable checks, release queue intake, approval coverage, and source-to-published diff.
4. Merge only non-force; independently read merged commit SHA and required passing exact-source CI. Record SKIPPED or unexecuted checks as such. Independent feature READY does not prove parent issue acceptance.
5. Conductor reconciles queue, status, approval and release documentation. READY requires proven code+tests+merge+no blockers; DEPLOYED requires independent production receipts.
6. Every separate chat communicates exclusively through GitHub issues, PRs and scoped journals, not imagined cross-chat synchronization.

## Baseline, conflict and publish holds verified October 26
- Development `6ed8969a6c65b52f75300a6e3f7c982c4716c6b4` before conductor changes; main `d4a4098a454adcf931a93615566eb82433f5346e`; release/production `65ee38609db6bd5977dd0f2b393e7791a5e1b766`.
- PR #132 merged and its source package READY; Issue #33 remains OPEN with 120 missing / 822 strict-review frozen canonical facts. Immutable 603 original cases, 201 roasters, 1,197 captures and 4,002 canonical expectations must not be modified to inflate results. Keep extractor residual IN_PROGRESS.
- #5, #10 and #12 CLOSED. Supabase versions `20261024052303`, `20261024052411`, `20261024052419` already applied: **NEVER REPLAY**. Issue #5 source path `supabase/migrations/20261024034800_dic_pending_retry_http_conflict.sql` blob `2a9eca5b32e37dd937a5257a02981dd6113b84f7` matches recorded delivered source, and read-only production function inspection confirms structured stale-revision conflict. Keep distinct source-carryover tracking until guarded future release intake proves no second application. Other two corresponding SQL files likewise already live.
- Exact diff from published tested app `28f908dc9828a45558bd56b532fed17022cef3d8` to recovered development has 39 deployable paths; 38 have READY coverage and one is that already-delivered #5 SQL source. This is a **combined release HOLD**, not an instruction to rerun SQL.
- Actual Netlify READY/current deployment `6adc20c03a07673c4dd08035` at release SHA `65ee38609db6bd5977dd0f2b393e7791a5e1b766`. New Community frontend and extractor changes are NOT DEPLOYED.
- Backup scheduled daily 08:00 UTC; weekly comprehensive regression Sunday 08:00 UTC. Oct 26 scheduled encrypted backup succeeded, but provider timing differed from nominal cron. Oct 25 weekly run `40194860522` failed because offline test job lacked a built `dist/sw.js`; operations Issue #134/PR #135 repair tracked separately. Do not mark it passed until corrected exact-source CI verifies.
- No owner publication authorization is currently valid. Combined READY report first, then await NEW explicit owner publish command. No Netlify deployment, migrations, direct costs, user data modifications, or changed Locked decisions from coordination alone.

## Intake template
Issue/workstream; exact changed paths; source parent and head SHAs; any shared contracts; approval decision key if product behavior changes; tests actually run (including skips), PR and CI URLs; expected merged SHA; requested queue state; provider operations required; risks and rollback. No merging unresolved ownership conflicts, no concurrent shared-record writes.
