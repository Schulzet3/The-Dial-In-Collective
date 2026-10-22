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

## Source-only follow-up: postflight evidence and recovery index

`postrelease-receipt.mjs` implements fail-closed comparison of GitHub release ref, Netlify current READY published commit, exact one-use source, ordered migration versions and independent data receipt. It cannot perform authenticated checks by itself and cannot certify owner-device acceptance. `summarizeFailedChecks` avoids storing raw logs; `recoveryIndex` requires precise verified refs, a bounded next action and links back to authoritative GitHub documents. No release grant is generated, no provider is contacted and no previously Locked constraint is superseded. Real-host integration awaits dedicated verification under an explicitly approved release.

## Approval-ready packaging versus publish approval

A complete fresh backup and independently checked offsite custody must cover the last observed data write, with verification within the required two hours; credit evidence must be dated within 24 hours and show at least the approved per-build reserve. The offline dossier explicitly distinguishes `AWAITING_EXPLICIT_OWNER_APPROVAL` from `BLOCKED` and from `PREPARED_FOR_INDEPENDENT_RELEASE_CONTROLLER_CHECK`. These are explanatory source-only states, not live release commands; the actual release controller revalidates all conditions and single-use grant at execution time.

## Initial measured CI results (not a 10× completion claim)

Comparison on different successful source SHAs (GitHub run creation-to-update windows, not request-to-live latency):

| Check | Earlier | New optimizer PR | Interpretation |
| --- | ---: | ---: | --- |
| Full Node/lint/build | 28s | 40s | Slower; new tests and runner variability |
| Cloud mobile UX | 117s | 49s | 58% shorter elapsed run |
| Private visual | 112s | 95s | 15% shorter elapsed run |
| Approval continuity | 11s | 13s | Similar |
| Isolated SQL | not comparable | 53s | All applicable cases passed |
| New advisory fast feedback | not available | 15s | Early signals; not sufficient for release |

Because these workflows run concurrently and compare different commits, the durations cannot be added or claimed as a controlled benchmark. The full-cycle median has not been measured. Tests at source 1bbe6813 all passed; this completion-note commit changes documentation only.
