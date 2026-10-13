# The Dial In Collective — offsite recovery and release runbook

This operational guide supplements, and does not replace, the Locked Master Specification and Decision Ledger. Never copy database passwords, age private recovery identities, GitHub tokens, Netlify API keys, or downloaded user datasets into this repository.

## What nightly encrypted Drive archives contain

GitHub Actions on `main`, `.github/workflows/nightly-backup.yml`, schedules the Supabase PostgreSQL 17 dump at **09:23 UTC daily**. It connects using the GitHub Actions secret `SUPABASE_DB_URL` (session-pooler URI, TLS required), encrypts with the **public** `BACKUP_AGE_RECIPIENT`, and retains ciphertext on GitHub temporarily for the standalone Google Apps Script courier. The courier watches successful `main` workflow runs and places the ciphertext ZIP in the owner's private `DIC Automated Encrypted Backups` Google Drive folder. It is configured to retain approximately 30 days of Drive artifacts (minimum two latest), and send stale-transfer and execution-error emails.

**Backup v1 bundle** contained `database.dump`, `toc.txt`, `storage-object-count.txt`, `manifest.json`. From the source-inclusive backup update, subsequent bundles additionally contain **`app-source.tar.gz`**, a checkout of `development/backend-foundation` that includes current app source, UI, calculation engine, SQL migrations, test code, recovery scripts, Netlify build manifest, and nonsecret documentation. The bundle's manifest includes the source commit ID and source archive SHA-256. All contents are encrypted before leaving the GitHub runner; the age **private** SSH Ed25519 recovery key exists only on the owner's Mac and separate secure offline location.

The backup job intentionally **fails closed** if Supabase Storage contains file objects, because PostgreSQL alone preserves only Storage metadata, not file bytes. At initial verification, Storage object count and bucket count were zero.

## What a database/source archive does NOT capture

- Supabase's dashboard project settings, SMTP provider login/secrets, provider-managed OAuth/JWT signing material, site/redirect URLs, dashboard rate limits, or the encryption key itself.
- Netlify account/site ownership and site-level environment settings, GitHub repository permissions, action secrets/variables, OAuth connector authorizations or Google Apps Script trigger configuration.
- Any future Supabase Storage object bytes unless a separate download+restore path is deliberately added.
- Original iPhone/Mac prototype data not imported into cloud. Preserve the previously downloaded prototype and reviewed JSON backup files independently.
- A guaranteed one-click restore into hosted Supabase. The raw `pg_dump` archive includes Supabase-managed internals and may need provider-specific restore processing.

## Configuration inventory to recreate after a disaster

1. Private repository source: restore `app-source.tar.gz` to a **new private GitHub repository**; keep review/branch workflow and commits separately if available. Do not commit personal exports.
2. Supabase Free: recreate project, apply checked-in `supabase/migrations/` in correct version order; recover user/application/auth data through a supported Supabase/Postgres migration path. Recreate Auth settings, allowed redirects, password policy, email confirmation, custom SMTP (if configured), and invitation/member policies. A different JWT signing key will require users to sign in again; never restore old refresh tokens blindly.
3. Netlify: connect private GitHub branch `development/backend-foundation`, Node 22, `npm test && npm run build:cloud`, publish `dist`, site origin `https://the-dial-in-collective.netlify.app`, and add only public `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the build environment. No database passwords or service-role keys in the browser build. Keep visitor SSO restriction until explicit beta release approval.
4. Backup continuity: configure the GitHub Actions `SUPABASE_DB_URL` secret, `BACKUP_AGE_RECIPIENT` public variable, and owner-authorized private Apps Script Script Properties `DIC_FOLDER_ID`, `DIC_ALERT_EMAIL`, `DIC_GITHUB_ACTIONS_READ_TOKEN`; install the three-hour polling trigger. New credentials should be generated securely on each restored service.
5. Run the Auth/user/isolation tests and a test restore into disposable infrastructure **before** making the recovered app writable.

## Verification and status

- GitHub Actions: two early dev PostgreSQL dump/encryption runs succeeded, main run 38438265941 generated encrypted backup and owner-authorized Apps Script placed it into the correct private Google Drive folder.
- Owner's Mac successfully downloaded, SHA-checked, decrypted that exact encrypted archive, and verified its manifest and database checksum. The owner reports an independently secured private-key copy.
- GitHub Actions disposable PostgreSQL recovery run 38453921221 successfully restored nine Auth/app table schemas and rows with matching row counts, without writing to the hosted Supabase project. This is a real data-restoration drill, **not a complete restore of managed Supabase APIs, indexes, functions, RLS or provider settings**.
- A wider first-party app table-data recovery check is being expanded and tracked separately; do not claim a pass before its CI run finishes.
- A subsequent encrypted bundle with app-source snapshot was tested on the development branch (run 38454332010, success) and promoted into the daily `main` workflow. The first source-inclusive `main` archive is not confirmed in Google Drive yet.

## Before external beta

External beta requires functioning user confirmation/recovery email for non-team recipients. Supabase's built-in SMTP does **not** send to outside project-team addresses, so configure and test custom SMTP first. Then test genuine outside-account signup, confirmation link, invitation redemption, device-local owner data access, shot-save/read/reload/sync, cross-account privacy, and backup/restore integrity. Do not remove Netlify access controls, open public signup, or enable historical import gates until these are verified and the approved release gates are deliberately updated.
