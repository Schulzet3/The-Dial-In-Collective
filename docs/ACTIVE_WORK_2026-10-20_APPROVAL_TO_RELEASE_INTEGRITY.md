# Main operations active checkpoint

## October 23 UTC / October 22 MDT: verified reconciliation

Read [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md), main AGENTS, actual branch/provider state and the authoritative application CURRENT_STATUS. The complete prior checkpoint is preserved at [exact archive](archive/2026-10-23-operations/ACTIVE_WORK.previous.md).

PR95's weekly source-consistency repair merged at `314ccf362dacba660e3b5a5236bb1bde2878d6e3`. Exact candidate CI `39898590290` and post-merge CI `39898695303` succeeded. All three weekly suites share one immutable development SHA. Daily 08:00 UTC backup and Sunday 08:00 UTC regression schedules remain; future natural executions are not claimed.

Current README and journal use the actual published `f97b8f30` source, matching backup pin and schema v4. Notification metadata is an unresolved discrepancy, not proof of disabled global settings; the owner's prior enabled Push/Email proof remains accepted and no reconfirmation is needed.

This checkpoint is documentation-only. No publication or production mutation; consumed release request, backup request, nightly workflow and backup scripts remain untouched. #93 is still READY and unpublished. The application audit continues through PR94. [Operations receipt](audits/2026-10-23-operations-reconciliation-receipt.json).

## November 1, 2026 UTC — Issue #330 published-source recovery pin correction (main ops, no application release)

Owner-authorized operations-only fix: `main` nightly `backup-app-source` pin corrected from historical 05cf9eb156f63110cd434034ec3914a1e92b76d3 to independently verified Netlify READY/current 42eb45aab12d1a47fe96a3ebe8a1f36b3913b5f7. Source/release evidence, exact test outcome and follow-up are recorded in [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md) and [Issue #330](https://github.com/Schulzet3/The-Dial-In-Collective/issues/330). No app publication or private member changes. At source-preparation time, CI and post-merge backup-run receipts remain pending; do not call them PASS prematurely.

## 2026-11-01 UTC — Issue #332 late backup schedule mitigation

Owner-authorized safe fallback opportunities 08:17, 09:37, 12:17 UTC added beside untouched primary 08:00 cron, with ciphertext-artifact-verified duplicate guard (scheduled only, GitHub API fail-open) and dedicated Node CI tests on `main`. This is a mitigation of GitHub upstream scheduling delays, **not proof of punctuality**; inspect future actual GitHub schedule executions/offsite delivery separately. Do not deploy the app or modify production data. Full scope, test limitations and next verification in [main operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md) and [Issue #332](https://github.com/Schulzet3/The-Dial-In-Collective/issues/332).

## November 2, 2026 UTC — Issue #368 submillisecond snapshot coverage hardening

Source/test regression on `main` rejects snapshots that predate the latest PostgreSQL write by even 1 nanosecond; strict UTC calendar validation prevents rollover dates from passing backup recovery decisions. Exact-source hosted CI and nonforce merge must pass before this is VERIFIED. This is structural timestamp correctness only, **not** independently verified offsite decryption/restore, READY approval or Netlify publication. See [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md) and Issue #368. No deployment or provider/data writes.

## November 2, 2026 UTC — Issue #368 same-day cross-key backup dispatch dedup

Backup fallback now uses one atomic GitHub claim per UTC day, closing the race where different microsecond latest-write keys previously created independent claims. Later same-day requests fail closed for manual reconciliation; midnight cross-day and independently verified restore evidence remain outstanding. Exact PR/merged CI required. No backup dispatched, provider write or deployment. See [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md).

## November 2, 2026 UTC — Issue #368 CI artifact pagination and temp cleanup

GitHub artifact discovery now fails closed on truncated/missing/oversized API result inventories, preventing a false unique exact-source artifact selection. Certified retrieval cleans private downloaded containers even when identity validation fails, and refuses unsafe temporary directories. Tests and same-commit operations journal accompany this main-only safety fix. Hosted PR/merged-main CI pending. No production, backup or provider writes; release remains HOLD. See Issue #368.

## November 2, 2026 UTC — Issue #368 active backup run dedup hardening

The fallback now checks complete bounded GitHub active-run inventories for queued/waiting/pending/requested/in-progress backup jobs, including old and push-triggered runs, before any claim/dispatch. Incomplete API evidence fails closed. Same-commit tests/journal; exact hosted CI and nonforce merge required. Existing Git-connected production remains unchanged; no backup dispatch or provider/data writes. Same-archive restore and atomic provider compatibility remain unverified.

## November 2, 2026 — Issue #417 pending safe controller restoration
Nonpublishing main controller source+test candidate restores one Git-connected publisher and retains all exact-source authorization and READY gates. No production changes or claim. See OPS journal and #417.

## November 2 — Issue #417 bounded current published app recovery pin
Proposed nightly source checkout correction to verified Release14 SHA and removal of unnecessary workflow-file-only push backup trigger. Retains schedules, explicit backup requests, encryption and offsite settings. Requires exact PR and merged main CI; no new backup or deployment claimed. See OPS journal.

## November 2 UTC — Issue #423 encrypted offsite archive recovery implementation (BLOCKED real decrypt)
The actual Nov 1 private Drive ZIP byte hash matches scheduled GitHub artifact 13087632285; ZIP CRC, sole backup.age entry and age format verified. Original ciphertext is addressed only to the owner's offline SSH age identity; neither automatic decrypt nor saved-archive restore has been exercised. Manual-only Actions archived-restore workflow, offline network-disabled PostgreSQL restore script and focused negative/syntax policy tests are prepared without changing active daily backups, fresh-snapshot Sunday drill, Netlify or production. Genuine archived recovery requires dedicated automation-only GitHub managed secret and a FUTURE dual-recipient encrypted archive; do not request owner's personal key or mark PASS. See docs/backup-recovery-automation-20261102.md, Issue #423 and operations journal. Base main af9c913d05277b1c4b059e6165fcad6f146849bb; hosted CI pending.


## November 2 UTC — #423 optional dual-recipient recovery preparation
Daily age encryption is retained. A new dedicated automation-only identity in GitHub Actions secret DIC_ARCHIVE_AGE_IDENTITY can add a second PUBLIC recipient to future saved archives; the owner's offline key remains a recipient. Without that secret, existing owner-only backup behavior is preserved. Backup script edits no longer trigger duplicate exports on push; scheduled/backstop and explicit manual/backup-request remain. Real saved Drive ciphertext decryption and offline restored rows are NOT yet verified; see docs/backup-recovery-automation-20261102.md and Issue #423. No old archive/key deletion, production write or deployment.

## Nov 2 UTC — Issue #423 owner-approved existing SSH key in managed CI secret

Owner authorized using the personal existing SSH/age recovery key directly in encrypted GitHub Actions repository secret `DIC_ARCHIVE_AGE_IDENTITY`; this is a scoped exception to independent automation-only key custody, not permission for ChatGPT uploads or raw Git files. Ops main now validates native age/OpenSSH Ed25519 key noninteractively, skips duplicate recipient if it matches original public key, preserves dual recipient for unrelated keys, and fails unusable passphrase keys. The actual key, saved archive decryption and isolated row restore remain unverified until owner-side secret provisioning and an actual run. Historical archives and original offline key must remain intact. No publication or extra backup triggered; see docs/backup-recovery-automation-20261102.md and Issue #423.


## 2026-11-02 — #423 weekly archived-ciphertext restore automation in progress
Owner requires unattended GitHub Actions restores, not manual ChatGPT workflow dispatch. Stage weekly Tuesday 13:17 UTC source-bound isolated encrypted-archive restore; first archival test targets already independently verified Nov 1 private Drive/GitHub byte-identical ZIP. Future tests use recent GitHub scheduled ciphertext and MUST distinguish that from independent Drive delivery integrity. Owner-held Actions key was reported installed but not yet actually used in a passed archived-restore run. Existing daily encrypted backup, Sunday fresh snapshot recovery and courier remain unchanged; no Netlify publication or production DB writes. See operations journal and #423.
