# Independent SQL review — audit pass 3

Canonical sources: [Master Specification](../MASTER_SPECIFICATION.md), [Decision Ledger](../DECISION_LEDGER.json), [Current Status](../CURRENT_STATUS.md). [Audit overview](2026-10-21-history-audit.md).

Reviewed the root's source-only changes in:

- [supabase/migrations/20261021221455_dic_source_worker_auth_and_admission.sql](../../supabase/migrations/20261021221455_dic_source_worker_auth_and_admission.sql)
- [supabase/tests/source_worker_auth_and_admission.sql](../../supabase/tests/source_worker_auth_and_admission.sql)
- [supabase/tests/pre_release_cross_account.sql](../../supabase/tests/pre_release_cross_account.sql)

Compared them with the predecessor source-worker, duplicate-first promotion, role grants, membership/access mutation, equipment, coffee and shot schemas. This is an independent static review; actual PostgreSQL execution belongs to the root's isolated CI receipt. No live SQL or provider changes were made by this reviewer.

## Two additional findings

### SQL-P3-01 — private helper needs the actual role boundary

The initial regression checked forged `request.jwt.claims` against public service-only wrappers. Those correctly fail their real `EXECUTE` ACL, but `private.dic_promote_pending_coffee` is intentionally `EXECUTE`-granted to `authenticated` for its member/admin modes, with schema usage also granted. Its `official_verified` mode initially relied only on the claim string. A direct SQL caller running as authenticated with forged service claim settings could pass that branch even though the public wrappers reject the same caller.

This does **not** demonstrate a remotely exposed private PostgREST endpoint or a forged signed JWT. It identifies an internal SQL authorization boundary and a missing negative case in the regression's original “real role cannot spoof” claim.

Root added a mode-specific check of `current_setting('role',true)='service_role'` together with the JSON/legacy JWT check, and a direct-private helper negative test. That preserves existing member/admin modes and avoids revoking their needed helper access. The current-setting approach matches PostgREST's documented impersonated role; `current_user` inside a SECURITY DEFINER function represents the function's effective execution identity instead.

Primary reference: [PostgREST transaction-scoped request role](https://docs.postgrest.org/en/v13/references/transactions.html#request-role-and-search-path). [PostgreSQL SET ROLE](https://www.postgresql.org/docs/current/sql-set-role.html) describes SQL role permissions and the restriction on changing role inside SECURITY DEFINER functions. The integrating reviewer must verify the revised tests in actual PostgreSQL before claiming the guard executed successfully.

### SQL-P3-02 — exact 24-hour expiry boundary

The copied source-budget body treats a window as active only when `window_started_at > now() - interval '24 hours'`, but initially reset the window only for `<`, leaving equality in neither set. At exact expiry with six attempts, retry/account checks no longer apply while the upsert increments six to seven, violating the `CHECK(attempts between 0 and 6)` constraint.

Root corrected both reset CASE comparisons to `<=` and added a regression with an existing attempt at exactly `now()-interval '24 hours'`, six prior attempts and an expired short retry cooldown. The fixture asserts that the next claim succeeds with attempts reset to one and a renewed window. PostgreSQL `now()` is stable within that transaction, so no real waiting is needed. Independent reinspection confirms that both source corrections and the regression are present. Actual PostgreSQL execution is still pending the isolated CI receipt. This is a bounded source fix, not a migration that rewrites historical attempt rows in bulk.

## Subsequent revision-race correction reviewed

Root also bound official source evidence to the exact submission revision returned by `dic_source_check_target`. The Edge verifier forwards that revision with its inspected evidence, and final promotion compares it with the current submission revision under the existing row lock. A Pending submission renamed while the source request is in flight is rejected with SQLSTATE `40001`, including when its URL has not changed. The added fixture checks that rejection leaves the submission Pending. The existing resolved-request replay returns before this Pending-only revision check, preserving its safe idempotent behavior; fresh admission is checked before that replay. The two existing automated-approval/URL-preview fixtures were updated to include their current revision. Independent review found no mismatch between the new target field, Edge binding and final guard.

## Other reviewed properties

- `dic_source_claim` qualifies its parameter in the attempts lookup and upsert, and uses the named primary-key constraint. No new parameter/column ambiguity was found in the reviewed migration.
- JSON JWT role takes precedence over a stale legacy nonnull role; blank transaction settings are handled explicitly. Invalid JSON fails instead of granting access. The real public `EXECUTE` ACL remains limited to service_role.
- Fresh membership checks occur before metadata return, budget claim, and official promotion. Admission `FOR SHARE` locks in the mutating paths conflict with the existing Remove Access `FOR UPDATE`/UPDATE, keeping admission stable through each individual transaction.
- The external fetch spans separate transactions; rechecking admission inside final promotion covers revocation after the earlier target/claim. A stale service credential alone cannot restore membership.
- The promotion-body transformation is guarded by exact predecessor markers, preserves the existing duplicate-first body, and retains function ACLs through CREATE OR REPLACE. Unexpected predecessor drift stops the migration rather than silently editing an unknown function.
- No new public table grants, RLS relaxation, direct member-source-verification access, historical submission backfill, Auth deletion, private note mutation or Community-data deletion is introduced.
- The rewritten cross-account fixture creates independent random users and synthetic setup/library/shot/note rows inside a `dic_ci`-only transaction and rolls back. It no longer assumes production owner row counts or selects real accounts.
- The fixture's SQL-role switches, owner predicates, setup/version foreign keys and canonical fuzzy-match expectation were checked against the source definitions. Full SQL execution remains necessary; static inspection is not a substitute for the CI run.
- Source-worker tests now cover JSON-only service claims, legacy compatibility, conflicting current JSON role, public grant enforcement, private official-mode denial, replay, retry throttling, exact 24-hour expiry, a same-URL changed-revision race, and revocation between claim/promotion. These are present in source; their actual PostgreSQL results must be reported separately.

## Review boundary

These source changes require independent isolated PostgreSQL success before integration can be described as validated, and a separately scoped owner authorization before any hosted application. This audit provides no new production mutation permission. The current live deployment and current 32 live migrations remain the existing recorded provider baseline until separately changed and read back.
