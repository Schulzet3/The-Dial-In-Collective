# Default-branch single-use release controller — installation history

## Current operating state — October 22, 2026

The release controller and Netlify routing are installed. [Native Actions run 39706556610](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39706556610) completed successfully, recording `GITHUB_REF_UPDATED_NETLIFY_UNVERIFIED` for release `eee687dd4d7fc19493139bc106e63c16849ac91d` and consumed grant `DIC-20261021-ALL-PENDING-02`. Separate current Netlify readback confirms READY/current deployment `6ad968689f42fbe8e871e151` at that exact release SHA. Native push acceptance is therefore verified for this completed release. The earlier supervised recovery remains historical; its unknown original transport cause does not negate the later successful native run. No new publication or future reliability guarantee follows from this receipt. GitHub Free/private checks remain advisory. Current remaining work and exact verification status are in the [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md).

New manual requests require `release_evidence_json` under [schema 2](RELEASE_REQUEST_SCHEMA_V2.md), in addition to the unique owner grant and tested source. Historical request files and consumed approvals must not be replayed. The wording below records older installation checkpoints, including superseded inert/no-grant/provider-routing assumptions; it is not the present checklist.

## Historical installation evidence (preserved)


## Latest owner policy supersession — GitHub Free/private, NO upgrade or public visibility (October 20, 2026)

Owner explicitly declined GitHub Pro and making the repository public. Earlier checklist and prerequisite suggestions in this historical ops file are **SUPERSEDED**: **DO NOT ask the owner to buy Pro, change repository visibility, or set a fake private-branch-protection verification flag**. Source of truth is the active app-branch [Master Specification](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md), [Decision Ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json), and [GitHub Free/private operating plan](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/GITHUB_FREE_PRIVATE_CONTINUITY_AND_RELEASE_PLAN_2026-10-20.md).

The manual release controller on this unprotected `main` branch remains **INERT**. GitHub Actions testing is advisory on private GitHub Free; it does not prevent direct writer bypass. There are no grants or verified release readiness flags and Netlify still follows the prior development source; no owner authorization to deploy, switch Netlify branches, spend credits or change user data. Keep #38 OPEN and require separate owner acknowledgment of any future manual Free/private release procedure and its unavoidable risks.
**Installed in backup/operations branch `main` on 2026-10-20. INERT until owner configuration.**

The controlled GitHub Actions workflow `.github/workflows/dic-single-use-release.yml` is manual `workflow_dispatch` only, not activated on pushes, PRs, scheduled backups or routine work sessions. It requires exact inputs `release_id` and `tested_source_sha` and a matching explicit, expiring owner grant in the protected application branch.

**The configuration variables MUST ALL remain unset until independent verification:**
- `DIC_PRIVATE_BRANCH_PROTECTION_VERIFIED=YES`: private GitHub Pro-enabled `development/backend-foundation`, `main`, and dedicated release branch have appropriate required status/check and force-push prevention rules; no unapproved bypass.
- `DIC_NETLIFY_PRODUCTION_BRANCH_VERIFIED=release/production`: Netlify project actual Git-linked production branch has been switched from ongoing development to the exact dedicated release branch; release branch was initialized at actual current deployed production source safely.
- `DIC_RELEASE_CONTROLLER_VERIFIED=YES`: isolated successful Git ref race, grant validation and CI result tests verified; GitHub Actions permissions allow ONLY the intended non-force ref write and rejection on replay. Review how protection rules interact with the bot before setting.

**No owner release grant exists.** `docs/RELEASE_AUTHORIZATIONS.json` on development starts `grants: []`, consumed ledger `[]`; this workflow will fail closed if manually started now. Do NOT set any readiness variable merely to silence an error. Do NOT test by moving the real Netlify production branch or writing a release marker until owner expressly approves the cutover and controls are verified.

The release controller has NO Netlify API token, build hook or CLI deployment; it performs exactly one non-force remote Git push to `release/production` upon all checks passing. It cannot guarantee that a Netlify administrator won't manually redeploy the same commit; provider-side permissions and branch settings are separate safeguards.

**Source/test receipt:** last reviewed development code from `994a4d9f91e2475a96df42a46564c06e29f1c8d7`; GitHub Node/lint/build PASS `39518608025`, approval/continuity PASS `39518607963`. GitHub Pro/private branch rule and Netlify source changes are NOT independently available from current integration, and the current app stays untouched.

See app development documentation `docs/MASTER_SPECIFICATION.md`, `docs/APPROVAL_COVERAGE_MATRIX.json`, `docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md` and issue #38. Do NOT enable this controller or consider #38 closed before the owner's manual hosted settings are confirmed.

## Main-branch controller checks installed (October 20)
- Added `.github/workflows/release-controller-ci.yml` on EVERY main push and PR, with required job name `release-controller-validate`. It checks Node source syntax and runs four source-equivalent test modules copied from the reviewed development app branch, including a **real disposable bare-Git remote race**. Tests have no Netlify token, SQL credentials or production deploy calls. Manual release workflow remains separately inert and without any release grants.
- **GitHub admin blocker remains:** The main branch is `protected:false`, so this workflow is *not yet a mandatory required status*. Owner GitHub Pro/private branch rules and account settings must activate it. Do not claim #38 complete based on green CI alone.

## Final source sync and additional replay protection
- Refreshed default-main release controller from tested application source `b778d95d6ac5df4215ddca7428c656f6299460bd` to include the pinned minimum guarded source SHA and exact deployed production genesis SHA. A missing claim ledger after the initial genesis release is a HARD refusal, never silently reset to zero. New source must inherit the new Netlify release-only guard and be independently green.
- Updated main test `tests/controlled-release-runner.test.mjs` with non-genesis missing-ledger replay negative test. Dev Node/lint/build [run 39519263969](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39519263969) PASS, approval [39519263976](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39519263976) PASS. Main release-controller CI must rerun and pass on THIS default-branch commit. No manual dispatch, Netlify branch switch or source publication has been authorized.
