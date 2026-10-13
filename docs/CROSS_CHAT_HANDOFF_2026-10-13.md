# The Dial In Collective — cross-chat continuity handoff

**Prepared:** 2026-10-13. **Purpose:** carry the important history, decisions, verified infrastructure state, blockers, and next actions from the long backup/import/backend chat into another chat in the SAME ChatGPT Project. **This is a continuity reference, not a new product specification or a replacement for the Master Specification and Decision Ledger.**

## 1. Instructions for the next assistant (read first)

The user wants to **launch The Dial In Collective as soon as safely practical**, make backend/recovery **bulletproof first, as automated as possible second, and operationally simple third**, then focus only on using the espresso app and operating its admin portal. The user will do essential one-time authorizations now but strongly prefers **no installations on their Mac** and minimal manual steps. Perform as much as possible with connected **GitHub, Supabase, Netlify, and Google Drive** tools. Verify technical claims using live system status and authoritative documentation; do **not** claim success based on a design, a dry run, or a successfully executed setup function alone. The user has repeatedly been frustrated by redundant setup instructions and inaccurate statements. Prefer decisive backend execution plus compact, precise status reports. Ask product questions **one at a time**, only when needed.

**Preserve all Locked decisions** in the canonical **Master Specification and Decision Ledger**; never silently supersede them. If a decision changes, explicitly obtain approval and amend the appropriate specification and ledger. Keep design sleek/clean/simple and make the central **Log Shot -> Rate -> Recommendation** flow as fast as possible. No paid plan, project, domain, or external service purchase without explicit authorization. Never ask for, print, commit, or disclose secrets. User's original phone/Mac prototype, data, and historical source files must not be destroyed or overwritten even though the user is willing to rebuild the *cloud app setup* if necessary.

**Do not confuse two different milestones:** recovering database table data and encrypted files is verified in several ways; full reconstruction of Supabase's managed runtime, auth/email configuration, Netlify/GitHub settings and a fully functional multi-user beta is *not yet* verified. Historical import writes remain blocked server-side. The user has not approved bypassing privacy/account protections for external users.

## 2. Current product and service map (live checked on 2026-10-13)

- **Product:** The Dial In Collective, espresso journaling, dial-in recommendations, coffee community and admin functionality. Local prototype v0.2.0 is preserved separately; cloud app is development version.
- **Private GitHub repository:** `Schulzet3/The-Dial-In-Collective`. Full cloud app, tests, SQL migrations, runbooks and specs live on branch `development/backend-foundation`. Branch `main` contains repository README and the recovery/backup GitHub Actions infrastructure, not the complete app frontend. Last inspected branch heads BEFORE committing this handoff: development `b7c31e7e04d1ce654acd960d642314a61649ddd6`, main `272b133a6c3fc95787b3a104de1a3cb44c9840fb`. Recheck heads before writes.
- **Supabase Free:** project `azviqqejypsefzilgonr`, region `us-east-2`, PostgreSQL `17.11`, healthy. Thirteen committed and applied application migrations. One real Auth account, zero cloud `public.coffees`, `public.library_entries`, `public.shots`, zero Storage objects at last check. Server import gate `private.import_control.saves_enabled=false`, `recovery_verified_at=NULL`. Do not change unless its release gate is deliberately satisfied. Security advisor has the pre-existing `auth_leaked_password_protection` warning (plan-restricted enhancement); this does not imply missing application RLS. Application/private tables have RLS.
- **Netlify:** site `https://the-dial-in-collective.netlify.app`, site ID `153277f2-e19e-4862-b9a6-f2e18ccde271`. Connected to development branch; latest deploy reported **ready**. Visitor access `requiresSSOTeamLogin=true`. Build: Node 22, `npm test && npm run build:cloud`, publish `dist`. Browser build gets only public `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. **Do not disable team-login restriction until external-account and release gates pass**.
- **Google Drive:** approved private script-owned folder `DIC Automated Encrypted Backups`, folder ID `1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`, URL `https://drive.google.com/drive/folders/1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`. A verified earlier encrypted artifact `dic-nightly-11833663348.zip`, Drive file ID `1b3NKkm30GxW3JQnz2MWecvHWsaKxZ7Kn`, 119241 bytes, came from successful GitHub main backup run `38438265941`. The older separately created folder `The Dial In Collective Backups` ID `1opb3JySDaNVaP0t9ocpNeXm2Kh23jQhv` is **not** the courier's active destination. Do not confuse them.
- **Google Apps Script:** user owns and authorized a private standalone script `The Dial In Collective Private Backups` under their primary Google account. It has `drive.file` and related permission scopes. Script Properties include `DIC_FOLDER_ID`, `DIC_ALERT_EMAIL`, `DIC_GITHUB_ACTIONS_READ_TOKEN`. The owner ran `setupPrivateBackupFolder`, `syncPrivateBackups` and `installPrivateBackupPoller` successfully. The courier accepts only completed successful scheduled/manual backup workflows on `main`, validates artifact SHA-256 and Google Drive upload MD5/size, avoids duplicates, retains about 30 days (minimum 2 newest), polls via a 3-hour trigger and sends failure/staleness alerts. Successful setup run is user-confirmed; check first unattended cycle in Drive separately.
- **Do not restart the abandoned Google Cloud OAuth process.** A separate desktop OAuth client was created/downloaded earlier, but publishing had blocked on branding/domain requirements. The private Apps Script approach was approved and used instead. No domain is owned.

## 3. What is actually backed up / restored

**Backup pipeline**: private GitHub Actions workflow `main:.github/workflows/nightly-backup.yml` runs at **09:23 UTC daily** and can run manually. It connects to Supabase using the configured GitHub Actions `SUPABASE_DB_URL` secret (session-pooler URL with percent-encoded password, verified by successful live Postgres connection; TLS enforced), uses public repository variable `BACKUP_AGE_RECIPIENT` for `age` encryption, uploads **ciphertext only** to private GitHub Actions artifacts (new artifacts retained **30 days**). Apps Script copies eligible artifacts into private Google Drive. The private `age`/SSH recovery key stays on the user's Mac in a dedicated backup directory and a separately secured offline location; its contents must NEVER be placed in GitHub, Supabase, Netlify, Apps Script, the chat, or the handoff.

**Original encrypted bundle v1**: `database.dump` (PostgreSQL custom archive), `toc.txt`, `storage-object-count.txt`, `manifest.json`. **Newer source-inclusive bundle** additionally includes `app-source.tar.gz` containing app code, recommendation engine, SQL migrations, tests, Netlify build configuration and nonsecret docs checked out from `development/backend-foundation`; SHA-256 and commit are recorded in manifest. Backups fail closed if Supabase Storage contains any object bytes, since raw PostgreSQL only backs up Storage metadata. Zero Storage objects and buckets observed at initial setup.

**Verified recovery tests:**

1. GitHub dev backup/encryption successful `38433662181`, and TLS-enforced run `38434157066`.
2. Manual `main` backup run `38438265941` success, encrypted artifact `11833663348` copied to Drive under the expected folder; size matches. Its matching encrypted `backup.age` was successfully decrypted on the user's Mac with their private SSH key, and archive/manifest/database checksums and required table inventory passed. User reports a secure backup copy of the private key.
3. Isolated, network-disconnected disposable PostgreSQL 17 test run `38453921221` restored **9** representative Auth/app tables and verified source/target row counts. No live data changes.
4. Widened recovery drill on development `38454798657` restored **all 35 first-party public/private tables** plus core Auth users and identities, comparing representative counts.
5. Main weekly recovery verification `38475063706` **passed**: weekly schedule **Sunday 10:43 UTC**, offline PostgreSQL 17 restore of all 35 public/private first-party tables and core Auth users/identities, with **every restored table row count checked against source**. These are real isolated table/row restores but **NOT** a full clone of Supabase's provider-managed runtime, policies/functions/indexes/SMTP/JWT.
6. Source-inclusive encrypted development test `38454332010` successful. `main` source-inclusive smoke-test run `38475327361` **passed** with encrypted artifact `11853582739`, size **231845 bytes** (new 30-day retention). It was a **push** test, intentionally ineligible for the Apps Script courier; latest Drive folder inspection still showed only older database-only ZIP. A subsequent successful `workflow_dispatch` or scheduled run on `main`, followed by Apps Script, is required to prove the **new source-inclusive archive reached Drive**.

The GitHub operational runbook documents daily 09:23 UTC export, weekly 10:43 UTC restore, two storage destinations, ~30 day retention, failure monitoring (including a separately reported daily condition watch), and exact limitations. Canonical path: `docs/RELEASE_AND_RECOVERY_RUNBOOK.md` in development branch.

**Gaps / don't overclaim**: The encrypted archive cannot by itself recreate Supabase-managed Auth settings, JWT secrets/API keys, SMTP, redirect URLs, Netlify env variables/SSO/team identity, GitHub Actions secrets/permissions, Apps Script properties/triggers, or future Storage file bytes. `pg_dump` can contain Supabase-managed internals and is not a one-click dashboard restore. SQL migrations in GitHub are schema/security recovery source. Auth password hashes and data can be migrated via supported Supabase paths, but a changed JWT signing secret means sessions may need to sign in again. Independent complete hosted reconstruction remains unverified.

## 4. Historical espresso import status

The original v0.2.0 phone/Mac prototype and its personal records are separate from the cloud database. A reviewed portable source backup of the owner's history (created 2026-10-12) contains **4 coffees, 14 shots, 4 recipe families**, including an added **Sweet Bloom Hambela** coffee with **zero shots**; one missing grind and fourteen historical unrecorded/unknown feed values. Preserved original baseline includes Yirgacheffe, David Armijos and Bavyeyi IV. Do not fabricate missing values; do not make an added but unlogged coffee Current. Historical original and reviewed JSON copies were downloaded by the owner (verify actual availability in new chat rather than inventing a file path).

The hosted app's **Settings -> Import Backup** supports selecting the reviewed JSON, previewing the counts and coffee names, checking it against the real Supabase backend, and downloading a recovery copy. Preview succeeded with all four coffees/fourteen shots. **Save/import is disabled by a server-side recovery gate**, not a UI bug. Current DB reports `saves_enabled=false`, `recovery_verified_at=NULL`, no imported coffees/shots. The importer has owner-bound server validation, all-or-nothing/idempotent commits, duplicate protection, account-switch protections, and a private original source archive on actual commit. Role tests passed and rolled back without touching the real account. Only a first empty-cloud-workspace prototype format is supported; not a general overwrite/merge import.

Relevant code/docs: `docs/NATIVE_IMPORT_CHECKPOINT.md`, `docs/DECISION_LEDGER_IMPORT_STATUS.json`, `site/cloud/import-*.js`, migrations `20261012183642_dic_native_import_review` and `20261012183845_dic_import_qualified_validation` (all on development). Preserve the user experience and approved original data semantics. If enabling gate, use a clear deliberate release decision only after reviewing remaining recovery/privacy gates; avoid accidentally opening external beta or overwriting the phone prototype.

## 5. Product decisions to protect

See canonical Master Specification and Decision Ledger, plus `docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md` and `docs/DECISION_LEDGER_BACKEND_AMENDMENTS.json`. **Locked** instructions include:

- External beta requires real accounts, cloud sync, qualifying shared community data, verified privacy/recovery, and an operable admin path; no public beta just because the static site deploys.
- Supabase Free development, private GitHub code, Google Drive as automatic recovery destination, and preservation of the original working local prototype. No payment/domain without approval.
- Owner-bound privacy: raw shots, free-text notes, identities, setup names, preferences and personal history must not leak to community views. Verified canonical coffee facts are separately governed; user submissions may not self-approve.
- Password policy for *new/reset* passwords: at least **8 characters**, **one uppercase**, **one supported special character**; do **not** require a number/lowercase. Keep email verification and prominent post-signup **Check your email** screen. Existing logins should not be obstructed by creation rules.
- One setup = one personal workspace with full library, setup-specific recency and Current Coffee. Adding/browsing a coffee does not activate it; a saved shot changes Current, apart from deliberate restoration/hardware transitions.
- Hardware history immutable across major machine/grinder/burr changes; basket/zero-point semantics preserved; shots retain their equipment snapshots. Basket dose +/-1g advisory only.
- Dialed In = exactly all-green taste values **Extraction 3, Body 3, Clarity 5, Sweetness 5, Astringency 1**; timing/style may inform guidance but never veto success.
- Family learning is ratio/coffee/style-centric, setup-aware, with centerpoints; contributor-balanced robust shared evidence, 2-contributor community confirmation, personal repeat confirmation; only qualifying all-green evidence; no cross-style time/grind copying. Corrections replace/withdraw their contributions.
- Slow Feed is a grinder condition, not an independent recipe family; historical unrecorded feed stays unknown. Advanced hidden by default. Pressure/flow profiling tabled. Private-note publication outside V1.
- Mac double-click launcher/Documents-folder updater remains a future delivery queue item, but priority is now cloud operations and rapid launch. No unnecessary local install requests.

User preference from newest requests: prioritize **bulletproof/reliable -> automated -> simple**, expedite real beta, verify claims, ask questions only when essential, automate operational backend/recovery tasks through GitHub/Supabase/Netlify; user accepts changing/redoing hosted app setup if necessary but has NOT authorized losing unimported history or weakening other Locked decisions.

## 6. Implementation and testing already done

- 13 Supabase migrations applied; owner-bound RPCs for signup/admission, workspace/core mutations, idempotent retries, version/conflict checks, shot edits/hiding, setup history, private notes, community projections; explicit quality/verification gates. Original cloud code includes site recommendation engine adapted from v0.2.0.
- Real owner Auth account created, email confirmed, and admitted; one Auth account exists. Real hosted native import preview was tested. Do not infer full real multiple-user testing from this.
- Earlier committed cloud tests: Node unit/integration, mocked 390px Chromium UI, rolled-back SQL role/permission tests; import-specific **27 Node**, **30 rolled-back database**, **18 mocked Chromium** checks passed. Later `supabase/tests/native_import.sql` 30 role tests were reportedly rerun successfully with gate restored to false; check latest runbook checkpoint. Static Netlify builds on development ready.
- Database security advisor: current lone Auth warning for leaked password protection, a provider-level protection unavailable on the current tier; do not misrepresent it as missing RLS.
- **Not production-ready:** no end-to-end external-test-user signup/reset, real multiple-account private data isolation, real iPhone sync/offline cold-start conflict behavior, full shared-community recommendation qualification, admin review workflows, source-inclusive Google Drive delivery after latest workflow changes, managed-service restore. Feature parity of advanced experiments/baskets/hardware Custom targeting also remains limited in cloud version.
- **External email is a launch blocker:** official Supabase Auth documentation says built-in SMTP only sends to pre-authorized team addresses, not general outside users; a custom SMTP provider must be configured and actual outside-account signup confirmation/recovery tested before public invitation. A domain may help with mail delivery but none owned; research options before suggesting purchase. Do not assume a general public email path works because owner email worked.

## 7. High-priority action plan for the new chat

**First, verify current GitHub branch heads and latest run IDs before writes; another chat has been making progress concurrently.** Use the newer repository runbook/ledgers as the source of truth when they include more recent verified actions than this handoff. Never overwrite them with stale status.

1. **Prove source-inclusive offsite backup without the user's Mac**: use a normal manual `main` workflow dispatch (or wait for scheduled 09:23 UTC); then invoke/verify Apps Script courier with user's help only if needed and confirm the fresh `app-source.tar.gz` bundle is now in the right Google Drive folder; verify its manifest and SHA. The `push` smoke-test artifact alone does not satisfy the courier's allowed provenance.
2. **Make recovery self-documenting and resilient**: confirm backup/restore schedules, 30-day retention, failure alerts, script trigger, stale warnings, protected credentials, source code + data recovery routes; inventory but do not copy private configuration secrets. Check if GitHub workflow scope/restore tests should add full Auth schema/functions/RLS verification and portable Supabase-specific recovery procedures. Handle future Storage object bytes before first upload, rather than letting backups silently omit them.
3. **External-user Auth unblock**: configure a suitable custom SMTP service (provider should support real delivery/verification; user can perform only essential signup/DNS steps); verify confirmation, password recovery, allowed redirects, signup error handling, and admission with a genuine outside-project-team account. Keep anti-abuse/security constraints.
4. **Run actual hosted user flows**: owner and separate tester account on live HTTPS Netlify, sign-up/invite/login, create coffee/setup, log shot, five ratings, recommendation, reload, sign-out/in, multi-device sync/offline/retry, privacy cross-account denial; use rollback/testing controls and don't seed false public community data.
5. **Finish admin and community**: operational admin portal, pending coffee review/verification, vetted contributions, family learning/qualification, invitation management. Keep code aligned to canonical product decisions; don't confuse UI mocks with functional services.
6. **Safely unlock historical import when criteria are met** and test the actual reviewed 4-coffee/14-shot import, idempotence, recovered backup, sync and Current Coffee behavior; never overwrite local v0.2.0 source.
7. **Release a controlled external beta** only when users can safely access app through a public URL, signup/recovery work, private data is protected, critical workflow and admin operational, and backup/restore evidence supports the release. Netlify currently has mandatory SSO, so remove only deliberately after readiness validation.

If the fastest safe rollout requires a revised sequencing/product decision, ask one targeted question, document approval and update ledger. Do not manufacture a full release guarantee from existing limited restore tests.

## 8. Important exact pointers

- GitHub repo: `https://github.com/Schulzet3/The-Dial-In-Collective`
- Dev runbook: `docs/RELEASE_AND_RECOVERY_RUNBOOK.md`
- Master addendum: `docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md`
- Locked-decision addendum: `docs/DECISION_LEDGER_BACKEND_AMENDMENTS.json`
- Backup ledger: `docs/DECISION_LEDGER_PRIVATE_BACKUP_AMENDMENT.json`
- Import ledger: `docs/DECISION_LEDGER_IMPORT_STATUS.json`
- Import checkpoint: `docs/NATIVE_IMPORT_CHECKPOINT.md`
- Backup operations: `main:.github/workflows/nightly-backup.yml`, `main:.github/workflows/database-recovery-drill.yml`
- Backup and restore scripts: `scripts/backups/create-nightly-encrypted-dump.sh`, `scripts/backups/isolated-recovery-drill.sh` (in appropriate branches)
- Netlify site: `https://the-dial-in-collective.netlify.app` (still SSO-gated)
- Supabase project: `https://supabase.com/dashboard/project/azviqqejypsefzilgonr`
- Private Google Drive courier folder: `https://drive.google.com/drive/folders/1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`
- Verified main encrypted DB artifact run: `https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38438265941`
- First nine-table restore: `https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38453921221`
- Weekly main comprehensive table-data restore: `https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38475063706`
- Main source-inclusive encrypted smoke test: `https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38475327361`

## 9. What should NOT be carried into GitHub or pasted into a new chat

- The owner's Supabase database password or its encoded full connection URI; GitHub Actions stores this securely as `SUPABASE_DB_URL`.
- The `age`/SSH **private** recovery key, stored by owner and in a separate secure offline location (only public recipient configured in GitHub).
- The private GitHub Actions-reading token stored in Google Apps Script Script Properties.
- Netlify/Supabase service-role secrets, any SMTP credentials, private coffee notes/exports, real auth tokens, raw encrypted archives, personal backups.
- The unused downloaded Google Desktop OAuth client JSON.

**Handoff guarantee:** This file is a carefully reconstructed, live-checked context summary rather than a literal cross-chat transcript migration. The actual messages, uploaded screenshots, user-owned source files, and runtime sessions do not physically relocate between conversations. Consult this file, current live GitHub/Supabase/Netlify/Drive state, and the project's canonical files before taking action.