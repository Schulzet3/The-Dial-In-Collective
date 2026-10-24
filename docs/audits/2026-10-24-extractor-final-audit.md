# Dial In Collective extractor audit — verified development source

**Completed 24 October 2026 UTC. Candidate12 is READY in development and has not been deployed.**

PR [#121](https://github.com/Schulzet3/The-Dial-In-Collective/pull/121) was merged non-force at `010f77a83ca1efbf447db6b838ef0f826aaf2f1a`. The actual merge tree is exactly the reviewed head's tree, `9a00b4fa54f87f66a649a17db516bc049f326821`, with preserved development `a42bc757a3aedf02fcb213a4d8a7da807a68fa8c` and reviewed head `3dc7fe4daab46b888368cdd8de4d59886fe5fb4f` as its parents. The final runtime fingerprint across 32 files is `ac529dd5950b0fe63d904aed154dc901180013aacf65aae1adec9f890b0a2451`.

The [complete reviewed benchmark40074270907](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40074270907) passed the original 603 coffees, 201 roasters and 1197 captures. Applicable merged-source checks and fresh public-page acceptance also passed; their exact sources, job logs, counts and limitations are in [extractor-candidate12-merged-ci-010f77a8.json](extractor-candidate12-merged-ci-010f77a8.json). The final documentation commit changes no extractor, scorer, expectation, capture, client/export/offline source, workflow or test.

This report supersedes earlier in-progress Candidate12 summaries. The complete historical Candidate11 audit and its original READY queue are preserved verbatim in [the archived audit](candidate11-concurrent-integration-audit.md) and [queue snapshot](candidate11-concurrent-ready-queue-snapshot.json). Dated failures, source-review decisions and interrupted runs remain in the [Issue 33 journal](../workstreams/issue-33.md); they have not been rewritten as passes.

## Plain-English findings

The main remaining problems were how the extractor assigned meaning to text that it already retained: identifying the current farm or cooperative, distinguishing a location from an award or coffee grade, and keeping a complete tasting description without importing a different product, preparation or historical story. The repairs use generic source relationships and boundaries, not a lookup table of the benchmark's answers.

The finished version recovers useful facts and corrects specific wrong assignments. It also leaves uncertainty visible. A page saying only “Co-op” does not justify inventing its name; a flavor that appears only after adding milk is not an unconditional cup note; a marketing series is not automatically a distinct release. These distinctions preserve the product's existing review and explicit-save decisions.

The earlier GitHub write/execution blocker is resolved under the owner's explicit authorization. The original archives were restored through an authenticated, one-use encrypted handoff to an actual GitHub runner. All source reviews, the full original benchmark, integration and applicable final checks are completed. No new API key or paid service was introduced. No production deployment, SQL/Edge/Auth operation or member-data write was performed.

## Measured results on the unchanged corpus

“Exact” means normalized agreement with the original frozen expected value. It is not an overall accuracy percentage. “Review required” includes faithful wording that differs from the expected string, richer supported detail, unresolved source roles and actual uncertainty. The expected answers and scorers were not adjusted to improve the score.

| Complete benchmark | Usable previews | Exact canonical | Missing canonical | Review required |
|---|---:|---:|---:|---:|
| Original preserved baseline |600|2229|1068|705|
| Handoff Candidate4 |603|3003|192|807|
| Candidate7 |603|3023|171|808|
| Durable Candidate8 / freshly verified Candidate11 |603|3024|167|811|
| Intermediate Candidate12, runtime 37253; strict run retained |603|3044|143|815|
| **Final Candidate12, reviewed run 40074270907** |**603**|**3046**|**132**|**824**|

The final result has 43 more exact assertions and 60 fewer missing assertions than Candidate4, the latest complete result in the original handoff. Candidate5 originally had focused verification only and is not presented as a complete benchmark. Compared with the restored Candidate8/verified Candidate11 source, the final runtime adds 22 exact matches and fills 35 missing fields, while 13 more results fall into the honest review category.

Across the original 6474 supplementary assertions, 5458 remain fully retained, 337 partly retained and 679 unconfirmed. There are **zero prior exact-match losses and zero prior full-retention losses**. Retention counts do not increase merely because a previously retained passage is now correctly assigned to a canonical field.

Primary evidence: [extractor-candidate12-frozen-reviewed-run-40074270907.json](extractor-candidate12-frozen-reviewed-run-40074270907.json), [manual source review](extractor-candidate12-manual-source-review-runtimeac529.json), [source manifest](extractor-candidate12-source-manifest.json), and [historical Candidate11 audit](candidate11-concurrent-integration-audit.md).

## What actually improved

### Current origin and producer roles

The extractor now separates the selected coffee's geography and producer relationships from awards, grades, nearby projects and historical descriptions. Concrete frozen-source corrections include:

- Onyx Mexico Finca Santa Cruz Gesha: **Chiapas, Mexico** replaces the award text used as geography.
- Alta Kirima Batian: **Othaya, Nyeri, Kenya** is retained as origin, with **Othaya Farmers Cooperative Society** as producer; “AA” is not treated as a place.
- Alta Nevado Gona: **Sierra Nevada de Santa Marta, Colombia** is selected from the current coffee's description rather than a nearby social-program location.
- Maps Scarlet Macaw: both **Silvestre Vasquez and Joel Lopez** are retained, with **Pacavita, Honduras**.
- Pinewood Hacienda Río Negro: the current producing farm **Hacienda Río Negro** is recovered without assigning its sister farm as the producer.

Further producer repairs preserve explicit cooperative aliases, complete named farm/grower groups and current smallholder credits. Historical, hypothetical, educational and other-product paragraphs cannot donate a producer. A country-qualified producer claim must agree with the selected origin and cannot silently fill a field after a genuine country conflict.

Some correct recoveries remain review-required. Ghost Town's page supports **Abateraninkunga ba Sholi**, while the frozen expected string adds “cooperative.” Sidecar supports **smallholder producers** without an invented individual name. VT Artisan's current source says **Co-op**; the parser does not invent the longer name in the expected answer. All original source details and provenance remain available for review.

### Complete tasting descriptions with the right scope

Current literal sensory clauses are recovered more reliably, including coordinated phrases, “Characteristics” sections, explicit tastes and sweetness. Meaningful modifiers are preserved instead of stripped to force exact string matches.

Examples include Hello Darlin's **fruity**, Hello Bless Your Heart's **mildly sweet and nutty**, INK6610's **rich taste, slightly smoky undertones and bittersweet, dark chocolate**, INK Espresso89's **chocolate taste, licorice sweetness**, and South17's **strawberry jam and chocolate**. BLEU's actual Sumatran product is scoped by its content despite an old Papua New Guinea URL slug.

The new boundaries distinguish tasting notes from aroma-only descriptions, body/acidity, roast descriptions, optional flavor additions, milk preparation, partial blend components and historical material. A narrow processing-description rule lets an explicit current named profile outrank the broad causal phrase “fruit-forward”; it does not discard specific fruit or chocolate flavors generally. Actual counterexamples for these boundaries were repaired and tested before integration.

### Release identity, source preservation and public-page fidelity

A literal current release/year pair is recovered without letting a later historical comparison erase it. Existing rules for release labels remain unchanged: generic Reserve/Limited marketing, a series name or a yearless seasonal calendar do not justify inventing an edition or year. A separate22-row [release-label review](extractor-candidate12-release-label-closure-review.json) records19 reviewed source-role decisions and 3 context-limited rows. The latter are evidence limitations, not proof that no source exists.

The restored earlier work also retains four documented omissions: Larry's complete alternate Sumatra structured object and Tintico's page description, Open Graph title and image-caption context. Five additional published espresso references across Foster, Methodical and Tenfold remain preserved. Its recorded preservation review covered 22900 reconstructable structured objects, 30111 plain contexts, 447 alternatives across 223 namespaces, 614 purchase variants and 3008 reference destinations.

Candidate11's guarded selected-product boundaries and complete HTML attribute handling remain integrated. The public-fixture sanitizer retains the precise public product/Offer/variant structure needed for extraction while removing private controls. Actual current-page checks, including NOMAD and Circulor, verify full extraction parity against the sanitized saved fixtures. No private-data or source-scope guard was weakened to make a fixture pass.

Evidence: [complete 42-case review](extractor-candidate12-manual-source-review-runtimeac529.json), [forensic projection receipt](extractor-candidate12-forensics-run-40073961047.json), [earlier capacity verification](extractor-600-candidate8-capacity-verification.json), and [extractor-candidate12-merged-ci-010f77a8.json](extractor-candidate12-merged-ci-010f77a8.json).

## Size limits: increased where the evidence justified it

The owner-authorized capacity change is retained:

| Evidence allowance | Earlier | Current |
|---|---:|---:|
| Source facts |128|384|
| Content budget, UTF-16 units |64000|192000|

Per-value, structured-part and variant bounds remain1600/128/128. The existing network policy remains a900000-byte normal read and an eligible bounded2000000-byte product retry. HTTPS, SSRF, redirect, request-count and deadline safeguards are unchanged by the final runtime.

The capacity increase reduced recorded source-context truncation warnings from 96 to3. The three remaining warnings correspond to malformed original Congregation captures; the audit did not establish that a larger arbitrary limit would recover their missing markup. On the final 603 run, the maximum fact count was 297 and the largest response was 222,009 UTF-8 bytes. The measured maximum source-fact **value** text was 165610 UTF-16 units; that metric excludes label/other budget contributions and must not be treated as the complete content-budget usage.

No additional limit increase was justified by these results. Larger limits alone would not correct the role, conflict or missing-source issues listed below. [Capacity receipt](extractor-600-candidate8-capacity-verification.json); [extractor-candidate12-frozen-reviewed-run-40074270907.json](extractor-candidate12-frozen-reviewed-run-40074270907.json).

## Every changed output was reviewed

The final source was first run in strict mode at 2454, [run 40073531611](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40073531611). All 603 cases executed, but the job correctly failed acceptance because 42 complete output records differed from the baseline and had not yet been approved. That failure remains preserved.

A separate hash-bound forensic run [40073961047](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40073961047) produced all 42 complete safe projections with no omitted structured facts. The root review and independent producer/sensory reviewers inspected the current-product relationships, complete changed values, retained qualifiers, original capture/oracle bindings and before/after case/export identities. Earlier review was reused only where the complete evidence and all relevant hashes were identical.

The final reviewed rerun accepts exactly those 42 changes: **41 source-supported case changes and 1 nonsemantic ordering change**. It does not accept arbitrary future changes.

- 40 coffees have 46 changed canonical assertions: 17 producer, 21 tasting-note, 7 origin and 1 release-label assertions.
- 35 originally missing assertions are populated: 15 now exact and 20 still review-required.
- 7 previous review assertions become exact; 4 changed review assertions remain review-required.
- Lima's extra case changes auxiliary producer detail only. Aldea's extra case changes an availability-array order only; its export bytes are unchanged. Neither is counted as a canonical accuracy gain.

The pinned review manifest is 73029 bytes, SHA256 `d82f85051727908bfbea8985cd837636a37baee4b1b3262aa21e3c0049dd9d47`. Actual hosted validation checked all 55 source quotations: 35 as exact UTF-8 members of their original captured bytes and 20 against the unchanged frozen oracle, with original packet/capture hashes and URLs. It also required exact before/after case and export hashes, unchanged frozen identities/scorers, and zero loss/export/offline failures. All 41 runner controls, 9 forensic-reader controls and five benchmark stages passed.

The reviewed rerun reproduces the strict run's complete changed records, score counts and retention dictionary exactly. “PASS_WITH_REVIEWED_CHANGES” means those explicit source-supported changes passed the fixed gate; it does not mean every remaining field is correct. [Pinned manifest](extractor-reviewed-changes-candidate12.json); [strict receipt](extractor-candidate12-frozen-run-40073531611.json); [extractor-candidate12-frozen-reviewed-run-40074270907.json](extractor-candidate12-frozen-reviewed-run-40074270907.json).

## Remaining gaps are recorded, not hidden

All 167 originally missing Candidate8/11 assertions were individually triaged and reconciled against the actual final replay:

| Field | Originally missing | Recovered exact | Recovered, still review | Still missing |
|---|---:|---:|---:|---:|
| Elevation |1|0|0|1|
| Origin |11|0|0|11|
| Process |11|0|0|11|
| Producer |42|10|5|27|
| Release label |34|1|0|33|
| Roast level |26|0|0|26|
| Tasting notes |42|4|15|23|
| **Total** |**167**|**15**|**20**|**132**|

There are still824 review-required canonical assertions. The original 115 conflict assertions remain65 withheld and 50 unresolved; 19 unexpected canonical fields remain visible. Supplementary retention still includes337 partial and 679 unconfirmed assertions. These are retained limitations, not silently promoted successes.

Residual cases include source conflicts, ambiguous producer or component roles, conditional/preparation descriptions, unsupported roast tiers, yearless release language, decaffeination versus green-coffee processing, image or structural evidence limits, and malformed captures. The finite documented repair and review set is complete, but this audit does **not** establish that every remaining blank is intentional, impossible to improve, or blocked by cost. Further improvements need equally specific source evidence and regression checks; broad guessing would change product behavior or create unsupported facts.

Issue 33 remains the named tracker for these disclosed residual accuracy questions. The current READY classification applies to this completed, tested, integrated repair set. [Case-level dispositions and final 167 reconciliation](extractor-candidate12-manual-source-review-runtimeac529.json).

## Verification, failures and limits of the claims

Fresh reviewed-head 3dc ordinary checks passed:

| Verification | Actual result |
|---|---|
| Full Node suite |1575 total: 1569 passed, 0 failed, 6 explicit skips|
| Cloud unit/regression suite |1201 passed, 0 failed|
| Python audit/report checks |44 passed|
| Offline/OCR companion checks |23 passed|
| Pre-install Node 18 ignore guard |12 passed|
| Browser/mobile checks |61 passed|
| Visual assertions |167 passed, 38 screenshots|
| Source guards |42 passed|
| Isolated SQL signed synthetic HTTP assertions |53 passed|
| Lint, build, private-source distribution guard, approval/continuity and security |Passed|

These suites overlap; their totals are not summed into a unique-test count. The six skips are the published sign-in shell, published admin shell, and missing/forged-JWT tests for each of dic-verify-coffee and dic-preview-coffee. They were not run against real published endpoints and are not passes.

On the actual merge, the full app/test/build workflow 40074669136, cloud/mobile workflow 40074669168, Python workflow 40074669171, approval/continuity workflow 40074669164 and public-source acceptance 40074669139 all completed successfully. The separate broader controlled-roaster probe 40074669165 was skipped and is not counted as a pass. PR-head visual/security/isolated-SQL evidence applies to the identical merged file tree; it is not represented as newly executed on the merge. The fresh live acceptance at [run 40074669139](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40074669139) exercised nine current product-page cases plus the required homepage negative, retained complete saved-fixture parity, made19 public requests and reported zero gaps. It made no real backend calls, consumed no member quota and performed no deployment or production writes. This sample is not a fresh live crawl of all 603 products or all 201 roasters.

All 603 actual client snapshot and Blob-download paths preserve the **current** reviewed outputs.562 exports are byte-identical to old Candidate8;41 deliberately differ and are independently reviewed. All 603 real offline-helper validations pass with no attempted external operation. Browser verification includes actual service-worker cold reopening, durable queues, session isolation and packaged assets. No physical-device or genuine-member-session acceptance is inferred.

Actual earlier failures are retained: an unconditional plum flavor was lost before a later milk-qualified note and was repaired without weakening its original test; synthetic .example fixture hostnames were rejected by the real URL guard and only the fixtures were corrected. Superseded or interrupted frozen jobs that did not execute603 cases are not counted as benchmark passes. The optional original-context reader's partial result remains explicitly partial, separate from the complete final 42-case forensic projection. Restricted-V8 preparation diagnostics are not used as substitutes for the actual Node/browser/corpus runs above.

Fixture timing is reported in the raw result for reproducibility, not as a production latency or capacity promise. The final audit did not exercise production authentication or change member records. [extractor-candidate12-ordinary-ci-3dc7fe4d.json](extractor-candidate12-ordinary-ci-3dc7fe4d.json); [extractor-candidate12-merged-ci-010f77a8.json](extractor-candidate12-merged-ci-010f77a8.json); [work journal](../workstreams/issue-33.md).

## Recovery, reproducibility and retained artifacts

The original source archive is 113755359 bytes with SHA256 `696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52`. The original recovery ZIP is 88577532 bytes with SHA256 `728bd52965538879f116d0e384984d7a49becbb9224b092f587a71e24b4e6cce`. The frozen oracle digest remains `0bd751f68aba81d17204418a6d016a66815afdc82095d7a89c5f856eab05b2cb`; the packet attestation remains `0767e52af1a5483ef31beba01d9fa70666a17de10634bb9cb1cc933a6b105556`.

Historical unpublished Candidate10 runtime/raw bytes were not recoverable after environment loss. Its [recorded local summary](extractor-candidate10-recorded-local-summary.json) is retained as history; reconstructed Candidate11 and final Candidate12 were actually reverified. A separate claimed Candidate8v2 archive was not found and its 3036/118/848 numbers are excluded from the accepted comparison.

The reviewed run's [raw artifact12552820841](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40074270907/artifacts/12552820841) is 15203294 bytes, SHA256 `a5ae41c233761cef75d489ea0b2b66623ff56c822269e98ea02202394cb22ca8`, with GitHub expiry **22 January 2027 at 07:28:30 UTC**. Its final manifest is 126430 bytes, SHA256 `4b91c5707e2531993dca6d950631841117b375f27873eb5a80f7cc46061621d4`, describing631 retained files and 206486532 uncompressed bytes. The complete hosted job log is 93836 UTF-8 bytes, SHA256 `dc46883f57c768ff241481e0168ec58908e7fbdfec7cc5d7d9b0f276413a603c`.

Durable repository receipts bind every stage log, replay, comparison, retention report, actual exports and complete review material to the original sources and tested runtime. They preserve compact evidence after the raw Actions artifact expires; they are not a claim that an expiring raw archive remains indefinitely downloadable. No original capture files or signed transfer credentials were included in the retained Actions artifact. The encrypted temporary PR-body marker was removed after successful materialization, and the runner erased its receiver key.

The retained run 40074270907 HTML and its internal benchmark-receipt.json were generated before the merge and correctly retain that premerge TESTING integration state. They are immutable historical artifact bytes. Source READY is established separately by the actual non-force merge, the merged-source verification receipt and this final audit; those raw artifacts have not been relabeled.

## Integration, product decisions and production boundary

The non-force merge preserves all unrelated development files, queue rows/history/policy, Locked decisions and concurrent publication instructions. Only this extractor queue item's current completion state is reconciled to READY; no other work is promoted. The deterministic-only runtime, blank-only autofill, review-only source evidence, explicit save, Pending/Verified semantics, source provenance and offline/member behavior are unchanged.

Readonly production checks for this task observed release/production at `65ee38609db6bd5977dd0f2b393e7791a5e1b766` and Netlify current READY deploy `6adc20c03a07673c4dd08035`. The branch, published deploy ID and deploy's exact source SHA remained unchanged at the readonly 07:36 UTC check, compared with the earlier task readback. No publication branch, provider deployment, production database, Auth or member record was written.

### Concurrent future-publication instruction — preserved historical wording

The following existing authority paragraph is preserved verbatim. Its in-progress PR121 status is historical; the verified current source disposition is stated above. This audit does not execute that separate conditional future publication.

October 24, 2026 UTC: Owner now authorizes completing PR121 and ONE future combined publication of the verified READY queue, with no repeat production migrations, no unrelated TESTING scope and a separate release grant plus provider readback. This supersedes only the older pause on publication, not the source-integrity/safety/release controls. PR121 remains TESTING until its changed-runtime frozen603 has independently reviewed output deltas and exact-source passing checks; no publication has occurred.

## Current evidence index

- [Merged PR121](https://github.com/Schulzet3/The-Dial-In-Collective/pull/121).
- [Reviewed full603 run 40074270907](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40074270907) and [extractor-candidate12-frozen-reviewed-run-40074270907.json](extractor-candidate12-frozen-reviewed-run-40074270907.json).
- [Original strict observation40073531611](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40073531611) and [its receipt](extractor-candidate12-frozen-run-40073531611.json).
- [Complete original-source adjudication](extractor-candidate12-manual-source-review-runtimeac529.json), [exact manifest](extractor-reviewed-changes-candidate12.json), and [forensic receipt](extractor-candidate12-forensics-run-40073961047.json).
- [extractor-candidate12-ordinary-ci-3dc7fe4d.json](extractor-candidate12-ordinary-ci-3dc7fe4d.json) and [extractor-candidate12-merged-ci-010f77a8.json](extractor-candidate12-merged-ci-010f77a8.json).
- [Current source manifest](extractor-candidate12-source-manifest.json), [release queue](../RELEASE_QUEUE.json), [Issue 33 journal](../workstreams/issue-33.md), and [Issue 33 residual tracker](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33).
