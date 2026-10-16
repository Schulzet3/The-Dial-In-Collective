# Exact encrypted backup: isolated application/Auth restoration — 2026-10-16

**Result: PASS for first-party app database and core Auth user/identity restoration. NOT a complete hosted provider disaster recovery test.**

Owner approved using the older October 16 backup despite the two later shots and second account, and expressly authorized a one-time encrypted handoff and isolated restore. The owner’s permanent SSH/age recovery private key remained on the Mac; only a re-encrypted archive was supplied for this disposable test.

## Source and verified integrity

- Original GitHub Actions run `38926581554`, artifact `12056578138`, ZIP `dic-nightly-12056578138.zip`, SHA-256 `e1f4ce1705a7a5dc903b24967f27b1e97ee219854dc5e52cb4d2aa1e655add6f`, matching private Drive ciphertext.
- One-time user-uploaded handoff `DIC_Restore_Test_2026-10-16.zip`, SHA-256 `5206a766e808d377b12b4d8846b1b57926e86e9beb5675bc30b115521c549ee6`. It contains only the test-key `.age` ciphertext and decrypted successfully with the ephemeral test private key.
- Decrypted source manifest identifies snapshot time 2026-10-16 15:46:40 UTC and app commit `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`.
- `database.dump` SHA-256 `ac03773899c5e0ae686c619a6f9864ef6201db0a88db6aea23b296ccdd09155d` PASS; `app-source.tar.gz` SHA-256 `ccbf81509bca35f8327f77c5ad9ca603ef249cc9a529d2027b0fc447859a8eb3` PASS.

## Genuine restoration

A **fresh isolated PostgreSQL 17.11** cluster was initialized in a disposable filesystem, bound exclusively to a private Unix socket (`listen_addresses=''`). No connection was made from the restore to the live database. The **actual decrypted `database.dump`** was restored, not a replacement live dump.

Successfully restored **all 42 first-party public/private tables** plus core `auth.users` and `auth.identities`:
- 1 Auth user; 1 identity; 1 admitted member; 1 admin.
- 4 verified coffees; 14 shots, all historically imported; 4 library entries; 4 approved submissions.
- 1 original private import archive batch; historical import saving remains **disabled**.
- An independent replay of the original dump’s data-only `COPY` streams was used solely to count records. **All 44/44 table streams matched restored table-by-table row counts, 141 aggregate rows.** No personal records or hashes were printed or committed.

The database security/metadata fingerprint was independently matched to a read-only query of the live project: **42 first-party tables | 42 with RLS | 40 RLS policies | 99 indexes | 19 application triggers | 48 functions | 1 signup trigger**. All **85 first-party foreign keys** are validated, zero unvalidated.

In a single rolled-back transaction, a local JWT-claim simulator and temporary database-role grants verified: restored owner could read 14 shots and 4 library items; a synthetically admitted nonadmin could see the 4 verified global coffees but zero owner shots, notes or library entries and lacked admin rights; an unadmitted identity had no protected shots. Recovered Auth-signup provisioning trigger created the expected dependent member row. All fixtures, grants and emulator changes were rolled back. These are **local RLS role tests, not hosted JWT or HTTP sessions**.

## Boundaries

This proves recovery of the exact selected ciphertext’s **first-party database and core Auth pair**, not all hosted services. The encrypted dump was created with `pg_dump --no-owner --no-privileges`; original SQL ownership/grants are not in the artifact, and managed Supabase roles/service infrastructure must be reconstructed separately. The disposable PostgreSQL environment does not have Supabase’s `supabase_vault` extension. Other provider-managed Auth, Storage, Realtime, Vault, email/SMTP/OAuth, DNS, Netlify and external secret configurations were **not cloned or restored**.

Automated Google Drive courier delivery, failure notifications, and backup retention were not tested in this one-time drill. Locked product decisions and the live import gate were unchanged.

## Cleanup

The isolated PostgreSQL server was stopped. The ephemeral test private identity, decrypted archive, plaintext dump, recovered data, and disposable runtime were deleted from the test filesystem after verification; no keys, decrypted backups, or user data were uploaded to GitHub. One-time public-only toolkit workflow was removed from `main`. Original private encrypted GitHub and Drive backup objects are unaffected.
