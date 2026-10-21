# Application audit — three passes, 2026-10-21

> **Current completion:** PR #48 is merged at `663cc6d779fec99ee788f655d75ebc8d96593a18`; all five required workflows passed before and after merge. Final results are 575 Node tests, 151 visual assertions and 38 captures, with complete isolated SQL/HTTP/recovery checks. See **Final integrated application result** below and the [completion receipt](2026-10-21-completion-receipt.json). The opening scope/counts and earlier entries are preserved historical checkpoints, including earlier missing-source and pending-CI statements. The new administrator source is reviewed and tested; production installation and real-account/device acceptance remain open.

## Outcome and scope

Three distinct application audit passes are complete. Confirmed defects were corrected in source. Final application verification covers **47 test files / 474 individual cases: 474 passed, zero failed, zero skipped**. **47 JavaScript/MJS/TypeScript files also pass syntax checks.** This is source and synthetic regression evidence; it does not establish deployment, new real-device acceptance, or completion of the remaining approved features.

The recovered application baseline was c9829d157ef4f430d24af7056ab32661ba8629f5; root started the audit on development f2432bf08a803ba370ff1940d3121305bbce2459. Concurrent development commit 3e8806ddff5247a4042e970309b6ea5a10195f91 later supplied the staged Issue 47 administrator explorer. Root preserved that work, reapplied the admin denial correction, and fixed build/anchor integration. Issue 47 remains unpublished and incomplete.

The inventory contains **59 files**: 34 under site/, 15 server extraction modules, one Netlify function, five Supabase Edge files, and four build/configuration/service-worker files. Baseline inventory had 58 files; the late administrator records.js was reviewed as a Pass 3 delta. Text source was read and traced to requirements. The two PNG icons were retained as build assets; accepted device/visual acceptance was not repeated.

Database migrations, live database inspection, release automation, complete historical documentation reconciliation and GitHub updates were separate root/team workstreams. This report does not claim recovery of unprovided conversations or proof against every possible future defect.

## Pass 1 — inventory and requirement trace

Read repository instructions, active journal and relevant master/decision-ledger requirements before changing behavior. Read the owned browser, administrator, model/recommendation, cache/outbox, import, extractor, Edge and build sources. Traced:

- Identity, live admission, account changes, cached reopening, durable mutation ordering and acknowledgment receipts.
- Log Shot → five active ratings → recommendation, calibration bounds, actual grind zero, temperature units, immutable history, recipe selection and Make Current separation.
- New Coffee URL preview, duplicate-first approval, Pending correction/merge/source retry, canonical revisions and truthful evidence labels.
- Community review holds, owner isolation and historical import safety gates.
- Product-scoped extraction, conflicting evidence, bounded fetches, allowed hosts, redirects, response sizes and cooldown boundaries.
- Admin invitation/member controls, private-state invalidation, escaping, build imports and public-shell service-worker scope.

Compared source with approved unfinished requests. A local model function or backend endpoint alone was not counted as a completed cloud interface.

Exact duplicate checking found only src/server/agtron-roast.mjs and supabase/functions/dic-preview-coffee/agtron-roast.mjs. They are intentional byte-identical Node/Deno runtime copies and were retained. Historical import modules are intentionally not mounted in everyday cloud UI. Layered styles and historical material were not deleted merely because they resemble older versions.

## Pass 2 — adversarial reproductions and narrow corrections

The second pass exercised concrete failure sequences and added regression coverage where actual behavior was incorrect. Its checkpoint ran **45 files / 458 cases, all passing**, recorded in application_pass2_tests.json.

| Fix group | Confirmed failure | Correction |
|---|---|---|
| Live application authorization | Fresh server denial could be treated as a network outage while an admitted cached workspace stayed visible. | Explicit SQL/JWT/HTTP denials clear private views/forms and that owner's snapshot cache before waiting for storage cleanup. Queue events/receipts remain. Account and epoch guards prevent late old-owner results changing another account. |
| Outbox authorization propagation | Mutation denial became generic rejected/offline, allowing a subsequent read outage to restore admitted cached UI. | Preserve denial metadata through fresh and retained rejections. Fresh denial blocks before read fallback. Retained denial requires fresh server admission, allowing restored members to reach their preserved queue. Validation/conflict errors stay distinct. |
| Administrator denial and retry | Private admin records could survive an RPC denial, and failed refresh could permanently disable its button. | Central invalidation clears issued codes, merge choices and private records; finally re-enables the trigger. Root retained this correction during the concurrent-source rebase. |
| Canonical corrections | Edit Coffee used original-submission facts/revision instead of the latest canonical record. | Use canonical revision/facts unless a pending correction exists; match server timestamp/ID ordering; preserve intentionally cleared source URLs. |
| Temperature precision | Editing notes/ratings could round-trip rounded Celsius/Fahrenheit display and change a saved measurement. | Only convert a temperature that was actually edited. Explicit Use Recommendation preserves exact calculated Celsius before display formatting. |
| Applied next-shot controls | Actual 20 g/50 g/91°C/grind 1.2 could receive a grind-only arrow while its applied grid reset dose/temperature to basket defaults. | Retain actual controls unless advice explicitly overrides them; preserve initial recipe basket defaults. Regression covers this exact non-green example. |
| Espresso units | Spelled-out grams/seconds could trigger malformed regex alternatives and produce NaN. | Group unit alternatives; require all extracted endpoints finite. Cover short/spelled-out units, ranges, missing/malformed/reversed values. |
| Duplicate product metadata | Same-identity Product nodes were discarded before conflicting process/roast/release facts were compared. | Combine selected same-identity facts and contradictions, retain primary-node precedence for compatible evidence, exclude other products. |
| Roast graphics | Contradictory graphics could leave a structured or Agtron fallback marked as resolved. | Withhold roast level on explicit graphical conflict. |
| Verifier membership | A valid login token could outlive beta access and still reach privileged verification. | Fresh session-status admission check precedes service-client construction, budget claim, fetch and promotion; retain owner validation. |
| Release/lot proof | A year falsely proved an unmentioned lot; unrelated company-history years and weaker OG metadata could bypass conflicting stronger evidence. | Named/lot releases require their full label. Plain years require product identity or explicit release context; conflicting release years remain unverified. Choose matching JSON-LD before checking release proof. Preserve accepted Wuri “selection for 2026” evidence. |
| Source truth and revision | Existing catalog approval, including approval during fetch, could become “Official source verified”; the submission could change while its old source was fetched. | Explicit source_verified:false on already-approved results, generic approved UI wording, exact target.submission_revision forwarded to trusted RPC, stale-write rejection stays Pending. Root provides the locked-row SQL check. |

The numeric next-shot correction follows the Locked single-variable requirement. The literal **Basket-based** caption was expressly preserved. Its wording when retained actual dose differs from basket default remains an explicit design decision.

## Pass 3 — independent review and final verification

An independent reviewer examined changed CloudApp, engine and verifier paths against recovered sources and requirements. That review found the additional contextual-year and outbox-denial defects. Root independently found the submission-revision race and coordinated the SQL/Edge contract.

Rechecked delayed cache cleanup, account replacement, offline fallback, failed local error annotation, restored membership and retained rejected events. Rechecked stronger/weak metadata competition and already-approved outcomes before/during fetch. Rechecked advice-grid consistency across explicit grind/yield/temperature changes and unchanged initial defaults.

Read the late administrator explorer source/test delta without implementing missing backend features. Root fixed omitted records.js in the build, duplicate section IDs and an unused variable. The final full application run exposed three stale fixture failures: two VM contexts omitted the imported authorization predicate, and one renderer asserted the former combined empty-queue sentence. Updated only these fixtures to use the real predicate, model the undeployed records RPC, and assert both current empty sections and valid missing aggregates. No security assertion was removed.

Final evidence comprises a **47-file full run**, followed by **only the two affected admin fixture reruns**. Latest combined result: **474/474 passing**. The original three-failure result is retained in application_pass3_before_admin_fixture_refresh.json; it was not described as a clean first run. Root owns the subsequent combined repository lint/test/build/CI gate.

| Representative area | Individual cases |
|---|---:|
| Access-denial/controller regressions | 11 |
| General cloud mapping, outbox and auth | 40 |
| Cross-account races | 8 |
| Offline reopening and storage resilience | 10 |
| Admin session/invitations/read-review/staged records | 25 |
| Canonical correction revisions | 4 |
| Temperature and next-shot control consistency | 7 |
| Recommendation evidence and family selection | 22 |
| Edge admission/revision/race behavior | 8 |
| Official evidence and source-status UI | 19 |
| Product-page isolation and espresso units | 11 |
| Import validation and preservation | 27 |
| Other extractor, community, UI/build/PWA cases | Included in 474 total |

These use synthetic SDK/network/storage responses. They do not count as genuine member acceptance, live source verification, deployment, actual browser execution or repeated device testing.

## Unfinished requirements and exact remaining boundaries

| Requirement | Evidence and remaining work |
|---|---|
| #14 Custom targets | Cloud style options still exclude Custom. Local engine support does not complete cloud UI/protocol. |
| #15 Bag lifecycle | Hydration still provides empty bags/null active bag; complete lifecycle UI is absent. |
| #16 Equipment lifecycle | Setup creation/settings/rename are not the complete approved version/archive lifecycle. |
| #19 Add Coffee recommended style | Engine suggestion exists; the requested New Coffee presentation is absent. |
| #20 Safe Hide Shot UI | hide_shot exists in action/cache/backend paths and local engine, but no mounted CloudApp/shot-card hide control exists. UI and durable Community-detach verification remain unfinished. |
| L041/L043; related #12/#26 | Local recommendation-use metadata is not preserved through cloud Use Recommendation, shot payload, hydration and storage. Arrow/info UI does not close this separate requirement. |
| #21/#22 Denial and queue recovery | Queued events/receipts survive. Denied UI has no authorized private export route; Sign Out still protects pending work, but its message can point to inaccessible Sync Details. Failed cache deletion is protected only in the current tab: the denial marker is memory-only, so a full offline reload may expose the undeleted old cache. No durable revocation guarantee is claimed at this storage-failure boundary. |
| #10/#13/#17 | Non-ratio families, experiment/comparison/declined-green semantics and higher-is-finer/multi-turn calibration require outstanding decisions. No speculative redesign. |
| Dose caption | Actual dose can differ from basket baseline while mandatory “Basket-based” remains; numeric preservation is fixed, caption wording remains unresolved. |
| #47 Admin explorer | Concurrent source stages page/edit controls, but dic_admin_records and edit RPCs are not implemented/deployed here. Three renderer cases are not completed feature acceptance. Publication hold remains. |
| Source verifier deployment | Edge admission/evidence/revision/truth corrections and root's SQL claim/membership/revision correction are source-only. Both need the appropriate future deployment approval before claiming the trusted path restored live. |

A denied-screen export would reveal private pending payloads/receipts, so no new access policy was invented to claim that flow complete.

## Application audit changed files

Runtime:

- site/cloud/client.js
- site/cloud/main.js
- site/cloud/outbox.js
- site/admin/main.js — audit fix reapplied/integrated by root into incoming administrator source
- site/lib/engine.js
- src/server/coffee-espresso-evidence.mjs
- src/server/coffee-page-metadata.mjs
- supabase/functions/dic-verify-coffee/index.ts
- supabase/functions/dic-verify-coffee/evidence.mjs

New tests:

- tests/cloud-access-denial.test.mjs
- tests/coffee-edit-revision.test.mjs
- tests/coffee-espresso-units.test.mjs
- tests/coffee-source-status-ui.test.mjs
- tests/next-shot-control-consistency.test.mjs
- tests/shot-temperature-preservation.test.mjs
- tests/source-verifier-admission.test.mjs

Extended/refreshed tests:

- tests/admin-session.test.mjs
- tests/admin-invitation-controls.test.mjs
- tests/admin-read-only.test.mjs
- tests/cloud.test.mjs
- tests/coffee-page-isolation.test.mjs
- tests/coffee-source-verification.test.mjs

Root separately owns incoming administrator records/view/style/test changes, their build integration, SQL and shared documents. This agent did not commit, write GitHub, deploy or change production data.

## Evidence and references

- application_source_inventory.json — 59 source/build paths, SHA-256 hashes, sizes, exact duplicate group and 47 syntax checks.
- application_pass2_tests.json — 45 files/458 passing cases.
- application_pass3_tests.json — latest per-file results, 47 files/474 passing, with affected-rerun provenance.
- application_pass3_before_admin_fixture_refresh.json — retained three late fixture failures.
- Canonical contracts: docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, applicable Locked amendments and active journal.
- Independent history mapping: PROJECT_REQUIREMENT_TRACEABILITY_2026-10-21.md and .json.
- Official references checked: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser) and [PostgREST errors](https://docs.postgrest.org/en/stable/references/errors.html). Trusted identity and current membership are separate checks; SQL privilege/JWT errors and HTTP 401/403 cannot safely be treated as ordinary transient connectivity failures.

## Suggested same-commit journal entry

Completed three application audit passes over recovered browser/server/Edge/build sources, with independent denial/release-proof review and the concurrent Issue 47 source delta. Corrected private UI/cache invalidation, durable outbox denial propagation/restored-member recovery, admin denial/refresh retry, canonical correction revisions, untouched temperature precision, single-control advice consistency, duplicate product/roast conflicts, spelled-out espresso units, fresh verifier admission, contextual release proof, truthful catalog-versus-source status and Edge revision binding coordinated with the separate SQL fix. Application evidence: 47 files/474 cases passing and 47 syntax checks. Three stale admin fixture failures were retained in initial evidence and corrected with affected-only reruns. Historical data, queued payloads, accepted device evidence and Locked captions remain preserved. Source changes are not deployed; remaining UI/provenance/queue-recovery work and the failed-cache-deletion/offline-reload limitation remain explicit. Issue 47 remains unpublished/backend-incomplete. No universal error-elimination or full-product-completion claim is made.

## Late concurrent administrator delta — 2026-10-21 22:41 UTC

The preceding findings and test counts remain the frozen baseline receipt. Root subsequently requested a separate review of concurrent development through 0a400f85bc4d268717660d30a9d4c46e6b66999d, followed by the small view delta at 5ab369e6755d26e0e2e2c22724722a14ed8535d6. Incoming snapshots are retained under incoming2/ and incoming3/. Root owns their merge and the other reviewer's database corrections.

The late canonical spec and ledger explicitly record the narrow, development-only administrator creator/notes/edit permission under OPS-ADMIN-RECORDS-EDIT-20261021. It permits separate live-admin-gated APIs and preserves member isolation, immutable originals, audit, canonical identity and production approval. Thus the earlier baseline statement that these RPC sources were absent is historical: the incoming delta now contains a proposed migration and isolated fixture. Their production installation and completed acceptance remain unestablished.

Read the entire incoming administrator controller, renderer, records module and build delta; traced input names/types to the proposed RPC contract. Numeric form values remain strings consumed through SQL text casts. Canonical identity controls are readonly and the backend separately rejects identity rewrites. Reported partial-payload erasure risks for omitted shot/canonical fields to the database reviewer, who owns those corrections.

The late application review found and resolved:

- **Readonly enrichment:** URL preview could populate an unknown readonly canonical release label and make the ensuing descriptive save fail identity validation. Root's controller now skips readonly and disabled fields. The regression proves mutable blank origin is filled while identity and existing typed process survive into the save payload.
- **Stale URL response:** a delayed lookup for URL A could fill a draft changed to URL B. Root now requires the same live administrator form and unchanged URL before applying results. The actual-controller regression first reproduced the wrong fill, then passed after the guard.
- **Semantic merge navigation regression:** two independently correct duplicate-ID fixes removed both copies of the Pending/Conflicts anchors when combined. Root restored exactly one outer target per section. The test now requires every metric destination to exist exactly once, in addition to detecting duplicate IDs.
- **Empty-page ranges:** shrinking totals could show impossible ranges such as “Showing 51–49 of 49.” Empty record/account pages now display an accurate empty-page total while retaining a Previous route.
- **Account fallback loop:** a failed page request reused the overview's first account page but still offered Next. The fallback now explains its limitation and provides no misleading pagination. Successful zero totals remain zero rather than falling back to stale overview counts.
- **Existing note capacity:** shot-note editor maxlength now matches the established 16,000-character database limit; other fields retain 8,000.

Preserved the incoming5ab369 view changes: corrected administrator privacy-scope comment and closed legacy-review disclosures when full records are available. Preserved our earlier live-denial invalidation, record-memory clearing, refresh cleanup, generic transient-listing message, and exact navigation targets.

**Focused final verification: six administrator test files, 31 individual cases, all passing; zero failures/skips.** The new URL enrichment file contributes two cases and the extended records suite now has seven. Six changed-source/test/build syntax checks also pass. Exact source hashes and outputs are recorded in [late admin receipt](2026-10-21-admin-regression-receipt.json). This is an affected-area rerun, not a claim that the frozen 474-case baseline was rerun against every later concurrent change.

Late application-owned changes are site/admin/view.js, site/admin/records.js, tests/admin-records.test.mjs and new tests/admin-url-enrichment.test.mjs. Root applied controller guards and owns the merged main.js. No provider writes, production SQL, deployment or genuine account acceptance was performed by this agent. Issue 47 remains unpublished and subject to the database review and final combined gate.


## Final administrator count consistency — October 21, 2026

Successful record-list totals now drive the matching metric cards, including zero. When a page is missing, invalid or unavailable, the older overview remains an explicit fallback. This aligns hidden-shot, removed-admitted-account and merged-canonical counting with the records reached by the links. Existing labels and order remain unchanged. Two targeted regressions were added; the final administrator-records file passed 9/9 cases, zero skips. The earlier 571-case root full run and 31-case administrator receipt precede these two cases; exact final CI will provide the combined result.

## Final integrated application result — 2026-10-21T23:18:35Z

The preceding counts and missing-source statements remain historical checkpoints. The later reviewed administrator migration and permission contract resolve the earlier source-absence gap; production installation and real-account/device acceptance remain open. Final audit source `d366ec4afee6cf47be6611d9c2e37ca2a1954bc5` was merged in [PR #48](https://github.com/Schulzet3/The-Dial-In-Collective/pull/48) as `663cc6d779fec99ee788f655d75ebc8d96593a18`. The actual merge tree `c8819ad71ceaf795db60e245bf373c959a102fa2` equals the tested candidate tree and preserves both parent histories.

All five required workflows passed on the final source and again on the actual merged commit. Final combined Node 22.23.3 suite: **575 passed, zero failures/skips**; the separate Node 18 ignore-runtime suite passed 30 cases. Pinned lint/build, shipped-source boundaries, complete isolated PostgreSQL 17.11 execution (34 migrations/17 suites), 32 signed isolated HTTP assertions and six recovery scenarios passed. The focused final six-file administrator run passed 35 cases before integration.

The final independent visual review found and repaired raw nested headings and duplicate empty panels. A realistic populated RPC fixture now exercises creator attribution, private notes, immutable canonical identity, editable values and accurate list/card totals while preserving every original assertion and independent approval control. Final browser results: 50 mobile owner-flow checks, actual localhost service-worker cold offline reopening and 151 visual assertions/38 captures. All six final administrator captures passed native-resolution inspection; the other 32 are byte-identical to the prior reviewed set. See the [final visual result](2026-10-21-final-visual-results.json) and [completion receipt](2026-10-21-completion-receipt.json).

These synthetic/isolated results do not close hosted account, real-device, accessibility or unfinished product issues. No audit application publication, hosted SQL/Edge/Auth action, live member-data mutation or provider-setting change occurred. Historical failures, existing accepted flows and the documented failed-cache-deletion/full-offline-reload limit remain preserved.
