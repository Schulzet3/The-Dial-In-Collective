# Private backup implementation checkpoint

Status: Staged only. No automatic Google Drive backups or successful restore have been verified. The live import gate remains OFF.

Approved backup destination: private Google Drive owned by the project owner. A standalone, owner-authorized Google Apps Script with `drive.file` permission has created `DIC Automated Encrypted Backups`; the private GitHub Actions reader token and alert email were added to its Script Properties. The Apps Script transfer schedule is not yet installed.

The GitHub workflow, if reviewed and later enabled on `main`, produces a PostgreSQL 17 custom-format logical export including Auth and application tables. The export is bundled, encrypted using the owner's *public* age recipient, and uploaded to private GitHub Actions artifacts as ciphertext only. A separately authorized Apps Script courier copies artifacts to Drive. The user's *private* age identity must remain offline and must never be stored in GitHub, Apps Script, Netlify, Supabase, or this repository.

The workflow must fail closed if Supabase Storage contains file objects, as PostgreSQL backup alone does not capture object bytes. A verified restore additionally requires application configuration and Auth integration, backups/retention and failure notification tests. Neither preview validation nor a checksum suffices.

Do not merge into default branch or turn on schedules until private backup secrets and the recipient are configured. Do not enable the server import gate until actual independent restore verification. The previous Locked decisions and original phone prototype are unchanged.
