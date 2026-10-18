# Community eligibility and integrity — production release record

**Date:** October 18, 2026 UTC (October 17 America/Denver). **Issue:** [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9). **Status:** Supabase SQL migration **APPLIED and independently read back**. Actual hosted migration: **`20261018054140_dic_community_quality_integrity`**. **No frontend/Edge release**. Live acceptance by real member session still pending. Community browsing #11 remains disabled.

## Authorization and exact source

The owner answered “yes do it please” when explicitly asked to approve the production rollout of **the tested Community eligibility safeguards**; that authorizes this single, narrow SQL migration with verification, not later releases or unreviewed historical Pending promotion. [GitHub preflight](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9#issuecomment-6246196991) and [verified first postflight](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9#issuecomment-6246204978) were recorded as the rollout progressed. Existing Locked product decisions, privacy, historical coffee identity/shot data and GitHub-only continuity remain in force.

- Approved GitHub source head when migration executed: `8f9eefc093c76fa3942aba31a4763460bdad4eaa`, app/migration code derived from passing `146b0f7ad7a61949772e955dd7b8e7a413b7d957`.
- Exact SQL Git Blob SHA: `7f6178347ee0452fb64a66981c6e3975650fd63c`, length 19,672 UTF-8 characters, SHA unchanged on path rename.
- Prior development migration path: `supabase/migrations/20261018061000_dic_community_quality_integrity.sql`. **Corrected canonical GitHub path:** [`supabase/migrations/20261018054140_dic_community_quality_integrity.sql`](../supabase/migrations/20261018054140_dic_community_quality_integrity.sql), using the **actual Supabase migration version** so future `supabase db push` cannot inadvertently replay a different-version duplicate. Historical path exists in the Git history, not as a second active migration.
- Verified source CI: [network-disconnected PostgreSQL 17.11 run `39100628654` SUCCESS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39100628654). A new isolated CI run on the reconciled filename is to be checked after this commit; do not declare it passed until the run reports success.
- `apply_migration(name='dic_community_quality_integrity')` returned `success=true`; subsequent live `list_migrations` confirmed version `20261018054140`, count 27.

## Live read-only postflight (before/after row comparison)

| Category | Before SQL | After SQL | Result |
| --- | ---: | ---: | --- |
| Personal shots | 15 | 15 | Preserved |
| Private shot notes | 15 | 15 | Preserved |
| Canonical coffees | 4 | 4 | Preserved |
| Workspace coffees | 4 | 4 | Preserved |
| Community projections | 1 | 1 | Preserved |
| Pending-quality projections | 1 | 1 | **Not promoted** |
| Eligible projections | 0 | 0 | Remain private |
| Private contributor links | 1 | 1 | Preserved |
| New quality review rows | 0 (no table) | 0 | No automatic historical review |

New `private.community_quality_checks` RLS **ON**, explicit client-deny policy. Three installed triggers: `private.contribution_links.dic_recheck_after_link`, `public.coffees.dic_on_community_coffee_verification`, `public.library_entries.dic_on_library_coffee_change`. Seven new private helper routines + two public member-callable RPCs are present. Confirmed anonymously/public roles lack private-table SELECT and internal reviewer/batch EXECUTE; `authenticated` may call only the membership-gated public outlier-confirmation and anonymous-count RPCs. The existing `community_read` RLS still requires an admitted member, `eligible` state and verified canonical coffee. Fingerprinting and revision checks preserve the original contribution ID across safe corrections and allow user-confirmed unusual recipes without hard shot-style numeric exclusion.

**Supabase post-migration advisor:** Two new warnings for deliberately `SECURITY DEFINER`, `authenticated`-callable public RPCs. Confirmed both define `private.require_member()`, and outlier confirmation further checks `owner_id=u` and expected shot revision. They are intentionally privileged server functions that protect private links; they must still undergo **real user/other-account/anonymous authorization acceptance** before the issue closes. Existing provider warnings remain tracked in [#27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27). [Security-definer advisory documentation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Recovery and unchanged surfaces

[GitHub encrypted backup snapshot `39099579576` SUCCESS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39099579576), created from the source pinned to prior verified published app and before this migration; verified encrypted snapshot and ciphertext artifact steps. This push-run **does not establish a fresh offsite Google Drive receipt**; prior owner reported receipt and full restore are separately recorded in [#28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28). The separate `main` nightly encrypted backup published-app source pin remains unchanged: `ebd2bed149f6c9fed998a861a0b8ac819fab98db`. A subsequent scheduled full database backup should include the newly installed schema; it has **not yet been independently observed**.

Netlify remains READY published app deploy `6ad4541c0e2686c05d66a4f2`, no branch/preview/publish build, no Netlify credits intentionally spent. Supabase `dic-preview-coffee` Edge v3 and `dic-verify-coffee` Edge v4 unchanged. No migration-time backfill or direct member data writes; no personal notes, emails, identifiers or equipment snapshot source fields copied into public eligibility records beyond the existing anonymized projection shape.

## Scope still open / follow-up

1. Confirm renamed migration still passes the isolated SQL workflow on final repository SHA; log exact workflow run and any failures. This report predates that post-rename CI result.
2. Verify authenticated member **and different-member** access plus denied unauthenticated access through a genuine client session, and approved/verified coffee, outlier correction/hide flows. Do not create or mutate real user shots for test convenience.
3. Existing `pending_quality` row remains unchanged. An explicit quality review is required before choosing to process it through bounded internal maintenance; no bulk auto-promotion granted by this release.
4. #9 issue stays open until genuine acceptance. #11 Community browsing still disabled. The automatic worker is triggered on **future** qualifying events, while the new private bounded maintenance routine for historical Pending rows is intentionally **not run** during this release.
5. Future app/source releases and provider setting changes require fresh owner approval. Preserve all earlier Locked decisions; GitHub is the continuously updated session record, not an inferred deploy.

This receipt distinguishes production SQL, CI, Netlify and owner acceptance deliberately and should allow the next work session to resume without another handoff.
