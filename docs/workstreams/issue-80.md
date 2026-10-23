# Issue #80 — Owner-approved refinements

## 2026-10-22 — Scope journal initialized
The owner approved same-commit independent workstream journals to reduce conflicts in parallel code and testing. This source-only checkpoint adds the indexed location; earlier feature implementation evidence remains in the central work journal. Preserve all Locked behavior and do not deploy or mutate Supabase until a separate owner publish instruction. This stream is TESTING until exact source GitHub CI and nonforce integration are verified.

## 2026-10-22 — CI intake recovery
First PR approval CI failed correctly: the workflow audit script is operational CI-only, not a deployable application path, so adding it to RELEASE_QUEUE violated queue schema. Removed that invalid item; the source/test improvement remains tracked through Issue #80, this same-commit journal and GitHub PR. No app deployable files modified.

## 2026-10-22 - authorized READY-queue exact-source release validation
- Owner authorized one release of all 11 READY queue items in Issue #80 comment 6353908213. This SAME commit adds a conservative SQL migration-risk test, a disposable PostgreSQL staged-RPC smoke test, and visible-screen assertions to packaged Chromium browser smoke. These are test-only changes. They trigger the five required exact-source GitHub CI jobs; no app behavior, release ref, production database, or user data is changed by this commit.
- Release ID DIC-20261022-READY-QUEUE-04 is reserved for a one-use source-bound grant after five checks and fresh encrypted offsite recovery evidence. Main backup request generated fresh artifact 12468515140; backup is not yet certified offsite. Preserve current dev and parallel work; publishing still pending verified readiness.

## 2026-10-22 - automated SQL runner regression repaired before release
- Exact tested source 66b885e5955ea3e985aa1febb6ced1df1ac8a976 failed one Node contract because its new ready_queue_release.sql suite was checked in but omitted from the explicit isolated SQL runner list. The same-commit fix includes that suite in scripts/audit/isolated-sql-regression.sh; no production operations or application runtime changes. Preserve the initial red CI as valid evidence, rerun five exact-source checks before proceeding. The encrypted backup remains GitHub-verified but private Drive upload is not yet verified.

## 2026-10-22 - final five-check release source candidate
- The previous exact-source Node contract failure was fixed by including the newly checked-in SQL suite in the isolated runner; subsequent Node/approval checks on f12d2189e9a88097ced70c1ab4f829f653bda5dc passed. This same commit expands release SQL acceptance to cached verified preview RPC and packaged Chromium acceptance to visible member welcome UI. Both tests now trigger the five mandatory workflows on one exact candidate SHA. No runtime features, migrations, consumer data or production operations changed. Await independent all-five green CI and a real offsite backup receipt before issuing the one-use release claim.
