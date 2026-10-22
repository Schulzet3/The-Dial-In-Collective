# Tenfold update pipeline: source-only optimization sprint

This implementation is development-source only; neither an owner-signed release grant nor a production publish. The user explicitly requested source-only implementation and a faster redesigned flow. A generic invitation to "loosen requirements" does **not** identify which Locked release/backup/data decision is superseded. Separate product approval and exact supersession in the canonical Master Specification and Decision Ledger are required before changing any mandatory production safeguard.

## Implemented first tranche

1. One authoritative full Node test/lint/build check remains in `cloud-beta-ci.yml`. The distinct cloud syntax, mobile Chromium, and private visual/offline checks remain separate release-gated workflow names. Duplicate `npm test`, extra cloud build, and duplicate Chromium acceptance passes were removed from independent jobs only after explicit source/test coverage assertions.
2. Cache the public npm lockfile dependency downloads and pinned Chromium browser binaries, never cached credentials, database state or release receipts. Cache speed improvements are hypotheses until exact run evidence.
3. Add a fail-closed advisory fast inner loop, with `docs`, narrowly targeted admin, or full test modes. The full exact-SHA CI gates are **not** removed or substituted.
4. Add a source-only release dossier function. It consumes independently supplied evidence and marks missing grant, backup chronology, credit information, CI, or SQL results as BLOCKED. Even a complete dossier is only `PREPARED_FOR_INDEPENDENT_RELEASE_CONTROLLER_CHECK`, never a publishing grant.
5. Add separate request/test/approval/publish/verify duration accounting. No real 10x result is claimed from synthetic time fixtures.

## Next tranches and boundary

Consolidate reproducible preview artifact handling only after actual CI proves preservation of source/security behavior; prepare immutable machine-readable recovery indexes while preserving original journals; add safe failure triage and read-only published-commit/receipt checks; address native GitHub final-push #44 only using a future separately approved release as genuine end-to-end proof. Main is an operations branch, not an app source: ops changes need independent reviewed integration and no inferred host mutation.

Benchmark equivalent work items before/after; target at least a 90% median reduction in engineering processing time excluding owner approval wait. Record full elapsed time too. GitHub Free/private checks are advisory, so no guarantee of preventing privileged direct pushes. All source commits still need a same-commit active journal and `[skip netlify]`.
