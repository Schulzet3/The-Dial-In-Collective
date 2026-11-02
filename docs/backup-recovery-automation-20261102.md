# Issue #423 — saved encrypted Drive archive recovery

Status: **SAFE RUNNER PREPARED; LIVE ARCHIVED-CIPHERTEXT RESTORE BLOCKED** (2026-11-02). This is not a production change and does not replace the already passing Sunday fresh-snapshot recovery drill.

## Verified real offsite archive
- GitHub scheduled main backup run: https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/41316998335
- Artifact: `dic-encrypted-nightly-41316998335`, ID 13087632285.
- Owner-private Drive direct-child: `dic-nightly-13087632285.zip` ID `1r8hGOSlLjOF-19rnav6sKXBvdV5BrbMV`, folder `1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`.
- ZIP bytes 5,940,899, independently recalculated SHA-256 `1cd12b8b9b7ef4dded07cebc96578f2903e9fb3a85195e6afd42e677aa92b746`, matching GitHub artifact digest. ZIP CRC check PASS; exactly one `backup.age` entry, format `age-encryption.org/v1`.
- **Not decrypted/restored:** age ciphertext recipient is an SSH Ed25519 public key. The owner keeps the corresponding private key offline. An unrelated automation key cannot decrypt this historical archive.

## Safe implementation
- `scripts/backups/restore-saved-age-archive.sh` takes the existing `backup.age` and a **dedicated** `DIC_ARCHIVE_AGE_IDENTITY` GitHub Actions secret; it never accepts a live database URL. It validates the decrypted bundle, project, hashes, archive members, Storage count and restores Auth + first-party tables and metadata to a disposable Docker `postgres:17-alpine --network none` target. It removes plaintext and the offline database on exit.
- `.github/workflows/verified-drive-archive-restore.yml` is **manual-only**. Given a completed scheduled GitHub backup run and **independently verified private Drive ZIP digest**, it checks exact artifact identity/digest and downloads identical ciphertext from GitHub Actions. Equality of SHA-256 ties the tested ciphertext to the verified Drive copy; the workflow does **not** authenticate directly to Google Drive.
- The job fails explicitly if no dedicated secret is present. No scheduled copies, new database exports, Netlify builds, production SQL/Auth/data writes, or ciphertext uploads.

## Required external dependency before actual restore
1. Provision **a separate, automation-only age private identity** through the GitHub Actions managed secret `DIC_ARCHIVE_AGE_IDENTITY`, without posting it in ChatGPT, GitHub issues/logs, or Drive. Existing GitHub connector cannot set Actions secrets. Keep owner's personal private SSH/age key offline and independent.
2. Explicitly add the automation identity's **PUBLIC** age recipient to **future** encrypted backup output *in addition to* the owner recipient; preserve all old ciphertext. Current `BACKUP_AGE_RECIPIENT` encrypts only to the owner's SSH key, so adding a new identity secret alone will not unlock existing historical backups.
3. Once the first new ciphertext addressed to both recipients is delivered to the approved direct-child Drive folder and independently hashed, run the manual-only isolated archive recovery against exactly those bytes. Require a genuine PASS including decrypt, manifest hashes and offline row/schema restoration before enabling unattended scheduled saved-archive restore.
4. Retain current daily encrypted backup + existing Sunday fresh-snapshot restore, original #28 acceptance and watchdog during transition. Do not silently remove encryption or publish an app release.

**Blocker:** neither an automation-only identity secret nor a dual-recipient future archive has been provisioned and verified. Claiming the old encrypted Drive archive is automatically restorable would be false. No personal key upload requested.

## Follow-up: zero-upload managed recovery identity (Nov 2, 2026)
- The owner prefers no repeated private-key handling. Keeping age encryption is a low-overhead choice because saved snapshots contain Auth identities and account data, not only coffee notes. Existing encrypted archives remain unchanged; a new key can never retrospectively decrypt an archive that was not addressed to it.
- `DIC_ARCHIVE_AGE_IDENTITY` is the **only new GitHub repository Actions secret**. After one-time secure provisioning, the existing nightly job derives its PUBLIC recipient with `age-keygen -y` without logging or persisting private identity. The nightly `backup.age` is encrypted to BOTH the existing owner public recipient and the automation recipient. If the secret is absent, the original owner-only encrypted backup path continues unchanged; if present but malformed, backup fails rather than quietly claiming a usable secondary recovery recipient.
- The manual-only saved-archive restore requires this secret and a verified matching Drive/GitHub ZIP digest. Do not claim successful restore until the first future dual-recipient scheduled ciphertext is delivered, the Drive ZIP verified, and the isolated restore actually runs to completion. Keep owner offline key; **never ask them to upload it**.
- One-time owner secret setup is necessary because the connected GitHub tools do not expose Actions-secret creation and the runtime has no authenticated GitHub CLI. Generate the dedicated identity locally and enter it directly into GitHub Settings → Secrets and variables → Actions → New repository secret (name `DIC_ARCHIVE_AGE_IDENTITY`). Do not paste it into ChatGPT, Drive, issues, or logs. An SSH Ed25519 identity generated with macOS `ssh-keygen` is accepted by age.
- Script edits no longer dispatch an extra live backup via push; the existing daily schedule, guarded fallback, explicit BACKUP_REQUEST and manual trigger remain intact. Recovery enhancements are NOT publication authority.
