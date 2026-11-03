# Issue #457 — risk-based, nonduplicating release CI

Owner November 3: approved deduplicated builds/browser, automatic conservative source-impact classification, reuse of exact-source passing evidence, one-command publication; EXPLICITLY REJECTED proactive READY-candidate assembly/certification. Development only, no production grant or release.

Source base: `0772c65662d776793723cc11559502f1fb9ee779`. Same-commit paths: scripts/audit/ci-scope.mjs, tests/ci-scope.test.mjs, tests/ci-impact.test.mjs, tests/ci-optimization.test.mjs, cloud-beta/cloud-regression/isolated-sql/visual-review workflows, this journal. Candidate CI compares actual published-source to READY-only deployable tree, not its staging manifest. Unknown refs/paths fail closed HIGH. Exact five existing named CI statuses remain; individual suite NOT_APPLICABLE is logged, never claimed PASS. Non-UI build owned by validate; UI/Auth build by mobile browser; no redundant routine build. Deep visual workflow manual-only. Sunday comprehensive/backup scheduled checks unchanged. No automatic staging/claims/provider writes.

Acceptance: adversarial classifiers, CI-level browser/cloud/SQL applicability and dedup contracts, high-risk PR full Node/lint/isolated SQL/browser verification, approval and continuity, noforce merge, merged-source evidence, unchanged Netlify. Current: code STAGED, tests/PR CI and integration pending. Repair failures without force; preserve current #335 READY and Issue #33/#267 source/history, Auth/privacy/SQL/offline data.

## Same-commit canonical owner policy reconciliation, November 3

Owner authority recorded as a NEW Locked scoped supersession at the top of docs/MASTER_SPECIFICATION.md and in docs/DECISION_LEDGER.json with approval coverage inventory. Explicit rejected proactive READY release staging corrected in docs/RELEASE_QUEUE_RUNBOOK.md and full Project Instructions (<8000 chars), CURRENT_STATUS. Existing exact five named checks and single release controller retained; new CI suite classification no Netlify/Supabase/backup action. This commit is documentation-only, not CI acceptance or publication; PR exact-source CI and merge still pending.

## Corrected initial pre-job YAML and unknown-file risk (same-commit, not a PASS)

Initial branch push workflow runs 41727959264, 41727961082 and 41727957046 FAILED before any jobs because unquoted inline echo with a colon in YAML `run:` is invalid. Converted those messages to block scalars. Adversarial source test also identified unknown `site/*.tx` was classified medium due an overly broad `site/**` match; now only recognized site JS/HTML/JSON routes are medium, unknown file formats high. No product source, release, backup or provider change. Retest exact corrected PR head, preserve historical failed runs.

## Concurrent owner-authorized extractor source integration (merge-only)

Latest development `4f36301cc25ea61e593590b5a59ef13df4227da4` (Issue #33 PR456) advanced after this branch fork, changing selected Buncho source identity, regression and its same-commit #33 journal. This non-force two-parent merge brings those exact code/test/journal bytes into the #457 branch without rewriting, staging or publishing them. The sole overlapping Project Instructions file was reconciled to retain the new #457 risk policy plus the concurrently restored PRIVATE GitHub Free and owner-only credit/screenshot literal constraints. PR exact-source CI after this merge is required; no result from the premerge PR head is accepted as final.
