# #3889 historical receipt QA lint repair [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=3661913e21808ebb4205e8c804c2bb231b2ad41a preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

Exact #3972 head df384445906bb226f52919b38f5ac7aa22030219, approval job 139560846768 FAILED after successful 10/10 promotion regressions and READY51 frozen-source readback: eslint no-duplicate-imports warning in tests/preflight-contract.test.mjs. Replace duplicate static import with existing scoped dynamic-import test convention. No change to test assertions, helper, queue, source or candidate. Await corrected exact native CI, no false PASS. Main #3971 merged 67d18c3a6d6d257abc89ba496104b5cbf0f54131 controller and event 139560897833/139560898196 SUCCESS. No publication.
