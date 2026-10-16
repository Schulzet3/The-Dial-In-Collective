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
