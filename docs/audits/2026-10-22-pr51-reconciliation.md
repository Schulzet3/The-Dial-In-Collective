# PR #51 focused reconciliation review

Baseline: development/backend-foundation `5cf07be14b64449954a71f1e296d332b160d4032`.
PR #51 source: `6183ba170f64f1c3f8d8d8e86725eee7f1137ac0`.
Review and selective source reconciliation under Issue73; no provider or release writes. The original PR branch is preserved.

## Recommended disposition

Close PR #51 as superseded by the current #54 workflow implementation plus a narrow current-source reporting repair, **not as wholly merged**. Preserve its branch/commits. Record each unique helper as intentionally not integrated or still unimplemented, and retain #50 for measured full-cycle performance / independent provider integration where still missing.

| PR #51 area | Current-source evidence | Disposition |
| --- | --- | --- |
| npm/Chromium caching, repeated full tests | #54 current CI and `tests/ci-optimization.test.mjs`; `measure-stage.mjs` records actual per-stage timing | Already superseded by measured current implementation; do not overwrite current CI. |
| Additional fast-feedback.yml + change-impact.mjs | Current package has optional `check:fast`, targeted `test:cloud`, full validate suite | Do not add another auto-trigger workflow. PR classifier routes virtually all source outside two admin files to another full Node run; this adds duplication rather than resolving an active defect. |
| Second release-dossier.mjs | Current `source-release-dossier.mjs` deliberately always HOLD; existing pure controller validators enforce current release semantics | Do not introduce a parallel framework. PR dossier uses workflow-name checks and caller-provided booleans; current contract uses five exact job identifiers and separate live evidence. |
| postrelease-receipt.mjs | Current `docs/RELEASE_POSTFLIGHT_PROCEDURE_2026-10-21.md` covers provider Netlify + SQL/Edge + grants + member evidence; controller persists actual claims | Pure helper is not connected to provider retrieval; its booleans cannot establish independent verification. Keep absent and do not claim authenticated automation implemented. |
| compact recoveryIndex | Current AGENTS, active journal/status and reconciliation receipts remain authoritative | Do not add another derived status authority; compact summary can be part of current status without unused code. |
| stageDurations arithmetic | Current `measure-stage.mjs` captures CI subprocess times; end-to-end comparison remains explicitly unverified | Keep the end-to-end evidence gap in #50. An unconnected timestamp subtraction helper does not establish measured improvement. |
| PR-only tests | Assert PR-only modules and stale workflow syntax | Do not copy. Existing current CI tests plus focused actual-defect regression cover selected implementation. |

## Confirmed current defect and prepared fix

`buildSourceDossier` originally offered an `available_exact_source_grant_id` when owner_approved=true, max_publications=1, source matched, and ID was not consumed. It did not check status, expiry, future approval, valid scope/provenance, consumption-ledger validity, or whether the same source had been consumed under another grant ID.

This is a misleading **read-only report**, not proof of a release bypass: its output was still HOLD and the actual release controller already rejects these cases.

Candidate fix:
- Import/reuse `planSingleUseClaim` from existing `one-use-claim.mjs` solely for pure validation.
- Do not persist the plan or mutate grants/consumption.
- Allow injected `nowIso` for deterministic tests; real callers default to current time.
- Retain every existing HOLD / external-provider / device-evidence boundary.
- No extra operational gate, workflow, product choice or provider call.

Integrated paths: `scripts/audit/source-release-dossier.mjs` and `tests/source-release-dossier.test.mjs`. The existing controller module is reused unchanged.

## Verification

New dossier regressions produced3 PASS/2 FAIL on original source, reproducing expired-grant and previously-consumed-source false availability. The corrected dossier passes5/5 locally. Combined with the7 actual-handler draft-context/dose regressions,12/12 targeted tests pass without skips. Integrated approval coverage passes44 owner decisions/14 source contracts. Exact GitHub Node22/browser/disconnected SQL CI remains required before integration.

The local sandbox denies shell subprocesses (`spawnSync ... EPERM`), so its default full Node test run is not recorded as an overall PASS. Required hosted CI must establish the complete source result; no test assertion or gate is waived.

## Sources

- https://github.com/Schulzet3/The-Dial-In-Collective/pull/51
- https://github.com/Schulzet3/The-Dial-In-Collective/pull/54
- https://github.com/Schulzet3/The-Dial-In-Collective/blob/5cf07be14b64449954a71f1e296d332b160d4032/scripts/audit/source-release-dossier.mjs
- https://github.com/Schulzet3/The-Dial-In-Collective/blob/5cf07be14b64449954a71f1e296d332b160d4032/scripts/release/one-use-claim.mjs
- https://github.com/Schulzet3/The-Dial-In-Collective/blob/5cf07be14b64449954a71f1e296d332b160d4032/docs/OPTIMIZED_DEVELOPMENT_AND_RELEASE_WORKFLOW_2026-10-21.md
- https://github.com/Schulzet3/The-Dial-In-Collective/blob/5cf07be14b64449954a71f1e296d332b160d4032/docs/RELEASE_POSTFLIGHT_PROCEDURE_2026-10-21.md

