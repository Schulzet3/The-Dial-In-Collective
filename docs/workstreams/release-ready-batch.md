# READY batch certification journal

## November 2, 2026 — Automatic READY batch combined-source CI (non-publishing)

Owner directed automatic READY certification to eliminate repeated manual release preparation. Added a development-branch push/dispatch workflow that validates the exact queue schema, intake and strict source-to-published coverage, then executes combined Node, cloud/offline/UI, lint and build checks. Workflow is non-publishing, has read-only contents permission, does not create a grant, and explicitly leaves offsite recovery/provider checks to release preflight. This is an implementation awaiting actual hosted workflow execution; no tests are claimed PASSED by this commit. Source parent 64e923b35e62100d05dae0f302cf78d5f3a16068; no production write or deploy.

## November 2 — Repair failed combined build gate

Exact-source GitHub run 41377555013 passed queue validation, Node, cloud/offline/UI and lint but build failed solely because this new workflow omitted the public, nonfunctional Supabase CI coordinates already established in `.github/workflows/cloud-beta-ci.yml`. Reuse that same non-secret CI environment for the build. Retest via automatic development push. No production credentials or provider changes; no deploy.

## Release exact-source five-check CI restoration — November 2

The 17-item combined certification passed at source `a2daf144e6b02e94dd29ca97a00449beba156f84`, but path-filtered legacy check workflows omitted checks on that exact SHA. Add the automatic READY certification workflow as a trigger path to the four existing CI workflows so a single nonpublishing CI-only source change runs the required `validate`, `cloud-tests`, `mobile-browser-qa`, and `sql` jobs alongside unconditional `approval`. This does not relax required checks, change product logic or publish. Retain all workflow tests and verify each exact-source conclusion before considering a release grant.

## Owner-authorized one-use Release14 grant — 2026-11-02T03:09:15.395Z

Owner explicitly directed immediate publication of the 17 READY items. Grant `DIC-20261102-READY17-14` binds to exact-source five-check passing SHA `2c8e1ffe3b83a7524968f50efca3ead4da282cf8`; no SQL/Auth/Edge/member-data operations are authorized. Historical encrypted offsite artifact metadata readback confirmed direct child of approved folder; provider routing and queue isolation remain controller-gated. This commit is a nonpublishing grant only, not a deployment or Netlify receipt.

## Release 14 deployed — November 2

Single-use GitHub controller run 41382114139 SUCCESS; release/production `8e3808f0d7532f47ea348ef9a58e5aa87d714ffe` and Netlify production deploy `6ae8006cd64b30ae9046e44d` READY/current with matching commit at 03:16:13 UTC. Seventeen formerly READY queue items now DEPLOYED; two ongoing unfinished items remain excluded. Verified encrypted `backup.age` SHA-256 and direct-child Google Drive offsite ZIP. Authenticated member-session and live DB write integrity were not exercised; no such PASS claimed.

## 2026-11-02 — release isolation hardening (no deployment)
- Added fail-closed check: a DEPLOYED-labelled item with a merged commit newer than the actual published source cannot be silently included in a future release candidate. A label alone is not a deployment receipt.
- Added regression for a prematurely marked DEPLOYED overlapping-path item; source-bound CI still required before READY. Incident #356 remains open pending end-to-end verification and the broader replacement workflow.
- No Netlify/Supabase/member data writes, no publication, no queue state promotion.

## 2026-11-02 — CI no-batch distinction and continuity incident
- The automatic CI job now reports release-queue status rather than requiring a READY release on every development push; it still runs the full combined tests, lint and build. The production controller retains its strict fail-closed release gate.
- Previous test-only commit `2e0105ba93bd859a5e617a958697164839f2893d` violated the same-commit journal rule. This entry records the defect without rewriting immutable history or falsely claiming that prior CI passed. This commit includes its own same-commit journal.
- Issue #356 source-isolation follow-up and end-to-end release rehearsal remain open; no production release or provider write.

## 2026-11-02 — post-release read-only public smoke
- Added bounded GET-only public route smoke (home, cloud shell, web manifest), reject unexpected origins/paths, redirects, HTTP failures and empty/mismatched responses; no login or production writes.
- Added focused tests and serialized post-release workflow triggered by release/production push or manual dispatch. This is a public reachability check, NOT proof that Netlify deployed the expected source SHA. Provider READY/current SHA receipt remains mandatory before DEPLOYED status.
- No deployment authorized or triggered by this development-branch change. No production member/session/SQL writes. Same-commit journal included.

## 2026-11-02 — exact owner-selected READY batch binding
- Future release grants must contain `approved_ready_item_ids` exactly matching the assessed READY candidate inventory; source overlap, queue status and free-form scope text cannot silently expand the authorized batch. Controller fails closed before any one-use claim or production push. Focused positive/negative tests added.
- The historical Release14 grant lacks this new field; it is consumed and not rewritten. New grants must be source-and-item-bound. Development-only integration pending exact-source CI and promotion of controller to operational main. No publication.

## 2026-11-02 — source-bound CI certificate artifact
- After successful automatic queue validation, combined Node/cloud tests, lint and build, CI writes and uploads a machine-readable receipt with exact checkout SHA, Actions run ID and READY item IDs. Certificate explicitly does not authorize publication, certify backup, or verify Netlify SHA. Focused contract test added; same-commit journal preserved.
- No production publication, member writes or provider mutation.

## 2026-11-02 — Netlify postflight exact-source receipt validation
- Added pure fail-closed Netlify project/deploy readback verifier requiring expected release SHA, deployment ID, READY/current state, production branch/context, approved site and hostname. Negative tests reject wrong source, preview, stale, wrong site and mismatched receipts. This verifier does not itself fetch provider data, deploy, or mark queue items DEPLOYED; release operator must pass independently fetched provider receipts. Same-commit journal included.

## 2026-11-02 — provider readback schema correction
- Compared live Netlify project response to verifier and found currentDeploy nested inside _enrichedFields, not project root. Corrected verifier and fixtures before acceptance; actual production deploy/site/hostname/source remain unchanged. Exact-source CI rerun required. No publication or provider mutation.

## 2026-11-02 — honest source-isolation CI certificate classification
- Source-bound CI receipt schema v2 now includes strict source-isolation assessment, actual READY item IDs, error reasons and explicit CERTIFIED_READY_SOURCE / NO_BATCH / BLOCKED_NOT_RELEASABLE state. Green tests cannot be confused with a releasable batch. The production controller still independently rechecks exact source and grant before any claim. Added positive/negative classification tests; no release, provider write or queue promotion. Exact-source CI pending.

## 2026-11-02 — safe backup fallback decision regression
- Added read-only backup decision helper and negative tests: GitHub artifact availability, Drive direct-parent, ciphertext SHA-256 proof and snapshot coverage of latest observed write must all pass to reuse backup; otherwise request and verify a fresh encrypted snapshot. Provider metadata alone is explicitly insufficient proof of ciphertext integrity. Independently read back GitHub artifact 13097561218 (unexpired, nonempty) and Drive file 1396aSuRA-5wApeiRRkgi6A44wtKZEBwB (direct child of approved folder). No new backup created or production data touched. CI pending.

## 2026-11-02 — nonpublishing source isolation rehearsal
- Added inert release rehearsal CLI and focused negative tests. Current development queue contains zero READY items and two IN_PROGRESS items, so expected result is DENIED_NO_PUBLICATION, not a false PASS. With a synthetic READY assessment, only an exactly matching owner grant passes scope preflight. Rehearsal never claims a release, touches Netlify or writes Git/Supabase. Full live provider/backup/release controller rehearsal remains separate.

## 2026-11-02 — executable no-write rehearsal workflow
- Added read-only GitHub Actions workflow that runs focused backup fallback, release scope, CI certificate and Netlify provider readback regressions; executes real current-source rehearsal and requires explicit DENIED_NO_PUBLICATION with exit 2 while queue has zero READY. The job must fail if source unexpectedly becomes publishable, requiring review/update of rehearsal expectations. No GitHub write permissions or production mutation. CI pending.

## 2026-11-02 — provider-integrated postrelease verification
- Added GET-only Netlify API postflight verifying current published deploy, production branch/context, READY status, exact release SHA, site ID and hostname. Postrelease smoke workflow now runs provider readback before public route checks and fails closed when NETLIFY_AUTH_TOKEN is absent. Added mocked positive/negative provider tests. This requires a configured GitHub Actions NETLIFY_AUTH_TOKEN secret; actual postrelease run remains unverified until an authorized deployment. No deploy or provider write.

## 2026-11-02 — Netlify canonical domain mapping correction
- Raw Netlify sites API can return the Netlify-managed ssl_url while the custom domain is authoritative. Normalize `custom_domain` to HTTPS before exact-hostname assertion, preserving failure on unexpected host. Focused fixture now exercises this distinction. Same-commit tests and journal; CI pending.

## 2026-11-02 — streamline empty-queue certification
- Automatic certification first checks READY count and always validates queue schema/source intake. When READY count is zero, it skips duplicate npm ci, full Node/cloud tests, lint and build; ordinary path-scoped application CI remains authoritative for those checks. It emits no READY certificate on empty batches. When READY exists, it retains full exact-source combined certification, certificate artifact and independent production grant. No change to five-check release controller or source isolation; no publication. CI pending.

## 2026-11-02 — eliminate certification-triggered redundant workflows
- Removed automatic READY-certification workflow path as a trigger from cloud app, cloud UX, isolated SQL and private visual workflows. Each still runs on its own relevant source/test changes and keeps existing manual/PR coverage. Certification itself remains push-triggered with queue preflight; owner-approved release gates unchanged. Prevents a workflow-only certification edit from spawning unrelated SQL/visual/cloud suites. No production changes; exact-source CI pending.

## 2026-11-02 — immutable production artifact preparation (nonpublishing)
- READY-only combined CI now requires explicit public production build coordinates in GitHub vars `DIC_PRODUCTION_SUPABASE_URL` and `DIC_PRODUCTION_SUPABASE_PUBLISHABLE_KEY`; builds a deterministic ZIP, stores SHA-256 and retains the ZIP as a source-named artifact. No READY => no production artifact build or upload. This is artifact PREPARATION only; existing Netlify Git-connected publication is not replaced until exact-artifact consumption and prevention of duplicate Git builds are independently verified. No production publication. CI pending.

## 2026-11-02 — deterministic artifact negative regression
- Added Python regression to no-publish rehearsal: repeated ZIPs must have identical hashes, missing entrypoint must fail, and symlinks must fail closed. No live provider write. CI pending.

## 2026-11-02 — fix Python rehearsal test discovery
- GitHub run 41401602292 failed because Python unittest discovery intentionally only recognizes test*.py files; custom filename yielded zero tests. Run the named Python test module directly; no change to production logic. Reverify exact-source hosted rehearsal.

## 2026-11-02 — explicit encrypted backup fallback dispatcher
- Added authenticated GitHub workflow-dispatch adapter to trigger the EXISTING main encrypted backup workflow without modifying data, backup files, secrets or Apps Script. Adapter intentionally returns BACKUP_REQUESTED_NOT_VERIFIED and cannot satisfy a release gate until independent Drive direct-parent and ciphertext verification succeeds. Added fail-closed mocked dispatch tests in nonpublishing rehearsal. Not yet automatically invoked by the main release controller; no live backup requested in this commit.

## 2026-11-02 — exact artifact Netlify ZIP publication adapter (inert)
- Official Netlify API documents POST /sites/{site_id}/deploys with application/zip and no rebuild. Added isolated adapter verifying source SHA and ZIP SHA-256, requiring explicit owner-grant proof, consumed one-use claim and production publication flag before network call. CLI refuses publication. Mock tests assert no network request for unauthorized/tampered source and fail closed on provider HTTP error. Adapter is NOT connected to the main controller and no production write is performed; existing Git-connected build still requires safe cutover before use. Netlify provider response and exact SHA require separate readback; no release claimed.

## 2026-11-02 — protect live Netlify Functions during immutable artifact cutover
- Current app includes `netlify/functions/coffee-url-preview.mjs`; static ZIP alone does NOT prove equivalent function deployment. Added explicit `functionsPreservedVerified` fail-closed requirement to inert ZIP adapter, with negative test. Real publication must include or independently verify exact function continuity and Netlify routing before enabling this flag; no release may silently drop the function. No production action.

## 2026-11-02 — bind READY certificate to immutable artifact bytes
- Fixed critical certification gap: READY certificate schema v3 now records SHA-256 of the exact `dist-immutable.zip` produced in the same CI run, names its source-bound artifact and fails if READY is otherwise claimed without that ZIP. This does not prove Netlify Functions parity or authorize publication; publication controller must independently rehash downloaded artifact and match certificate before any provider write. Node regression added. No production changes; CI pending.

## 2026-11-02 — release evidence preflight coordination
- Added nonpublishing preflight coordinator: reuse verified encrypted recovery only after direct-parent/ciphertext/snapshot check; otherwise request existing main encrypted backup exactly once per preflight invocation and HOLD until offsite ciphertext verification. Independently SHA-256-verify exact certified artifact before declaring evidence ready. Four focused regressions cover reuse, fallback HOLD, unavailable dispatch, tamper denial. This is not connected to main hosted controller yet; repeated invocations need idempotent dispatch deduplication before production activation. No provider write or deployment.

## 2026-11-02 — avoid duplicate manual encrypted backup dispatch
- Backup fallback now queries recent main workflow runs before dispatch; if an existing manual backup is active, returns BACKUP_ALREADY_RUNNING_NOT_VERIFIED and does not launch a second. API lookup uncertainty fails closed; neither response is accepted as verified offsite recovery. Mock regressions cover active suppression, malformed/API denial and new dispatch. A race between simultaneous independent dispatchers still requires a durable cross-run claim before production activation. No backup was requested here.

## 2026-11-02 — exact artifact certificate verification gate
- Added fail-closed pure verification of READY certificate schema v3, source SHA, isolated queue item IDs, successful source-specific CI receipt, GitHub run ID, artifact name and actual ZIP SHA-256. Added tamper, mismatch, duplicate ID and no-batch regression cases to hosted nonpublishing rehearsal. This is the read-only verifier to integrate before any release-controller provider action; no artifact download or production publication occurs here. Remaining blockers: wire into hosted controller, provider function parity and durable cross-run backup claim. No release status changed.

## 2026-11-02 — include Netlify Function in immutable CI artifact
- Added deterministic ZIP packaging and tests for prebundled `coffee-url-preview` server function. READY certification now bundles function dependencies in CI with pinned esbuild 0.25.12 and uploads exact function ZIP and SHA-256 alongside static artifact. No publish-time function compilation is permitted by this design. **Not yet certified:** provider function digest upload, runtime parity and production routing must pass before main controller cutover. No production write; tests pending.

## 2026-11-02 — require exact function bytes in READY certificate
- Certificate schema v4 now requires SHA-256 for bundled Netlify Function ZIP. Artifact verifier checks both static and server function byte hashes; mismatch, absent function and stale schema fail closed. Updated mocked regressions. Main hosted controller still has schema v3 verifier and remains intentionally nonpublishing until reviewed promotion; no deploy.

## 2026-11-02 — repair CI Python test invocation
- Run 41404804152 passed all 14 Node preflight regressions but failed before Python cases because workflow concatenated two script paths into one Python invocation. Split into two shell commands. Re-run exact-source rehearsal; no production change.

## 2026-11-02 — Netlify atomic digest publisher adapter
- Added source-inert Netlify API digest uploader with SHA-1 static manifest, SHA-256 zipped `coffee-url-preview` function, required-hash validation and function PUT upload. Positive and fail-closed mocked tests added to hosted nonpublishing rehearsal. Uses official Netlify API digest/function endpoint rather than ZIP-only deploy; does not build at publication. **Still pending:** artifact unzip/exact certificate and controller transaction integration, live provider compatibility verification without production publication, release receipts and readback. No provider mutation or deploy.

## 2026-11-02 — fix YAML folded Python test commands
- Run 41405139854: 18 Node tests PASS; Python tests never ran because YAML `run:` folded two lines into one shell command. Corrected `run: |` literal block; exact-source rerun pending. No production action.

## 2026-11-02 — exact immutable ZIP to Netlify digest manifest
- Added bounded ZIP reader (no disk extraction; rejects traversal, duplicate entries, symlinks, nonregular entries, excessive decompression and missing index), Node bridge converting bytes into SHA-1 static manifest and existing SHA-256 function digest. Tests cover valid and malformed archives and bridge; hosted rehearsal updated. ZIP bytes must first pass certificate hash verification. No provider write, no release-controller activation. Next: wire verified archive and CI download to controller and provider readback.

## 2026-11-02 — correct ZIP mode interpretation
- Hosted rehearsal `41405384537` failed safe ZIP fixture because Python zipfile encodes permissions without POSIX file-type bits. Accept mode with no file-type bits, still reject explicit symlinks and nonregular file types; update both main and development. Re-run exact-source CI; no production changes.

## 2026-11-02 — source-bound GitHub Actions artifact discovery
- Added read-only CI artifact locator requiring successful completed push run for exact source SHA on development, nonexpired unique matching immutable dist and certificate artifacts with run+SHA metadata. Refuses stale, ambiguous, missing or API-uncertain evidence; mocked tests added to nonpublishing rehearsal. It returns IDs only; download and archive extraction still pending. No production changes.

## 2026-11-02 — read-only GitHub CI artifact download
- Added exact-source discovered artifact archive download with size/magic validation, private temporary files and cleanup on errors; explicit NOT_YET_VERIFIED status until certificate and inner ZIPs are checked. Mock positive/negative tests included in hosted rehearsal. No GitHub release or Netlify publication. Next: secure unpack of outer artifact ZIPs and bind to certificate verification.

## 2026-11-02 — strict inner CI artifact unpacker
- Added allowlist-only unpack of exact GitHub Actions artifact members: static ZIP, static checksum, function ZIP, function checksum and CI_CERTIFICATE.json. Rejects extra, missing, unsafe or duplicate members, never extracts arbitrary paths. Mocked Python cases in nonpublishing rehearsal. Next integrate downloaded containers, SHA receipt and main controller; no provider writes.

## 2026-11-02 — exact-source CI failure diagnosis and instruction repair
- Run 41406059039: 2228/2235 Node tests PASS, one failure `tests/approval-coverage.test.mjs` due to shortened Project Instructions omitting exact owner-locked `Never request ... screenshots` clause. Restored explicit no-screenshot wording in GitHub paste-ready instructions without weakening original owner constraint. Rerun exact-source CI pending; no release status change.

## 2026-11-02 — Issue #368 exact-source automatic artifact retrieval bridge
- Added `retrieve-certified-release-bundle.mjs` with live five-check SHA readback, exact-source discovery/download, strict allowlist ZIP unpack, two SHA-256 sidecars, schema-v4 certificate and function/static hash checks, immutable Netlify digest manifest and guaranteed temp cleanup. No provider mutation.
- `prepare-release-evidence.mjs` now automatically retrieves source-bound CI bytes only after independently reusable recovery when explicit archive not provided; original preflight API remains compatible. Positive and adversarial tests added.
- Branch base `62161b2d76e8b4460edab21aa3d3d3865c1e6137`. **Hosted CI and integration PENDING**. Main controller, durable backup dedup, atomic publication and provider readback still pending. No deploy, backup dispatch or production write.

## 2026-11-02 — Issue #368 read-only Netlify Function continuity check
- Actual connected Netlify site readback: site `153277f2-e19e-4862-b9a6-f2e18ccde271`, published deploy `6ae8006cd64b30ae9046e44d` READY/current, production source `8e3808f0d7532f47ea348ef9a58e5aa87d714ffe`, hostname `app.dialincollective.com`, bundled `coffee-url-preview` Node22 Function and POST `/api/coffee-preview` route. This is **existing live deployment**, not proof a new digest publication succeeded.
- Hardened GET-only Netlify postflight to require exact function identity, route, POST method and runtime in provider inventory. Added positive/negative mocked readback tests. Source parent `46cd5e1d6a23606686d7f1e2e8ff0dc4796af2b1`; hosted CI pending. No provider write, production deploy, release grant or data change.
