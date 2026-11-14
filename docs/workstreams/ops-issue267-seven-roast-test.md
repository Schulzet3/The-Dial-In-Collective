# Issue #267 T17D focused test defect remediation (2026-11-13 Denver) [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=5c85c894273e9e7c8690fb43407e886aab5e0c7e preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Scope: development-only owner authorization for reproduced SQL test assertion weakness in P193; no prod SQL, Edge/Auth, real member/shot/history, migrations, backup, queue/READY, release, main or Netlify changes. Concurrent #509 SQL owner notified with exact original lines at https://github.com/Schulzet3/The-Dial-In-Collective/issues/509#issuecomment-6873076713; no overlapping open PR found for seven_roast_levels.sql before change.

Original pinned source commit 9707553a64f88127826e8f5b2b36cd0651296e83, source/live prechange blob 071e3471634c7a8d45e546bcdf30e97115c17221, exact 39 physical lines; same-commit SQL after-source blob 181b48da95d7bf9b46495118c92a4674381472b2 with 40 physical lines. Single new line23 `rejected:=false;` immediately before second unsupported `Ultra-Medium` negative insertion. First independent invalid `Light-Medium` still resets before its check; all remaining 39 literals identical shifted one position. Added 1 reviewed current source-code delta line, no original frozen/pinned duplicate credit. Separate nine-field source-bound evidence: docs/audits/issue267-P193-seven-roast-negative-assertion-source-fix-20261113.json.

**Reproduction before patch:** Node 22.16.0 deterministic sentinel control-flow microcase: first expected CHECK sets rejected=true; deliberately simulate second INSERT unexpectedly succeeding. Baseline returns FALSE_PASS; patched control flow throws second invalid unexpectedly accepted. When second actually CHECK-rejects, patched flow PASS. This is a source-level test control-flow reproduction, NOT a claim that the production roast constraint accepts invalid labels or an actual PostgreSQL fixture run.

Acceptance: isolated PostgreSQL suite must execute exact edited SQL successfully and reject forced-invalid second-case behavior if independently mutation-tested; exact PR-head and merged-source governance SUCCESS required before this source fix can be called verified. Node22 project build, visual/mobile/browser/offline, hosted signed Auth and original603 oracle NOT_RUN unless applicable CI requires; no skipped/pending test counted PASS. No deployment authorized.

#267 remains OPEN; cumulative original audit frozen 579961/pinned 57913 unfinished; next original F183:1/P195:1. Current live drift outside this single test insertion remains unreconciled.

Correction to failed PR #2602: old journal path with date suffix was outside the repository's exact scoped-journal filename allowlist, so governance failed. This NEW recognized ops-issue267 journal is in the SAME COMMIT as the test change; old PR remains unmerged. No guard logic weakened, no duplicate SQL edit merged. [skip netlify]
