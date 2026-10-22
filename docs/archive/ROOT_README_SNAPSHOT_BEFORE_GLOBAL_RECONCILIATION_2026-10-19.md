# The Dial In Collective

Better espresso through shared experience.

**Active application and documentation branch: `development/backend-foundation`.** The default `main` branch runs backup operations and does not contain the current application.

Start with [Current Status](../CURRENT_STATUS.md) for the next action, then [Master Specification](../MASTER_SPECIFICATION.md) and [Decision Ledger](../DECISION_LEDGER.json) for canonical requirements. [Documentation Index](../README.md) locates dated evidence and historical records. [AGENTS.md](../../AGENTS.md) defines the handoff workflow.

The latest published application is [app.dialincollective.com](https://app.dialincollective.com), deploy `6ad2c872ad7a8fa78dc410dc`, source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`. Provider read-back during the October 17 error sweep confirms it remains ready. Newer development source includes seven roast categories, extractor improvements and the [app-wide error-sweep fixes](../APP_WIDE_ERROR_SWEEP_2026-10-17.md); these are **not published**. The owner's current instruction is **do not publish**.

Hosted recovery and its disposable-project cleanup have passed for their documented scope. The genuine member Wuri preview and private Pending save also passed; roast was manually selected. The owner has already Locked the 12-preview budget and seven roast categories. The compatible frontend and exact coffee corrections still await the ordered release in Current Status; do not reopen those decisions or restart completed recovery tests.

The [reconciled audit backlog](../AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md) now links all 26 findings to scoped issues or completed documentation corrections. The [decision crosswalk](../DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) maps original Open topics without silently resolving them. These records track unfinished implementation and acceptance; they do not claim every feature is complete.

## Development

Node.js 22.13 or newer (including the pinned lint tool):

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run lint
npm run build:cloud
node scripts/audit/site-integrity.mjs --dist
```

The build needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, which are public browser coordinates. Never put privileged keys, database passwords, SMTP credentials, recovery identities or personal exports in source or frontend configuration. `build_cloud.mjs` produces allowlisted `dist/`; do not publish `site/` or the repository root.

GitHub Actions runs iterative checks, including path-filtered visual review on the active branch. The [latest audit evidence](../APP_WIDE_ERROR_SWEEP_2026-10-17.md) distinguishes local tests, actual Actions runs and production observations. Synthetic browser tests use mock accounts. SQL suites require isolated fixtures; do not run them casually against a populated production database.

## Release and data boundaries

Preserve all Locked decisions. Product copy uses **The Dial In Collective** without hyphens. Distinguish development commits from live releases and SQL/Edge deployments. Production's extra Netlify login is off; nonproduction previews retain team SSO. Supabase sign-in, email confirmation, admission, RLS and admin checks remain required.

Only a separately authorized tested bundle, deliberate release marker and sufficient verified credits may publish under existing release controls. Netlify billing is not exposed by the connected read tools, and historical ledger balances are not live balances. Build hooks/manual publishes can bypass source controls; do not use them to circumvent the gate.

The current sweep changes development code, tests and documentation only. **No deployment, production-data mutation, migration or provider setting change** is part of this pass. The scheduled encrypted backup on `main` remains pinned to the verified published application SHA.
