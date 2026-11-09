# Issue #1676 — Admin invitation and account deletion

Owner instruction Nov 9, 2026: build Delete Code (revoke immediately and remove from operator listing), and Delete Account with explicit KEEP or REMOVE qualifying anonymous Community contributions. Narrow new owner approval replaces only previous beta no-hard-delete and blanket retention defaults, not unrelated Auth, privacy, member, offline, backup, or publication decisions. No real user/account/code/shot deletion authorized by build request.

This source-stage change introduces admin-only invitation deletion with private receipts and a new two-phase member deletion ledger. Account deletion requires a server-only Edge orchestrator to verify GoTrue admin admission and execute Auth admin.deleteUser; SQL alone never deletes Auth users. Pending integration: Edge handler, Admin option selector, scoped SQL/JS tests and provider-independent verification. A failed Auth/finalization step must remain incomplete and retryable; never report completed on partial effects. The staged SQL originally drafted below must be audited before merging/READY. No hosted SQL or publication.

## Backend SQL safety refinement

Before any CI/release, reviewed delete-finalization ordering: capture target Community IDs from the frozen contributor IDs **before** unlinking, detach reviews, remove only those projections, and count removed rows atomically. Fail-closed on missing Auth deletion; no provider or member-data writes. Full test/Edge integration still pending.

## Source idempotency fix

Reused the historical `dic_admin_access_overview` definition as `CREATE OR REPLACE` (not conflicting CREATE) so the forward-only migration can apply after the existing Admin API. No production operations; isolated SQL remains to be run.

## Admin view and light/dark responsive controls

Added per-code Delete Code action including used/revoked codes; added nonadmin Delete Account button alongside reversible access toggle; added two-option permanently destructive dialog with server-provided impact counts and accessible Light/Dark contrast. Backend wiring, tests and verification remain pending; no hosted SQL or member/account action.

## Service-role only GoTrue deletion bridge

New Edge source `supabase/functions/dic-delete-member-account/index.ts` validates origin, authenticated identity, current admitted/admin role, exact operation UUID and server-side request budget. The *only* service-role client prepares SQL, deletes GoTrue user, checks ambiguous failures and finalizes only after the DB independently verifies the Auth row is gone. On partial failures returns retryable status, never false completed; no deployed function yet. Supabase JS admin.deleteUser API checked against official documentation. No production writes.

## Bound client Admin actions

`site/admin/main.js` now uses administrator-only RPC `dic_admin_delete_invite` for confirmed code deletion (automatic revocation + listing removal), and a two-choice account impact dialog invoking preview, request and `dic-delete-member-account` Edge only after a second explicit confirmation. Retry reuses the same mode/ledger; a failed RPC/Edge call is not success. Secret remains exclusively server-side; no production changes or live member deletion. Source tests/CI still pending.

## Exact-preview concurrency guard

Refactored the single source of server-authoritative impact counts into private `dic_admin_account_delete_impact`, denied to clients. Both admin-facing preview/request and service-only prepare now call it, with an actual equality check before admission revocation. This closes an account-data race between displayed preview and external GoTrue deletion. No production write or inferred test PASS.

## Disposable SQL implementation acceptance fixture

Added `supabase/tests/admin_member_deletion.sql` to the existing ONE isolated SQL regression loop. Exercises admin/ordinary/anonymous privileges, a deleted code's immediate revocation and invisibility across search/overview/pages, private receipt and idempotence, exact account preview rejection, confirmed request, server-only preparation, prohibition on pre-Auth finalization, disposable simulated Auth cascade, retention of private contributor identity for Community weighting, removal of only the selected user's Community rows, and an untouched second member. The suite has a hard `current_database()='dic_ci'` guard and wraps all inserts/DELETES in BEGIN/ROLLBACK. Actual CI verdict PENDING; no hosted operations.

## Admin JS tests

Updated the retired no-hard-delete assertion, preserving administrator protection. Added fixture tests for escaped Keep/Remove Community choices, no forged direct confirmation, confirmed exact member and choice, server-only operation UUID to Edge, and Delete Code RPC. No production writes. CI verdict pending.

## Release queue IN_PROGRESS tracking

Added only `DIC-Q-1676-admin-code-account-delete` with exact runtime/SQL/Edge scope; status IN_PROGRESS, no CI PASS, no merged SHA and no production authorization. Existing 260 queue entries and released receipts retained unmodified. READY only after applicable exact-source CI, safe integration and migration/Edge release compatibility proof.

## Service endpoint simulation and Storage safety guard

Added Node VM simulation for Edge endpoint: origin/method/auth/admin denial before privileged client; target/mode strictly from prepared SQL ledger (not injected browser body), Auth deletion before DB finalization, no false success after failed GoTrue deletion, recovery when Auth user vanished on prior attempt, and completed-op idempotence. Added provider Storage-owned-object preflight guard before admission revocation (conditional dynamic SQL because isolated dic_ci has no Storage schema). Live project read-only check found 0 Storage objects and 0 buckets. Exact-source CI pending after this change.

## Interrupted Auth deletion recovery SQL

Added owner-operator-only `pending_deletions` to the existing access overview, sourced from private operation receipts only for `actor_id=auth.uid()` and not containing any token or member private notes. This remains listable even after Auth delete removes the member row. Disposable SQL checks visibility after Auth deletion and before finalization. UI recovery button still being wired. No hosted changes.

## Operator recovery button

Admin Access renders the requesting admin's private unfinished operation receipts and an explicit Retry Completion control, even when the deleted Auth account is absent from member listings. It sends only the original immutable operation ID through the gated Edge function. Added JS recovery test. No new member deletion scope or production operations. Source CI after this change pending.

## Prevent Restore Access during pending permanent deletion

After `prepare`, the member's admission is revoked. The existing Admin Remove/Restore Access path now explicitly rejects changes for an account with an unfinished hard-delete operation; service retry additionally rejects any unexpectedly restored admission. This preserves the preview/Community snapshot while the GoTrue delete runs, without changing the reversible access behavior for other accounts. Disposable SQL regression added; no provider/member changes.

## Actual SQL CI fixture failure diagnosed and fixed

PR-head SQL run 42692499171 (job 129415617298) applied all migrations and passed earlier suites, then failed ONLY in the newly added recovery test: the assertion for an *unfinished* operation was mistakenly placed after `dic_admin_account_delete_finish` had already transitioned it to `completed`, so it correctly disappeared from pending overview. Moved the assertion to the exact post-GoTrue/pre-finalization interval, preserving runtime code and all existing safety assertions. Failed run remains FAILED, new exact-source CI pending. No production action.

## Completed-receipt privacy hardening

Verified that the private request impact contains email and original member UUID for confirmation/retry, but neither needs retention after a successful Auth deletion and Community cleanup. The finishing SQL transaction now drops those two identifying JSON keys from the completed operation receipt, while keeping limited operation audit metadata, source counts and actor scope. Added disposable SQL regression. No real account or provider changes; new exact-source CI required.
