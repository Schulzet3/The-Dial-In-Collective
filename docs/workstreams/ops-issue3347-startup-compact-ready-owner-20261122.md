# #3347 compact READY-owner projection test restoration fix [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=5012964b0c03b61ab34d8d34cdfcbe84eb75b06e preflight_blob_sha=3742fed0176c809b115320c698a0e8b1675b2d3e

Authority: owner five startup changes and #3347 source-only READY pre-validation. Prior exact main ops PR #3683 nonforce merged 103edc47858c7517469623fb31d9cc8507057330 with all four source/test/journal blobs matching tested PR head; merged main controller run 44988493683 SUCCESS. No Publish.

Source proof run 44988530684 strictly FAILED: "Startup test restoration lacks selected owner and mixed-file provenance" before any candidate ref could be created. Root cause is an internal API shape mismatch, NOT a feature test failure: planReadyOnlyCandidate intentionally returns compact ready_items {id,issue,title,merged_source_sha,scope_paths}, omitting state. The new focused startup helper incorrectly required selected.state==='READY', but the full authoritative queue record contains state and is already schema-validated.

Repair: require full queue item state==='READY' and exact equality to the compact selected item's issue, merged SHA and scoped path set; preserve all remaining exact parent/published/current test blob, mixed owner, pinned clean runtime and co-selected overlap checks. Tests now use the exact compact plan ready_items payload, not a more permissive artificial full object. No broad test omission, no imported member data, no deployed source change.

Existing separately frozen candidate ref release-candidates/ready3347-a7625f02b1667b9257d0, commit d505fb506c499f7a636d90f92242faa4242f5288, was created concurrently from OLD receipt 44988178583, before published-test restoration; its manifest retains zero of the two required original tests, and it must remain immutable historical evidence (no overwrite/force). Its candidate validate and other CI should be read as actually reported, NOT reused as PASS for corrected source. A later corrected candidate MUST use a new uniquely frozen source identity and exact five new CI jobs; do not run duplicate suites concurrently. Live development row remains TESTING.

Changed only scripts/release/ready-only-candidate.mjs, tests/ready-only-candidate.test.mjs, and this same-commit scoped ops journal. PR head CI and merged controller CI required; then rerun one read-only source proof. No grant, release request, Netlify, SQL/Auth/member/provider or backup write.
