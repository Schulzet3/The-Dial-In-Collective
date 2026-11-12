# Issue #267 M1 complete exact-tree post-pin path/drift inventory — 2026-11-12 [skip netlify]

## Source and method
Original pinned executable source `9707553a64f88127826e8f5b2b36cd0651296e83` tree `626d241ef5888bddee71b6e94ee30ea0cb8bee1e` and current development parent `627ef19c394520eb0f41771ce8a8e4eadb8da1c3` tree `5a969c9c1407e0e98a701c5d76741c458b0be0f2`. Both exact Git recursive trees fetched complete (`truncated:false`); pinned 436 eligible original paths taken from verified current-code pin inventory blob `d3c8ab1992eec7b7252d2565914a25c82e88350c`. Full machine receipt `docs/audits/issue267-v2-full-git-tree-drift-machine-inventory-20261112-M1.json`.

## Deterministic file-level reconciliation (NO semantic credit)
- Pinned Git blob paths: **951**; current Git blob paths: **3866**.
- 436 pinned original executable files: **326 unchanged SHA, 109 changed SHA, 1 missing** = 436, no file-path accounting hole.
- Whole tree: **131** common-path blobs changed, **2916** new paths, **1** absent prior paths. All listed with exact original/current blob SHA and sizes in attached JSON. All 2916 additions independently retained for eventual eligibility classification rather than a capped first-300 compare.
- **621 new code-like/build/test/SQL/frontend/assets candidate paths** by conservative path heuristic. This is a triage queue, *not* verified new executable eligible count or semantic audit. Remaining 2295 additions need manual eligibility adjudication, especially root code-looking names.
- Missing pinned original eligible `tests/qa/issue27-invitation-acceptance.mjs`: check rename/caller/test replacement before treating deleted test as acceptable. No unproven regression claim.
- Original frozen 579,961 and pinned 57,913 text-line denominators unchanged. Zero machine-inventory semantic credit, no old grouped R2/C2 elevation, no live added-line credit.

## Finding and controls
This replaces the insufficient 300-entry truncated *compare endpoint* as **exact full Git-tree file-level inventory** at the SHA above, not a substitute for direct line reading. Every changed/missing code file and newly added code-like path still needs literal source-line and semantic review; post-pin D2/live receipts require global dedup, and newer commits need fresh delta. Preserve historical migrations, original603, member/shot/offline/Community, Locked decisions and #33 extractor/#96 Auth ownership. No runtime code, production, provider, DB or release changes; Node22/lint/build/SQL/Auth/browser tests NOT_RUN_DOCS_ONLY. Exact PR-head and merged-source governance must actually pass before completion claims.

**Next:** independently reconcile original R2/C2/V2 receipts against exact frozen/pinned blobs, adjudicate 620 new code-like candidates and the one missing test, direct-review changed/new executable lines at source SHA, then refresh drift from this exact tree to latest development. #267 OPEN.
