# Autonomous task completion — owner-authorized operational tracking

Authority: owner approved changes only to AGENTS.md, paste-ready Project Instructions, GitHub task tracking, and automatic continuation for long-running tasks. No changes to testing, READY certification, or publication workflow. Production smoke testing remains read-only.

## Acceptance criteria
- [x] Add explicit completion/recovery contract to active AGENTS.md.
- [x] Define persistent per-task acceptance criteria, exact evidence, checkpoints, blockers, and next action in GitHub.
- [ ] Owner pastes concise Project Instructions into ChatGPT Project Settings (owner-only action).
- [ ] Verify existing issue-specific continuation automations remain enabled and scoped; do not silently broaden or alter schedules.
- [ ] Verify this tracking record and AGENTS.md are readable on the authoritative development branch.

## Task checkpoint schema (reuse existing issue/workstream journals)
For each long-running task record: issue/task identifier, owner-approved scope, immutable/Locked constraints, current branch and SHA, acceptance criteria with status, tests actually performed (no invented PASS), source-bound evidence, last safe checkpoint, outstanding work, blocker with exact cause, next executable action, automation ID/status if continuation is truly scheduled, and completion verification timestamp/receipt. Update the issue/workstream journal alongside substantive code/test/CI commits under existing same-commit policy.

## Recovery and continuation
At the start of each run, read the actual GitHub source and last checkpoint; reconcile concurrent changes and active CI before editing. Fix failures and retest. When a tool/run ends, record unfinished work and allow only an existing authorized task-specific automation to resume. Never imply background continuation if none exists. Do not create an unbounded generic automation that can mutate unrelated issues or production.

## Protected boundaries
No isolated QA environment, test accounts, synthetic production member data, database-write testing, mandatory Playwright, changed release gates, altered certification, publication, production write, or purchase. Preserve existing authorized task schedules and ownership.
