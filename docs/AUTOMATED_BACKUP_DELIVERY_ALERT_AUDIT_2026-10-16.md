# DIC scheduled backup / Drive courier / failure-alert verification — 2026-10-16

**Summary:** PASS: two sequential scheduled encrypted GitHub backup artifacts were automatically generated and identical ciphertext files appeared in the script-owned private Google Drive folder. Exact byte SHA-256 checks passed. **NOT VERIFIED:** actual Apps Script execution logs, failure-alert branch, receipt by the configured recipient, alert deduplication or overdue-backup behavior.

## Scheduled GitHub export (read-only provider evidence)

The `.github/workflows/nightly-backup.yml` file on `main` contains `on.schedule: cron '23 9 * * *'` plus `workflow_dispatch`; it uses `actions/upload-artifact@v7`, encrypted `backup.age` only, with GitHub artifact retention set to 30 days. Schedule times are nominal; actual observed dispatch occurred later, so alert thresholds should tolerate provider latency.

- October 15: [scheduled run 38749488029](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38749488029), event=`schedule`, success, started 2026-10-15 14:13:32 UTC. Artifact `11980516369` (`dic-encrypted-nightly-38749488029`), 375651 bytes, created 14:14:24 UTC, SHA-256 `0181d3a25c21446521fa2fbc161d0cf24e418dc53b041fa6f8c64fa9917ae5a5`.
- October 16: [scheduled run 38912535489](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38912535489), event=`schedule`, success, started 2026-10-16 14:02:17 UTC. Artifact `12051176137` (`dic-encrypted-nightly-38912535489`), 380078 bytes, created 14:03:21 UTC, SHA-256 `675e97225ee39924cc3eb0c1f53060fde5e1dd9813b0250c9e2a9da642dbc092`.

## Verified offsite copies

Private owner-only `DIC Automated Encrypted Backups` folder: https://drive.google.com/drive/folders/1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf (not shared; permissions previously independently read).

- October 15: [Drive encrypted copy](https://drive.google.com/file/d/1HQ6v2QQ5iE7d1ZeTwEw0d00C63SAZb3E/view), `dic-nightly-11980516369.zip`, created 15:20:16 UTC, 375651 bytes. Independently downloaded directly from Drive to the verification runtime; SHA-256 **exactly equals** scheduled GitHub artifact `0181d3a25c21446521fa2fbc161d0cf24e418dc53b041fa6f8c64fa9917ae5a5`. `unzip -t` PASS: sole `backup.age` entry, no CRC error.
- October 16: [Drive encrypted copy](https://drive.google.com/file/d/196Q6ijQAvcy7X75TSgTNbE39m9oPzB87/view), `dic-nightly-12051176137.zip`, created 15:20:36 UTC, 380078 bytes. Independently downloaded directly from Drive to the verification runtime; SHA-256 **exactly equals** scheduled GitHub artifact `675e97225ee39924cc3eb0c1f53060fde5e1dd9813b0250c9e2a9da642dbc092`. `unzip -t` PASS: sole `backup.age` entry, no CRC error.
- Separate October 16 post-publication archive `12056578138` was manually uploaded with owner approval and exactly restored in an isolated test. Do **not** misattribute that manual copy as courier proof.

The arrival dates/times and artifact identity across two consecutive `schedule` events strongly support automated courier operation, but no direct Apps Script execution logs were available through connected tools, so the precise uploader identity/call stack remains unproven.

## Alerts and delivery: verification gap

Historical owner-driven setup shows:
- Standalone Google Apps Script project `The Dial In Collective Private Backups` has `setupPrivateBackupFolder`, `syncPrivateBackups`, `installPrivateBackupPoller`; owner reported the poller installed without errors, intended to check every **three hours** and monitor overdue backups.
- `DIC_ALERT_EMAIL` was configured in Apps Script private Script Properties, independently observed then by screenshot in earlier chat. The value is not replicated in code here; private properties/credentials must not be shared.
- The connected Gmail search did not provide a verifiable view into the configured personal alert inbox. Neither a genuine failure email nor a synthetic alert issued by this script is evidenced.
- Google Apps Script source, live execution logs, and installed trigger metadata are not directly accessible through current Drive/GitHub/Gmail connector actions. No user-owned secret or backup was uploaded in this audit.
- No failure was intentionally induced: do not break the live backup workflow, revoke GitHub access token, or disable the Google trigger merely to elicit an alert.
- GitHub artifact retention (30 days) is configured. Drive-side cleanup/retention is **not demonstrated** from recent items; its implementation and execution need review.

**Next safe test:** Obtain a copy of `Code.gs` *source only* (without Script Properties, keys, recovery identities or tokens). Inspect the courier's actual failure-handler. Add or identify a one-time, no-production-failure test that invokes the exact handler with a clearly marked `TEST` message and, after user runs it in their existing Apps Script project, verify delivered alert in the intended inbox and record execution timestamp. Then review installed trigger and repeat-alert suppression, without altering the live GitHub/Supabase workflow.

**No production writes, deployment, or state changes were made by this verification.**
