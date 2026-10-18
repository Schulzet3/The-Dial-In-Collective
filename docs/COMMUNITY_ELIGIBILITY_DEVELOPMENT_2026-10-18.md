# Community Quality, Eligibility, and Durable Contribution — Development Checkpoint

**Date:** 2026-10-18 UTC / 2026-10-17 America/Denver. **Issue:** [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9) (P0, remains OPEN until separately authorized production rollout and member acceptance). **Status:** Completed the approved implementation and network-isolated SQL acceptance in development. **NOT DEPLOYED** to live Supabase or Netlify.

## Governing authority and user authorization

The owner answered "yes" when asked to proceed with issue #9, expressly for read-only live/source audit and development implementation/tests only. This did not authorize a production database migration, Edge deployment, member-data mutation, a paid service, or another Netlify release. Preserve all product-Locked decisions in [Master Specification](MASTER_SPECIFICATION.md) and [Decision Ledger](DECISION_LEDGER.json), especially §§16,21–24,30. The fastest Log Shot → Rate → Recommendation UI remains unchanged; #11 Community browsing is still unavailable and depends on #9.

## Source-versus-live inventory (read-only)

Supabase project `azviqqejypsefzilgonr` and current GitHub `development/backend-foundation` were inspected. Before and after these development-only commits:
- 15 personal shots, 15 private shot notes; 1 public community projection with `quality_state='pending_quality'`, **0 eligible**, 1 private contribution link.
- Existing `private.project_shot()` trigger projects only all-green shot observations to `pending_quality`, withdraws them on a non-green correction, and preserves anonymous published contributions through personal Hide or account deletion. No separately deployed community-quality promotion worker/function was present in PostgreSQL procedures/triggers or either deployed Edge function.
- Existing `community_read` RLS restricts member access to `eligible` projections with verified canonical coffee; private contribution links have client-deny access. All inspected first-party tables have RLS.
- Current Supabase migrations stop at `20261018035732_dic_seven_roast_owner_data`. The new #9 migration is **not** in hosted migration history. Netlify remains READY published deploy `6ad4541c0e2686c05d66a4f2` for the previously owner-approved PERC extractor.
- Security advisor (read-only) reported existing security/maintenance warnings, recorded under [#27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27). They are not regressions from unpublished #9 code.

## Completed development implementation

**New forward-only migration:** [`20261018061000_dic_community_quality_integrity.sql`](../supabase/migrations/20261018061000_dic_community_quality_integrity.sql). It introduces a private quality-check table, RLS and explicit role permissions; member-only outlier confirmation and sanitized counts; protected server-only quality review, link rechecks, library Pending→Verified contribution backfill, canonical-coffee verification invalidation, and a bounded pending-review routine. The migration deliberately does **not** perform a blind data backfill or add public browsing UI.

A successful anonymous projection must match its source shot (taste values, source revision, observations, equipment snapshot, contributor mapping and exact approved coffee/release) before eligibility. Corrected non-green shots withdraw; material corrections cause revalidation without multiplying contribution IDs. Hiding personal history is not withdrawal. An already eligible detached contribution survives deletion of the originating account as private contributor association is removed. A Pending coffee does not contribute until actual canonical verification; earlier all-green shots can become eligible upon that transition without rewriting historical personal shot values/revisions.

Extreme time or ratio disagreements are held for member correction/confirmation, not automatically deleted or reclassified. The code first compares the member's prior all-green shots from the same coffee/setup/style (3 preceding observations). Otherwise it compares at least five **distinct other contributors** of the exact coffee/style, using medians; a heavily contributing single account cannot manufacture the comparison cohort. Ratios beyond 3× or below one-third, or times beyond 4× or below one-quarter, trigger **review rather than rejection**. These numerical thresholds are provisional code-level conservative heuristics, **not** new Locked style extraction windows, rigid eligibility exclusions, or scientific universal limits. Accepted user-confirmed unusual shots remain valid; confirmation is bound to the source-content fingerprint and cannot be reused after a substantive correction. Missing legitimate context is not fabricated.

**Isolated test fixture:** [`community_quality_integrity.sql`](../supabase/tests/community_quality_integrity.sql) covers multiple synthetic member identities, wrong-owner/expired-revision confirmation rejection, own-shot versus distinct community outlier precedence, duplicate suppression, privacy and RLS, no notes/email in projections, Pending coffee verification/backfill, distinct coffee releases despite same URL, corrections/non-green withdrawal/restoration, retained anonymous data on Hide/account deletion, distinct contributor statistics, idempotent review and bounded maintenance.

**CI integration:** [`isolated-sql-regression.sh`](../scripts/audit/isolated-sql-regression.sh) includes the new suite with existing security, identity, approvals, administration, URL preview and seven-tier tests. All run inside a **network-disconnected disposable PostgreSQL 17.11** container against synthetic records, rolled back afterward; no connection to hosted Supabase.

## Final verification (actual GitHub actions)

- **Final application/migration/test head:** [`146b0f7ad7a61949772e955dd7b8e7a413b7d957`](https://github.com/Schulzet3/The-Dial-In-Collective/commit/146b0f7ad7a61949772e955dd7b8e7a413b7d957).
- [Isolated SQL Actions run **39100628654 — PASS**](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39100628654), verified against exact source head. All checked-in migrations and the existing SQL regressions PASS; new Community fixture PASS, including distinct contributor/outlier/retention/Pending backfill and RLS checks.
- Intermediate failures were retained in run history: dollar-quoted SQL function typo `39100325275` (fixed), new fixture variable ambiguity `39100447006` (fixed), test mistakenly attempted a member-only count with a deleted owner session `39100492634` (fixed). Earlier `39100533817` passed the core suite before added member-history-priority test. Final current run `39100628654` PASS.
- The last independently inspected live DB snapshot remains 15 shots, 15 notes, 1 pending projection, 0 eligible and 1 contribution link. No migration, Edge function, Netlify or member data changes occurred during #9 development.

## Completion boundary and next handoff

1. **Before a live release:** Require new explicit owner authorization; inspect current production schema/permission and change scope, verify source/production parity, and execute the forward migration in a separately approved coordinated deployment. Review which old pending rows to evaluate with the bounded private maintenance routine; do not blindly publish the one current pending row or change saved coffee data.
2. **Acceptance after approval:** Verify the live admitted-member session and wrong-member/anonymous denial, actual outlier owner-confirmation, verified/Pending boundary, historical user data integrity and backup continuity. Current synthetic SQL proof does not constitute live multi-account/device/browser acceptance.
3. **Then #11:** Build member Community browsing only over securely eligible data; continue privacy review of free-text/custom equipment data, user-facing retention disclosure, safe confidence display and no persistent visible member identity.
4. **Separate #12:** Robust community family estimates and diminishing contributor weighting are still a recommendation-layer milestone. This tranche gives privacy-safe counts and prevents one owner from dominating the outlier peer cohort, but does not claim the entire recommendation engine weighting/robust aggregate pipeline is implemented.
5. **CLI limitation:** Supabase CLI was not available in this session, so this forward migration was added using the repository's timestamped naming convention and verified by the isolated PostgreSQL workflow, **not generated by `supabase migration new`**. Validate the migration's release procedure and advisory checks before production.

The repository is the owner-Locked continuously updated work log. Issue #9 remains open through production approval/acceptance; #11 is still blocked by its live-release gate. Historic source and the canonical 79 Locked/20 Open baseline ledger records remain unchanged.
