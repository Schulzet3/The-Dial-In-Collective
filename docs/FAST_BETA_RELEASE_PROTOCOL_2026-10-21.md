# Fast beta release protocol — 2026-10-21

## What actually improved
- The user explicitly approved two production SQL migrations and one coordinated tested Netlify release. Do NOT request publication consent again. The two migrations are APPLIED in production and independently read back, with 22 shots, 22 notes and five beta members preserved.
- Backup handling fixed: for GitHub Actions download_workflow_artifact, pass the returned file_uri.file_id STRING to Google Drive upload_file(file_uri=...). Verified private owner-only Drive copy 1_qP5KuE_3MRU-oYYPL8fUbyfv6htL0ly, 1,190,308 bytes, SHA256 1a1163504592d55088bfd26acb0bf57db67f61a663670ad119c2d0e4902f5069. No additional backup needed while latest covered user data has not changed; the archive was not independently restored.
- Tests for exact app source c6976b1fc86ed5e6b38c0c38831950fca017b3a4 already passed: 487/487 Node, isolated SQL, mobile/cloud UI and continuity. Reuse them if no source changes. Do not repeat historical owner browser QA as a precondition to deployment.

## The remaining one-time provider configuration barrier
- Frontend STILL UNPUBLISHED. Netlify current READY is 6ad7be20bf672d5c8936f19a at old SHA e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60. Connected Netlify plugin cannot publish or change/read the production Git branch setting.
- Fail-closed build guard only allows release/production, which does not exist in GitHub. The main manual controller is inert because GitHub private Free cannot enforce required protected branch checks; do not set falsely verified flags or bypass via development marker, CLI or build hook. Netlify credit balance is owner-managed and unknown through plugin; no separate purchase/top-up.
- One-time next action using a logged-in Netlify dashboard in ChatGPT Work or an authorized operator: verify production Git branch, examine risk/cost of switching to dedicated release/production, and implement a Free/private-compatible controlled single-use path after specific scope and residual-risk acceptance. Do not cause a spare deploy while changing configuration. Provider setting change is NOT claimed complete here.

## Future releases: one approval, one transaction, one readback
1. Pre-approval: bundle and test all code to exact SHA, record approved scope, prepare encrypted/offsite backup (reuse verified recent copy if current and covering last writes). Prepare unique bounded grant, do not consume or publish.
2. When owner approves: create exact SHA-bound one-use release grant, 15-credit estimated ceiling, expiry and branch, WITHOUT asking again. Only named production SQL/Edge/provider changes are permitted; read actual live state once.
3. Serialized release controller compares exact source, immutable grant, advisory GitHub CI (private Free limitations acknowledged), latest tested backup, and performs one non-force Git release-branch claim. Reject repeated source/grant or concurrent pushes. Only release/production may trigger Netlify production.
4. Independently read actual READY/current Netlify SHA and verify source; run limited live auth/privacy/API/shell and data-count smoke; record real device acceptance separately, with no synthetic claims. No extra test-driven deployments or unauthorized failed-build retry.

## Acceptance
- Target >=10x fewer manual intervention steps after the one-time release-source setup; MEASURE actual approval-to-READY latency before claiming improvement.
- Zero duplicate Netlify builds for a single approval, no loss of shots/offline data, no GitHub paid upgrade or public repo, no weakening locked RLS or manual-approval policy.
- Do not represent this runbook as executable automation or a published deployment. Issue #38 stays open until provider and real publication checks pass.
