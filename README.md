# The Dial In Collective

Better espresso through shared experience.

## Current operational status (reconciled October 16, 2026)

**Read [CURRENT_STATUS.md](docs/CURRENT_STATUS.md) first** before asking the owner to redo a test, change infrastructure, or proceed from an older "next step". The rest of the dated 2026-10-09 to 2026-10-15 checklists are historical snapshots; their descriptions of no live release, no active invitations, all-deploy Netlify SSO, or no encrypted restore are no longer current.

**Current published beta owner preview:** [app.dialincollective.com](https://app.dialincollective.com), GitHub source SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`. Production's extra Netlify login was **removed by explicit owner approval** after genuine second-member acceptance; development previews still require Netlify team SSO. Supabase email verification, invitations, Row Level Security and administrator-role checks remain in effect.

The owner has tested Log Shot → Rate → Recommendation, genuine second email confirmation/invitation, nonadmin data isolation and admin denial, password-reset delivery, custom-domain redirect and support forwarding. The scheduled GitHub → private Drive encrypted backups match byte-for-byte; the exact selected ciphertext was genuinely restored into a disposable PostgreSQL database, and test alert email delivery passed. The read-only independent backup watchdog is enabled.

**Next milestone before expanding the external beta:** full **hosted** disaster-recovery reconstruction (new isolated Supabase-managed Auth/SQL/SMTP/Netlify environment after a cost check and explicit owner authorization). This is distinct from the successful isolated encrypted Postgres dump restoration. Nonadmin source-verification, real mobile/offline sync, writable admin workflows and full engine coverage remain separate unfinished product acceptance.

**Canonical decisions:** [Master Specification backend addendum](docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md) and [current dated Decision Ledger UX/operations amendments](docs/DECISION_LEDGER_2026_10_14_UX.json), together with the historical original Master Specification and Decision Ledger in the owner's Library. Preserve every Locked decision and recorded supersession. Product name and product copy use **The Dial In Collective**, not hyphenated "Dial-In". Legacy Library filenames are retained for provenance.

**Detailed records:** [current status and do-not-repeat list](docs/CURRENT_STATUS.md), [exact archive restore](docs/EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md), [backup delivery/alert audit](docs/AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md), [hosted-provider configuration inventory](docs/HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md), [Netlify credit ledger](docs/NETLIFY_CREDIT_LEDGER.json), [full release/recovery runbook](docs/RELEASE_AND_RECOVERY_RUNBOOK.md).

## Owner-development build

Node.js 22 or newer:

```sh
npm install
npm test
npm run build:cloud
```

The build requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in its environment. Those are public browser coordinates, not privileged keys. Never put database passwords, service-role keys, SMTP credentials, backup keys or personal exports in source or frontend configuration.

`npm test` runs the current automated Node suite. The exact official Supabase SDK is pinned in package.json; the published October 16 release passed its reviewed Node, browser and build checks. Refer to the matching GitHub Actions run and [current status](docs/CURRENT_STATUS.md) for the real count and deployed SHA; earlier 32-test/89-test claims were point-in-time development checkpoints.

`build_cloud.mjs` creates a clean, allowlisted `dist/`; `netlify.toml` provides the guarded production build configuration. A working HTTPS production domain, Supabase callbacks, SMTP and owner admission are already configured and user-tested; do not start their setup over. Do not deploy `site/` or the repository root directly.

## Tests and boundaries

`tests/browser/cloud_owner_qa.py` is a 19-check injected Chromium harness requiring Python Playwright and `/usr/bin/chromium`. It uses synthetic fixtures, mock authentication/backend responses and a memory store. It does not prove actual email/password login, native offline persistence or real-device synchronization.

`supabase/tests/security_foundation.sql` records the earlier 60-check foundation suite. Some direct-write expectations were intentionally superseded by the newer version-checked mutation APIs; update those assertions before using it as a current gate. The current checkpoint records the additional live-database role assertions and their scope. All database testing remains restricted to controlled synthetic fixtures with rollback; never casually run it against a populated beta database.

Published application code remains on `development/backend-foundation`; `main` hosts backup workflows, and the existing local prototype remains preserved. The custom app domain is already operational. Full managed hosted-provider recovery, real nonadmin source-verification, device/offline conflict acceptance, and agreed community/engine feature parity remain separate release gates. The exact encrypted app-data/Postgres restore is already verified.

## Credit-aware releases

GitHub Actions (plus rollback-only database tests) handle iterative development without Netlify production credits. The owner-approved production branch is `development/backend-foundation`; Netlify builds only intentional `Release DIC: ... [dic-publish]` commits and only after the latest verified billing snapshot records at least 15 remaining credits. Every other source/documentation commit skips Netlify production publishing. The older **October 14 0-credit screenshot is historical and superseded** by a later owner-observed paid-plan snapshot; even the October 16 985-credit observation is *not* the current post-release balance. The credit ledger is a provider-observed **snapshot**, not live billing. Refresh the actual provider balance before the next intentional release, do not override the guard or buy credits without approval.
