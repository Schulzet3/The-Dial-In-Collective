# #3347 two exact workflow-only test exclusions [skip netlify]



DIC_PREFLIGHT_VERIFIED development_sha=ec8e4b57d8a7d76bef072cc0bba1cb2cdce62e8f preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f



Owner authority: five startup changes + #3347 nonpublishing READY candidate only. Dev ec8e4b57d8a7d76bef072cc0bba1cb2cdce62e8f main 7d7ebc318f55e35f75a4cf29154c9d039d63776b. No Publish.

Exact provisional read-only source proof run 44989382451 FAILED at strict validation: workflow-only fast-pr-check.test.mjs now independently qualifies for exclusion when its workflow is restored, but final candidate validator still hardcodes the original browser-dependency fixture path and blob. Earlier source proof of startup and source restore passed; no candidate was deployed or certified.

Fix: resolve each exclusion against the existing TWO reviewed exact Git path+blob+workflow specs, preserve original published/candidate absence, selected READY test provenance and exact stage-set equality. New focused positive two-fixture/negative mismatched current Git blob, leaked candidate test and incomplete manifest regressions. No arbitrary test omission, no weakened Auth/offline/SQL or changed runtime.

Three files including this SAME-COMMIT journal, main operations only. Source exact main controller CI, nonforce merge, merged controller CI, new unique candidate exact five SUCCESS required. No Netlify, grant, release request or provider/member/SQL write.
