# Reading the first Candidate 12 changes without replaying the corpus

scripts/audit/coffee-reviewed-change-forensics.py is a read-only GitHub Actions evidence reader. It does not generate an approval manifest. It downloads only one explicitly pinned failed Candidate 12 artifact from this repository using the existing read-only GitHub token and GH CLI. It does not fetch roaster URLs, extract archives, run archived code, or change repository refs.

Run its prepared offline failure controls with:

    /usr/bin/python3 scripts/audit/coffee-reviewed-change-forensics.py --self-test

Actual hosted test results must be recorded separately. The presence of the controls is not a passing execution claim.

## Future config after the actual first changed full run

Do not fill these fields from a proposed runtime, guessed run ID, or a partial test. First retrieve the actual completed failed frozen workflow's metadata, job summary, final artifact-manifest hash, and uploaded artifact ZIP digest. Root must independently authenticate those GitHub records before executing this reader.

The config contains exactly these keys:

| Key | Required source |
|---|---|
| schema_version | Integer 1 |
| type | candidate12_frozen_change_forensics |
| repository | Schulzet3/The-Dial-In-Collective |
| candidate | Integer 12 |
| head_sha | Actual full failed-run source commit |
| source_tree | Exact source_tree from the actual full-run summary |
| runtime_fingerprint | Exact measured runtime_fingerprint from the actual full-run summary |
| run_id | Actual positive GitHub run ID |
| run_attempt | Actual positive attempt |
| artifact_id | Actual uploaded artifact ID |
| artifact_bytes | Actual exact ZIP size |
| artifact_sha256 | Independently retrieved SHA-256 of the exact artifact ZIP |
| artifact_name | dic-frozen603-candidate12-RUN-ATTEMPT |
| artifact_manifest | Exact {file, bytes, sha256} from the final artifact-manifest receipt |
| members | The seven exact raw-result descriptors from summary.artifacts |

The seven members keys are replay, comparison, retention, report, receipt, review_material, and actual_exports. Preserve each exact file, bytes and sha256 object. The config SHA-256 is pinned separately in the invoking workflow command:

    /usr/bin/python3 scripts/audit/coffee-reviewed-change-forensics.py \
      --config PATH_TO_EXACT_CONFIG \
      --config-sha256 EXACT_CONFIG_SHA256

No executable config or URLs are accepted. Config size is capped at 64 KiB. The artifact must belong to the same repository, the exact PR branch, commit, run and attempt, and the existing frozen workflow. It must be completed with FAILURE, with an actual unapproved FAIL summary and all five benchmark stages completed successfully.

## Evidence verification

The reader validates the ZIP size/digest, safe unique member inventory, original manifest, every selected member hash, all 603 original and current case identities, the measured 32-file runtime fingerprint, unchanged original scorer/harness/exporter hashes, frozen oracle/archive bindings and original C8 artifact hashes.

It independently recounts both score dictionaries from scorer records, recomputes the entire case inventory and every changed whole-case hash excluding only elapsed_ms, verifies every actual current export file against the recorded snapshot/Blob receipt, and checks the offline helper's all-603 result. It independently computes prior exact canonical and full-retention losses without suppressing them.

It then checks the source-bound HTML report's original-source identities, 603 cases and 1,197 capture metadata records. No original raw capture body is present in or extracted from the artifact.

## Log record kinds

- forensic_reader_identity identifies the exact reader script and config hashes.
- candidate12_artifact_identity identifies the authenticated historical source/run/artifact.
- candidate12_recounted_summary records actual counts, every changed case ID, current export fidelity, C8-equal/changed exports, losses and blockers.
- exact_review_material preserves the original review-material.json bytes as numbered base64 chunks, with its exact length and SHA-256. Decode all chunks in index order and verify the hash before constructing a separately reviewed manifest.
- candidate12_changed_case provides complete changed field/call values, explicit absent fields, ordered source-fact differences, original capture filenames/hashes/URLs, original canonical source quotes, strict comparison differences and retention-status changes.
- candidate12_forensics_complete records evidence projection completeness. It never marks a source review approved.

The reader avoids dumping whole structured product/media JSON facts. If such a fact changed, it emits its hash and bounded metadata, explicitly identifies the missing targeted review, and exits unsuccessfully. It never silently treats omitted evidence as inspected. Unexpected sensitive patterns, excessive content, incomplete evidence, unknown identities, stale pins, changed expected values or mismatched records also fail closed. Exact public values are emitted without silent clipping.

Bounds are 64 MiB compressed download, 2,048 ZIP entries, 256 MiB total uncompressed data, 64 MiB per member, 180,000 bytes per log event and 4 MiB across emitted evidence. These fit the measured previous artifact. A failure at a bound requires an explicit, scoped follow-up; it is not permission to accept partial review.

The first-run references later placed in an approval manifest must come from this actual authenticated evidence. The separate frozen runner still requires independent source review, exact manifest pins, zero existing exact/full-retention losses, all current exports and offline validation on the full rerun.
