# Optional review of changed frozen outputs

This iteration is Candidate 12. The historical Candidate 11 run and its evidence remain unchanged; the existing PR and branch names remain intact.

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

- decision: source_supported_improvement.
- rationale: an explicit source-supported explanation of 20–4,000 characters.
- source_evidence: one to 32 unique original-source quote bindings.

Each source-evidence object has exactly capture_id, capture_file, capture_sha256, capture_source_url, quote, and quote_basis. It must refer to the exact case's original frozen capture and original hash-bound packet. A literal_capture quote must occur byte-for-byte in that capture. A frozen_oracle quote must occur with the exact capture ID in the unchanged original oracle. The latter preserves original quoted evidence that may have normalized HTML layout; it does not fabricate a new raw-byte match. Quote size is bounded to 8,192 UTF-8 bytes. No source path may leave the original corpus or traverse a linked directory.

## Non-waivable checks and reporting

The runtime fingerprint is measured by the existing replay harness, then compared to both the workflow pin and approval. The complete original case/roaster/capture inventories and frozen assertion totals stay enforced. Previous canonical exact matches and fully retained supplementary assertions cannot be lost. All 603 actual current snapshot/Blob downloads must verify; all exports must pass offline validation without an attempted external operation.

The raw exporter and application exporter are unchanged. Its export_changed findings remain visible and are accepted only for the exact approved case/export hashes. Failures remain failures. No score rule or expected value is relaxed.

Receipts retain the measured actual_client_exports_equal number and add explicit export_verification counts for current snapshot/download fidelity, unchanged C8 exports, changed C8 exports and offline validation. Reports independently bind the reviewed whole-case hashes to the two actual replays before displaying approved changes. They do not call changed exports unchanged or infer deployment from source integration.

## Validation status

This implementation adds focused positive and adversarial runner/report controls. Source review and hosted execution must be recorded separately; preparation of this document or its tests does not establish a passing hosted run.
