# Main operations journal

## October 23 UTC / October 22 MDT: verified Issue70 integration

The owner authorized the current cross-system audit and safe confirmed source/test/CI repairs, not website publication or production data changes.

PR95 is merged at `314ccf362dacba660e3b5a5236bb1bde2878d6e3`. Tested source `81b56a47d7c5d4af75f8217a55ae8f5fb6a799df` passed main acceptance run `39898590290`. Independent push-run readback confirms exact merged source passed `39898695303`; its tree is the tested tree `5b80680d7fa360aec9035d1f956c6d4464afe4eb`.

The weekly regression now resolves development once and supplies its immutable SHA to Node/build, database and mobile/offline jobs. The database job explicitly uses Node22. Sunday 08:00 UTC, read-only permissions, no persisted credentials, no cancellation and all existing suites remain. Six policy/negative regressions and local YAML/dependency checks passed; main CI also passed the existing inert release controls and isolated synthetic snapshot checks. This is not evidence that the future Sunday schedule already executed.

README and current journals now reflect the actual published release and schema v4 rather than stale PR76/pin-approval/v2 instructions. Exact prior README, active checkpoint, operations journal and weekly workflow are archived without alteration.

### Notification interpretation corrected

The initial audit overinterpreted false task-level notification flags. Issue28 already records that same discrepancy against repeatedly accepted owner proof of enabled global Tasks Push and Email. Those flags do not establish disabled settings, a changed configuration or failed delivery. Preserve prior owner and Apps Script alert/trigger evidence; do not ask for another screenshot, settings check or reconfirmation. Natural condition-alert receipt remains unverified. No task or provider setting was changed, no duplicate monitor created and no new release gate introduced.

### Preserved boundaries and evidence

Actual published source remains `f97b8f30c25f6d4ef30c5d79d12daf4fb0670e2f`, Netlify READY/current `6adabcecd4a2a68e94cdc09a`. The nightly backup source pin already agrees. Scheduled ciphertext artifact `12434555176` matches private Drive SHA256 `bd575a9716ea0b76225827f0b33a036df10a49b62b86ecee5faa556ada5fdb0d`; no new export, decryption or restore occurred.

This follow-up is documentation-only. The consumed RELEASE_REQUEST, BACKUP_REQUEST, nightly workflow, backup scripts, release code/grants, provider settings and production branch remain unchanged. #93 remains READY, not deployed. Application reconciliation is PR94; its final integration is independently verified there. The current receipt is `docs/audits/2026-10-23-operations-reconciliation-receipt.json`.

Historical operations journal: [exact archive](archive/2026-10-23-operations/OPS_JOURNAL.previous.md).
