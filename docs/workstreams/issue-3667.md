# Issue #3667 — bounded full-suite CI speed experiment
DIC_PREFLIGHT_VERIFIED development_sha=049cda39aa4c17e6cae7978b7adc2f675deb820d preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

## Authority, scope and baseline (November 21, 2026)
- Owner asks for drastic implementation-to-READY acceleration. #457 requires risk-tier tests, one build and five exact-source checks; #3347 requires nonpublishing frozen candidate evidence before READY. No relaxed Auth, SQL/RLS, privacy, offline, backup, or publication gates.
- Exact GitHub timing from concurrent startup task before this change: run 44979951464 full Node step 03:17:57–03:21:33 UTC (216 seconds), run 44978550911 02:59:56–03:04:38 (282 seconds), run 44979086164 03:06:45–03:10:09 (204 seconds). Browser run 44979951499 took ~124 seconds; Chromium install ~41 seconds. Startup-shell edits in site/cloud/main.js are HIGH because the file also includes Auth, so all Node tests and high-risk browser/SQL are correctly selected.
- Scope: only package.json test entrypoint, new scripts/audit/run-full-suite.mjs, tests/ci-optimization.test.mjs and this journal. No changes to site code, SQL, release queue, READY labels, security code, CI job names, workflows, providers, grants or production.

## Change and acceptance
- Preserve EXACT former full-suite enumeration (tests/*.test.mjs plus tests/audit/*.test.mjs); run each file once. General tests bounded at four concurrent Node files; malicious HTML resource budget tests separately run at one after general completes. Security subset runs even after general failure. Missing resource test, empty or duplicate suite plan fails closed; no skipped file declared passing.
- New direct test proves exact collection, protected security isolation, absent-resource fail-close, and 4s child budget. Existing approval/security/SQL/browser checks unchanged.
- Required: focused tests, complete exact PR CI, nonforce integration with [skip netlify], exact merged Git SHA/CI and actual measured timing against baseline before claiming speed gain. Status: IN_PROGRESS; no READY or release published.

## PR first-head approval HOLD, safely repaired
- Exact PR #3668 run 44983557010 job 137089092114 failed intake: `package.json` had no TESTING queue owner, while all affected runtime/product code remains unchanged. Added `DIC-Q-3667-ci-parallel-full-suite` TESTING scoped to package.json in the same documentation reconciliation. Do NOT claim earlier failure passed; rerun current exact PR five checks.

## Measured benchmark and two-runner corrective acceleration — November 21/22, 2026
DIC_PREFLIGHT_VERIFIED development_sha=d3dbfb43ab1515ce254d5d91ea1275243ba6aa10 preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e
- First measured exact PR head 44c1a04466fd908996eeba537cd6220556a5fa32: five named CI jobs, security and Python COMPLETED SUCCESS; original603 SKIPPED. Node full-suite 04:08:47–04:12:34 UTC = 227s. Compared with baseline 204/216/282s (mean 234s), ~3% average improvement is insufficient.
- Correction: partition exact same Node test files into deterministic disjoint 0/2 and 1/2; existing required validate and cloud-tests jobs execute concurrently on separate GitHub runners. The malicious HTML resource-budget file remains serial only in shard0. No test removed/repeated; both named jobs must be completed-success for source-bound READY. Unsharded npm test remains full for local/release contexts. One app build remains owned by mobile-browser-qa for high UI/Auth.
- Cloud regression PR path exclusions and push filters now cover every source category accepted by validate, preventing half-corpus execution without second job. Focused medium and docs-only applicability unchanged; targeted cloud tests are NOT_APPLICABLE under HIGH, while its full-corpus shard remains mandatory.
- Added tests for full union/disjoint coverage, security once, invalid shard rejection and trigger parity. Exact five PR and merged push CI required. No Publish, provider/DB/member write, READY promotion, Netlify build, secrets, or force update. TESTING until proven.
