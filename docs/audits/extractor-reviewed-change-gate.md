# Optional review of changed frozen outputs

This iteration is Candidate 12. The historical Candidate 11 run and its evidence remain unchanged; Candidate11 PR116 has merged. Candidate12 continues on the separate authorized branch `work/issue33-candidate12-full-audit-20261024`; the input channel derives the actual follow-up PR number from its event.

The default frozen benchmark requires complete C8 equality, excluding only per-case elapsed time. Both workflow review pins are empty. No changed case is automatically approved, and this document is not an approval manifest.

## Required sequence

1. Run the new exact runtime on the complete original 603-coffee corpus with no review manifest. Any changed case, count dictionary, or export remains a failure requiring review. Retain that actual run and its raw artifacts.
2. Independently inspect every changed case, original source quote and capture identity, canonical/retention delta, and actual client export. Existing exact canonical matches and fully retained supplementary assertions cannot be lost.
3. Commit an explicit JSON approval directly under docs/audits/ only after the review. Pin its exact SHA-256 and path in the workflow's two literal environment fields. Both CLI arguments are required: --reviewed-changes PATH --reviewed-changes-sha256 HASH.
4. Run the full corpus again. The same runtime, frozen inputs, preserved scripts, precise changed-case inventory, stable full-record hashes, export hashes, and entire recounted score dictionaries must match the approval. Any extra, missing, or stale change fails.
5. An accepted changed run reports PASS_WITH_REVIEWED_CHANGES, with the nonempty changes and actual score differences retained. Source integration and deployment remain separate.

## Retained review material

Every complete run writes review-material.json. It is explicitly UNREVIEWED when outputs differ. It contains no generated approval decision or generated source adjudication. It records:

- Original freeze, packet attestation and archive hashes; exact C8 artifacts and runtime.
- The actual new runtime fingerprint and preserved harness/scorer/client-exporter hashes.
- Both whole-corpus stable case inventories and every changed case's before/after whole-record and export hashes.
- Complete baseline and candidate count dictionaries, independently recounted from the unchanged scorer records.
- Exact changed case/output key names and actual export-change case IDs.

Stable case hashing uses Python JSON with sorted object keys, UTF-8, ensure_ascii=False, compact separators and allow_nan=False. Only the top-level elapsed_ms property is removed. All source facts, nested values, calls, fixture calls, status and identity remain. The inventory hash is the same serialization of the case-ID-sorted array of {case_id, sha256} records.

The material file has no clock, run ID or absolute file path. Its exact bytes must reproduce on the approved rerun and match the hash retained from the original failed run. Raw replay hashes remain first-run provenance because raw replay timestamps and elapsed times can differ.

## Approval schema

Schema version 1 accepts exactly these top-level keys. Missing or unrecognized keys are rejected.

| Key | Required value |
|---|---|
| schema_version | Integer 1 |
| candidate | Integer 12, matching this current runtime iteration |
| type | independently_reviewed_frozen_case_changes |
| repository | Schulzet3/The-Dial-In-Collective |
| oracle_freeze_sha256 | Exact original freeze hash from review material |
| packet_archive_attestation_sha256 | Exact original packet attestation hash |
| source_archive_sha256 | Exact original source archive hash |
| recovery_archive_sha256 | Exact original recovery ZIP hash |
| baseline_runtime_fingerprint | Exact C8 runtime fingerprint |
| baseline_artifacts | Exact C8 replay/comparison/retention hash dictionary |
| candidate_runtime_fingerprint | Actual reviewed 32-file runtime fingerprint |
| preserved_script_hashes | Exact replay/comparison/normalizer/retention/client-exporter map |
| stable_case_projection | Exact format and ignored-properties declaration from review material |
| baseline_stable_cases_sha256 | Exact original complete-case inventory hash |
| candidate_stable_cases_sha256 | Exact independently reviewed candidate complete-case inventory hash |
| expected_counts | Entire candidate_counts object from the reviewed failed run |
| review | Explicit independent source-review decision below |
| first_observed_run | Exact prior failed full-run provenance below |
| changes | Nonempty exact inventory of independently reviewed cases below |

The review object has exactly reviewer, reviewed_at (past timestamp with UTC offset), decision equal to approve_exact_source_supported_changes, and independent_source_review equal to true.

The first_observed_run object has exactly run_id, run_attempt, source_commit, source_tree, workflow_path, completed_at, conclusion, benchmark_status, artifact, and artifacts. Run/attempt IDs are positive integers; the run is distinct from the current run; source commit/tree are full nonzero Git SHAs. The workflow is .github/workflows/coffee-frozen-corpus.yml, conclusion is FAILURE, and benchmark status is FAIL. Completion must precede independent review.

The outer artifact object contains the exact original artifact's positive id, positive bytes, and SHA-256. The artifacts object contains exactly replay, comparison, retention, exports, review_material, summary, and manifest. Each has file, bytes, and sha256. Their filenames are, respectively, candidate12-replay.json, candidate12-comparison.json, candidate12-retention.json, actual-exports.json, review-material.json, summary.json, and artifact-manifest.json. The offline runner does not make a network request to reauthenticate the prior artifact: its exact references are supplied by the independent review and are protected by the workflow's manifest pin. The reproduced stable review-material hash is checked again during the new full run.

Each changes entry copies every field of the corresponding actual review-material.json change exactly: case_id, changed_case_keys, changed_output_keys, roaster_id, source_url, before_case_sha256, after_case_sha256, before_export_sha256, and after_export_sha256. It adds only:

- decision: source_supported_improvement for a reviewed extraction change, or nonsemantic_order_only for the narrowly verified availability-array permutation below.
- rationale: an explicit explanation of 20–4,000 characters, accurately distinguishing a source-supported change from a change of array order.
- source_evidence: one to 32 unique original-source quote bindings for source_supported_improvement. It must be exactly an empty array for nonsemantic_order_only, because that decision makes no new source claim.

Each source-evidence object has exactly capture_id, capture_file, capture_sha256, capture_source_url, quote, and quote_basis. It must refer to the exact case's original frozen capture and original hash-bound packet. A literal_capture quote must occur byte-for-byte in that capture. A frozen_oracle quote must occur with the exact capture ID in the unchanged original oracle. The latter preserves original quoted evidence that may have normalized HTML layout; it does not fabricate a new raw-byte match. Quote size is bounded to 8,192 UTF-8 bytes. No source path may leave the original corpus or traverse a linked directory.


## Explicit nonsemantic available-field order review

A difference in the order of output.available is not an accuracy improvement. It still requires a manual, exact, pinned per-case decision after the actual first failed full run; there is no automatic exception to the unchanged-output default.

The nonsemantic_order_only decision is accepted only when all of these conditions hold:

- The complete changed-case descriptor names only output and only its available property.
- Before and after available values are different arrays of at least two nonempty strings. Both arrays contain exactly the same unique strings, without duplication, insertion, removal, coercion or case normalization.
- Every other property of the whole case is identical under the existing typed comparison after removing only top-level elapsed_ms and output.available. This includes canonical fields, source facts, status, identity, calls and fixture calls.
- The actual before/after client snapshot/download export hashes are equal, and the case is absent from the actual changed-export inventory.
- The entire per-case canonical/additional/conflict/unexpected-field scorer record and the entire supplementary-retention record are unchanged.
- The verifier receives all six actual complete 603-case maps: original/current replays, comparisons and retention records. Case identities and both whole-corpus stable replay inventory hashes must match the pinned review material. Missing, partial, stale or rebound evidence fails closed.

The availability-only classification cannot be disguised as source_supported_improvement. Membership changes, duplicate values, other output changes, changed calls, changed scorer evidence or changed exports do not qualify. The ordinary exact manifest inventory, source/runtime/scorer bindings, first failed-run provenance and all non-waivable checks still apply.

Accepted receipts separately record reviewed_source_supported_cases and reviewed_nonsemantic_order_cases, plus the exact per-case case_decisions. The report's total reviewed-case count includes both classes and is not a count of accuracy gains. An order-only case must not appear as a recovered field or a semantic extraction improvement in the final audit.


## Non-waivable checks and reporting

The runtime fingerprint is measured by the existing replay harness, then compared to both the workflow pin and approval. The complete original case/roaster/capture inventories and frozen assertion totals stay enforced. Previous canonical exact matches and fully retained supplementary assertions cannot be lost. All 603 actual current snapshot/Blob downloads must verify; all exports must pass offline validation without an attempted external operation.

The raw exporter and application exporter are unchanged. Its export_changed findings remain visible and are accepted only for the exact approved case/export hashes. Failures remain failures. No score rule or expected value is relaxed.

Receipts retain the measured actual_client_exports_equal number and add explicit export_verification counts for current snapshot/download fidelity, unchanged C8 exports, changed C8 exports and offline validation. Reports independently bind the reviewed whole-case hashes to the two actual replays before displaying approved changes. They do not call changed exports unchanged or infer deployment from source integration.

## Validation status

This implementation adds focused positive and adversarial runner/report controls. Source review and hosted execution must be recorded separately; preparation of this document or its tests does not establish a passing hosted run.

Full603 workflow path filtering follows runtime, tests, audit scripts/workflow and the exact reviewed-change manifest/control document. Narrative audit receipts alone do not alter a scored runtime or approved delta; ordinary documentation/approval checks still apply. This avoids making a receipt about a completed run recursively require a new full run without any source or approval change.


## Current37253 source requires a fresh unapproved run

The exact concurrent3fabb approval below is preserved as historical evidence only. This source revision has runtime fingerprint `37253ab02a1cf137f3a9ec5e7faf8d4aabee81d7f65e8ca630cf8d8940d9fc24`; its workflow intentionally clears both review pins. The old manifest is retained verbatim at `extractor-reviewed-changes-candidate12-runtime3fabb.json`. It cannot approve changed37253 outputs. The new source must retain its own first full result, independently review all exact changes, and reproduce a separately pinned review without waiving canonical/full-retention losses or current-export/offline checks.

## Preserved concurrent review of the earlier3fabb runtime

## Actual first 603-case Candidate12 replay and independent original-source review — October 24 UTC

Run [40070270334](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40070270334), attempt 1, at exact PR121 source `92cd74d6da008b8186f381b57aaa09a10a43cc88` **did run every original case** with both hash-verified private archives, the same 1,197 source captures, frozen 4,002 canonical expectations, 6,474 supplementary assertions and unchanged scorers. The first unapproved run correctly failed the strict unchanged-output gate and retained raw artifact `12551131716`, ZIP SHA-256 `a82a2f07d5583ce3dbb0a48334e2766fe89d2d8f465e3afe097d1df38c1c0afd`. It was not a parser crash and cannot be retroactively marked PASS.

Independent original-source review examined **all 24 changed whole-case records**, their 23 changed client export byte streams, and **35 literal quotations** verified against the two hash-verified original archives. No previously exact canonical fact was lost; no previously fully retained supplementary fact was lost; frozen scores changed from 3,024 exact / 167 missing / 811 review to **3,037 exact / 151 missing / 814 review**, 4,002 unchanged assertions. Supplementary full/partial/unconfirmed remains **5,458/337/679**. All 603 *current* client snapshot/download pairs matched each other and all 603 isolated offline helper validations passed; the 23 old-versus-new export differences are explicitly included in the review, never hidden or relabeled as same bytes.

The exact cases and reasons, original page capture IDs/URLs/SHA-256s, source excerpts, before/after whole-record hashes and export hashes, changed-key inventory, first failed-run artifact hashes and full count dictionaries are **pinned in** `docs/audits/extractor-reviewed-changes-candidate12.json`, SHA-256 `935fe08ed5d4764e7b3fde9e7a3c0179260832d73a97158d4078d4522ac8d235`. Original oracle and capture files were not changed. The review covers FUDAM, Gold Mountain, co-op station affiliations, current geography vs awards and coffee grades, complete literal sensory descriptions, date labels and milk-qualified negative boundaries. A harmless single case reordered only the available-fields array and retained exactly the same underlying field values.

Under the existing nonwaivable loss and source-integrity contract, this review **authorizes a new exact-head replay**, not a declaration of PASS: the workflow now specifies the reviewed JSON path and exact SHA-256. The second runner must independently verify all 24 case/output/export hash and source quote bindings and re-execute all 603 against unchanged archives; any new/unreviewed delta or missing secure input fails closed. C12 remains **TESTING** and PR121 stays unmerged until that actual replay and all applicable CI passes. No member/production/provider writes, cost, API key, grant or publication.
