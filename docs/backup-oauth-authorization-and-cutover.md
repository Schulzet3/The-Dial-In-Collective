# The Dial In Collective — personal Drive OAuth feasibility and staged courier

**Status: TESTED LOCALLY ONLY; NOT ACTIVATED.** Do not disable Apps Script,
change Google Drive permissions, deploy the espresso app, or modify live backups yet.
The Google OAuth consent screen itself will need to be set **In production**
for long-lived, unattended authorization.

## Confirmed design

- Personal Gmail-owned folder, ID `1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`, stays in My Drive.
- `drive.file` OAuth grants app-specific rights to the folder the owner selects.
- Desktop One Pick Picker (`trigger_onepick=true&allow_folder_selection=true`) makes
  the owner select the existing private folder in a browser. No Workspace needed.
- Google OAuth refresh token supports unattended renewal when the OAuth consent
  screen is published **In production**. A project left in **Testing** issues
  tokens that expire after approximately seven days.
- The GitHub-runner courier downloads **the exact GitHub Actions ZIP** (only
  encrypted `backup.age` inside), verifies SHA-256 and ZIP CRC, uploads to
  Drive via 4 MiB resumable chunks, and verifies Drive MD5, size, folder,
  appProperties and privacy metadata. No decryption key is needed.
- Only a completed, successful, scheduled/main run or approved manual backup
  qualifies; push-only runs do not count. Duplicate-guard fallback runs without
  an artifact are safe skips. The cutover timestamp blocks legacy reuploads.

## Critical limitations

1. This tool cannot inspect your Google Cloud console, grant OAuth consent for
   your personal Google account, or set GitHub Actions secrets on your behalf.
   Those are owner-account actions. Do not paste credentials into ChatGPT.
2. `drive.file` may not list or delete your **older Apps Script-created files**,
   even though the folder was selected. It can manage its own newly created
   files. Historical retention is therefore a separate, unresolved acceptance
   item. Do not promise automated 30-day retention for old files yet.
3. The OAuth folder permission must pass a **real** disposable upload/readback
   before we call it viable **in your Google account**. A second synthetic
   upload executed within a GitHub Actions runner must pass before activation.
4. No schedule is installed by this package, no backup is exported here, and
   the existing Google Apps Script courier remains unchanged.
5. A GitHub-held refresh token could be used by a compromised Actions job.
   Use the minimum `drive.file` scope, protect main/Actions workflows, do not
   log tokens, and know how to revoke this OAuth grant. Desktop-client secrets
   are not a substitute for secret refresh-token protection.

## Step 1 — Google Cloud one-time setup (owner action)

On a macOS, Windows or Linux **desktop** computer with Node.js 22 or newer:

1. Open `https://console.cloud.google.com/` using your personal Google
   account. **Select the existing `The Dial In Collective` project created
   October 12, 2026. Do NOT create a duplicate project.**
2. Open Google Auth Platform > Audience; check if its status is **Testing** or
   **In production**. If still Testing, it must move to **In production**
   *before issuing the refresh token used for unattended backups*. The
   seven-day Testing token limitation makes Testing unacceptable for production.
3. Verify Google Drive API **and Google Picker API** are enabled for this same
   project. Drive API was historically enabled; Picker may not have been.
4. Verify Google Auth Platform > Data access declares only the
   `https://www.googleapis.com/auth/drive.file` scope for this private courier.
   Preserve existing unrelated app scopes/clients if this project is shared;
   do not broaden permissions to full Drive.
5. Google Auth Platform > Clients: reuse existing **Desktop OAuth** client
   `The Dial In Collective Backup Setup` if still present and correctly
   configured. Download a **new copy of its JSON file** from the Console only
   if needed, and keep it on your computer. Do not create new credentials
   merely because an older downloaded copy was misplaced.
6. Having a custom domain can make Google OAuth branding easier, but is NOT a
   requirement for this private-use `drive.file` authorization. If the Console
   specifically requests a verified domain, use only your owned domain, real
   publicly accessible homepage and truthful privacy policy. Never publish
   private archive details or OAuth tokens. Personal-use apps under Google's
   unverified-app exception can operate with an owner-acknowledged warning.
7. **Never send, upload, screenshot, paste or commit OAuth client JSON,
   authorization code, access/refresh tokens, client secret, or API keys here.**
   No billing/payment setup is required merely for this test; stop if prompted
   to activate a paid service.

## Step 2 — Verify folder access with no real backup modifications

Run locally, from the extracted folder:

```bash
node --version
node --test tests/*.test.mjs
node scripts/backups/verify-drive-oauth.mjs /path/to/your/downloaded-oauth-desktop-client.json
```

Copy the printed Google authorization URL to your normal browser. Sign into the
same personal Google account, grant **drive.file** only, and choose the existing
`DIC Automated Encrypted Backups` folder, *not a new folder*. A tiny synthetic
file is uploaded with the Drive resumable API, its bytes/MD5, size, name and
parent are verified, and the temporary file is moved to Trash. A cleanup failure is treated
as an incomplete proof and you must inspect the test-file ID before retrying. The private
refresh token is stored **only on your computer** in:

- macOS/Linux: `~/.dic-drive-oauth/verified-credentials.json`
- Windows: `%USERPROFILE%\.dic-drive-oauth\verified-credentials.json`

**Only send ChatGPT the PASS or sanitized error message, never credentials.**
If it fails, keep Apps Script running and investigate the specific Google error.

## Verification gates (do not skip)

- Confirm existing project and Desktop client, Drive API and Picker API, External
  audience and production publishing status.
- Owner confirms the folder selection and disposable test upload/MD5/parent.
- Verify a GitHub-runner disposable upload as a separate authentication test.
- Install the scheduled offsite courier **only after** the above gates pass;
  initially run it alongside Apps Script only for source-unique identities and
  monitor carefully for duplicates. Never disable the old trigger on a PR.
- Final cutover requires a verified scheduled encrypted archive in the chosen
  owner-only folder, and an agreed plan for the historical retention limitation.

## Step 3 — after proof PASS only (NOT before)

After local folder-access proof PASS, and with GitHub CLI authenticated:

```bash
gh auth login
node scripts/backups/install-github-secrets.mjs
```

This sends the three OAuth credential values directly into GitHub's encrypted
Actions Secrets over the GitHub CLI (via stdin), without printing them. It also
sets the new-only `DIC_DRIVE_CUTOVER_UTC` Actions variable. Protect your local
credentials file; never commit it. Confirm only secret **names** exist in GitHub
Settings > Secrets and variables > Actions.

## Step 4 — independent GitHub-runner proof (NO automatic courier yet)

- Stage reviewed source scripts and tests in a backup-operations PR to `main`.
- After local OAuth proof and secure GitHub secret installation, install **only**
  the manual `.github/workflows/dic-drive-oauth-smoke.yml` workflow, and
  dispatch it *once*, manually, on protected `main`.
- The smoke job calls `drive-oauth-smoke.mjs` and creates/trashes a tiny random
  disposable file in the exact folder; it does NOT touch real archives.
- Inspect workflow conclusion and the log's PASS result; never mark success
  based only on GitHub status or a local synthetic test.

## Step 5 — GitHub scheduled courier integration (after both proofs)

- Install `.github/workflows/dic-drive-oauth-courier.yml` only after the
  runner's authenticated disposable-file test independently passes.
- Verify first actual scheduled backup in Drive by exact run/artifact ID,
  SHA-256, byte length, correct direct folder parent and ZIP/age structure.
- Only then disable the **existing Apps Script time-driven trigger**, not its
  archived source, and reconcile the old stale-alert timer.
- Keep the existing `DIC Backup Watchdog`, recovery tests, archive retention
  safeguards and all encrypted historical files intact.

## Technical references — Google/GitHub official documentation

- Google Picker Desktop One Pick (folder selection):
  https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker
- `drive.file` restricted access and refresh-token storage:
  https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- OAuth Desktop PKCE and loopback redirect:
  https://developers.google.com/identity/protocols/oauth2/native-app
- Personal-use verification exception:
  https://support.google.com/cloud/answer/13464323
- Testing-mode seven-day refresh token limit:
  https://developers.google.com/identity/protocols/oauth2
- Drive resumable uploads:
  https://developers.google.com/workspace/drive/api/guides/manage-uploads
- GitHub encrypted Actions Secrets:
  https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
