# #3889 V11 complete-cohort nonpublishing publisher audit

DIC_PREFLIGHT_VERIFIED development_sha=d3ba05ae4ee84de25766d2a3046c1d216e3913b5 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

## Source and repair

This operations-only input selects frozen candidate `d8639edb2b4ee240afe6cd507086588c2493f2a5`, sole development parent `d3ba05ae4ee84de25766d2a3046c1d216e3913b5`, exact tree `b4f1b2da764c4bff4a87aa582208487fe6261189`, manifest `c262699b420198d93a5f547405f6abdf821402b2`, and raw queue `a816976d2c53e88724323d9c90370c7151bd3c84`. It selects exactly the original 63 IDs in the immutable d9fc859d baseline, preserving all 410 other rows.

The failed predecessor `6372df32405212fa3459d9bcec25df5029c5e21a` remains FAILED: validate 45731136963/job139613126181 executed 5271 PASS, 3 FAIL, 6 SKIP. All three failures concerned operational-workflow metadata assertions incorrectly reading published workflows. Development #3980 repairs their exact reviewed-source binding and adds adversarial source-swap cases without deleting or skipping assertions. Main #3981 pins all ten V11 QA blobs and rejects mixed V10/V11 fixtures. Runtime, dependency, fixture, queue and published workflow bytes are unchanged from that predecessor; its successful statuses are not transferred to the new SHA.

Merged main source `e852bdfb05d924d4ebe8592b23669f2011cf9d8d` passed native controller 45733298130/jobs139620362737+139620363024 and source prevalidation 45733298128/job139620362322. Hosted source artifact 15077667854 has independently verified ZIP SHA-256 `7106d1e125f485f56ff5d89cdf2658f47072aaf412430cf2948ab399a4b4c2ba`; manifest, journal and all 436 Git delta entries equal local source proof. The existing52 revalidation step was NOT_REQUESTED and is not represented as a new audit. Earlier genuine52 evidence remains retained.

## Exact candidate gates and merge condition

This input was prepared while the five candidate jobs were running, to allow the main controller PR check concurrently. It may merge only after fresh native exact-candidate PUSH readback shows SUCCESS for all five jobs:

- approval: 45733854744 / 139622226113
- validate: 45733854753 / 139622227193
- cloud tests: 45733854697 / 139622226831
- mobile/browser: 45733854697 / 139622226292
- isolated SQL: 45733854801 / 139622226402

All jobs must bind to d8639edb2b4ee240afe6cd507086588c2493f2a5. Pending, failed, missing, skipped or stale evidence is HOLD. Native API readback at merge is recorded in the PR/coordinator receipt, not invented here. The actual publisher-compatible audit then executes once on main with read-only GitHub access and must verify the complete 63-ID source, parent, raw queue, manifest, candidate branch and all required native results.

## Promotion and boundaries

This commit does not promote the live queue or issue checklist. After the actual audit succeeds and its receipt artifact is independently rehashed, a separate development change will atomically promote the remaining11 through the exact frozen queue, certificate, per-ID cohort ledger, CURRENT_STATUS and scoped journal. The separately approved #3472 member-vault component remains outside the original63. Existing404 DEPLOYED and6 IN_PROGRESS remain unchanged. Request-to-READY under15minutes is unproven.

No deployment, Publish, grant, production mutation, Netlify build, live provider/database/member write, secret change, force or spending. The source-plan input and all controller/workflow code remain unchanged in this audit-only commit.
