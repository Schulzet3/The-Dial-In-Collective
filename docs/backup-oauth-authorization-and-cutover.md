# The Dial In Collective — browser-only owner Drive OAuth and staged GitHub courier

CURRENT OWNER-APPROVED ROUTE (Nov 14/15 2026): NO MAC INSTALLS, NO DESKTOP CLIENT DOWNLOAD, NO GITHUB MANUAL WORKFLOW RUN.
OAuth is owner-confirmed In production. Preserve existing Google Cloud project and Desktop client. Browser authorization needs a new Web application OAuth client for its HTTPS callback.

## Status
- Browser consent endpoint source is in development PR #2818; /api/owner-drive-connect, disabled unless private Netlify configuration exists. Must pass exact-source CI and be separately owner-PUBLISHED before live use.
- Draft operations courier PR #2684 is still NOT MERGED or activated. Existing encrypted backups, Apps Script, private Drive archives and watchdog are unchanged.

## Owner browser-only setup
1. Google Cloud Console > Auth Platform > Clients, in EXISTING The Dial In Collective project: create Web application client The Dial In Collective Browser Backup Setup. Authorized redirect URI: https://app.dialincollective.com/api/owner-drive-connect . If required, authorized JavaScript origin: https://app.dialincollective.com . Preserve Desktop client. Only drive.file scope; Drive and Picker APIs enabled. No downloads required.
2. After source tests/CI and explicit separate Publish of the owner setup endpoint, enter Netlify private runtime variables DIC_DRIVE_SETUP_ENABLED=true, DIC_DRIVE_WEB_CLIENT_ID, DIC_DRIVE_WEB_CLIENT_SECRET, and a fresh random 24+ character DIC_DRIVE_SETUP_PASSPHRASE. Do not put credentials in Git, issues, screenshots, chat or public app configuration.
3. On any browser visit https://app.dialincollective.com/api/owner-drive-connect, enter private owner passphrase, sign into the Google account owning the existing private folder, approve only drive.file and select the EXISTING DIC Automated Encrypted Backups folder (ID 1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf). No new folder, no member Google account connection. Session has short-lived HMAC CSRF cookie and PKCE; Google token is shown only after exact folder, disposable upload/readback MD5, size, parent and trash verification.
4. Copy the refresh token directly into GitHub Actions secret DIC_DRIVE_REFRESH_TOKEN and add the Web client ID/secret directly as DIC_DRIVE_CLIENT_ID and DIC_DRIVE_CLIENT_SECRET via GitHub Settings > Secrets and variables > Actions. Never transmit values in chat. Disable the setup function after completion.

## Automated GitHub operations
Once owner consent and GitHub encrypted secret names are confirmed, ChatGPT creates a later source-bound docs/DIC_DRIVE_OAUTH_SMOKE_REQUEST.json push on protected operations main. This automatically triggers the disposable GitHub runner smoke; there is no manual Run Workflow step and no real archive upload in that smoke. Review exact hosted result and folder.
Only after a real runner success does a separate reviewed operations change enable the guarded scheduled Drive courier. Confirm first actual scheduled GitHub encrypted ZIP in correct owner-private folder with SHA-256, bytes, Drive MD5, direct parent and dedupe. Only then disable original Apps Script trigger. Preserve historical archives, recovery, 30-day retention and backup watchdog.

Google Web OAuth One Pick actual behavior remains UNVERIFIED; source tests do not demonstrate provider acceptance. Historical desktop helper scripts remain optional fallback, not required. No GitHub requests, provider configuration, production writes or cutover occur merely by staging this code.
