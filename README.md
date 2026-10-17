# The Dial In Collective

Better espresso through shared experience.

**Active application and documentation branch: `development/backend-foundation`.** The default `main` branch runs backup operations and does not contain the current application.

Start with [Current Status](docs/CURRENT_STATUS.md) for the next action, then [Master Specification](docs/MASTER_SPECIFICATION.md) and [Decision Ledger](docs/DECISION_LEDGER.json) for canonical requirements. [Documentation Index](docs/README.md) locates dated evidence and historical records. [AGENTS.md](AGENTS.md) defines the handoff workflow.

The latest published application is [app.dialincollective.com](https://app.dialincollective.com), deploy `6ad2c872ad7a8fa78dc410dc`, source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`. Provider read-back during this consolidation confirms it remains ready. Newer development source includes the roast graphic extractor with 226 passing tests; it is **not published**. Ordinary documentation commits do not authorize a deployment.

Hosted recovery and its disposable-project cleanup have passed for their documented scope. The genuine member Wuri preview and private Pending save also passed; roast was manually selected. Next product question is the daily URL lookup cap, followed separately by roast taxonomy. See Current Status for exact remaining acceptance limits; do not restart completed setup or recovery tests.

The [reconciled audit backlog](docs/AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md) now links all 26 findings to scoped issues or completed documentation corrections. The [decision crosswalk](docs/DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) maps original Open topics without silently resolving them. These records track unfinished implementation and acceptance; they do not claim every feature is complete.

## Development

Node.js 22 or newer:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run build:cloud
```

The build needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, which are public browser coordinates. Never put privileged keys, database passwords, SMTP credentials, recovery identities or personal exports in source or frontend configuration. `build_cloud.mjs` produces allowlisted `dist/`; do not publish `site/` or the repository root.

GitHub Actions runs iterative checks. The 226-test result is tied to its [verified run](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38994786401), not a claim of exhaustive real-device acceptance. The synthetic browser harness uses mock accounts. SQL suites require isolated fixtures; do not run them casually against a populated production database.

## Release and data boundaries

Preserve all Locked decisions. Product copy uses **The Dial In Collective** without hyphens. Distinguish development commits from live releases and SQL/Edge deployments. Production's extra Netlify login is off; nonproduction previews retain team SSO. Supabase sign-in, email confirmation, admission, RLS and admin checks remain required.

Only a separately authorized tested bundle, deliberate release marker and sufficient verified credits may publish under existing release controls. Netlify billing is not exposed by the connected read tools, and historical ledger balances are not live balances. Build hooks/manual publishes can bypass source controls; do not use them to circumvent the gate.

The current continuity task is **documentation only: no deployment, production-data mutation, migration or provider setting changes**. The scheduled encrypted backup on `main` remains pinned to the verified published application SHA.
