# Backend foundation checkpoint

## Verified results

- Five migrations applied to the existing development Supabase project.
- 31 application/internal tables; all have Row Level Security enabled.
- 60 database-level permission/integrity assertions passed using temporary generated users and fixtures. No test emails were sent.
- Fixtures were rolled back. Separate post-test queries confirmed zero Auth users, coffees, shots, community shots and backup runs.
- Supabase security advisor returned no findings after remediation.
- The automatic `ensure_rls` event trigger remains enabled. Public/anonymous/authenticated execution of its internal `rls_auto_enable()` function was revoked instead of disabling the protection.
- Each committed migration's Git blob SHA matches the SQL stored in Supabase's migration history byte-for-byte.
- Main/frontend deployment and the user's phone prototype were not changed.

These results validate this schema and its tested role boundaries. They are not a production-security guarantee, proof of successful browser authentication, or an end-to-end cloud sync test.

## Applied migration manifest

Migration identifiers are copied from the service's actual history; they are not inferred from conversation dates.

| Version | Name | Verified Git blob SHA |
|---|---|---|
| 20261009190246 | dic_identity_foundation | 186f24755f50bde79998b546bf93735a8355fda4 |
| 20261009192735 | dic_coffee_catalog | f762098fad284856cbc5fc3e66618ff3a76a9db9 |
| 20261012015417 | dic_equipment_workspaces | 8eb5b6315abdc44b93227845276d3caa8a5875a5 |
| 20261012015600 | dic_shots_recipes_community | 15a832e8cdae53090c8d61e7b1131d7ab8a4ad74 |
| 20261012015655 | dic_internal_function_access | 743936e2a86c219f76fdc7763111410888b1c7fa |

The earlier proposed monolithic migration was not present when the repository was rechecked. This checkpoint instead records the five actually applied, independently verified migrations. Do not treat an attempted tool write as a successful commit without checking the returned result and repository tree.

## Test coverage

`supabase/tests/security_foundation.sql` is the reproducible 60-check suite. Execute with `psql` and `ON_ERROR_STOP=1` against a development/test Supabase database using the migration role. It deliberately creates synthetic Auth rows inside rolled-back transactions, not via the public signup endpoint. Keep this separate from later browser and API tests.

Coverage includes: pending-user denial; owner-only reads and preference edits; cross-user write denial; metadata-based self-promotion rejection; protected contributor mappings; verified-only catalog access; safe user submissions; private library/setup/shot/note isolation; admin review access without access to other users' private notes; anonymous denial; historical hardware immutability; owner/setup composite-key constraints; mismatched burr calibration rejection; unknown legacy feed preservation; missing-grind legacy exception; all-green time independence; advisory Basket Dose range; correction and withdrawal of community projections; duplicate projection prevention; audit entries; membership revocation; and identity detachment on account deletion.

The suite initially ran with an empty application database. It should remain restricted to controlled test/development use, not be run casually against a live beta database.

## Advisors

Security: zero remaining findings.

Performance: informational unused-index notices only (17 at the check). The application has no live workload yet, so the indexes were retained rather than removing foreign-key/query support based on empty-database usage statistics. No claim of load/performance validation is made.

Supabase reference for the remediated warning: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

Reference for the performance notice: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## Still not complete

- Real browser signup/login/password recovery and email delivery configuration.
- Invite redemption and controlled member/admin provisioning.
- Authenticated mutation endpoints, per-record revision checks, idempotent retries, offline queues and multi-device reconciliation.
- Operational coffee verification, admin review actions, outlier confirmation and contributor-balanced family/summary workers.
- Hosted frontend integration and real-device tests.
- Automated encrypted Google Drive backup, failure alerts and tested recovery including managed Auth/configuration and any stored objects.
- Production import of the user's fresh prototype backup.

The existing `private.backup_runs` and `private.mutation_receipts` tables are foundations only. No scheduler, Drive credential, backup file, or running synchronization job is implied.

## Next implementation milestone

Bring the current frontend source into version control, add controlled authenticated write/sync APIs with tests, then connect accounts and cloud state. Keep the local prototype available unchanged until the cloud build is explicitly handed over. No user action is needed for this foundation checkpoint.
