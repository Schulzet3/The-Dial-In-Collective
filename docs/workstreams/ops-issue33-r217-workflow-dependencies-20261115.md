# Issue #33 R217 — source workflow dependency event-filter repair, 2026-11-15 UTC [skip netlify]
DIC_PREFLIGHT_VERIFIED development_sha=1896fc4ed152084126e8ce683748d8c2bfc591d2 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Authority: active owner DEVELOPMENT-only Issue #33 source-evidence reliability, current AGENTS, PREFLIGHT, Locked Master/Decision, original603 immutable oracle. No publication, provider/production/member records, backup, schedule or automation modification.

Preflight: fetched live development commit 1896fc4ed152084126e8ce683748d8c2bfc591d2, then docs/ai/PREFLIGHT.md at that exact immutable commit; Git file blob 2fb236bbfa6bac48513eeb3bd157b260853af06d independently fetched and content compared before AGENTS or scoped topic. R215 workflow original blob 0bf6e3864dde38c2daeb6e80d1752a244a282bc8; R216 original blob e1a08212a7e0aabaa26bc23bd6965e096c4f5ec0. Same-commit source/test/CI journal receipt above.

Verified reproducible defect: both pull_request.paths and push.paths omit transitive executed dependencies. R215 omitted src/server/coffee-html-structure.mjs (directly imported by selected-offer H2, direct prose and metadata) and src/server/coffee-url-guard.mjs (directly imported by focused official HTTPS review). R216 additionally omitted src/server/coffee-selected-offer-h2.mjs and site/cloud/coffee-url-autofill.js (both reachable from focused review/metadata); it likewise omitted html-structure and URL guard. The previously fixed R213 workflow is not reworked. This can cause dedicated exact-selected official-source CI to SKIP on a dependency-only change; it does not establish bypass of five mandatory release gates or invalidate source-pinned earlier tests. See #508-to-#33 source graph handoff at Issue #33 comment 6888785260.

Correction (only R215/R216 workflow YAML + dedicated focused regression):
- Add the actual missing imported/executed modules to BOTH PR/push filters, with self-trigger for the test.
- Execute the new Node built-in assertions in both focused workflows; assert paths in BOTH events, preserve existing selected case numbers, positive/hostile parser tests, guarded public HTTPS, Add Coffee/Source Review, source SHA afterproof and retention boundaries.
- No parser/runtime or source-evidence semantic change, no untouched workflow rewrites, no modified original 603 CSV/201 roasters/1,197 captures or oracle/scorer.

Acceptance: exact changed-source test PASS; affected focused GitHub workflows succeed at PR head, applicable approval and Node/cloud/SQL/security as actually required succeed, reviewed source nonforce merged, changed Git blobs read back on merged development SHA. Full frozen603, real signed-in/device and every individual coffee verification remain NOT CERTIFIED; Issue #33 OPEN, R215 strict queue gate separately TESTING until #2829 independent five-check resolution, #267 V2/#96 separately owned.

At source commit: CI and merge PENDING; next step independently inspect PR check jobs, repair any failure, verify safe nonforce merge and record exact evidence in #33 GitHub issue/journal; no automatic READY, DEPLOYED or Publish inference.
