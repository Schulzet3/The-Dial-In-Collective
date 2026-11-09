# Issue #1676 — Admin invitation and account deletion

Owner instruction Nov 9, 2026: build Delete Code (revoke immediately and remove from operator listing), and Delete Account with explicit KEEP or REMOVE qualifying anonymous Community contributions. Narrow new owner approval replaces only previous beta no-hard-delete and blanket retention defaults, not unrelated Auth, privacy, member, offline, backup, or publication decisions. No real user/account/code/shot deletion authorized by build request.

This source-stage change introduces admin-only invitation deletion with private receipts and a new two-phase member deletion ledger. Account deletion requires a server-only Edge orchestrator to verify GoTrue admin admission and execute Auth admin.deleteUser; SQL alone never deletes Auth users. Pending integration: Edge handler, Admin option selector, scoped SQL/JS tests and provider-independent verification. A failed Auth/finalization step must remain incomplete and retryable; never report completed on partial effects. The staged SQL originally drafted below must be audited before merging/READY. No hosted SQL or publication.

## Backend SQL safety refinement

Before any CI/release, reviewed delete-finalization ordering: capture target Community IDs from the frozen contributor IDs **before** unlinking, detach reviews, remove only those projections, and count removed rows atomically. Fail-closed on missing Auth deletion; no provider or member-data writes. Full test/Edge integration still pending.

## Source idempotency fix

Reused the historical `dic_admin_access_overview` definition as `CREATE OR REPLACE` (not conflicting CREATE) so the forward-only migration can apply after the existing Admin API. No production operations; isolated SQL remains to be run.
