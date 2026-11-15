# Issue #28 — browser-based Google Drive OAuth with Web Picker

STATUS: DEVELOPMENT ONLY. The owner reports saving a new Web application OAuth client; live Google Cloud readback and Google Drive consent remain unverified. Existing Apps Script courier and all archives unchanged.

## Corrected design (no Mac/CLI)
Google's official Picker documentation distinguishes the desktop/mobile One Pick OAuth URL parameters from the browser Google Picker JavaScript API. Earlier source PR #2818 wrongly reused trigger_onepick with a Web OAuth client and expected picked_file_ids in its callback; source tests did not validate that behavior. Correct implementation must use gapi.load('picker'), PickerBuilder, short-lived OAuth access token, restricted browser API key and Cloud project number (Picker app ID).

## Owner Google Cloud setup
1. Keep EXISTING The Dial In Collective project, OAuth In production and Desktop client. Owner reports new Web OAuth client SAVED with server redirect https://app.dialincollective.com/api/owner-drive-connect . JavaScript origin need not be set for this server-side code exchange; Web Picker is called using the exchanged access token, not browser OAuth implicit/token flow.
2. Under APIs & Services > Library, enable Google Picker API and confirm Google Drive API is enabled.
3. Under APIs & Services > Credentials, create an API key and RESTRICT it to Websites: https://app.dialincollective.com/* and https://docs.google.com/* . Google documents the second origin as necessary for its embedded Picker. API restrictions: Google Picker API, plus Drive API only if genuinely required for browser activity. Don't leave unrestricted keys.
4. Note your numeric Cloud project number for Picker App ID. Do not send client secrets, API keys or OAuth tokens to ChatGPT.

## Later owner setup (after separate Publish command and full exact-source CI)
Once verified source is approved for one-use production publication and Netlify route exists, configure these Netlify PRIVATE runtime environment variables directly in the Netlify console:
 DIC_DRIVE_SETUP_ENABLED=true
 DIC_DRIVE_WEB_CLIENT_ID (new Web OAuth client ID)
 DIC_DRIVE_WEB_CLIENT_SECRET (new Web OAuth client secret)
 DIC_DRIVE_SETUP_PASSPHRASE (fresh strong private password, 24+ characters)
 DIC_DRIVE_PICKER_API_KEY (restricted Google Picker API key)
 DIC_DRIVE_PICKER_APP_ID (numeric Cloud project number)

Open https://app.dialincollective.com/api/owner-drive-connect on any browser, enter private owner setup passphrase, grant only https://www.googleapis.com/auth/drive.file through Google OAuth, then click Select Google Drive folder using the actual browser Picker. Choose the EXISTING DIC Automated Encrypted Backups folder ID 1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf. No new folder or extra scope. The server uses exact origin, HMAC/PKCE state, short-lived encrypted HttpOnly token cookie, CSRF, strict folder identity and a disposable 53-byte upload, readback MD5/size/parent, and confirmed Trash cleanup. Only after proof does it return the refresh token privately in the owner browser. No real archive touched.

Copy refresh token directly into GitHub Actions secret DIC_DRIVE_REFRESH_TOKEN. Directly add Web client ID and secret as GitHub Actions secrets DIC_DRIVE_CLIENT_ID and DIC_DRIVE_CLIENT_SECRET. Never send credentials to ChatGPT, paste into issues, commit into Git, or put in screenshots. Disable DIC_DRIVE_SETUP_ENABLED immediately after handoff.

## GitHub autonomous backup courier follow-up
Main operations draft PR #2684 remains DRAFT and inert. It includes a future push-only request-file triggered disposable GitHub runner smoke (no manual Run Workflow by owner) and resumable encrypted ZIP courier with exact artifact SHA-256, Drive MD5/size/folder and duplicate guard. After owner Google consent + secrets, verify real runner disposable upload/readback/trash, then install reviewed scheduled courier in a separate authorized ops change and verify one real scheduled encrypted ZIP in direct private folder. Only then disable old Apps Script trigger. Preserve archives, age recovery keys, restore drills, retention, old courier until proven, watchdog and member Auth/privacy. No deployment, provider changes, member/database access or backup dispatch authorized by staging these source files.

Limits: Google Picker browser integration remains provider UNVERIFIED until actual owner visit; no CI PASS proves Google approves scope or folder permissions. No user should attempt to visit unpublished function or share secrets through ChatGPT.

## Netlify runtime credential timing (official provider constraint)
Netlify Functions read values fixed at deployment. Changes to private Netlify runtime environment variables require a **new build/deploy**, not simply saving variables in the UI (Netlify Functions environment variables official docs, November 2026). Therefore, AFTER the owner issues a NEW Publish instruction and the source is certified READY, owner should privately set the six approved Functions-scope environment variables BEFORE the one-use production build to avoid a second publication. Never auto-publish, bypass the DIC controller, or introduce secrets into Git. The owner can configure Google Picker API and restricted key now; entering the Google key into Netlify is a later step. No provider credentials have been set during source authoring.
