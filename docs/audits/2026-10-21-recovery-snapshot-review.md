# Recovery snapshot concurrency follow-up — October 21, 2026

**Status at 22:34 UTC:** source repair and local PostgreSQL 17.11 behavioral verification PASS. Independent source/test review complete. Exact GitHub integration, hosted CI and any deliberately authorized main-operations promotion remain the root agent's responsibility. No hosted backup, restore, database mutation, deployment, grant, provider setting or remote Git write was performed by this reviewer.

This is a follow-up to the completed three-pass release/workflow audit. It closes the specific recovery comparison race that the earlier report retained as open; it does not rewrite that earlier evidence or imply that an existing archive or prior successful restore was defective.

## Confirmed defect and correction

The previous recovery drill took a consistent `pg_dump`, then opened independent source connections for the nine core counts, every table's count, app-schema totals and payload fingerprints. A legitimate committed write between those observations could produce a mismatch against a correct dump. The observed source code establishes that race; this audit does not claim to have observed it on production.

`capture-recovery-snapshot.sh` now runs one **read-only, repeatable-read transaction**. It exports a snapshot, supplies that identifier to `pg_dump --snapshot`, and retains the exporting transaction while it reads every expected count, schema total and row fingerprint. The transaction closes only after all expected files have been produced. The offline restore compares against those files; it no longer reconnects to a moving live database for later expectations.

PostgreSQL documents that an exported snapshot remains available while its exporting transaction is open, and that importing sessions share the same view of pre-existing data. The supported `pg_dump --snapshot` option provides that import. Sources: [PostgreSQL 17 snapshot synchronization](https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-SNAPSHOT-SYNCHRONIZATION), [PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).

The implementation uses the existing PostgreSQL container and existing source credential. It needs two concurrent source database sessions while the dump runs. It creates no database objects and changes no stored source data. `row_security=off` is local to the read-only transaction and causes insufficient read privileges to fail rather than silently filtering expected inventory; it grants no privilege.

## Failure handling and cleanup

`psql` uses `ON_ERROR_STOP=1`, but a shell escape needs an additional child-status check. The collector checks `SHELL_ERROR` immediately after `pg_dump`, and accepts success only when the exact completion marker appears after the final transaction close. Therefore an early `\quit` following a failed child cannot be mistaken for a successful capture. A SQL error, missing completion marker or unreadable dump also fails the operation. This follows the documented [`psql` shell-status and error behavior](https://www.postgresql.org/docs/17/app-psql.html).

The operational row-count and fingerprint comparisons now share `assert-recovery-inventory.sh`. It rejects absent/empty files and any byte mismatch, and emits a fixed diagnostic without printing records or hashes. All existing table-scope, required DDL/data, core counts, complete table counts, app/Auth metadata and payload gates remain present. The same 30-table lower bound remains intact.

The independent reviewer also identified a pre-existing cleanup gap: the source container had no name, so a lost Docker client could leave a daemon-owned collector running without the script having an identifier to remove it. The source is now named. The existing EXIT handler attempts to remove both source and restore containers before deleting the private output directory. This proof covers ordinary script exits and the tested child/SQL failures; runner destruction, SIGKILL and Docker-daemon unavailability are not represented as tested cleanup guarantees.

The restore target remains `--network none`, with no published ports and no source credential forwarded to it. The source helper is mounted read-only. No dump, row fingerprint, private data or recovery key is uploaded. The nightly encrypted-backup path, its public encryption recipient and archive custody are unchanged by this follow-up.

## Behavioral verification

The official PostgreSQL **17.11** source archive was downloaded from `ftp.postgresql.org`, checked against its published SHA-256, compiled and installed entirely under `/tmp`. Required build tools were downloaded from signed Ubuntu package metadata and extracted under `/tmp`; no system package installation was performed. Initial configuration correctly failed for missing bison; local build-tool extraction resolved that prerequisite. An early invocation with a nonexistent working directory was retried from `/tmp` without changing source. These environment attempts are not hidden as successful tests.

The actual regression used a newly initialized PostgreSQL 17.11 instance, an unprivileged operating-system user, a private Unix socket and **TCP disabled**. Its SQL fixture refuses any database other than local `dic_snapshot_ci` before DDL. All records are synthetic. This environment cannot create a separate network namespace (`unshare` returned OS `EPERM`); the checked-in CI runner supplies the explicit `--network none` boundary.

The real server reported PostgreSQL 17.11 and confirmed both `listen_addresses=''` and a Unix-socket connection. The regression exited **0** and passed all six scenario groups:

1. A test-only `pg_dump` wrapper commits an update and insert through a second connection **after export and before the dump reads**. The source has the new two-row state; the restored archive retains the original one-row payload. Every core count, per-table count, schema total and fingerprint agrees with the shared snapshot.
2. Changing only a restored payload leaves all row counts unchanged. The real operational fingerprint comparison rejects the corruption.
3. A mutation control deliberately strips `--snapshot`; the concurrent write then makes the dump and expected inventory disagree, and the real comparison rejects it.
4. A `pg_dump` child exit of **37** fails the collector; the exporting session is closed.
5. A source inventory query failure fails the collector; the exporting session is closed.
6. Two empty inventory files cannot create a matching recovery receipt.

The test instrumentation exists only in `tests/backups`; it is not a production hook. The unchanged production collector is exercised by placing a test wrapper earlier in that disposable test process's PATH.

After execution, the synthetic cluster directory count was **0**, and no PostgreSQL process remained. No live database connection was used.

The final targeted Node command passed **9/9 tests, zero skips**, including two new executable negative tests. One invokes the actual operational shell with fake Docker, injects source exit 37, verifies both named container removals while the output still exists, then verifies deletion of that output. The other invokes the real comparator and verifies that mismatched fingerprint values never appear in stdout/stderr. Existing backup, required-workflow and complete SQL-runner coverage checks passed in the same command.

```sh
node --test tests/backup-snapshot-policy.test.mjs tests/backup-security.test.mjs \
  tests/required-check-workflows.test.mjs tests/sql-runner-coverage.test.mjs
```

All five affected shell programs passed the appropriate Bash/POSIX syntax check. The new Node test passed pinned ESLint 10.13.0 with **zero warnings**. The editor environment's normal child-process sandbox causes false `spawnSync ... EPERM`; the executable tests ran under approved normal local child-process permissions, with no skipped assertions or altered error handling. The independent reviewer documented source/syntax verification separately and did not claim an independent runtime PASS from their blocked sandbox invocation.

## Independent review

The history/SQL reviewer re-read the collector, operational restore, shared comparator, synthetic fixture, runtime regression, CI runner, both workflow integrations and cleanup tests. They confirmed the snapshot remains open for all observations, the child error cannot be accepted as success, the target receives no source secret, and the deterministic corruption/control cases exercise real comparisons. Their one concrete cleanup finding was implemented and re-reviewed. No further definite blocker was found in this bounded change.

## Integration inventory and remaining gates

The precise nine-file source inventory, byte lengths and hashes is in `recovery_snapshot_followup_files.json`. It is additive to the earlier 25-file audit inventory; two existing files (`isolated-recovery-drill.sh` and `database-recovery-drill.yml`) now have newer follow-up hashes.

The application `sql` CI job now runs `scripts/audit/isolated-backup-snapshot-regression.sh` after the existing SQL and signed-HTTP checks. Its push paths include the helper, backup scripts and synthetic fixtures. The new test uses `postgres:17.11-alpine`, no secrets and no network. The existing 10-minute job budget is unchanged.

Any eventual main-operations sync must carry **all four operational dependencies together**: `isolated-recovery-drill.sh`, `capture-recovery-snapshot.sh`, `assert-recovery-inventory.sh`, and `database-recovery-drill.yml`. The workflow's main-only push filter now includes both helper files. Such a promotion would trigger the existing live-source recovery workflow; this report does not authorize an extra run or claim that promotion occurred. Root must keep the current authorized operations scope and same-commit journal requirements intact.

The immutable production source pin, consumed release grant, release branch, existing archive, provider credentials/settings and live app/data remain unchanged. Actual hosted CI must pass on the integrated exact commit before treating this source follow-up as accepted there. Metadata totals and row fingerprints retain their prior recovery scope; this is not a full hosted Auth/Storage/DNS/SMTP reconstruction.

## Suggested same-commit journal paragraph

> Closed the confirmed source-only recovery comparison race with one exported read-only repeatable-read PostgreSQL snapshot shared by pg_dump and every expected core/table/schema/payload inventory. Added explicit psql child-failure/completion checks, retained every existing restore gate, and named the source collector so EXIT cleanup removes it before private output. Independent review found no remaining definite blocker after that cleanup correction. A fresh Unix-socket-only PostgreSQL17.11 instance with TCP disabled passed six real scenario groups: concurrent committed writes, unchanged-count payload corruption, removed-snapshot mutation control, dump exit37, inventory SQL failure and empty inventories; exporters and synthetic data were cleaned up. Nine targeted Node checks passed without skips, shell syntax and pinned ESLint passed. Secret-free CI now repeats the regression in a network-none PostgreSQL17.11 container. No hosted backup/restore/SQL, provider change, deployment or grant use occurred; exact integrated CI and any separately scoped main operations sync remain pending.
