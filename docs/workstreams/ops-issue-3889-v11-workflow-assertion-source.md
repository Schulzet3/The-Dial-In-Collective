# #3889 — V11 exact operational workflow assertion binding

DIC_PREFLIGHT_VERIFIED development_sha=d3ba05ae4ee84de25766d2a3046c1d216e3913b5 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

## Actual failure and bounded repair

Frozen complete-cohort candidate `6372df32405212fa3459d9bcec25df5029c5e21a` passed approval, cloud, mobile/browser and isolated SQL, but native validate `45731136963 / 139613126181` failed exactly three workflow metadata assertions. Full Node result: 5280 tests, 5271 passed, three failed and six skipped; separate security corpus four passed. The failed candidate remains HOLD and its publisher-audit PR #3979 was closed unmerged. No unchanged-tree retry or READY promotion occurred.

The failures were two push-concurrency assertions in `tests/ci-scope.test.mjs` and the single-live-verifier assertion in `tests/ready-promotion-gate.test.mjs`. Both test files are outside every original 63 selected merge's first-parent executable inventory and declared scope. The assertions describe the already reviewed operational workflow source `c26cd02724be477eeb7f30b989f586716fff2c56`, while the frozen candidate deliberately retains the exact published workflow objects.

Development #3980 merged as `d3ba05ae4ee84de25766d2a3046c1d216e3913b5`, sole parent `948d1dd33c5ffa2888867acc8f1edf2bce1ad5b2`, tree `56cc93f162eb3511b159e0abbde92defef19d1d5`. It changes only those two metadata test readers, one existing independent CI proof test and the scoped journal. Every original assertion is preserved; no skip, workflow, helper, runtime, queue, certificate, package or privacy behavior changed. The existing reviewed reader requires both the historical operational workflow object and candidate published workflow object to match their independent Git proofs.

## New exact QA generation

V11 is derived from the actual merged Git commit, not a PR head or a predicted SHA. It binds ten support objects: the previous eight, including the newly strengthened CI proof test, plus both exact metadata test blobs. Generations 1–10 retain their definitions and historical evidence. The V10 admission guard rejects mixed old/new metadata tests when the new proof test is reverted; V11 independently rejects every changed/missing current, fix or prior object. Selected CI-owned assertions remain outside compatibility support.

The prospective input keeps the same eleven compatible additions and 52 exact retained sources. Its live queue anchor remains `dac49db2e3478531fb34c5e022871d8fbc04dbf2`; the published tested source remains `2d22d448160d428a977f06482323646b92818fcf`. A new frozen candidate identity is required because the QA/source parent changed. No native status from failed6372 is credited to that new SHA.

## Verification and reuse

The three formerly failing assertions and new negative test passed four focused cases with zero failures/skips in both development and the actual frozen candidate context (10.71 seconds). Twelve historical/anchor/published/candidate workflow swaps and three unreviewed override paths were rejected. Exact #3980 PR native approval `139617149102`, validate `139617148624`, cloud `139617149325`, mobile/browser `139617149040` and SQL `139617148811` all completed SUCCESS on `b2b142e251fbc72813928a46a35151f1f9741b51`.

Previously executed selected runtime evidence remains scoped: all 79 coffee assertions, 19 member/runtime/source assertions and 19 selected CI assertions passed on6372. Its 38 coffee protected objects, member component and operational source were independently checked. No specialist recapture, duplicate local full suite or extra app build is requested. Those passes inform reuse of unchanged source proof; the replacement candidate still requires all five actual native successes. Skipped assertions and unrelated skipped original603 jobs are never counted as PASS.

## Required completion gate

Verify exact merged development applicability, native main controller acceptance and the approved hosted source receipt. Independently reproduce the complete candidate tree and unchanged runtime. Then require approval, validate, cloud, mobile/browser and isolated SQL SUCCESS on the one replacement candidate SHA, followed by the actual read-only publisher audit for all 63 IDs. Only that completed evidence may promote the frozen queue, certificate, per-ID ledger, CURRENT_STATUS and scoped journal to development and update #3889. Existing 404 DEPLOYED and six separate IN_PROGRESS entries remain unchanged; #3472 remains separately attributed new work. Under15-minute request-to-READY remains unverified. No publication or production/provider/Netlify/grant/request/backup/visibility/secrets/spending/force action.

## Actual V11 proof readback

Seven focused V10/V11 generation cases passed with zero failures/skips, including mixed-generation refusals; actual Git generation lookups preserved V9 at947237, V10 at948d1dd and V11 atd3ba05ae. The complete approved `prevalidateReadySource` wrapper then passed for all63 selections in31,963ms, producing local diagnostic `fade63a4780bc36b27bc44d160ea198c852fb5f6`, proposed branch `release-candidates/prospectbatch3889-ea1ae6ddf36867450dba`, exact tree `b4f1b2da764c4bff4a87aa582208487fe6261189`, manifest `c262699b420198d93a5f547405f6abdf821402b2` and436 tree deltas. The queue remains exactly `a816976d2c53e88724323d9c90370c7151bd3c84`. Direct complete-tree comparison against failed6372 found only the three reviewed test files and documentation changes; all runtime, dependency, fixture, package and workflow objects remain identical. This is local source proof only; no new native candidate success or READY certification is inferred.

Exact merged development `d3ba05ae4ee84de25766d2a3046c1d216e3913b5` native PUSH readback is complete: approval `45732717826/139618413720`, validate `45732717681/139618413593`, cloud `45732717685/139618413922` and mobile/browser `45732717685/139618413458` all SUCCESS, plus nonpublishing rehearsal `45732717425/139618413330` SUCCESS. This test-only push has no SQL run; absence is not claimed as PASS. The replacement frozen candidate still requires its own five exact native jobs.
