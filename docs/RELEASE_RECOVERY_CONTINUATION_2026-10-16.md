# Consolidated release and recovery continuation — October 16, 2026

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
