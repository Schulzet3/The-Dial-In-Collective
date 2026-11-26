# READY63 exact Git object retrieval correction [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=593dee41d328112bcc67791a477e3b1500e030c1 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

Owner current Publish and no-duplicate instruction, #417 comment7201232912; temporary unmerged PR3984 only. Frozen candidate d8639edb and all five passing source jobs unchanged. No application suite/build repeated.

Native metadata helper45882326090/job140124426833 passed all six focused tests and inventory, then reported missing production docs/RELEASE_CONSUMPTION.json before creating any blob. Independent GitHub Contents and commit/root/docs-tree API reads establish that the SAME production commit5b256f1fc0717d3635f7148b934a1f91f8991685 has root779fdcf2ac14496179a242a34b13ca7f4d8d6ae4, docs treea55a014f90ac42a0753a87005037406a6f3c4901 and ledgerblob728f4e4378c27979993fef865e209588c72bd1cb. The path is correct; do not invent a different ledger or recreate history. Cause of the earlier local/remote discrepancy is not yet established.

Task-branch workflow now explicitly fetches the immutable production commit with incoming object verification, disables Git replacement-object substitution and asserts exact independently observed root/docs/ledger identities and ledger byte hash before executing the unchanged helper. Any discrepancy still fails closed; no fallback ledger, missing-evidence exemption or publisher change. Acceptance requires actual native fetch/hash/metadata job success and exact operations CI, not this documentation.

All previous grants and consumption history preserved. Only unreachable proposed metadata blobs may be created by the existing helper. No grant activation, production ref, release request, Netlify, SQL, Edge, member, secret, backup or schedule write in this commit. Next: verify native result and independently hash its source packet, complete recovery/provider prerequisites, then the single existing chat controller publication. Close PR3984 unmerged after use.
