# Issue #455 R430 — missing legacy grinder: distinct History/overview eligibility, plus R428 merged CI [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=ebbfca995e99c0a9791c23bde2e4755fed42941b preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

**Owner authority and exact source:** #455 Option B, **documentation/source audit only**, no code, tests, CI, numeric science, schema, telemetry, new research enrollment, member/provider data, release or Locked changes. Immutable development ebbfca995e99c0a9791c23bde2e4755fed42941b; complete GitHub PREFLIGHT content and blob 3742fed0176c809b115320c698a0e8b1675b2d3e independently matched before AGENTS/issues/providers. Read-only main `57adc419ed4b106e158435b465971f5986537b41`; release/production `07f054f6470b2ae36b36faef8fb9a8161dd3bfb5`. At source read, `site/cloud/shot_card.js` Git blob `4e743f5fab812f0597ab00bcd83922f9f4982301`; `site/lib/model.js` `baafc8fa64fa3e359d8e42094e41c5d72a3b22df`; `site/lib/engine.js` `33515aa60ce0357d7c4953138c43aeb8eab065a3`; `site/cloud/main.js` `d19b89ac2e4249adae6f2f271b47253ef3a2709f`. Preserved all original source bytes.

## Distinct, reproducible current-code eligibility behaviors — NOT a confirmed defect

Executed the **exact immutable source function bodies** for `shotCard` and `hasLocalSuccess` in an isolated JS source-function harness with synthetic all-five-green Traditional shot, measured 18g in / 36g out / 29s, valid family ID, current setup and grinder range 0–5, expanded History, no member/API access. Only `grindSetting` changed:
- `null` or `undefined`: **History offers Make Current**, original Dialed In badge remains, **Coffee overview hasLocalSuccess=false**.
- `2`: **History offers Make Current**, **overview=true**.
- `6` (outside active bounds): **History hides Make Current**, **overview=false**, original historical all-green badge remains.

This difference is **explicitly covered by a prior accepted contract**, not a newly proven failure: `tests/issue455-make-current-explicit-control-integrity.test.mjs` Git blob `335f935ce05a24c1be18e35298418ccc210fdd5c` expressly expects both missing legacy `grindSetting:null` and `undefined` to remain eligible for `makeCurrent`, while invalid explicit readings are refused. The engine's `familyEvidenceShots` likewise explicitly retains missing optional legacy controls as ratio-family evidence; a current overview's `hasLocalSuccess` requires a numeric measured grinder setting. `validateShot` prohibits creating a NEW shot without the actual grinder measurement. These are **separate semantic intents**. Do not silently narrow existing Make Current or declare a regression from a synthetic disagreement. No actual server RPC, offline replay, or physical member experience was tested here; whether source-level difference creates confusion remains unproven.

**Disposition:** `R455-R430-LEGACY-GRIND-SEMANTICS`, P3 possible copy/mental-model question, **INTENTIONAL_SOURCE_CONTRACT / NO SAFE FIX DEMONSTRATED**, owner approval NOT requested. If further independent user-visible harm is demonstrated, first inspect Cloud `make_current` server contract, ratio-only historical recipe display, offline behavior, and original Locked compatibility before proposing narrow copy/options. No redundant R171 or #335 test suites were rerun; no #267 exhaustive-line review credit.

## Exact-source CI evidence recovered without reruns

Prior R428 code fix PR #3633 nonforce merged `52a506aff7c59018b07be0ffa8e90758aa9d3376`. GitHub **push-event** Actions `?head_sha=` readback (not the PR-only connector) confirmed:
- `44953658004` **DIC cloud app build and tests / validate: COMPLETED SUCCESS**; Node22 checked-in tests step, lint and applicability steps succeeded; exact aggregate numbers in PR-head journal remain PR-head evidence, not independently parsed from this push-run log.
- `44953658017` **DIC cloud UX regression checks / mobile-browser-qa: COMPLETED SUCCESS**; applicable real compiled browser, 390px Log Shot→Rate→Recommendation, service-worker offline and responsive/contrast steps succeeded. Its separate `cloud-tests` job explicitly said **targeted cloud NOT_APPLICABLE**, not a passed test.
- `44953658068` **DIC approval, implementation and continuity contract: COMPLETED SUCCESS**, exact merge SHA.
- #33 selected-source independent push jobs `44953658006` and `44953658009` also SUCCESS, but not misattributed to #455 tests.
- Docs reconciliation PR #3634 merge `73ef195c8a2a5c581ac5fdf8ac80d785cf8afc03` exact push governance `44953814669` **COMPLETED SUCCESS**.
- Prior R429 research-only docs PR #3638 merge `cb1adad5d87f84b957f5ee03d4babbe3e254b8aa` exact merged governance `44958419931` **COMPLETED SUCCESS**.

These readbacks **resolve the earlier unverified merged-push evidence for the named checks**, not a frozen isolated READY certificate or new Node/test/SQL/production run. No READY/DEPLOYED assertion; queue R428 remains TESTING pending #3347 frozen source/isolation certification.

## Source access and next action

Fetched owner-private October 29 research archive via connected Drive on this run, downloaded 66,421 bytes and independently SHA-256 verified `7d562a4536cf4f79bfa17898672ff6a2ec30aa6c1147e7a33f3d06017776bf1d`; verified 15 member names. Research-only material was **not** uploaded to GitHub or promoted to product authority; original 48/48 reference tests do not measure cup quality. Standalone owner S019 roast/style PDF remains unverified/unavailable from prior targeted searches; separate slow-feed PDF is not S019. Nine original Markdown archive and older 202 source/612 evidence/267 proposal inventory not re-counted. #33, #267, #96, accepted #335 remain separate; no member data, SQL/Auth/Edge, Netlify, main/release, backup, visibility, schedule or alert writes.

**Next distinct bounded action:** recover fresh preflight and latest issue ledger, inspect a not-yet-reviewed original primary claim or genuinely reproducible mobile/offline recommendation defect, and investigate legacy History copy only if the accepted missing-control behavior generates a documented failure. Preserve #455 OPEN; no release/publish.
