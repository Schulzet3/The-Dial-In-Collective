# Managed Supabase recovery drill — October 16, 2026

**Latest acceptance (2026-10-16): CORE HOSTED RESTORE PASS** — new Supabase and protected Netlify application rebuilt, real archived Auth account/data restored, owner logged in using original account and verified four coffees, 14 shots and working Admin Dashboard. **Some wider disaster scenarios remain NOT VERIFIED** (see final acceptance section). Earlier PARTIAL checkpoints below are chronological evidence only; their former 'next' steps are superseded.

## Authorization, cost and separation

- The owner explicitly approved using the existing `The Dial In Collective` Supabase organization to conduct a disposable isolated hosted-recovery test. The provider returned an exact new-project quotation of **US $0 per month** for organization `wasoqqlcjozuuvvbedme` (Free plan). The provider requested a $0 cost-confirmation ID before creating the project; no nonzero spending was authorized.
- Created independently hosted recovery project **`DIC Isolated Recovery Drill 2026-10-16`**, project ref `bgstplvefumsnplhqpvd`, region `us-east-2` (matches production), `ACTIVE_HEALTHY`.
- Production is **`azviqqejypsefzilgonr`**. All write operations documented here were targeted only at the new recovery ref. **No production migration, user/shot data edit, Netlify deployment, DNS change, provider secret extraction, or paid subscription occurred.**
- The temporary project is still active to support follow-on Auth/Netlify end-to-end tests; do not forget to archive/delete it via owner-approved provider dashboard when the drill completes, and do not delete the live production project by mistake.

## Managed schema reconstructed from real GitHub source

- All **21 sequential SQL migrations** were retrieved directly from `development/backend-foundation/supabase/migrations/` and applied, in order, to the empty recovery project. No hard-coded live Supabase project reference or owner UUID appeared in those checked-in SQL files. The dated live migration *names* match, though **managed Supabase assigned fresh migration-version timestamps** on the recovery project (the production migration timestamps are separate historical metadata, not reusable identifiers).
- One **important unmanaged hardening divergence was discovered**: the existing production project additionally has `public.rls_auto_enable()` (security-definer, private to service role) and enabled `ensure_rls` DDL event trigger. This automatically enables RLS for newly created `public` tables, but the 21 repository migrations only contained the conditional *revoke* of the function and did not create it.
- We added **one recovery-only migration** from [scripts/recovery/restore_public_rls_creation_guard.sql](../scripts/recovery/restore_public_rls_creation_guard.sql) to the isolated project, creating the missing handler/event trigger and keeping client execution revoked. Its own disposable `CREATE TABLE` assertion confirmed the event trigger automatically enabled RLS, then discarded the probe table. This script is deliberately **outside** the ordinary production migrations; do not quietly insert it into a production release. Its effect is to reproduce the existing live safeguard, **not** to revise a Locked policy.

### Independent read-only structural comparison

| Invariant | Live production | Isolated managed recovery | Result |
| --- | ---: | ---: | --- |
| First-party application/private tables | 42 | 42 | PASS |
| Tables with RLS enabled | 42 | 42 | PASS |
| RLS policies | 40 | 40 | PASS |
| First-party indexes | 99 | 99 | PASS |
| First-party ordinary triggers | 19 | 19 | PASS |
| Application/private functions | 48 | 48 | PASS |
| Validated first-party foreign keys | 85 | 85 | PASS |
| Enabled `ensure_rls` DDL event trigger | 1 | 1 | PASS after recovery-specific repair |
| Historical import saving enabled | No | No | PASS |

- Compared normalized MD5 fingerprints from provider read-only SQL. Table names/RLS flags, column definitions, index DDL, ordinary trigger DDL and **47 identical non-guard function definitions** matched exactly. Raw policy fingerprints differed because provider role numeric OIDs differ between separate projects; per-policy names, **resolved role names**, actual expressions, permissive flags and commands **matched for all 40**.
- Installed extension names, schemas and versions match across both projects: `plpgsql`, `supabase_vault 0.3.1`, `pgcrypto`, `pg_trgm`, `unaccent`, `pg_stat_statements`, `uuid-ossp`.
- The fresh recovery project has **0 Auth users, 0 admitted members, 0 administrators, 0 coffees and 0 shots**. Seeded 4 allowlisted roaster-directory entries exist from migrations. The actual October 16 encrypted backup **has not been imported** into this hosted project yet.

## Reconstructed Supabase Edge functions

Both production `ACTIVE` functions' uploaded source files were individually compared byte-for-byte with the live GitHub files and all **five file comparisons passed**. The same source was deployed, with Supabase gateway `verify_jwt=true`, to the new hosted project:

| Edge slug | Recovery status | Managed bundle SHA-256 | Matches production? |
| --- | --- | --- | --- |
| `dic-verify-coffee` | ACTIVE, v1 (prod v3) | `872e12da9cb754ec4bd294dfa3a5616c46fbd6b6a28984660ca0024913ff1a4d` | Yes |
| `dic-preview-coffee` | ACTIVE, v1 (prod v1) | `c67b447a29ba69e5d0f9fd2cb63adad88b247e617fd107bc644746a019c0c5b6` | Yes |

Bundle version numbers differ because these are freshly deployed function identities. Identical bundle hashes and JWT flags are strong code/config evidence, **not** proof of a full external signed-in HTTP fetch/email interaction.

## Isolated database role/security acceptance

A rollback-only test created three temporary Auth subjects entirely within a single transaction (owner/admin; confirmed admitted ordinary member; unadmitted person). It verified the normal member is admitted/nonadmin with empty owner-scoped workspace; the admin can read the sanitized dashboard; the ordinary member is denied dashboard access; the unadmitted account is not admitted and cannot call protected personal state. The transaction rolled back all fixture users, roles and changes. A first attempt at this test was rejected before execution due to a PL/pgSQL variable name colliding with a column; a corrected, fully rollback-only test **PASSED**. No test emails were sent and no temporary accounts persisted.

## Outstanding before declaring FULL hosted disaster recovery

1. **Secure data import:** Original encrypted archive `dic-nightly-12056578138.zip` (verified earlier and successfully restored in a completely separate offline PostgreSQL drill) still has to be imported into this new Supabase instance if the owner wants a full managed restore of **the actual archived account/shot data**, including Supabase's managed Auth user/identity tables. The original age recovery private key remains on the owner's Mac. Never request it in ChatGPT, GitHub or a hosted runner. Re-encryption and data handling need a separate owner-controlled safe transfer; no decrypted owner data has yet been placed in the hosted recovery project.
2. **Hosted Auth settings:** Reconstruct and verify Site URL/redirect allowlist, confirmed email/signup settings, actual SMTP/Resend credential in a secure owner-controlled dashboard (never in chat), password policy, project JWT signing strategy, and real recovery-account signup/confirmation/password reset/session persistence. Existing live settings are already **documented**; do **not** ask for the same production screenshots again. Supabase connector cannot directly export or change the managed Auth/SMTP settings.
3. **Recovered site:** A separate Netlify recovery frontend pointing at the isolated Supabase project, with nonproduction-only access restrictions; require a fresh Netlify credit snapshot/owner approval for any credited deployment. Do not rewire the live application or production DNS.
4. **Provider-level operational recovery:** Re-establish/rotate managed project credentials safely, verify Edge runtime access/HTTP, Cloudflare/Resend registrar and DNS configuration from the existing verified inventory, and document GitHub/Google Drive/Apps Script credential continuity (without exporting actual secrets).
5. **Final acceptance and teardown:** End-to-end signed-in restored app, nonadmin admission/admin denial, current-user data and coffee/recommendation behavior; capture restoration time/failures, cleanup/retire disposable project when authorized.

### Security advisor detail

Both production and recovery lints report four `INFO` notices for intentionally deny-by-default private tables with RLS and no direct policies. Production also has a `Leaked Password Protection Disabled` `WARN` advisory, while the new project's advisor response only listed the four INFO entries. This is **a hosted Auth configuration divergence to investigate**, not proof of a leak or authorization to weaken the restored project's setting. [Supabase password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

**Operational note:** Treat this drill as a new independent managed instance with matched schema/functions. The earlier complete exact encrypted ZIP -> offline PostgreSQL restoration remains separate evidence. Together they increase recoverability but do NOT yet prove full hosted recovery with authenticated users and running frontend.

## Protected recovery frontend published — 2026-10-16 22:06 UTC

The user manually published the prepared static recovery-site ZIP. Independent Netlify API check confirms separate project `fd4a4dba-0c71-4b06-be63-9f5f689aba1b`, deploy `6ad29fd7a4349d2132a0528c` **ready** with `https://dic-recovery-20261016.netlify.app/` and required team SSO on all deploys. The original production site remains on deployed SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8` / deploy `6ad24660d0c6bdff2c065586`. ZIP's static contents were verified prior to manual upload; provider connector confirms deployment but does not export published file bytes.

**Outstanding:** recovery Auth Site URL/redirect, recovery SMTP credential/settings, real archived account/data restoration into this managed project, browser acceptance, and optional Netlify usage cost refresh. Full hosted disaster recovery still PARTIAL. See [recovery Auth/frontend plan](HOSTED_RECOVERY_AUTH_FRONTEND_PLAN_2026-10-16.md).

## Encrypted handoff preparation for archived-data managed restore — October 16

The earlier one-time rewrap test private identity was deleted after the successful offline PostgreSQL drill. A **new independent one-time age recipient** was generated in the active isolated restore workspace for the **separate managed hosted Supabase import**; its private key remains strictly in the isolated operator runtime and has not been placed in GitHub or this handoff. New public test recipient: `age1jnlsdetgsq5dsgp8k726ahugg962nkpwhr3lgarhy9xq90t6eq7sv050t2`. Local sample encrypt/decrypt test **PASS**.

Prepared owner-download ZIP `DIC_Hosted_Recovery_Rewrap_2026-10-16.zip`, 446385 bytes, SHA-256 `3d2605ebada01b9a9bbedc76c9999d6b952892ef8b92b56725bceceb472d9ad8`. Contains the original verified encrypted `dic-nightly-12056578138.zip` (unchanged SHA-256 `e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f`) plus `DIC_Hosted_Recovery_Rewrap.command` Mac-only helper adapted from the **earlier successful tested** rewrap workflow. The helper selects owner-held Mac private identity using Finder; verifies exact original ZIP SHA-256; streams decrypted age ciphertext **directly into re-encryption** for the **new** one-time test recipient; packages the output into `DIC_Hosted_Recovery_Handoff_2026-10-16.zip` in Downloads. It writes no unencrypted database to the Mac, does not modify live production, needs no local Docker/Node install. Package ZIP integrity and Bash syntax were independently verified. The permanent recovery private key must never be uploaded to chat, Drive, GitHub, or provider dashboard.

**Pending owner handoff:** Download new Mac helper ZIP, unzip, run `bash "$HOME/Downloads/DIC_Hosted_Recovery_Rewrap_2026-10-16/DIC_Hosted_Recovery_Rewrap.command"`, and attach **only** generated `DIC_Hosted_Recovery_Handoff_*.zip` here. Do not send old already-uploaded `DIC_Restore_Test_2026-10-16.zip`: its test private key is gone; the previous ciphertext cannot be decrypted anew. The helper ZIP is a conversation artifact, not uploaded into GitHub or Drive. If the ephemeral private identity disappears before the owner sends the handoff, generate a **new** identity and helper; do not claim old key still available.

**Next operator steps after genuine encrypted upload:** Decrypt in isolated runtime, validate original archive source/manifest/checksums, and reconstruct original archived Auth user and 14 shots into the **existing isolated hosted Supabase project `bgstplvefumsnplhqpvd` only**. Account for the newly confirmed but not admitted separate test user already present; do not silently reset it or production. Match 44 table row counts to original snapshot with clearly stated retained staging additions. Validate new-project JWT/signin and recovered-history rendering with owner; fully tear down plaintext and one-time private key after passing. Never turn on the historical import-save gate. Current managed restore remains **PENDING**, not completed.


## ACTUAL hosted encrypted snapshot import — PASS, October 16 (newer than earlier PARTIAL notes)

**Source:** Owner provided encrypted handoff `DIC_Hosted_Recovery_Handoff_2026-10-16.zip`; ZIP SHA-256 `1330f860b59391020f6c67dcd60b67183d0038e89af93ed3be978d4542aea6d3`, single age ciphertext member (443,079 B), ZIP CRC PASS. The **new one-time recovery identity** successfully decrypted it. The actual inside-archive `database.dump` SHA-256 **`ac03773899c5e0ae686c619a6f9864ef6201db0a88db6aea23b296ccdd09155d` MATCHED** the verified original GitHub/Drive export and `manifest.json` (`dic-age-postgres-v1`, original project `azviqqejypsefzilgonr`, snapshot **2026-10-16 15:46:40 UTC**, exact app source commit `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`). This is the older snapshot intentionally containing **one original admin and 14 shots**, not the live database's later 16 shots/two admitted users.

**Safe transport and deployment:** From the actual custom pg_dump, selected the **42 public/private app tables plus `auth.users` and `auth.identities`**, total **44 backed-up table streams and 141 archive rows**. Provider-specific Auth sessions/refresh tokens, platform migration tables, Vault and Storage system metadata were not replayed; managed services were provisioned fresh. Decoded COPY fields in memory into typed restore rows, transported a temporary **GPG/PGP AES-256-encrypted, compressed** JSON bundle via temporary encrypted-only private Library holding files, and invoked Supabase's connected SQL executor **only against** `bgstplvefumsnplhqpvd`. No original user's plaintext data or permanent Mac age/SSH private key was put in GitHub, Library or a user-facing chat message. Supabase evaluated the one-time encrypted payload in a short restore transaction; the one-time transport passphrase was not recorded in the project document.

**Recovery-only adaptations to a real managed provider:**
- Real GoTrue/Auth has provider-generated columns, so imported **only the source's explicit pg_dump columns** (not implicit generated fields); `private.shot_audit.id` / `private.dic_coffee_audit.id` use `GENERATED ALWAYS` identities and required a provider-supported `OVERRIDING SYSTEM VALUE` restore. Initial failed attempts rolled back atomically and left **0 imported shots**, **1 original staging test user**, and all **5 shot triggers enabled**.
- Only the **isolated recovery** project's four newly seeded roaster directory entries/aliases were replaced by the corresponding **original archived identities**, preserving source-backed references. The existing singleton import control was replaced by its original `saves_enabled=false` row.
- In the single checked transaction, `public.shots`' user-defined write-side triggers were temporarily disabled to avoid duplicating 29 archived audit events or mutating original equipment/provenance values; the five triggers were re-enabled **before commit**. The normal Auth account trigger was left enabled, and auto-created defaults for the restored owner alone were replaced with archived originals. The previously email-confirmed **separate recovery test user** was preserved.
- A fully populated 44-table import ran first inside **`BEGIN … ROLLBACK`** and passed checks on **all 141 rows** using typed column-specific semantic comparisons plus 44/44 table counts. Independent post-rollback read showed unchanged target and triggers. The same procedure then **COMMITTED**, with all validations applied before commit. Recovery audit-identity sequence highwaters were aligned to existing records (coffee audit `4`, shot audit `169`).

### Actual read-only post-commit acceptance

| Check | New hosted recovery project | Live production at the same read-only check |
| --- | ---: | ---: |
| Confirmed Auth users / identities | **2 / 2** (one archived owner + one separate fresh pending tester) | 2 / 2 |
| Administrators | **1 restored owner** | 1 |
| Admitted / unadmitted members | **1 / 1** | 2 / 0 |
| Verified coffees | **4** | 4 |
| Owner shots | **14** | 16 |
| Archived legacy-imported shots | **14** | 14 |
| Library entries | **4** | 4 |
| Approved submissions | **4** | 4 |
| Shot audit rows | **29** | 32 |
| Import batches | **1** | 1 |
| Mutation receipts | **14** | 16 |
| Roaster directory / aliases | **4 / 4** | 4 / 4 |
| Historical import saving | **disabled** | disabled |
| Storage objects | 0 | 0 |
| Enabled shot triggers | **5** | 5 |

Database security was independently rechecked after import: **42/42 RLS-enabled tables, 40 policies, 99 indexes, 19 ordinary first-party triggers, 48 app/private functions, 85 validated first-party FKs (0 invalid), and live `ensure_rls` guard**. There is no evidence of any production database/write, custom-domain, hosted Netlify production or payment change.

A rollback-only **actual restored-account** role simulation passed: original owner was admitted/admin, saw **14 private shots and 4 library entries**, could access the sanitized Admin Dashboard; the separate real confirmed recovery test user remained **unadmitted, nonadmin**, and was rejected by private-state and administrator RPCs. This is an in-database JWT-claim/role simulation, **not yet the final real HTTP/password login acceptance**.

**Cleanup complete to the tested scope:** The one-time age decryption identity, one-time GPG transport passphrase, encrypted staging payload and temporary local processing directory were deleted from the active container after the successful import. The two transient, encrypted-only Library transport files were moved to **Library trash** (this does not assert permanent deletion from provider retention). The owner's permanent recovery key remains on the Mac and was never transferred. Original user-uploaded encrypted handoff ZIP remains attached for provenance.

**Next distinct acceptance before FULL hosted DR:** Sign into the **protected recovery Netlify site** `https://dic-recovery-20261016.netlify.app/` as the **original archived administrator** using the original password (or a recovery-only password reset if it changed after the snapshot). Verify actual display of four coffees/14 shots and Admin Dashboard in the browser, then fresh session/refresh and optionally password-reset and another-user isolation HTTP paths. Do not use the separate pending tester or redeem another invitation simply to test restored admin access. Do not request another Mac key rewrap: data import passed. All Locked security and admission decisions remain unchanged.

**Status: HOSTED DATABASE/CORE AUTH ROW RESTORATION PASS; FULL END-TO-END HOSTED DISASTER RECOVERY still PARTIAL until real restored-account browser login is accepted and remaining provider continuity checks close.**


## Final owner acceptance, unresolved scope and teardown — 2026-10-16

**Owner-accepted real-browser PASS:** After the exact encrypted backup was restored into separate managed Supabase `bgstplvefumsnplhqpvd`, the owner **signed into the protected Netlify recovery website using the original recovered administrator account** and explicitly confirmed **all restored coffees/shots were present** and **Admin Dashboard opened**. This is genuine owner-observed frontend login and restored account access (not an independently instrumented HTTP/browser assertion). It supplements the earlier real *new test account* email-confirmation and recovery-hostname redirect PASS and 44-table/141-row actual database restore PASS.

**Independent read-only final inventory before any teardown** (recover/live):
- Recovery: 2 confirmed Auth accounts (restored admin + separate unadmitted test user), 1 administrator, 1 admitted account, **4 verified coffees, 14 shots, 4 library entries**, 42 first-party tables with RLS on, historical import disabled.
- Production: 2 confirmed Auth accounts, 1 administrator, **2 admitted**, **4 verified coffees, 16 shots, 4 library entries**, RLS on and historical import disabled.
- Published production Netlify deploy `6ad24660d0c6bdff2c065586` and team SSO restricted to nonproduction remained unchanged; separate recovery Netlify project `fd4a4dba-0c71-4b06-be63-9f5f689aba1b` still had ready deploy `6ad29fd7a4349d2132a0528c` with team SSO for all deployments at last read.
- The `main` nightly encrypted GitHub backup workflow remains configured and untouched. Previously verified source-inclusive GitHub → private Google Drive ciphertext copies plus owner-held Mac recovery key remain the durable recovery sources. Do **not** delete these originals.

**What remains explicitly NOT VERIFIED, not secretly waived:**
1. *Real recovery-specific password reset on the restored admin* (recovery SMTP real new-account confirmation already passed; production password recovery previously passed).
2. *New shot WRITE → taste rate → recommendation → refresh against the recovered hosted instance.* The recovered owner's existing history readback and SQL data/RLS checks passed, and production's real Log Shot → Rate → Recommendation previously passed. Distinguish these evidence scopes.
3. *Inviting and redeeming a new recovery-project beta code and wider nonadmin browser HTTP isolation.* Production had a real confirmed second nonadmin account and invitation; recovery had correct admission gate and a rollback-only role/RLS test, but the owner elected not to repeat the invite redemption on the recovery clone.
4. *An actual outage/failover including moving apex/app DNS, registering/rebuilding new Cloudflare/Resend mail zones from scratch, new provider credentials/registrar account continuity, and real backup failure/overdue alert.* Current authoritative DNS/inbound support-email configuration was already user-verified/documented; disrupting it in production solely for a drill was not authorized.

**Decision accounting:** This event **closes the end-to-end *core hosted rebuild + exact original data/Auth recovery* drill as PASS**, not every hypothetical disaster/provider failover scenario. It does not alter the Master Specification, Decision Ledger, password standards, or other Locked product requirements. Any future product release gate demanding the additional unverified scenarios remains open until explicitly accepted or separately tested. Deletion of only the disposable drill resources is permissible after archiving this evidence.

**Disposable resources prepared for teardown** (not production):
- Supabase `DIC Isolated Recovery Drill 2026-10-16` **`bgstplvefumsnplhqpvd`**. A pause can be done through the existing connected Supabase action (reversible); permanent deletion must be performed by the owner from project settings because the available connector has no delete-project action. Deletion destroys all restored rehearsal data, so it must be based on the already verified original offsite backup.
- Netlify `dic-recovery-20261016`, **`fd4a4dba-0c71-4b06-be63-9f5f689aba1b`**, HTTPS recovery site. Delete only this project from Netlify Project configuration → Danger zone; available connected tool cannot delete a Netlify project. The live `the-dial-in-collective` Netlify project must stay untouched.
- Resend **recovery-only Sending-access API key** created for the fresh Supabase staging SMTP, not the original production SMTP key. **Revoke/delete the key in Resend after the final sending tests**; removing merely the local copy does not invalidate its remote ability to send. Keep the shared `auth.dialincollective.com` sender domain, production API key, and Cloudflare DNS unchanged.
- Discard local **one-time Mac rewrap helper ZIP**, one-time ciphertext output ZIP, extracted recovery static ZIP, and copies of the throwaway *recovery-only* Resend key when done. **Never delete `~/.dic-backup/` owner permanent private key**, its secure backup, original encrypted offsite archives, GitHub backup workflow, or source/restore instructions. One-time runner/toolkit workflows were already deleted from GitHub `main`; one-time transfer staging files have been moved to Library trash and ephemeral keys destroyed.

**Teardown result:** To be recorded *separately after actual pause/deletion/revocation*. This paragraph is a readiness checkpoint and is **not** evidence that providers or keys have already been removed.


## Recovery teardown started — Supabase Free project paused (2026-10-16)

After owner-confirmed recovered administrator browser acceptance and the owner's request to clean up the temporary recovery infrastructure, the connected Supabase provider accepted a **pause request** for only **`bgstplvefumsnplhqpvd`** (`DIC Isolated Recovery Drill 2026-10-16`): `{"success":true}`. The immediate follow-up provider read returned `PAUSING`; **do not represent the project as permanently deleted** or already fully `PAUSED` until independently observed. Simultaneous provider read independently confirmed production Supabase **`azviqqejypsefzilgonr` = `ACTIVE_HEALTHY`**.

The separate, still-existing recovery Netlify project **`dic-recovery-20261016` / `fd4a4dba-0c71-4b06-be63-9f5f689aba1b`** still showed a `ready` deploy and team SSO required for **all** versions. It has not yet been deleted because the connected Netlify project-management API does not support project deletion. The restored recovery Supabase instance no longer serves the recovery app once fully paused.

**Remaining manual cleanup requested of owner:**
1. Delete **only** the separate recovery Netlify project via `https://app.netlify.com/projects/dic-recovery-20261016` → Project configuration → Danger zone → Delete project. Do not delete the live `the-dial-in-collective` project.
2. Delete **only** temporary Supabase project `bgstplvefumsnplhqpvd` in the Supabase Dashboard → project settings → General → Delete project, if permanent teardown is desired after the pause. Free paused projects do not count against the free active-project limit. Deletion irreversibly removes the recovery copy of the data, not the original verified backups or production database.
3. In `https://resend.com/api-keys`, select **only** the separately created `DIC Recovery Test` Sending-access token (actual name as shown by owner) and delete/revoke it; then delete the owner's local/password-manager copy of the **temporary token**. Simply deleting its local copy does not revoke a key still active in Resend. Do not delete production SMTP token, `auth.dialincollective.com` sending domain, or its Cloudflare DKIM/CNAME.
4. Delete downloaded one-time Mac recovery rewrap/handoff ZIPs and extracted recovery-site ZIP if no longer desired. Do not delete `~/.dic-backup/` permanent recovery private key, original Drive/GitHub encrypted source-inclusive backups, GitHub automated scheduled backup workflow, or documented recovery RLS guard and runbooks.

The earlier exact 44-table managed restore and owner real-browser login remain the durable evidence of successful scoped reconstruction; optional unrehearsed password reset, new-shot write/recommendation, recovery-specific invitation redemption, and real DNS cutover/failure conditions remain explicitly **NOT VERIFIED**. No production backup, production site, production Resend/DNS credentials or Locked product decision was changed by pausing this temporary project.

**Teardown status:** isolated Supabase **PAUSING** (verified); Netlify recovery **EXISTS** (verified); temporary Resend API key **not revoked by assistant**; permanent delete actions **require owner dashboard**.
