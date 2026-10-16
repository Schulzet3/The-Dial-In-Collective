# Consolidated release and recovery continuation — October 16, 2026

**CURRENT-STATUS PRECEDENCE — October 16:** Read [CURRENT_STATUS.md](CURRENT_STATUS.md) first. This lengthy document preserves successive, dated work-mode and chat handoffs; earlier “next step” sections intentionally remain as historical evidence. Do not follow those earlier steps where later acceptance has already passed (real nonadmin invite, privacy/admin denial, production Netlify SSO removal, automatic Drive delivery, exact encrypted backup restoration, synthetic alert delivery, Cloudflare root redirect and support mail). No re-approval or repeat screenshot is required for a test already evidenced. Complete hosted-managed-provider reconstruction remains unverified.

## Current handoff for return to chat — October 16, 10:27 America/Denver

Trevor reports: “I am signed in and refreshed the page. Everything is still there.” This confirms, by owner observation, that the existing signed-in session still displays the expected coffees and shot history after refresh on the published build. It is not evidence of a fresh sign-in, a complete new-shot flow, or another user's access.

The owner asked to finish the necessary Work Mode housekeeping and return to ordinary chat promptly. This handoff records the completed work and outstanding checks so discussion can continue without another deployment.

**Completed and saved**
- Protected application release is live at https://app.dialincollective.com, release SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`, Netlify deploy `6ad24660d0c6bdff2c065586`. Release/build, mobile and isolated SQL checks passed; existing production data fingerprints were unchanged.
- Owner now confirms expected data remains visible after refreshing the signed-in app.
- Exact-release backup is pinned and the approved private offsite copy is independently checksum-verified: https://drive.google.com/file/d/1aRSQAhBEFDJumavdz_kOQdsXOI0gekB5/view .
- Canonical product decisions remain in `docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md` and `docs/DECISION_LEDGER_2026_10_14_UX.json`, alongside the existing specifications and addenda. This handoff changes no Locked decision.

**Unverified or unfinished**
1. Owner's complete Log Shot → Rate → Recommendation acceptance on the released build and a fresh authentication attempt.
2. Genuine owner-selected nonadmin signup, email delivery/confirmation, admission, account isolation and admin denial.
3. Decryption/restoration of this exact encrypted backup; complete isolated hosted Supabase/Auth/Netlify/DNS/email reconstruction; automated courier execution, retention and delivered failure alerts.
4. Current Netlify billing balance after the release. The user's additional workspace credits are not evidence of a Netlify credit balance.

Keep the existing team SSO protection, beta admission and disabled historical-import saving. Refresh the billing ledger before any additional production release. Never ask for the private recovery key in chat. Further user acceptance and planning can continue in ordinary chat; technical execution remains available when needed. No additional production deployment was performed to create this handoff.

The sections below are chronological evidence. Their earlier pending/rejected checkpoints are superseded by the later verified release and approved offsite-upload records.

## Authorization and protected state

Owner approved the consolidated release, then real beta-account/integration and complete hosted recovery verification in the preceding session, and requested continuation in this session. GitHub writes now succeed. Supabase migration/Edge deployment and Netlify publication are not yet performed at this checkpoint.

Keep Netlify team SSO for all deployments, beta admission, all Locked product decisions, and the closed historical-import gate. Read-only production counts: 1 Auth user, 1 admitted member/admin, 4 canonical coffees, 4 submissions, 14 shots, 0 Storage objects. `saves_enabled=false`, `recovery_verified_at=null`, owner import exception fields null.

## SQL corrections and meaningful validation

The previously unpublished `20261016053000` migration used `min(uuid)`, which has no installed aggregate in production PostgreSQL. Replace it with `min(uuid::text)::uuid` while preserving the unique-match count guard. Rename a composite variable named `found` to preserve the PL/pgSQL boolean `FOUND` flag in the trusted roaster lookup. These are implementation corrections, not product changes.

A new GitHub workflow applies the complete migration chain to a disposable, network-isolated PostgreSQL 17.11 container using no Supabase credentials or production data. It exercises historical foundation security at its matching migration stage and then current identity, approval, admin and preview behavior. Auth schema/UID fixtures are explicitly test doubles; this is not hosted Auth/JWT recovery proof. Initial runs exposed an old test's obsolete direct-write assumptions, a container initialization race, and a Node assertion tied to the broken SQL syntax; those harness assumptions are corrected without broadening application privileges.

## Independently downloaded offsite archive

Both private Drive copies of `dic-nightly-12051176137.zip` were downloaded independently in this session. Each is 380078 bytes; SHA-256 `675e97225ee39924cc3eb0c1f53060fde5e1dd9813b0250c9e2a9da642dbc092`; ZIP CRC check passes; sole member `backup.age`. This matches the GitHub artifact checksum in the supplied handoff.

- Earlier manual copy: https://drive.google.com/file/d/1bDJjjE0Y45nsXNQPUrWJs37fg_-M-LFn/view — created 15:07:04 UTC.
- Later copy: https://drive.google.com/file/d/196Q6ijQAvcy7X75TSgTNbE39m9oPzB87/view — created 15:20:36 UTC, in the same private folder.

The later timestamp matches the pattern of earlier daily Drive arrivals. That is consistent with the configured courier, but Apps Script execution provenance, retention deletion and delivered failure alerts have not been independently verified. No ciphertext was decrypted here; exact-archive restoration still requires the owner's private key locally. No plaintext backup or private key belongs in GitHub.

## Remaining hosted recovery scope

Recreate an isolated hosted Supabase/Auth and protected Netlify environment; capture secret-free Auth/provider, SMTP, DNS/email and hosting settings; keep credentials in the owner's vault; verify genuine nonadmin login and account isolation. Verify the actual encrypted archive restore and courier alert delivery. Pin the scheduled backup source to the verified published release SHA after publication. Do not claim full reconstruction based on the isolated SQL tests or archive checksum alone.

## Verified published release — 15:44 UTC

- Netlify deploy `6ad24660d0c6bdff2c065586` is ready and published at `2026-10-16T15:44:45.260Z`, exact Git SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`, branch `development/backend-foundation`, https://app.dialincollective.com. Team SSO remains required for all deploys. Secret scan: 153 files, zero matches.
- Pre-release source CI: [38925913130](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38925913130), 198/198 tests, lint, build, asset integrity and synthetic browser checks passed. Exact release SHA CI/build [38926386533](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38926386533), mobile regression [38926386535](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38926386535) and isolated SQL [38926386517](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38926386517) all passed.
- Supabase migration `dic_url_first_and_autofill_preview` is applied as hosted version `20261016154252`; its checked-in source filename retains the staged timestamp `20261016053000`. Existing admin migration similarly maps checked-in `20261014211500` to hosted `20261014212829`. Reconcile these names/versions before using a CLI push against existing production; do not replay either migration merely because timestamps differ. Fresh isolated application of the complete source chain passes.
- `dic-preview-coffee` v1 and `dic-verify-coffee` v3 are ACTIVE, JWT verification true. Downloaded deployed file contents match the approved GitHub sources exactly, including shared parser dependencies.
- Five production SQL regression suites passed inside rolled-back transactions: coffee identity, automated approval, admin dashboard, simulated cross-account isolation, URL preview/release guardrails. These do not prove real Auth-issued user JWT/email/browser behavior.
- Full-row fingerprints of coffees, shots, library entries and submissions are unchanged after migration and tests. Counts remain 1 Auth user, 4 coffees, 14 shots, 4 submissions; 42 first-party tables; every public table has RLS. Preview test quota rows are zero after rollback. Import saving remains disabled and recovery timestamp null.
- Security advisor is unchanged: four intentional private deny-by-default tables, plus [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Hosted plan support/settings still need checking; no Auth policy change was made.
- Main backup workflow commit `792c8eb9734ad310e6da82fa762d877ce7bacc5b` pins its source checkout to this exact published SHA and preserves 30-day ciphertext artifact retention. Advance this pin only after verifying a future published release. Main hosts backup infrastructure; application code is not merged into main.
- The 985-credit screenshot predates this release. Actual post-release billing is unknown; the ledger refresh flag is re-enabled, blocking another production release until a fresh snapshot is recorded.

**Next acceptance:** owner login on the new build and Log Shot → Rate → Recommendation; then an owner-selected genuine nonadmin account with delivered email, correct redirect/admission, account isolation and admin denial. Keep SSO. Full hosted Supabase/Netlify/DNS/email reconstruction and exact encrypted-archive restoration are still incomplete.

## Post-release encrypted archive and offsite upload blocker

The source-pinned backup workflow [38926581554](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38926581554) succeeded after publication. GitHub artifact `12056578138`, filename `dic-nightly-12056578138.zip`, is 443225 bytes. Independent download matched provider SHA-256 `e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f`; ZIP CRC passed and sole member is `backup.age`. It has not been decrypted/restored in this session.

An attempted manual upload of this new ciphertext to the existing Drive folder was rejected by automatic approval review: sensitive organizational backup, destination/explicit payload authorization not sufficiently established. **No new offsite upload succeeded.** A read-only follow-up confirms the folder is named `DIC Automated Encrypted Backups`, is not shared, and has only an owner permission. Prior-context search nevertheless found differing Google account references and no exact user approval for this folder/manual-upload scope. Obtain explicit destination confirmation before retrying; do not work around the rejection. Earlier October 16 Drive copies remain independently checksum-verified, but predate this release.

Destination awaiting confirmation: https://drive.google.com/drive/folders/1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf . No backup keys, plaintext or credentials were exposed. This push-triggered verification run does not qualify for the Apps Script courier, which handles scheduled/manual-dispatch runs. Do not relabel the run or trigger an indirect transfer to bypass the rejected manual upload.

## Offsite upload blocker resolved — explicit owner approval

The owner answered “Yes I approve” after being shown the exact encrypted filename, connected Google account and destination folder. That explicit approval authorizes this manual ciphertext upload and resolves the blocker recorded above.

- Uploaded `dic-nightly-12056578138.zip` at `2026-10-16T16:06:26.923Z`.
- Drive file: https://drive.google.com/file/d/1aRSQAhBEFDJumavdz_kOQdsXOI0gekB5/view .
- Verified parent: `1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf` (`DIC Automated Encrypted Backups`).
- Read-back metadata: 443225 bytes, `application/zip`, `shared=false`, only an owner permission.
- Independently downloaded the new Drive file after upload. SHA-256 `e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f` matches the original GitHub archive exactly; ZIP CRC passes; sole member `backup.age`.

This verifies the authorized offsite ciphertext copy. It does not verify decryption, restoration of this exact archive, automated courier execution/alerts, genuine nonadmin authentication, or complete hosted reconstruction. No plaintext backup or private recovery key was uploaded. The application release and access restrictions are unchanged.


## Follow-up after the October 16 real nonadministrator acceptance — 18:16 UTC

**Real browser acceptance, reported and screenshot-confirmed by owner:**
- The owner completed real Log Shot → Rate → Recommendation and fresh-session persistence checks on the published release, beyond the earlier 10:27 checkpoint.
- A separate owner-controlled account received a real confirmation email, completed confirmation, and successfully redeemed a genuine single-use 24-hour beta invitation. Read-only production checks then found two confirmed Auth users, two admitted members, and one sole administrator; the used invitation has no remaining validity.
- While signed in as the second account, direct navigation to \`/admin.html\` displayed “Admin Access Unavailable / Administrator access required”; the owner provided a screenshot. This is real browser evidence of a denied administrator UI, not proof of all raw HTTP denial paths.
- The same second account showed an empty personal workspace with none of the owner's coffee library or shot history. Production owner-bound counts at this checkpoint: administrator 4 library entries, 16 shots, 16 private notes and one setup; nonadministrator zero in each category. Previous rollback-only RLS/database-role cross-account tests passed independently. A direct adversarial multiaccount API test is not yet recorded.
- Netlify site visitor access was deliberately changed under the owner's explicit approval: **production no longer requires additional Netlify team SSO; non-production previews still require team SSO**. The owner independently confirmed the production login prompt was removed. Supabase email verification, beta invitation/admission, account-based RLS, and sole-admin checks remain. The approved decision and precise supersession were recorded in \`MASTER_SPECIFICATION_BACKEND_ADDENDUM.md\` and \`DECISION_LEDGER_2026_10_14_UX.json\`. No Netlify redeploy occurred.

**Recovery checks re-read at this checkpoint, without state changes:**
- The private exact-release [Drive archive](https://drive.google.com/file/d/1aRSQAhBEFDJumavdz_kOQdsXOI0gekB5/view) still exists, 443225 bytes, not shared, owner-only permission, in the private \`DIC Automated Encrypted Backups\` folder. Historical independent archive byte verification and matching GitHub SHA-256 are recorded above.
- GitHub backup run 38926581554, artifact 12056578138, succeeded. The workflow job explicitly reports snapshot counts from **15:46 UTC: 1 Auth user, 14 shots, 4 verified coffees, 4 library entries, 4 approved submissions**, prior to the real second-account and two later shots. The valid encrypted backup is **not** a snapshot of today's eventual 2-user/16-shot state; a new subsequent snapshot is required to protect those newer changes.
- Main workflow \`.github/workflows/nightly-backup.yml\` has UTC cron \`23 9 * * *\` (09:23 UTC every day), 30-day GitHub artifact retention, production source pinned to verified published SHA, encrypted \`backup.age\` with private key kept off-runner. A future scheduled run/Apps Script Drive courier/alerts/retention has not yet been observed after the release. Job configuration alone is not execution proof.
- Actual restore of this exact ciphertext and full fresh hosted Supabase/Auth, Netlify, DNS and SMTP reconstruction remain **unverified**. Old owner's 6/6 local decrypt verification and a *different* fresh-source isolated SQL restore are meaningful evidence but not substitutes. Never upload the private SSH/age key, unencrypted dump, SMTP credentials, or service-role secrets to the repo or ordinary chat.
- Production import saving remains disabled. There was no mutation of user data or any environment during this evidence review. No Netlify deployment or credit spend took place.

**Next recovery gate:** Observe first scheduled encrypted backup and the automatically delivered private Drive copy **with the current two user accounts and shot data**, validate age/failure alerts/retention, and perform an isolated restoration of the actual ciphertext with private-key custody preserved. Keep operator-recovery steps separate from the ordinary beta Settings interface under the newer Locked UI amendment.


## Exact-archive isolated-restore preflight — owner direction, October 16

The owner expressly instructed to proceed using the **most recent already verified backup** and not delay testing to capture the two newer shots or second Auth account.

- Selected original GitHub artifact: run \`38926581554\`, artifact \`12056578138\`, \`dic-nightly-12056578138.zip\`, created 2026-10-16 15:46 UTC.
- Downloaded original archive from GitHub Actions to an independent isolated review environment: 443225 bytes, SHA-256 \`e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f\`; matches GitHub manifest and previously checksum-matched private Drive counterpart. ZIP central directory/CRC fully PASS. Sole member \`backup.age\`, 443091 bytes, SHA-256 \`705346ef5f81a7489e5c76a75120301a1bb0c7480c4ff7eafa049c23694dcc99\`. Header is valid age-v1 SSH-Ed25519 encrypted format.
- Expected observed post-export inventory in that backup run: **1 Auth user, 14 shots, 4 verified coffees, 4 library entries, 4 approved submissions**. These are run-time counts, not verified restored data. The newer two shots and second account will not be present by user choice.
- **Exact ciphertext NOT YET DECRYPTED/RESTORED.** The sole existing private SSH/age recovery identity was intentionally retained on the owner's Mac and not transferred to ChatGPT, GitHub, Drive or Supabase. Having valid ciphertext and public recipient alone is insufficient to decrypt. Do not substitute fresh-source re-dumps or transaction-based tests for proof of restoring this exact encrypted archive.
- No live production writes, new paid Supabase instance, Netlify deployment, private-key transfer, or extra hardware/software requirement occurred during this preflight.
- To complete an exact-archive drill while respecting offline key custody, explicitly agree on a one-time **local decrypt and re-encrypt to an ephemeral test-only recipient**, then transfer only the separately encrypted archive to an isolated testing environment whose handling of decrypted Auth/coffee data is owner-authorized. Alternative: entirely local isolated PostgreSQL restore controlled by the owner. Never ask the owner to paste their permanent recovery key or upload plaintext into chat.


## One-time exact archive restore: isolated runner ready, awaiting owner rewrap — October 16

The owner explicitly approved a **one-time encrypted transfer and isolated cloud restore** using artifact \`12056578138\`, allowing temporary processing of recovered Auth/coffee content in isolation. The owner's permanent private SSH/age recovery key **must stay on the Mac** and may never be uploaded or pasted.

- Verified original \`dic-nightly-12056578138.zip\`, GitHub/Drive SHA-256 \`e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f\`; contained \`backup.age\` SHA-256 \`705346ef5f81a7489e5c76a75120301a1bb0c7480c4ff7eafa049c23694dcc99\`.
- A one-time, **public-binaries-only** GitHub Actions workflow created an official PostgreSQL \`17.11\` + \`age\` offline rootfs utility kit (run \`38949369852\`, PASS). The job accessed no Supabase data, secrets or protected backup. A second run \`38949986389\` validated official macOS \`age\` v1.2.1 package checksums (PASS) for architecture-specific temporary downloads.
- Isolated disposable PostgreSQL \`17.11\` **successfully initialized, started, answered a SELECT, and shut down**, with local Unix-socket-only connectivity and \`listen_addresses=''\`. This checks runner capability, **not yet restoration of the actual backup**. No Supabase project, Netlify deploy or paid infrastructure was created.
- Temporary test recipient (public only): \`age15dgt76xr4dur60qjg9j8gy7vadtpds26pryj78yqh74nc79cv4dq4vkmrn\`. Its private identity is held solely in the transient isolated runner environment. **Do not put the private identity into GitHub, handoff docs or user messages.** If this runner session disappears before restoration, issue a new test-only recipient and regenerate the local handoff helper; never pretend an old key still exists.
- A self-contained \`DIC_Isolated_Restore_Package.zip\` was created for the owner in the chat session. It contains the exact encrypted GitHub backup ZIP and a Bash/macOS \`DIC_One_Time_Restore.command\` helper. Helper SHA-checks the original input, locally asks Finder to select the existing private recovery identity, automatically uses the verified installed \`age\` binary or a temporary pinned official release, streams decryption immediately into re-encryption to the temporary public recipient, and writes a test-only `.age`, packages it into `~/Downloads/DIC_Restore_Test_2026-10-16.zip` (containing only the reencrypted ciphertext), and deletes the intermediate `.age`. The original key and plaintext dump are not copied or uploaded by this helper. Script Bash syntax and packaged backup bytes were independently checked.
- **Next human action:** Download and unzip the helper package, then run \`bash "$HOME/Downloads/DIC_Isolated_Restore_Package/DIC_One_Time_Restore.command"\` on the Mac, select the private identity locally, and attach ONLY the resulting `DIC_Restore_Test_*.zip` containing the newly reencrypted ciphertext to this chat. No Mac Docker or permanent installation is required.
- **Next operator action on receiving that ciphertext:** Verify envelope decrypts with the ephemeral test private key, validate manifest/source/dump checksums, restore the **exact** included \`database.dump\` into a fresh isolated PostgreSQL \`17.11\` database, check Auth user/4 coffees/14 shots/4 library entries/4 approved submissions and relevant RLS/functions/policies. Report any unsupported hosted-only Supabase extensions and whether restore was full or partial. Delete plaintext from test environment and retire one-time CI helper after the test. Do not modify live database.


## Verified exact encrypted archive restore — October 16 (completed)

**PASS: Genuine offline restore of original artifact 12056578138.** After owner approval and a one-time encrypted handoff, the exact decrypted backup's original PostgreSQL 17 custom dump was restored to a fresh socket-only isolated PostgreSQL 17.11 instance; 1 Auth user/identity, 4 verified coffees, 14 shots, 4 personal library entries, 4 approved coffee submissions, and all 42 first-party tables were recovered. All 44 app/Auth source COPY-table counts matched restored table counts. RLS metadata matched live source (42/42 RLS tables, 40 policies, 99 indexes, 19 triggers, 48 functions, 1 signup trigger); all 85 first-party FKs validated; original historical import gate remained disabled. Rolled-back owner, fake admitted nonadmin, unadmitted role simulations passed. Disposable PG, ephemeral private test identity, plaintext and fixtures were deleted. Production untouched, no Netlify deployment. **Not a full hosted Supabase/Auth/Netlify/DNS/SMTP reconstruction; dump lacks SQL grants and the test runner did not include supabase_vault.** The one-time public restore-toolkit workflow remains on `main`; attempted deletion was blocked by safety checks, so this nonsecret, unscheduled helper remains pending owner review. See [exact restore test report](EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md).

## Scheduled encrypted GitHub → Drive backups independently verified — October 16

**PASS, two consecutive scheduled runs:** GitHub schedule run `38749488029` (Oct 15, artifact `11980516369`) and `38912535489` (Oct 16, artifact `12051176137`) completed successfully. The matching ciphertext ZIPs in the private Drive folder were independently downloaded and each exactly matched the original GitHub artifact SHA-256, with ZIP CRC test PASS. This supports automatic delivery. The separate post-release artifact `12056578138` was uploaded manually under owner approval and is not cited as courier evidence. **PENDING:** direct Apps Script execution logs, actual error-path alert email receipt, installed trigger/retention review. Historical script setup includes `DIC_ALERT_EMAIL` and a three-hour poller, but delivered failure notifications are not yet proven. Detailed audit: [AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md](AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md). Do not compromise existing scheduled backups to force an error.


## Verified Apps Script synthetic backup alert delivery — October 16

**PASS (owner confirmed):** Existing `sendBackupAlert_()` was invoked by a test-only Apps Script function and its unmistakably labeled test message was received at the configured alert inbox. The scheduled GitHub→Drive backup and SHA matching were independently verified on consecutive days. This closes synthetic email-delivery testing only. **Still not tested:** actual failed-backup catch execution, 36-hour stale warning, and resilience when Apps Script itself stops; the current code cannot alert if its own trigger never fires. A separately scheduled independent watchdog is recommended. [Detailed audit](AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md). No live backup or production service was deliberately disrupted.


## Hosted-provider reconstruction inventory completed — 2026-10-16 (read-only)

Collected live Netlify visitor access, published release, env **names/scopes**, build config; Supabase project/region/Postgres/migrations/extensions/Edge versions/storage count; reconciled older source comments with latest owner-approved production-only SSO removal and independently verified backup/alert evidence. No credentials copied, new services funded, secrets modified or live deploy performed. **Remaining dependency:** actual Supabase Auth Site URL/redirect allowlist and SMTP/provider settings, Cloudflare/DNS reconstruction, vault credentials and replacement hosted Supabase/Netlify account-configuration drill. Start with owner screenshot of Supabase Authentication → URL Configuration. [Secret-free hosted provider recovery inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md).


## Owner screenshot: Supabase Auth callback configuration verified — October 16

Dashboard **Authentication → URL Configuration** shows Site URL `https://app.dialincollective.com/` and exactly two redirect allowlist entries `https://the-dial-in-collective.netlify.app/` and `https://app.dialincollective.com/`; no wildcards. Current app's signup/password-reset redirect calculation uses the page's actual `location.pathname`+`location.origin`; root production matches allowed URL. No settings changed. Keep old Netlify redirect allowed pending separate review. Next read-only checkpoint: Supabase Authentication → SMTP Settings (mask credentials). See [Hosted provider inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md).


## Owner screenshot: Supabase Resend SMTP settings verified — October 16

Dashboard **Authentication → SMTP Settings** shows custom SMTP ON, sender `no-reply@auth.dialincollective.com`, sender name `The Dial In Collective`, host `smtp.resend.com`, port `465`, username `resend`, and a stored masked password. The existing second account independently received genuine verification mail previously. No API key/password was viewed, copied, or changed. Recovery still requires access to Resend account/domain verification and owner-held replacement credential, plus accurate DNS. Next owner-assisted step: Resend → Domains → auth.dialincollective.com verified status and DNS records (no API keys). Details in [hosted recovery inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md).


## Owner screenshot: Resend sender-domain DNS verified (partial overall) — October 16

Resend's domain Events timeline shows **Partially verified** for `auth.dialincollective.com`, but outbound **sending enabled**, DKIM TXT `resend._domainkey.auth` **Verified**, and two DNS-only SPF-related CNAMEs (`rsend.auth` → `rsend.forge.rmta.net`; `send.auth` → `send.forge.rmta.net`) **Verified**. Optional DMARC `_dmarc` with `v=DMARC1; p=none;` appears; its status and absolute DNS location are not confirmed by the screenshot. Official Resend documentation explains partial verification is **one of sending/receiving capabilities verified**; DIC depends on outbound sending only via this provider, which independently delivered real signup confirmation mail. Do not mark whole Resend domain fully verified or silently add inbound receive settings. Next compare directly with the Cloudflare zone and forwarding (read-only). No changes made. [Detailed provider inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md).


## Duplication-prevention audit against full project history — 2026-10-16

**Source precedence:** Preserve the original canonical Master Specification/Decision Ledger and later approved amendments. For operational status, *later verified release/checkpoint and direct owner acceptance take precedence over older 'pending' checklists*. The uploaded `Build Web App.pdf` and `Build Web App(1).pdf` are byte-identical and must be reviewed only once.

**DO NOT ask again without evidence of a new failure/config change:** Cloudflare root → app redirect (historically created, **owner “yes it works”**), active `support@dialincollective.com` Cloudflare forwarding (**owner real test “It worked!”**), working Supabase/Resend authentication mail (real password reset received; real second-user confirmation received), Supabase Site URL/redirects, app CNAME/HTTPS, Resend sending DNS/SPF/DKIM, Netlify production SSO removal, first admitted nonadmin invitation/account, denied nonadmin admin portal, empty other user's personal workspace, owner shot/recommendation flow, scheduled GitHub → Drive encrypted byte integrity, exact ciphertext isolated PostgreSQL restore, synthetic failure-alert mail delivery, or the daily ChatGPT watchdog. These are **verified for the observed scopes**, not proof of a complete new hosted-service reconstruction.

**Distinct remaining work:** Full rebuild of the managed hosted Supabase Auth/JWT/API roles/secrets/email/Netlify configuration in a **new isolated provider project**, with any cost explicitly approved before provisioning; actual nonadmin coffee-entry URL/pending/source-validation HTTP flow; device-specific/offline/multidevice sync acceptance; provider credential recovery access planning (no secret disclosure); optional auth/DMARC/retention hardening. Do not conflate optional hygiene with broken current functionality. Avoid collecting further Cloudflare/Auth/Resend screenshots simply to restate existing settings. For complete provenance see [reconciled hosted provider inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md).

**No provider settings, database rows, production deployment, billing, Locked product choices, or security gates changed in this audit.**


## Completed cleanup: one-time GitHub restore toolkit removed — October 16

One-time public-only `.github/workflows/one-time-isolated-restore-toolkit.yml` was successfully **deleted from `main`** in commit `e9822d271dbe1ace9e89d7ea9a7f769bc72b486f` following the exact encrypted snapshot restore. Earlier paragraphs reporting a blocked attempt are historical and now superseded; no remaining one-time workflow cleanup required. Persistent scheduled backup and recovery drill workflows remain intact. Project duplicate `Build Web App(1).pdf` is byte-identical to `Build Web App.pdf`, but current Project attachment controls do not permit deleting it from this chat; keep it and deduplicate indexing/read it only once.
