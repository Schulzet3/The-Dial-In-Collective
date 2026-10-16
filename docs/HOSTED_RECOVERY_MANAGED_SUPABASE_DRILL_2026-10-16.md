# Managed Supabase recovery drill — October 16, 2026

**Overall status: PARTIAL PASS — new isolated managed Supabase project reconstructed and database/Edge security validated. NOT yet a full hosted application/data/Auth/Netlify recovery.**

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
