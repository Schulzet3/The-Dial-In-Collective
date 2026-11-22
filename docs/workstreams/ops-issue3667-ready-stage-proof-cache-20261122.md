# #3667 — immutable READY source-proof caching (main operations; 2026-11-22)

DIC_PREFLIGHT_VERIFIED development_sha=133472bb8eb8d1707432496579aaee46701671d8 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

- **Authority:** owner #3667 speed-first (speed 10/10, reliability 9/10); Locked #3347 candidate source isolation. Live development 133472bb8eb8d1707432496579aaee46701671d8, preflight c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f, main parent 750424f0b8b69ef7601c5de8d055ab3f96d0ecfd.
- **Measured bottleneck:** READY pre-certification repeatedly reads identical immutable SHA:path blobs and ancestry pairs when planning/restoring test and workflow source; each duplicate spawned a fresh git subprocess. Optimization changes only reusable proofs, not release rules.
- **Change:** per-invocation immutable source-object and Git ancestry memoization in scripts/release/stage-ready-only-candidate.mjs. Cache explicit null/false, but never errors. Preserve all real Git candidate isolation assertions, five exact-SHA source-job requirements, and owner Publish-only release.
- **Acceptance:** focused cache test covers repeated positive/missing/negative reads and uncached failures; existing disposable-Git staging regression remains required; verify PR CI, nonforce merge, exact main push checks, resulting source blobs. Measure a real frozen candidate before claiming numerical end-to-end improvement.
- **Status on authoring:** TESTING, no #3667 ready source candidate, no verified under-15-minute request-to-READY proof. No app, Auth, privacy, offline, SQL, Netlify, grant, DB, production, paid service, or provider write.
