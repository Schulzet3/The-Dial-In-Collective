# DIC queue-intake CI fast path — owner #3667 / readiness #3347

DIC_PREFLIGHT_VERIFIED development_sha=d7cda74e9b628d109c2d336c3984e9796805b742 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

## November 22, 2026 — authorized speed-first optimization [skip netlify]
- Authority: owner #3667 speed/effectiveness 10/10 and reliability/performance 9/10; #3347 still requires exact frozen-source prevalidation and five SUCCESS CI statuses. Only GitHub source/tests/journal; no publication, grant, provider, DB, backup, or production action.
- Verified baseline: development d7cda74e9b628d109c2d336c3984e9796805b742; 459 queue records (401 DEPLOYED, 52 TESTING, 6 IN_PROGRESS), 438 source-merged records; official approval job 44988950135 queue intake step = 10 seconds. `--enforce-intake` called `evaluateLocalQueue`, causing up to hundreds of `git merge-base --is-ancestor` child processes and discarding all release assessment errors; it only consumed `deployable_paths`.
- Fix: `evaluateLocalIntake` performs ONE published SHA..HEAD source diff and retains existing exact `queueSchemaErrors`, `assessIntakeCoverage` and on-demand deployed SQL Git blob checks. Release candidacy `evaluateLocalQueue`, full READY/ancestor checks, source isolation, owner Publish and required CI stay unchanged. No shared code/workflow overlap with concurrent #3700 (Node sharding/browser).
- Regression: test synthetic 401 DEPLOYED records and verify exactly one Git diff with zero ancestry child processes; reject missing Git, missing baseline or untracked source; preserve exact SQL migration SHA verification. Existing release-candidate ancestry tests unchanged.
- Acceptance: focused release queue tests PASS, applicable exact-source GitHub CI jobs SUCCESS, nonforce [skip netlify] merge and merged source+CI rechecked. Historical 10-second intake vs new hosted time must be measured before claiming realized savings.
- Status: TESTING pending hosted CI. Not READY, DEPLOYED, published or a candidate grant.
