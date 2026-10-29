# The Dial In Collective: current operating guide

This is the active guide, reconciled October 23, 2026 UTC / October 22 MDT. The exact previous guide is preserved at `docs/archive/2026-10-23-reconciliation/AGENTS.previous.md`; its dated superseded gates are history, not instructions to repeat them.

## Recover before changing anything

GitHub `Schulzet3/The-Dial-In-Collective` is authoritative. Recover actual branch SHAs, interrupted work, open issues/PRs, applicable CI and actual Netlify published state. Read the active checkpoint, `docs/workstreams/README.md` and the relevant scoped journal, `docs/CURRENT_STATUS.md`, Master Specification, Decision Ledger, approval coverage and `docs/RELEASE_QUEUE.json`. Do not infer current state from an old chat or a stale historical paragraph.

The authoritative application records are on `development/backend-foundation`. `main` owns operations/backups; `release/production` is the only publication branch. Do not merge application work into main or move production merely to erase ahead/behind counts. Keep the repository private on GitHub Free. CI and branch protections are advisory, not enforcement against privileged direct writes.

Canonical current records: [Current Status](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/CURRENT_STATUS.md), [Master Specification](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md), [Decision Ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json). The original baseline remains immutable; later explicit scoped owner supersessions govern. A brainstorm, deferred proposal or old unchecked list is not new approval.

## Development means completed, tested, integrated work

A build/fix/update/implement request authorizes all feasible in-scope investigation, implementation, debugging, testing, repair, safe integration and queue preparation. Make routine technical decisions. Ask one essential product question only when truly necessary; do not repeat answered questions or routine approval requests. Development never authorizes publication.

Prioritize reliable, polished Log Shot -> Rate -> Recommendation. Preserve approved behavior, credentials, permissions, privacy, original shots, notes, offline outboxes, Community contributions, receipts, versions and history. Do not resolve an Open product choice by assumption or silently undo a Locked choice. A real safety or access blocker must be recorded precisely while all remaining safe work continues.

Use risk-appropriate Node 22, lint/build, browser/mobile, visual, offline, SQL, privacy and integration tests. Reuse valid unchanged evidence; do not repeat expensive unrelated suites. A failed check means investigate, fix, retest and continue, not stop at reporting it. Never label unperformed browser/device/provider checks PASSED. Owner physical-device testing is optional, not a release gate.

Every code/test/CI commit requires a same-commit update to the central active checkpoint OR an indexed `docs/workstreams/issue-N.md`, `ops-*.md` or `release-*.md` journal under the existing scoped-journal policy. Record authority, paths, failures, repairs, exact source, test scope and next action. Ordinary commits use `[skip netlify]`. Integrate with non-force Git and read back the merged SHA and applicable exact-source checks. After an uncertain write inspect actual state before retrying; never duplicate an ambiguous mutation.

## Proactive issue ownership and failure recovery

Treat "get Issue N closed" as authorization for all feasible development needed for its approved scope. Own recovery, prerequisite/dependency tracing, design, implementation, risk-proportionate testing, diagnosis, repairs, retesting, non-force integration, release-queue evidence and GitHub issue reconciliation. Act on approved work and offer a scope-preserving alternate acceptance method when direct evidence is unavailable; do not silently waive Locked product behavior, split work to obscure incomplete dependencies, or classify a test as PASSED unless its actual conditions were exercised. Ask only for a genuine missing owner product decision, out-of-scope irreversible action, external mandatory permission, or separately required production publication.

Do not stop at "test failed" or "CI pending." Diagnose/fix/retest within the current authorized work; only report a failure after beginning corrective action, with the practical cause, verified state and next blocker. Record interrupted or longer-running work in the issue/work journal and check actual CI/provider state before retries. Reuse passing evidence instead of rerunning expensive suites. Do not promise background execution that is not actually scheduled. Notify the owner when checks finish through available configured monitoring; the ChatGPT CI completion watch operates hourly (its maximum supported cadence), so it is not instantaneous. The owner should need only to name the issue. Keep concise updates: completed, verified, READY, blocked by a real constraint, and actually DEPLOYED. Do not publish on a development-only instruction.

## Queue and one-command release boundary

Maintain `docs/RELEASE_QUEUE.json`. READY means completed code, passing applicable tests, safe integration, exact-source evidence and no scoped blockers. Otherwise use IN_PROGRESS, TESTING or BLOCKED with a verified reason. An open PR or green lint alone is not completion. Accumulate independent READY work without publishing.

One owner publish/deploy/release-queue instruction authorizes one selected READY batch. A named feature includes only that READY feature and necessary approved dependencies. Prepare the exact batch/readiness report, combined tests and preflight; create a unique source-bound one-use release record; execute only authorized operations and one serialized non-force publication; independently verify Netlify READY/current SHA, affected behavior and accessible data integrity; record receipts and mark only delivered items DEPLOYED.

The report is not another approval request. Necessary in-scope frontend/backend/named SQL/Edge/Auth/provider operations are included in that scoped release, not separate routine consent loops. Mandatory platform permission prompts remain external. No release instruction authorizes unrelated irreversible deletion, arbitrary private member-data changes, purchases, plan changes or future publications. Keep single-use claims, exact-source CI, authentication, permissions, recovery evidence and production readback.

## Backups, schedules and credits

Verify actual scheduled configuration: encrypted backups daily at 08:00 UTC and comprehensive regression each Sunday at 08:00 UTC. These are fixed UTC, not fixed Denver wall-clock hours. Verify actual execution and offsite delivery separately from configured schedules or push-only smoke tests. Store every offsite encrypted backup only as a direct child of the owner-private Google Drive folder DIC Automated Encrypted Backups (ID 1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf). Never save backups in My Drive root or the old nested The Dial In Collective Backups folder (ID 1opb3JySDaNVaP0t9ocpNeXm2Kh23jQhv); check exact parent and existing run/artifact identities before transfer to prevent duplicates. Pin backup application source to the actual published release, not an unshipped development tip. Reuse valid restore evidence. Take an extra verified encrypted backup only before potentially destructive database operations; arrange it automatically within an authorized release. Stop destructive work when required verified recovery evidence is absent.

Netlify credits are the owner's responsibility. No credit-balance checks, screenshots, minimum-balance/freshness/plan evidence, credit caps or billing records are release gates. Report an actual provider quota refusal if one occurs. Never buy credits, recharge or change paid plans without separate express permission.

## Continuity and reporting

Keep issues, journal, CURRENT_STATUS, approval coverage and release queue consistent. Preserve historical evidence without presenting superseded rules as active. Consolidation transfers every distinct residual criterion to a named surviving tracker; it does not make unperformed tests pass. Distinguish implementation, verification, source READY and actual DEPLOYED.

For lasting changes to workflow/tool/branch/schedule/approval/communication rules, synchronize the repository Project Instructions copy and provide exact paste-ready replacement text; only the owner can change ChatGPT Project Settings. Routine features and correction of stale documentation are not new instructions proposals. Current copy: `docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md`.
