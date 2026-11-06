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

## November 3 — completed exact-source CI and nonpublishing integration

- Owner approval: dedup, risk classification, exact-source evidence reuse and ONE later publish instruction. Owner explicitly rejected automatically/preemptively preparing/certifying READY releases.
- PR [#458](https://github.com/Schulzet3/The-Dial-In-Collective/pull/458) head `e8d7d8f01c637e9b53a5074f3372ae6fffd33090` passed all 5 applicable source-bound named jobs, Python audit; intentionally skipped frozen603. Historic invalid YAML runs were genuine pre-job FAIL and fixed in subsequent commit, never relabeled PASS.
- Nonforce squash merged `7d3418c69120a569c781e91b8e88a4007bb33e4d`; exact same Git tree as PR head `b297c0d658df243cdac82b9b6a110cf5165af229`. No overwritten concurrent #33 code/test/ledger.
- **Merged CI SUCCESS:** approval 41728785262, validate 41728785093 (2,297 Node PASS, 0 FAIL, 6 SKIP; lint PASS), cloud-tests/mobile-browser-qa 41728785142 (cloud duplicate test body NOT_APPLICABLE; one real browser build + visual/mobile/permissions/offline PASS), isolated SQL 41728785128 (actual isolated schema/JWT/snapshot PASS), python-audit 41728785081, queue/intake 41728785159. Frozen original603 source jobs SKIPPED, not PASS.
- Live Netlify site readback current/READY deploy still `6ae8006cd64b30ae9046e44d` Release14 exact SHA `8e3808f0d7532f47ea348ef9a58e5aa87d714ffe`; queue 1 READY #335, 89 DEPLOYED, 3 IN_PROGRESS. No release candidate, grant, automated staging, production SQL/Auth/member write, new backup or Netlify publication under #457.
- Final acceptance: scope-based tests and documentation complete/verified. **First actual owner-approved risk-scoped READY-only production release remains UNTESTED** and belongs to #417; don't call it a PASS. Owner must explicitly say PUBLISH to invoke it; no automatic preparation. Project Instructions copy 7,995 chars in GitHub; owner alone can update ChatGPT Project Settings.


## November 6, 2026 — fast fail-closed PR ancestry and single queue validation (#457)

**Owner authority:** Additional efficiency improvements requested after the verified one-command release reconciliation; development/CI-only, NO publication. Base development e64b25c1e4cf3e8595fadb74f51d7453c8d3a432, ops main eaa1ff090d3872a8ac8c8550799152957e5d3e1e, release/production 480aca1b32d7ded0bb83e9a899c4d7d5e6200e89. No Locked product or release authority changes.

**Reproduced inefficiency:** PR #1091 original head e8e7009d29e35bb8a4b0b78be519aceb855eb5c2 failed governance [42286081234] because the PR's live base advanced to 4ff819318198d303bd2c24ae0a0c4ffe6b725ebe; existing PR audit demanded current base be a strict ancestor of older feature head. This forced an otherwise unnecessary nonforce branch merge and second PR CI (42286261087 SUCCESS) before merge e64b25c1e4cf3e8595fadb74f51d7453c8d3a432. Approval also invoked three independent queue processes: --validate, --enforce-intake and nonblocking --status; --enforce-intake already performs schema validation, while --status repeatedly reports nonrelease HOLD conditions.

**Four-path same-commit repair:** scripts/audit/verify-commit-checkpoint.mjs only for trusted pull_request event requires a unique verifiable merge-base and audits every PR-exclusive commit from live base..exact PR head; ordinary pushes STILL require strict exact before->after ancestry. Reject disconnected/ambiguous histories, missing journal or unmarked commits; 400-commit limit unchanged. approval-continuity.yml passes trusted GitHub event name and runs a single --enforce-intake check, retaining full schema/intake enforcement, security inventory, approval coverage and PR commit audit. tests/commit-continuity.test.mjs adds real isolated Git regression for a valid behind-base PR, push-mode fail-closed and missing-journal/unmarked adversaries, plus workflow shape test. No changes to five required status job names, risk classification, skip semantics, queue, app, Netlify, Auth, backups or database.

**Acceptance pending this commit:** exact changed blob/parent readback; targeted Node22 fixture tests and all applicable high-risk source-bound checks; safe nonforce integration and merged SHA/CI; unchanged production. Do not claim tests passed until executed.
