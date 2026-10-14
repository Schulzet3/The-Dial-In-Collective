# Native import checkpoint

## What can be tested

The hosted owner build now has **Settings -> Import Backup**. A user can choose a supported personal prototype/reviewed JSON backup, inspect counts and coffee names, validate it against the actual database without retaining imported rows, and download a recovery package.

**Final saving remains disabled on the live project.** The existing requirement for verified cloud backup and recovery before importing real history is not superseded by this change. A database-local source archive and an import replay test are not a replacement for external Google Drive backups or disaster recovery. No unattended backup task was configured by this milestone.

The implemented commit endpoint is gated server-side by `private.import_control`. Browser users cannot change the gate. The temporary automated tests enable it only inside their rolled-back test transaction. Do not enable it in the live account merely because the preview succeeds.

## Preserved behavior

- Preview and commit are bound to the currently admitted account and the original expected owner ID.
- Preview exercises the real insertion/constraint/trigger path in a rolled-back subtransaction. It does not leave personal records, import batches or community contributions behind.
- A confirmed import is atomic. An invalid late record aborts the entire import.
- The reviewed-file fingerprint makes retries idempotent. Different files cannot silently replace an existing cloud workspace.
- Dates, measured values, recorded zero grind, missing grind, unknown feed, notes, historical equipment, families, selected styles and Current Coffee are preserved.
- Unlogged added coffees are included without inventing shot history or making them Current.
- Incoming coffee facts remain pending verification. Estimated roast metadata is retained.
- Complete original JSON and pre-import state are private archive records on eventual commit. Old community aggregates and historical recommendation messages are not replayed as new evidence.
- File selection is local. A separate **Validate import** button sends the file for server validation. The confirmation button is disabled while the recovery gate is closed.
- Settings remains open until X. Back returns to Settings. Account changes invalidate in-flight preview UI and clear the selected source.
- No original phone data, real account history or source backup was modified by implementation/testing.

## First-adapter limits (implementation limits, not product decisions)

The adapter accepts `the-dial-in-collective-prototype-backup` schema 1 personal exports, including the previously reviewed conversion. It supports one setup with one hardware version, up to 100 coffees and 2000 shots, within 2 MB. It is an initial empty-cloud-workspace import, not a general overwrite or merge utility. Multiple versions, experiments and inconsistent historical snapshots are rejected rather than silently discarded. Original format-1 text exports must be converted first.

Historical Custom targets, old recommendation messages, original edits/audit details and aggregate caches remain in the complete source archive; this milestone does not activate every archived field in the current cloud UI. The complete prototype feature-parity requirements remain in the Master Specification.

## Verification

- **27 new Node unit/integration checks passed** locally. The build command also runs the existing cloud checks.
- **30 database-role checks passed** against the development database, including preview rollback, commit gate, owner binding, negative cases, atomic failure, duplicate retry, and reconstructing synthetic observations from the saved source in an isolated replay drill. All fixtures and test gate changes were rolled back.
- **18 injected Chromium UI checks passed** at a 390px viewport using the real reviewed file as a local input and a mocked backend adapter. They cover file selection, four-coffee/fourteen-shot display, missing-data warnings, disabled save gate, recovery download, malformed JSON, Settings navigation and account switching.
- Direct browser navigation is restricted in this runtime. The UI tests inject trusted application code into a page; they do not verify live JWT login, production Netlify page behavior, email recovery, native iPhone persistence or multi-device sync.
- The real reviewed file passes the local parser: four coffees, fourteen shots, four families, one missing grind and fourteen unknown feed conditions. The unlogged added coffee is not Current.
- Post-test database check: one real Auth account; zero cloud setups, personal coffees, shots and import batches; save gate false; all application/private tables have RLS.

## Security advisory

The Supabase advisor found no new database-policy findings for this change. It reports a separate existing Auth warning: **Leaked Password Protection Disabled**. No password-policy or subscription change was made.

Remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Source and deployment

The source, SQL migrations, validation fix and repeatable tests are maintained on `development/backend-foundation`. The static build explicitly allowlists the new import modules and stylesheet; no personal backup or private test recovery package is published. `main` and the local prototype are unchanged.

Applied migrations are identified from Supabase history: `20261012183642_dic_native_import_review` and `20261012183845_dic_import_qualified_validation`.

## Remaining release gate

Authorize and configure unattended Google Drive backups, verify full cloud restore coverage (Auth, application data, configuration and any stored files), then enable real import saves deliberately. The next user test can cover file selection and live server preview now, but must not be described as a completed import.

## Owner-only, pre-domain launch testing — 2026-10-14

The owner explicitly asked to complete available testing, including eventual **real personal-history import**, before purchasing a custom domain. This establishes an **owner-only testing sequence**, not authorization to bypass the already-Locked full backup/recovery or user-privacy safeguards, and not approval to open external beta. Keep Netlify team SSO enabled and do not create paid infrastructure.

Live read-only check before planning (2026-10-14): one existing Auth user; zero cloud coffees, library entries, setups, shots and import batches; `private.import_control.saves_enabled=false`, `recovery_verified_at=NULL`; 35 application/private tables, with zero tables missing RLS. The user-provided reviewed JSON containing four coffees, fourteen shots, four families and an additional unlogged Sweet Bloom coffee is **not present as an upload in this chat**; preserve it privately and do not put its contents in GitHub or a public issue.

**Sequence and required evidence:**

1. Preserve local original v0.2.0 files and two independently accessible reviewed backup copies. Verify the latest source-inclusive, encrypted GitHub-to-Drive backup is present, with matching artifact name and byte count; one such delivery was verified on 2026-10-14 (file `dic-nightly-11856901593.zip`, 243225 bytes). Delivery/checksum checks and a database row-only restore are not a complete managed-service recovery.
2. Finish and record the **required** independent recovery/security checks for the intended owner-only write scope, including retained database/Auth records, first-party schema/functions/policies, nonsecret hosted-service configuration inventory, isolated recovery, account-bound permissions and working encrypted offsite backups. Keep the live gate closed until those checks meet the existing Locked acceptance criteria; escalate any proposed reduction explicitly to the owner and update the canonical ledger.
3. Owner signs in through the existing SSO-protected Netlify URL, selects the reviewed personal JSON through **Settings → Import Backup**, checks the local summary (4 coffees, 14 shots, 4 families, 1 missing grind, 14 unknown feed conditions and unlogged Sweet Bloom not Current), then runs **Validate import** against the live backend. Validation must leave cloud row counts unchanged.
4. Only after recovery verification is recorded and the owner deliberately authorizes real import, enable the server-side import gate through a controlled reviewed change (without disabling RLS or public admission guards). Have the owner download and physically verify the pre-import recovery file; commit once via authenticated UI. Do not fabricate missing source data.
5. Query the live DB for exact owner-bound counts/relationships, saved source archive, Current Coffee behavior, all-green eligibility, and nonduplication. Re-submit the identical reviewed file to confirm idempotence. Verify reload, logout/login, iPhone browser, recommendation flow and private sync. Keep original phone app/data untouched.
6. Trigger and independently verify a **new** encrypted, source-inclusive post-import snapshot in GitHub and Google Drive; check restore of **actual nonzero imported rows** into a disposable target before beta. Test admin/community workflows and real-user privacy as far as authorized accounts permit.
7. Defer any unverified outside-project email confirmation/reset and real external-account invitation to the custom-SMTP phase. The custom domain purchase remains optional for current owner-only testing. No general public release or removal of Netlify SSO during this phase.

**Current result:** Planned/partially pretested, **not** an actual import. All Locked product decisions, free-tier cost restrictions, server import gate, and original prototype preservation remain unchanged.

## Owner-reported live import validation — 2026-10-14

Owner reports finding the **reviewed original JSON** on their own device and that the hosted **Import Backup → Validate import** action succeeded. This confirmation is **owner-reported**; the actual file bytes, UI screen/result details and expected per-coffee preview counts were not transferred into this chat and were not independently inspected.

Follow-up read-only Supabase check after owner's report confirms `auth.users=1`, `public.coffees=0`, `public.shots=0`, `public.setups=0`, `public.library_entries=0`, `private.import_batches=0`, zero missing RLS across public/private, `private.import_control.saves_enabled=false`, and `recovery_verified_at=NULL`. This is consistent with the intentional rolled-back server-side preview, but a zero-row state alone cannot verify the exact content shown in the owner's browser.

**Next owner action:** While the validated import panel is open, click **Save recovery copy**, then confirm the JSON file is present in Mac Downloads and retain it separately alongside the original reviewed backup and untouched prototype. The dedicated panel makes this download available on successful validation even while the import save gate remains locked. Do not mark recovered copy as independently verified until the owner checks the actual file; selecting the button is not sufficient.

**Next engineering action:** Complete the remaining independent full-recovery/configuration acceptance evidence and real Auth/privacy checks before proposing a controlled gate enablement. No evidence here authorizes toggling the live database gate, importing personal rows through a privileged bypass, changing admission controls, or releasing an external beta. Keep this milestone in the implementation ledger without altering canonical Locked decisions.

## Approved owner-only import permission ACTIVATED — 2026-10-14

- Owner explicitly approved the one-time owner-only historical import exception; canonical Master Specification Appendix A and Decision Ledger `OWNER-IMPORT-20261014` were updated in ChatGPT Library and preserved all 79 original Locked entries.
- Applied Supabase migration `20261014152014_dic_owner_only_import_exception` and committed the exact migration SQL on `development/backend-foundation`. The old full-recovery flag `private.import_control.recovery_verified_at` remains **NULL**. No hosted-service recovery has been fabricated.
- The server uses `owner_only_exception_owner_id` and a bounded 24-hour validity interval; the importer checks both the verified owner session and the assigned UUID. Atomic commit clears `saves_enabled` and all exception fields. No other account, even if admitted later, may use it. The existing empty-workspace, review-hash, recovery acknowledgement, and one-import-idempotence guards remain.
- Existing native import database role tests **30/30 PASS** with rolled-back synthetic records; `supabase/tests/owner_only_import_exception.sql` **8/8 PASS** for expiry, cross-account denial, owner preview, reviewed-file hash, downloaded recovery acknowledgement, one successful transaction, idempotent retry, second import rejection and atomic re-lock, entirely rolled back. No original owner shots were written by tests.
- Live preflight: 1 existing Auth user, 1 enabled beta member, zero existing coffees/setups/shots/library entries/import batches/Storage files, zero first-party tables missing RLS, Netlify SSO still required. The previous gate was closed before approval.
- Guarded live grant succeeded at **2026-10-14T15:24:57.902877Z**, expires **2026-10-15T15:24:57.902877Z** (~9:25 AM Mountain). The owner can now re-validate their original reviewed JSON in the already hosted owner UI, save the recovery download and confirm. Owner action is still pending and no imported rows exist as of activation.
- Today’s scheduled `main` encrypted backup [38581684328](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38581684328) passed (artifact `11902823017`, **256130 bytes**) and its matching ZIP `dic-nightly-11902823017.zip` reached the approved private Drive folder automatically at 2026-10-14T15:20:17Z. This is a **pre-import** snapshot. A fresh **post-import** backup and isolated restoration of nonzero personal rows are required after owner confirmation.
- Do NOT mark external beta or complete hosted Supabase provider/Auth/configuration restoration as verified; do NOT disable SSO or alter raw local v0.2.0 data. Expiration closes the server predicate even if the unused row still has `saves_enabled=true`; investigate before reauthorizing an expired grant.
