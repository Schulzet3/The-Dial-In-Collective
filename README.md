# The Dial In Collective

Better espresso through shared experience.

> **Start here:** [Current Status](docs/CURRENT_STATUS.md) for the latest verified deployment and next action, [Master Specification](docs/MASTER_SPECIFICATION.md) and [Decision Ledger](docs/DECISION_LEDGER.json) for the canonical Locked product requirements, and [October 19 global audit](docs/GLOBAL_RECONCILIATION_AUDIT_2026-10-19.md) for verified cross-service findings and outstanding gaps. The [active 20-topic decision crosswalk](docs/ACTIVE_DECISION_AND_REQUIREMENT_RECONCILIATION_2026-10-19.md) and [live issues](https://github.com/Schulzet3/The-Dial-In-Collective/issues) distinguish approved decisions, implementation and real-account acceptance. [Documentation Index](docs/README.md) and [AGENTS.md](AGENTS.md) control seamless cross-chat handoff.

## Repository and live application

- **Active application/source/docs branch:** `development/backend-foundation`; it is not `main`.
- **Default `main`:** deliberate dedicated encrypted backup and isolated-recovery workflows. Do not merge these branches by habit or delete this architecture.
- **Published site:** [app.dialincollective.com](https://app.dialincollective.com). **Verified October 19, 2026:** Netlify READY/current deploy [6ad599e539cf6e672af21352](https://app.netlify.com/projects/the-dial-in-collective/deploys/6ad599e539cf6e672af21352), source commit `40b97f33bb1d828943e88d88ca0978c37baea18c`.
- **Data baseline at that audit:** Supabase ACTIVE_HEALTHY; 30 hosted/versioned migrations, 4 coffees, 16 personal shots with 16 notes, 2 eligible sanitized Community rows, 2 admitted members, 1 protected administrator.
- **Access:** production uses Supabase Auth, verified email, beta admission and row-level security; the redundant Netlify login was deliberately removed from production. Nonproduction Netlify previews remain SSO-protected.
- **Current backlog:** [31 actual GitHub issues, 27 open and 4 closed](https://github.com/Schulzet3/The-Dial-In-Collective/issues), plus 6 separately closed pull requests, including deliberately deferred [future beginner guide/video #37](https://github.com/Schulzet3/The-Dial-In-Collective/issues/37). Some P0 recommendation/recipe/Experiment work remains; a working **limited technical pilot** is not a specification-complete beta. Older status snapshots live under [docs/archive](docs/archive/README.md), never as a second active source of truth.

## Mandatory decisions and release protection

Preserve all Locked decisions, historical shots, and provenance. Do not silently adopt suggestions, archived plans, or unapproved espresso style names. The shortest **Log Shot → Rate → Recommendation** workflow takes precedence over additional complexity.

Netlify credits are owner-managed. **Each distinct production migration, deployment, provider setting change or release requires the applicable separately explicit owner approval.** The prior October 19 pilot release approval has been consumed. Ordinary development and documentation commits are not permission to publish. GitHub’s `[dic-publish]` build guard and `[skip netlify]` bookkeeping markers help prevent accidental costly production deployments; direct provider/manual publishes can bypass source gates, so still require human controls. See [Current Status](docs/CURRENT_STATUS.md).

Cloudflare and Resend email/domain setups have historically passed owner-observed tests, but their **current private account settings** and Google Apps Script courier execution cannot be certified from these GitHub/Netlify/Supabase connectors. The exact next scheduled postrelease Drive backup receipt and full current backup restoration are not yet verified. See [audit findings](docs/GLOBAL_RECONCILIATION_AUDIT_2026-10-19.md), [courier issue #28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28) and [restricted settings issue #27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27).

## Local / isolated development

Node.js 22 or newer. Development commands (on an authorized source checkout; **do not** run isolated fixtures against the populated production database):

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run lint
npm run build:cloud
node scripts/audit/site-integrity.mjs --dist
```

The frontend build requires **publishable** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` coordinates only. Do not place privileged service-role, database, Auth, SMTP or backup credentials, member IDs, personal exports or recovery keys in committed source or `dist`. `build_cloud.mjs` builds a constrained allowlisted public `dist/`. The older manual import/recovery UI sources are **deliberately not shipped**; their exclusion is enforced by `scripts/audit/site-integrity.mjs`. Preserve their historical recovery/testing context rather than deleting them without an approved replacement.

**Last checked:** October 19, 2026. For changes after this dated README, check [Current Status](docs/CURRENT_STATUS.md), [GitHub commits](https://github.com/Schulzet3/The-Dial-In-Collective/commits/development/backend-foundation), [issue tracker](https://github.com/Schulzet3/The-Dial-In-Collective/issues), and the actual Netlify/Supabase providers. Do not treat a prior approval or old issue heading as today's status.
