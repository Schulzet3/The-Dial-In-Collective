# Complete local PostgreSQL regression verification — October 21, 2026

## Result and scope

**PASS:** the third complete execution applied all **34 checked-in migrations** and passed all **17 staged and final SQL regression suites** on a fresh, synthetic **PostgreSQL 17.11** database. The checked-in bootstrap and owner fixture also completed. The execution exited **0**, and the final runner message confirmed all checked-in suites completed without a hosted connection.

The exact immutable input snapshot is recorded in `local_project_sql_20261021_attempt3_files.json` (56 files, including the generated local dispatch transport). The full execution log is `local_project_sql_20261021_attempt3.log`, SHA-256 `935ff2dc0f46ddbb50d140e337e6ed4b1baaef68bef4771918769c9fa43bb3d9`. Environment and exit status are separate files with that prefix. `local_project_sql_receipt.json` records the executed path sequence, cleanup readback and candidate timestamp rename readback.

This is a database semantics and regression result for the reviewed source. It did not apply migrations to Supabase, modify any hosted records, publish the application, issue invitations, spend release credits or consume a grant. Docker readiness/network isolation and signed HTTP/PostgREST tests remain separate exact-commit CI gates.

## What executed

The local transport copies `supabase/migrations`, `supabase/tests`, `tests/sql`, and the checked-in `scripts/audit/isolated-sql-regression.sh` into a fresh private temporary tree. It extracts the exact dispatch body starting at the unique bootstrap call. Only `run_sql` changes: it sends those same checked-in files to local `psql -X -v ON_ERROR_STOP=1` instead of `docker exec`. It does not copy anything back to the repository.

Four historical suites run immediately after the schema version they are intended to verify: `security_foundation`, `native_import`, `owner_only_import_exception`, and `setup_rename_feed_memory`. This preserves their historical validation boundaries before later migrations supersede parts of the schema.

After all migrations and the owner fixture, all 13 final suites ran: `coffee_identity_matching`, `coffee_automated_approval`, `admin_read_only_dashboard`, `admin_coffee_review`, `admin_content_review`, `coffee_duplicate_first_auto_approval`, `admin_invitation_controls`, `url_preview_release`, `universal_url_preview`, `seven_roast_levels`, `community_quality_integrity`, `pre_release_cross_account`, and `source_worker_auth_and_admission`.

The final admin migration was captured as `20261021222700_dic_admin_content_review.sql`, SHA-256 `0d3270956fafec565afac80473289ea1eae8737fb72d6a3f51cbd5097c880276`. Its regression file SHA-256 was `3b32341dc03e88889c7c98ad3ec2d8fc964b4e81c1773ba1538a8ab05d8cacf6`. Root subsequently renamed only the unapplied candidate to CLI-generated `20261021224447_dic_admin_content_review.sql`. The exact source bytes and ordering after `20261021221455_dic_source_worker_auth_and_admission.sql` are preserved; the final local readback is in the receipt. The original filename in the test log is intentional evidence of the executed snapshot.

## Failures retained and corrected

The first execution applied all migrations and reached the new admin suite, where the existing equipment provenance trigger rejected its synthetic shot fixture. The synthetic setup specified `grinder_model='Synthetic grinder'`; its calibration fixture omitted that value and therefore stored NULL. `private.capture_equipment_snapshot()` correctly refused the inconsistent setup/calibration. The owning reviewer fixed the fixture, leaving the trigger and production schema intact. The captured terminal diagnostic is preserved in `local_project_sql_20261021_first_failure.txt`. The first yielded run's persisted log later ended before its terminal failure, so that log alone must not be represented as the complete first-attempt transcript.

The second execution passed the corrected admin suite and all preceding final suites, then reached the same fixture mismatch in `pre_release_cross_account.sql`. Root corrected that synthetic calibration in the same way. Attempt 2's complete log, input hashes, environment and exit status are retained under `local_project_sql_20261021_attempt2`. Its failed execution did not reach the final source-worker suite and was never counted as a complete pass.

Before attempt 3, the independent reviewer also corrected an admin audit omission: a URL-only approved-coffee edit added a source row, but the audit snapshots did not previously record the source rows. The final migration records them, and the added regression verifies original source retention, nonofficial provenance, actor/revision audit, unchanged coffee facts, and repeated-URL deduplication. Attempt 3 includes that final correction as well as both fixture repairs and passes the final source-worker authorization/admission suite.

## Runtime and containment

The runtime was compiled from the official PostgreSQL 17.11 source archive after checking its published SHA-256. Binaries are installed at `/tmp/dic-pg17-runtime/bin`; the same-source build is `/tmp/dic-pg17-build/postgresql-17.11`. Required `pg_trgm` and `unaccent` extensions were compiled and installed from that source. The current migrations do not require `pgcrypto` at runtime.

The server runs as the unprivileged UID/GID 65534 in a fresh private temporary directory. It listens only on a private Unix socket with `listen_addresses=''`; the environment receipt reports both TCP disabled and local-socket access as true. The runner refuses an existing `SUPABASE_DB_URL` and clears inherited connection overrides. Its EXIT/INT/TERM cleanup stops the local server and deletes that private cluster. The final receipt verifies no matching temporary cluster or PostgreSQL process remains.

The local runner is `/tmp/dic-pg17-build/run-local-project-sql.sh`; it accepts the repository path and a distinct evidence prefix. A bounded invocation is:

```sh
timeout --signal=TERM --kill-after=10s 180s \
  bash /tmp/dic-pg17-build/run-local-project-sql.sh \
  /workspace/scratch/e138009564a7/repo \
  /workspace/scratch/e138009564a7/audit_evidence/local_project_sql_next
```

This local environment could not create an OS network namespace (`unshare` returned EPERM), so its containment proof is the private Unix socket, TCP-disabled server, cleared connection state and synthetic database. The checked-in hosted CI uses the stronger Docker `--network none` boundary. No claim of SIGKILL, runner destruction or hosted execution is inferred from the ordinary cleanup result.

## Journal paragraph for root

Completed the full reviewed migration sequence locally on PostgreSQL 17.11 using a fresh synthetic database: 34 migrations, all four historical-stage regressions and all 13 final SQL suites passed, exit 0. Two complete earlier attempts exposed synthetic calibration/setup mismatches; corrected those fixtures without weakening the existing provenance trigger and preserved both failure receipts. The successful snapshot includes the final admin source-URL audit correction, cross-account isolation and source-worker JWT/admission regressions. Hashes and the exact executed path sequence are recorded in the local SQL receipt. The admin candidate was then renamed byte-identically to its Supabase-CLI-generated timestamp. No hosted SQL, application publication, grant consumption or credit spend occurred; remote exact-commit Docker/HTTP gates remain independently required.
