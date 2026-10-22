# The Dial In Collective

**Current application and project documentation are on [development/backend-foundation](https://github.com/Schulzet3/The-Dial-In-Collective/tree/development/backend-foundation).** This default `main` branch holds encrypted-backup and isolated-recovery operations; it is not the current app source.

Start here:

1. [Active application work journal](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md): read first for incomplete attempts and current blockers.
2. [Current Status](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/CURRENT_STATUS.md): latest verified milestones, next action, open questions and provider-access limits.
3. [Master Specification](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md) and [Decision Ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json): canonical requirements, preserved originals and explicit supersessions.
4. [Documentation Index](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/README.md) and [AGENTS](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/AGENTS.md): evidence navigation and continuation rules.

When continuing the project, review GitHub's active development branch and its active journal before Current Status. Preserve all Locked decisions. Ask product questions one at a time. Never treat an old checklist or an Open proposal as a new requirement or current completion state.

## Current operations — October 22, 2026

Verified production is Netlify READY/current deploy `6ad968689f42fbe8e871e151`, release `eee687dd4d7fc19493139bc106e63c16849ac91d` on `release/production`. [Native Actions run 39706556610](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39706556610) successfully advanced the release branch for the already consumed grant `DIC-20261021-ALL-PENDING-02`; separate provider readback confirms publication. The older failed native attempt remains historical. This receipt does not authorize another release.

**Open recovery correction:** the nightly app-source pin still points to prior release `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`. A separate one-line candidate updates it to the verified published release after scoped backup-operation authorization; changing that main path triggers an existing live-read encrypted backup. No backup workflow, release request or provider is changed by this documentation reconciliation.

The [operations journal](docs/OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md) records the current audit repairs and actual CI/smoke outcomes. The [schema-2 evidence guide](docs/RELEASE_REQUEST_SCHEMA_V2.md) governs new release requests. The [application audit](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/audits/2026-10-21-three-pass-audit.md) records three-pass scope, findings, source repairs and unfinished requests.

Existing main backup/recovery path triggers perform a live-read encrypted backup and isolated restore; their results need independent readback. A push-run backup is not a scheduled offsite receipt. Preserve all prior archives, private-Free policy and member data.

## Historical navigation and provider observations (superseded)

Documentation consolidation commit: [c1e8d3175be836b4a7fc92d731729583e7ebe55d](https://github.com/Schulzet3/The-Dial-In-Collective/commit/c1e8d3175be836b4a7fc92d731729583e7ebe55d). Its commit parent/tree, all 11 changed files and exact content/blob hashes, expected branch ref, and documentation-only diff were read back and verified from GitHub. The original ledger's 79 Locked and 20 Open entries plus all eight GitHub ledger objects were preserved. "Verified" describes these checks, not a commit signature.

**Historical continuity checkpoint:** **No deployment or production-data changes are part of this continuity work.** Existing backup workflows/scripts and the source pin to published app SHA `f08dfda99f46b25240cb8cc35c46d2c3c76344b8` remain untouched. Do not merge the app into main to update these links This paragraph refers to the October 17 documentation-only consolidation, before the owner's next release.

**Latest independently verified private-beta publication (October 18 UTC):** Netlify READY production deploy `6ad443189d070656c813ef63` published application commit `d8ced8f74c682466445ede58bfc45497b10c30ce` (seven roast tiers, URL extraction, one-click Autofill and final sweep). Supabase authenticated Edge preview v2 ACTIVE and owner-approved protected-coffee migration `dic_seven_roast_owner_data` version `20261018035732` applied and independently checked. The four Verified coffees and one private Pending Wuri match the owner's chosen tiers; all 15 preserved shots and the one community contribution remain. The Community browsing interface is still a placeholder and remains tracked by development issues #9 and #11.

**Current main backup source pin (October 19, 20:40 UTC):** `main:.github/workflows/nightly-backup.yml` references exact Netlify READY/current production application source `8769508fc234f4fb63f89920b5a936d259936abf` (deploy `6ad6801b20c067ef4f2e3729`, deterministic-only roaster extractor). Backup workflow script, encryption, trigger, private GitHub artifact retention and Google Drive courier remain unchanged. A smoke push can test this pin, but the courier forwards scheduled/manually dispatched runs, not push-only CI smoke runs. The first new scheduled offsite encrypted archive is not yet verified. Preserve older encrypted archives; do not merge the app branch into main. Read [development Current Status](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/CURRENT_STATUS.md) for current release evidence and open acceptance work.
