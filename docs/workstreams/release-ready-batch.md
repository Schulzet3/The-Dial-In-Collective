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

## 2026-11-02 — Issue #368 durable backup dispatch claim (source-only)
- `request-encrypted-backup.mjs` now requires exact latest-observed database-write UTC freshness key; atomically creates a durable GitHub backup-claim ref against pinned main SHA before any `nightly-backup.yml` dispatch. Concurrent claims, existing active backups, uncertain GitHub readback, claim failure or dispatch failure all fail closed. A failed dispatch leaves claim for manual reconciliation, never blind retry. The existing scheduled ciphertext duplicate guard remains unchanged.
- `prepare-release-evidence.mjs` supplies freshness key from backup evidence; it still HOLDs until independently verified ciphertext, snapshot coverage and approved direct Drive parent. Added mock concurrent-claim and failure tests. **Not yet merged, hosted CI pending.** No actual branch claim, workflow dispatch, backup, provider or production write performed.

- Follow-up hardening: re-read pinned main backup workflow ref **after** durable claim and before dispatch; deny changed main SHA and require manual reconciliation. Updated test call-order assertion; hosted CI still pending.

- Accepted real request evidence uses PostgreSQL microsecond UTC precision (e.g. five fractional digits). Durable claim now preserves 1–9 fractional digits rather than collapsing distinct writes to milliseconds; test fixture covers five-digit precision.

## 2026-11-02 — Issue #368 read-only Netlify Function continuity check
- Actual connected Netlify site readback: site `153277f2-e19e-4862-b9a6-f2e18ccde271`, published deploy `6ae8006cd64b30ae9046e44d` READY/current, production source `8e3808f0d7532f47ea348ef9a58e5aa87d714ffe`, hostname `app.dialincollective.com`, bundled `coffee-url-preview` Node22 Function and POST `/api/coffee-preview` route. This is **existing live deployment**, not proof a new digest publication succeeded.
- Hardened GET-only Netlify postflight to require exact function identity, route, POST method and runtime in provider inventory. Added positive/negative mocked readback tests. Source parent `46cd5e1d6a23606686d7f1e2e8ff0dc4796af2b1`; hosted CI pending. No provider write, production deploy, release grant or data change.

## 2026-11-02 — Issue #368 draft-first Netlify digest/function publication transaction (source-only)
- Added a **disabled-by-default** exact-source Netlify transaction adapter: requires verified CI bundle/queue IDs, owner grant, consumed one-use claim, independently verified backup and explicit publish flag before network access. GET current site baseline; create **draft** digest deploy with exact static SHA-1/function SHA-256, POST-only coffee preview route and rate-limit metadata; upload required bytes; bounded GET READY/function verification; bind release SHA metadata; recheck unchanged current baseline; exactly one final restore; GET-only READY/current exact SHA, hostname and function route verification. Unknown or uncertain provider writes fail closed without retries.
- Mocked positive, missing permission, malformed draft, missing function, upload failure, changed baseline and uncertain restore tests. This is **NOT live Netlify API compatibility proof**: official API documentation supports draft digest, functions_config, commit_ref update and restore, but no production/draft provider writes were made. Main controller and safe one-use claim cutover remain pending. Source parent `7498d626b18d95eba746be332a7968e5d13be41c`; hosted CI pending.

- Follow-up fail-closed gate: an independently supplied final authority/ref/consumed-claim recheck must succeed **after** draft READY and immediately before irreversible restore; missing/failed callback denies publication. Added negative mock regression; no live provider write.

## 2026-11-02 — Issue #368 second-publisher suppression in Netlify source guard (NO DEPLOY)
- Added an explicit fail-closed `[skip netlify]` full-commit-message check in `scripts/netlify/should-ignore-build.mjs`. A future one-use Git claim can retain its required `[dic-publish]` subject while carrying `[skip netlify]` in the body; even if Netlify ignores its own skip directive, the on-disk Netlify build guard independently refuses a second Git-connected rebuild. Existing normal approved-release subject behavior is unchanged when no skip marker is present. Added bounded positive/negative regression in `tests/netlify-credit-guard.test.mjs`.
- Owner scope: Issue #368 only; this is **staged source hardening**, not activation or proof of Netlify live skip behavior. Main OPS claim writer still requires a separate change, CI, provider readback and offsite backup verification. No release ref push, grant consumption, backup dispatch, provider write, deployment or production data change. Source parent `22ee8fb7b31d1a49cb8dc530f2fd6b186d38562a`; exact PR and hosted CI pending.

- Fixture correction: use actual JavaScript newline escape sequences in claim-message tests, rather than literal backslash characters, to exercise the full-message skip marker. Same-commit test/journal correction; no provider action.

- PR #382 approval CI initially failed because the Netlify build guard is a deployable source path and the queue lacked a tracked in-progress owner. Added a dedicated **IN_PROGRESS** Issue #368 item scoped to `scripts/netlify/should-ignore-build.mjs`; zero READY promotion, no publication. This is the required queue-intake repair, not an app release approval. Previous approval job `125200906664` failed on the untracked path; re-run exact PR CI after this commit.

## 2026-11-02 — Issue #368 GitHub merge-body skip marker continuity correction (NO DEPLOY)
- Merged PR #382 at `2c58c10ff16e81ebd38699eac3cf74881602b9f7`, exact PR head `03779bcf243ac600be36bd5c95ee7b615a854cb4`: six applicable hosted PR checks SUCCESS; frozen603 SKIPPED. GitHub auto-generated merge **subject** lacks `[skip netlify]`, but its full **body** contains it from the PR title. Exact merged approval job `125203030231` failed the continuity checker that only inspected `%s`; no app behavior or provider failure.
- Repair `scripts/audit/verify-commit-checkpoint.mjs` to inspect actual full Git `%B` and recognize an exact whitespace-bounded `[skip netlify]` marker anywhere in the message, matching documented Netlify skip semantics; still require same-commit journal for every code change and never accept unmarked commits or release marker code. Add negative/positive regression and reconcile the #368 IN_PROGRESS queue item to its actual merged SHA and PR CI. Do not claim the historical failed check PASS; new exact-source CI must independently pass. Parent `2c58c10ff16e81ebd38699eac3cf74881602b9f7`; PR CI pending. No deploy, release grant/ref claim, backup dispatch, SQL/Auth/member/provider writes.

- Added real disposable-Git merge integration test: exact commit subject lacks marker, full commit body contains `[skip netlify]`, first-parent code delta includes contemporaneous workstream journal; verifyLatestCommit must PASS without relaxing same-commit code checkpoint. No provider operations; hosted CI pending.

- Hosted PR #385 review job `125203925800` exposed one fixture-only expectation: `git rev-list base..merge` correctly includes both the feature commit and merge commit (2), not 1. Corrected assertion to require both audited commits, preserving the stricter range audit. All other 47 focused review tests passed; rerun exact PR CI, no provider action.

- Hosted PR #385 full Node suite 2249 PASS/0 FAIL/6 expected SKIP; review and other scoped checks SUCCESS, but validate lint failed one `no-duplicate-imports` warning in the newly added test (`node:fs`). Consolidated the imports without changing behavior; exact-source CI rerun required. Historical failed run remains recorded, no production action.

## November 2, 2026 — #417 eliminate duplicate combined READY CI (nonpublishing)
Owner approved a simpler Git-connected single publisher. This scoped change replaces expensive duplicate development READY combined Node/cloud/lint/build and immutable artifact ZIP generation with fast queue schema/intake/status validation. Existing five exact-source workflow results remain mandatory for publication and run independently on applicable final source; no checks waived, no CI falsely reported PASS. Existing immutable helper source, archived audits and preexisting certificates are preserved but no longer used as a second publisher. PR and exact merged CI pending; 0 READY at last verified queue snapshot; no live publication or provider/data mutation.

## November 2, 2026 — #417 exact-source READY-only branch CI (nonpublishing)
- Existing five applicable GitHub checks now trigger on nonproduction `release-candidates/**` and `docs/RELEASE_CANDIDATE.json` changes: approval, validate, cloud-tests, mobile-browser-qa and SQL; private visual review also accepts a changed candidate with site edits. No separate publisher, no duplicate new suite, no automatic deployment. Development tests, nightly backups and Sunday comprehensive regressions remain intact.
- Candidate requires an exact one-parent development source plus same-commit journal/manifest, published-file restoration for unrelated unfinished code, READY-only path provenance, and all five checks on that exact SHA before a single owner-approved production claim. With zero READY items, no real release candidate is authorized or staged.
- This scoped commit is CI/journal only; exact PR and merged-source tests are required. No Netlify, database, Auth, member, backup or release action.

## November 2, 2026 — #417 final source-bound isolation and CI acceptance (NO DEPLOY)
- Main PR424 source-bound stage/verify merged `827cc068aa8d9a6f186bdaa86684ff732e82531a`; PR427 fixed initially omitted new-test coverage, merged `af9c913d05277b1c4b059e6165fcad6f146849bb`. Exact main CI executed 129 Node tests, 0 failures, including real synthetic Git source restoration and negative source/queue checks. Historical initial CI success was not misrepresented as having run those new tests.
- Dev PR426 exact PR-head six checks SUCCESS; exact merged dev `5e6e32a8cbf86ffd202e1b526ba5de8805cf20c8` approval, validate, cloud-tests, mobile-browser-qa, sql, review, lightweight certify-ready-batch all SUCCESS. Candidate branch push triggers existing checks once on staged exact SHA; no extra publisher.
- Current real queue zero READY, three IN_PROGRESS. No live candidate or production publication attempted; first real release requires new explicit owner publish request, actual candidate-specific CI and independent Netlify/backup postflight. Historical #356 remains source-documented. No production provider/data writes, force Git or extra backup.


## 2026-11-02 — #423 explicit Locked recovery-key custody supersession (no deployment)
Owner approved reusing EXISTING unencrypted SSH Ed25519/age recovery private key directly in GitHub Actions encrypted secret DIC_ARCHIVE_AGE_IDENTITY; prior separate-automation-only-key decision is superseded solely for key custody. Record in Master Spec and Decision Ledger current_owner_existing_ssh_backup_key_github_actions_secret_20261102. Main operations PR #431 merged source `760cc2ee1b97fc476d4d03b88ca76f5d7fa79d2c`; exact PR CI included real synthetic SSH test. No key has been shared through ChatGPT; no archive decrypted or production changes. Preserve existing backups, independent offline copy and block archived-restoration PASS until real digest-matched offline test. Project Instructions updated to under 8,000 characters. Docs-only development change [skip netlify].


### 2026-11-02 #423 canonical approval matrix reconciliation on exact PR head
- Initial documentation PR #432 CI correctly rejected new `current_owner_existing_ssh_backup_key_github_actions_secret_20261102` because the owner decision inventory lacked deliberate classification; this was NOT a passing test.
- Updated `docs/APPROVAL_COVERAGE_MATRIX.json` sorted decision inventory and explicit Locked scope/implementation/blocked restore entry without modifying historical baseline, existing contracts or receipt fingerprints. Same-commit scoped journal repair. Require new exact PR-head CI pass and new merged-development CI pass before VERIFIED; no app deployment, backup export, secret, production SQL or member write.


## Nov 2, 2026 — Issue #423 owner-reaffirmed weekly encrypted archive restore schedule (nonpublishing)
- User explicitly questioned manual Run workflow and reaffirmed goal of automatic restored archived backups. Main PR #437 merged exact SHA `5b6a056adf9cb6a39ce363f6530859e2239b1970`, CI PASS; GitHub-native weekly Tuesday 13:17 UTC offline saved ciphertext restore, no ChatGPT dispatch capability, no new dump or app publisher. First run pinned to Nov1 privately Drive SHA-matched ciphertext; later runs select recent GitHub scheduled archive but do NOT automatically prove Drive copy. Source-bound real decryption/rows/schema still pending.
- Updated existing single Backup Watchdog ID 6ad2807d3f408191a1aa9d5affe092a3 to check archive test with Wednesday 18 UTC grace, daily delivery and Sunday drill; read back enabled, no duplicate task.
- Locked scheduled-recovery owner reaffirmation recorded in BOTH Master Specification and existing Decision Ledger Issue #423 entry; update full Project Instructions under 8,000 characters and CURRENT_STATUS. Docs only, [skip netlify]. No publication, production data writes or secrets.


## Nov 3 2026 — #423 first genuine scheduled age-encrypted saved-archive recovery PASS (documentation only)
- GitHub live Actions event `schedule` [run 41709488687](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/41709488687), original ops main source `5b6a056adf9cb6a39ce363f6530859e2239b1970`, 2026-11-03 20:06:34 UTC, SUCCESS all steps. Originally 13:17 UTC cron; 6h49m GitHub delay, not failure/drop.
- Runner verified Nov1 source archive from backup run 41316998335, artifact 13087632285, ZIP SHA-256 `1cd12b8b9b7ef4dded07cebc96578f2903e9fb3a85195e6afd42e677aa92b746`, independently matching private Drive child 1r8hGOSlLjOF-19rnav6sKXBvdV5BrbMV. Actual managed existing-key `age` decrypt, manifest/payload hashes, 46 app tables/Auth identities/metadata restored disconnected PostgreSQL and cleanup PASS. No full hosted provider/settings/external credentials/Storage file-byte restoration claimed.
- Update Locked Master Spec, existing #423 Decision Ledger and coverage classification, CURRENT_STATUS, complete Project Instructions under 8,000 chars in this SAME documentation commit. No new tests, exports, source features, secrets, Netlify deploy, production DB/Auth/member writes. Preserve existing watchdog and future per-run independent evidence/Drive-delivery checks.

## November 3, 2026 - Owner-approved first READY-only publish validation (Issue #417)
- Owner direct new publication command: Owner Nov 3, 2026 current conversation: 'Okay so it's implemented and ready? Can we try a deployment to test it?' (explicit approval to publish previously discussed READY #335 only)
- READY selection ONLY DIC-Q-335-historical-grind-range-evidence, not newer DIC-Q-33-selected-buncho-station-history; any unfinished #33/#368 remains unpublished.
- Development source pin before authorization 96e2a89577f57a55206df88f31e78a251ce0ac7d; published baseline 2c8e1ffe3b83a7524968f50efca3ead4da282cf8; candidate branch release-candidates/ready335-nov03-firstlive and candidate SHA f1e150a2e7c95764c4a2d8760886aab23c2bfc5e.
- Isolated source diff ONLY site/lib/engine.js; restored scripts/netlify/should-ignore-build.mjs, src/server/coffee-identity-evidence.mjs and src/server/coffee-narrative-evidence.mjs to published blobs. Candidate exact Git checks approval 41732097245, validate 41732097348 (focused grinder/recommendation/offline + lint/build), cloud-tests/mobile-browser 41732097303, sql 41732097396 SUCCESS. Cloud/browser and SQL suites explicitly NOT_APPLICABLE, not a test PASS. Original historic PR442 verification retained; no duplicate full test.
- One-use owner grant DIC-20261103-READY335-15 bound to candidate SHA and selected READY ID; expires 2026-11-04T01:36:35.923Z; created in this same-commit journal. NO grant consumption, Git production claim or Netlify deploy at this checkpoint.
- Reuse valid existing Nov2 03:15 UTC Drive/GitHub ciphertext and Nov3 20:07 UTC actual archived restore evidence; non-destructive frontend-only, no fresh backup necessary. On owner-authorized main request: verify exact refs, grant, candidate/CI, recovery, one nonforce release/production publisher, Netlify READY/current postflight, then queue reconciliation and pin backup release SHA. Fail closed on drift.

## November 3 2026 — Release15 exact production readback, #335 DEPLOYED
- Owner-authorized one-use DIC-20261103-READY335-15, main request 3e9af091f310699d3ca56fd65d6cdb431d175321; GitHub release runner 41732438358 SUCCESS and exactly one nonforce release ref 31c66832a28247e657a2bf89592ebc1e2f48dfc5.
- Netlify production deployment 6aea62463d08ddf08e0bec7b READY/current, published 22:38:16Z, exact commit_ref 31c66832a28247e657a2bf89592ebc1e2f48dfc5, one existing coffee-url-preview function unchanged (SHA 73ab7d5...). No extra Netlify build/publisher.
- Exact READY-only tested candidate f1e150a2e7c95764c4a2d8760886aab23c2bfc5e exposes ONE changed deployable path site/lib/engine.js; server/extractor/guard paths restored to previous published bytes. Other READY #33 and unready work excluded.
- Postflight: no SQL migrations/source delta, no Supabase writes; read-only 46 application tables, 8 coffees, 25 shots+notes, 11 community, 11 beta members, 59 mutation receipts. No real signed-in device or direct production HTTP response checked (network DNS unavailable). Existing offsite encrypted recovery reused; no extra backup.
- **Continuation repair required:** published candidate SHA is a child of an earlier development tip, not the original development chain. This queue-settlement commit gives it a SECOND parent, keeps FIRST development parent's entire unchanged app tree and restores no excluded code. Future READY #33 merged ancestor predates published baseline despite excluded bytes; main staging planner must accept exact READY blob ownership rather than require merge to be newer than published SHA. Test this before next release; DO NOT stage automatically or deploy again.
- Queue base now pinned to actual deployed candidate, delivered #335 marked DEPLOYED, #33 remains READY. Receipt docs/PRODUCTION_RELEASE_2026-11-03_READY335_15_VERIFIED.json. Backup app source pin on main still needs update to release SHA 31c66832a28247e657a2bf89592ebc1e2f48dfc5; no extra scheduled export.

## November 3, 2026 — Release15 aftercare complete: next-release ancestry and backup source
- GitHub provider first live #15 receipt already in dev docs/PRODUCTION_RELEASE_2026-11-03_READY335_15_VERIFIED.json. One Git-connected publisher; Netlify 6aea62463d08ddf08e0bec7b READY/current, claim 31c66832a28247e657a2bf89592ebc1e2f48dfc5; #335 DEPLOYED only.
- Postflight exact development merge a7b9e0826353cfb26acf612e628f64857bb3617f has first parent grant-containing dev, SECOND parent source-only candidate f1e150a2e7c95764c4a2d8760886aab23c2bfc5e and preserves unready application source unchanged. Queue base now actual published source SHA; #33 remains READY, incomplete #33/#368 IN_PROGRESS.
- Main PR465 merged to main a5b5c75933501d778ea01cd02e82589f51ef7cd6, PR CI run41733239610 144/144 PASS; exact merged CI run41733374302 144/144 PASS. Fixed false gate on pre-published-but-source-excluded READY merges with real 2-sequential-release disposable Git test; enforced byte/source/overlap checks still hold.
- Nightly backup app checkout source pin updated to current verified Release15 Git production SHA; no new backup run started from main merge. Previously verified offsite ciphertext and Nov3 actual saved archive isolated restore reused; no redundant backup or restore.
- All provider and repo state verified; owner approval was ONLY one Release15. No follow-on automatic staging/deploy or second Netlify build. Signed-in owner device and independent direct public HTTP unavailable; historical #356 preserved. This completes the exact #417 first live release requirement subject to documenting HTTP/device as non-gating evidence limits.

## 2026-11-04 — READY17 release isolation Netlify guard-test repair (not published)
- Authority: Owner command "Publish all items in the queue"; the first source-isolated READY17 candidate 3158c461bc47c1128081d8d15a1cfb913cf90fe3 failed required validate CI 41872118650 because an existing guard test assumed unready #368 newer code while exact previously published guard bytes were safely restored. Other four required checks SUCCESS; failure retained, not called PASS.
- Scoped nondeployable test-only fix: permit the published guard semantics ONLY if release candidate manifest explicitly restores scripts/netlify/should-ignore-build.mjs from verified published source f1e150a2e7c95764c4a2d8760886aab23c2bfc5e and Git blob is exactly 22b4cd101006130513b45c6c5e932b5543ca8141. Otherwise test unchanged stronger full-commit skip-marker behavior and all Netlify approval/one-use checks. No unready code promotion or product behavior change.
- Next: re-stage all 17 READY paths from this source, restore both unready modules, run five exact candidate checks; hold production and SQL until all are SUCCESS and live recovery validated. No Netlify build or production SQL/Auth/Edge/member write.

## November 4, 2026 — guard test source-string representation correction (same commit)
- Previous isolated-guard test repair source commit edead87a094ea023c09894cc4595975b9db616c7 incorrectly double-escaped JS newline and NUL escape literals; code-level review identified that they would make the noncandidate skip test and pinned Git blob check fail. Preserve the prior attempted source and failure record. This change corrects the escaped strings and moves the helper below imports; expected verification is still exact-source CI, not yet passed. Nondeployable test and scoped journal only; no production release/provider mutation.
