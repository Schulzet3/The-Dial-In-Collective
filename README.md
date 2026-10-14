# The Dial In Collective

Better espresso through shared experience.

## Development status

This branch contains the applied cloud database foundation, authenticated owner APIs, and an owner-development frontend. **This is a private, hosted owner-development preview, not an external beta or a replacement for the local v0.2.0 prototype.** As of October 14, an approved owner-only import preserves 14 historical shots on the live development database. GitHub encrypted backup and recovery workflows have passed, but full platform restore, continuous offsite monitoring, and public beta requirements remain separate release gates.

- [Current account/cloud checkpoint and remaining gates](docs/CLOUD_OWNER_TEST_CHECKPOINT.md)
- [Earlier backend foundation checkpoint](docs/BACKEND_CHECKPOINT.md)
- [Master Specification backend addendum](docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md)
- [Decision Ledger backend amendments](docs/DECISION_LEDGER_BACKEND_AMENDMENTS.json)
- [Locked owner-approved UX refinements (October 14)](docs/DECISION_LEDGER_2026_10_14_UX.json)
- [Cloud implementation status ledger](docs/DECISION_LEDGER_CLOUD_IMPLEMENTATION_STATUS.json)
- [Applied migrations](supabase/migrations/)

The Master Specification, Decision Ledger and accepted subsequent amendments remain authoritative. Preserve Locked decisions; document changes explicitly. Keep the experience sleek, clean and centered on **Log Shot -> Rate -> Recommendation**. Missing controls in this owner-development harness are unfinished integrations, not decisions to remove beta features.

## Owner-development build

Node.js 22 or newer:

```sh
npm install
npm test
npm run build:cloud
```

The build requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in its environment. Those are public browser coordinates, not privileged keys. Never put database passwords, service-role keys, SMTP credentials, backup keys or personal exports in source or frontend configuration.

`npm test` runs 32 cloud unit/adapter tests without network access. The exact official Supabase SDK is pinned in package.json; dependency installation and the complete bundle still need a network-enabled verification run. Generate and review the dependency lockfile there before a beta release.

`build_cloud.mjs` creates a clean, allowlisted `dist/`; `netlify.toml` describes the intended build but does not deploy a site by itself. Configure the actual HTTPS URL, Supabase callbacks, email delivery and owner admission before providing a login link. Do not deploy `site/` or the repository root directly.

## Tests and boundaries

`tests/browser/cloud_owner_qa.py` is a 19-check injected Chromium harness requiring Python Playwright and `/usr/bin/chromium`. It uses synthetic fixtures, mock authentication/backend responses and a memory store. It does not prove actual email/password login, native offline persistence or real-device synchronization.

`supabase/tests/security_foundation.sql` records the earlier 60-check foundation suite. Some direct-write expectations were intentionally superseded by the newer version-checked mutation APIs; update those assertions before using it as a current gate. The current checkpoint records the additional live-database role assertions and their scope. All database testing remains restricted to controlled synthetic fixtures with rollback; never casually run it against a populated beta database.

Source remains on `development/backend-foundation`; main and the existing local installation were not changed. No paid database branch or domain was created. Full community processing, backup/restore, remaining prototype feature parity and end-to-end hosted verification are still required before external beta testing.
