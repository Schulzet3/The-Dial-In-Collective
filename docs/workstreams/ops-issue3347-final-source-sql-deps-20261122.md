# #3347 — source-hygiene and SQL test dependencies in frozen startup-only candidate [skip netlify]



DIC_PREFLIGHT_VERIFIED development_sha=74ab1b6bf947a7b4f1f721f6276641d23ceba4e0 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f



Owner authority: original five startup improvements already merged; proactive #3347 nonpublishing source-only READY acceptance. Live dev 74ab1b6bf947a7b4f1f721f6276641d23ceba4e0; main 611ee43c0ed3f7e45e72c766070df0cb88678383; published tested baseline 7a5b27d342c6c49bd75e8d1e4cb164a76bd2c174; separately tested clean startup source ffbf4656de2969326988d7b0ac0a21c3117575a6. New owner Publish NOT given.



Exact frozen candidate source 062f73df7f2ee529719556bad32972001a2d39a1 has approval 44989788224 SUCCESS, isolated SQL 44989788232 SUCCESS, browser/mobile/offline/cloud 44989788189 SUCCESS, but validate 44989788186 **FAILED**: 4,967 PASS, TWO FAIL, six SKIP. This failed immutable candidate remains a failed historical ref, NOT READY and will not be overwritten or reused as a passing candidate. Earlier 14 failures in a separate candidate were fixed by full published test/fixture restoration; do not repeat old full suites.



Failure #1: unchanged published source-hygiene test found two unexplained broken imports after correct exclusion of R374 unready PageFly H3 implementation and its support module. The exact original603 focused source review helper had been changed by independent unfinished #33 R374/R392 code: published complete file SHA 49b50fa3c1a1a07e61943ad98bbb2cc31c119fac versus development unfinished blob 74d78a80b72305d67a9d346e60fc5fe977de2031. Restore WHOLE original published helper only for the selected startup frozen candidate via clean source merge/first-parent exact Git proofs. Its new R374 checker scripts/audit/issue33-r374-original41-check.mjs was absent in published source, current exact blob 6b47cfa4736189d91df71ed6867f9455065ce4b3, and must be excluded only when the entire named R374 TESTING source scope is restored to published bytes. This keeps the full original source-hygiene test unchanged and truthful.



Failure #2: unchanged published SQL-runner-coverage test found two undeclared new stand-alone SQL suites under intentionally restored/unready SQL migrations. Exact new supabase/tests/admin_account_delete_completed_receipt.sql Git blob 5a9fc2b8d1c61d8b7c885d8bfec6f128160c35c2 belongs only to still-TESTING DIC-Q-509-admin-completed-delete-retry-count and its source migration 20261119175000. Exact new supabase/tests/personal_family_refresh_single_pass_post.sql Git blob a04c6e40693577caec79d2678d155786bcfd26da belongs only to still-TESTING DIC-Q-509-classify-family-single-refresh and its source migration 20261119133000. Both were absent in published source, and are excluded ONLY if their matching unready migrations and complete ownership scope are independently restored, retaining every original SQL suite and assertion. No production DDL/data change.



Implementation main ops-only: add ONE complete published helper to exact pinned startup Git provenance restoration and THREE individually byte-pinned, issue-owned newly introduced unready support/SQL paths to already strict exclusion inventory. Stage and final validation continue comparing identical exact source and manifest paths, with skipped/unstarted as NOT PASS. New synthetic positive/negative unit regression proves named Git source bytes, owner state and scoped runtime restoration are mandatory before an omission. No global test disable, no broad skip, no waiver, no source security or Auth/offline/Community relaxation.



Changed source/test and this journal in same commit: scripts/release/ready-only-candidate.mjs, tests/ready-only-candidate.test.mjs, docs/workstreams/ops-issue3347-final-source-sql-deps-20261122.md. Next verify exact PR-head main controller CI; nonforce merge with [skip netlify] and same-commit receipt; merged main controller CI; one read-only source recipe with NEW unique owner-source CI receipt and exact frozen Git tree; five NEW candidate-SHA SUCCESS jobs; only then promote LIVE startup queue TESTING to READY via source-bound nonforce merge and journal. No Publish, Netlify, grant, provider, member, backup or paid action.
