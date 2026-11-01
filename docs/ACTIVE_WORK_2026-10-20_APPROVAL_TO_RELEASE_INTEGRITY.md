# Main operations active checkpoint

## October 23 UTC / October 22 MDT: verified reconciliation

Read [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md), main AGENTS, actual branch/provider state and the authoritative application CURRENT_STATUS. The complete prior checkpoint is preserved at [exact archive](archive/2026-10-23-operations/ACTIVE_WORK.previous.md).

PR95's weekly source-consistency repair merged at `314ccf362dacba660e3b5a5236bb1bde2878d6e3`. Exact candidate CI `39898590290` and post-merge CI `39898695303` succeeded. All three weekly suites share one immutable development SHA. Daily 08:00 UTC backup and Sunday 08:00 UTC regression schedules remain; future natural executions are not claimed.

Current README and journal use the actual published `f97b8f30` source, matching backup pin and schema v4. Notification metadata is an unresolved discrepancy, not proof of disabled global settings; the owner's prior enabled Push/Email proof remains accepted and no reconfirmation is needed.

This checkpoint is documentation-only. No publication or production mutation; consumed release request, backup request, nightly workflow and backup scripts remain untouched. #93 is still READY and unpublished. The application audit continues through PR94. [Operations receipt](audits/2026-10-23-operations-reconciliation-receipt.json).

## November 1, 2026 UTC — Issue #330 published-source recovery pin correction (main ops, no application release)

Owner-authorized operations-only fix: `main` nightly `backup-app-source` pin corrected from historical 05cf9eb156f63110cd434034ec3914a1e92b76d3 to independently verified Netlify READY/current 42eb45aab12d1a47fe96a3ebe8a1f36b3913b5f7. Source/release evidence, exact test outcome and follow-up are recorded in [operations journal](OPS_RELEASE_CONTROLLER_WORK_JOURNAL_2026-10-21.md) and [Issue #330](https://github.com/Schulzet3/The-Dial-In-Collective/issues/330). No app publication or private member changes. At source-preparation time, CI and post-merge backup-run receipts remain pending; do not call them PASS prematurely.
