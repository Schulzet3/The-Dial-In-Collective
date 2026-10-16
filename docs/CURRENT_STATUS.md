# The Dial In Collective — Current Project Status

**Operational status reconciled:** October 16, 2026. **This file is the first stop for "what's next?"** It is a *living implementation/acceptance index*, **not** a new product specification or an authorization to alter any Locked requirement. The authoritative product requirements remain the original Master Specification and Decision Ledger together with the dated, explicitly approved subsequent amendments. The product name and all user-facing "dial in" wording **do not use a hyphen**, per a later owner decision; some original v1.0 Library filenames/headings reflect an earlier historical state.

## Source-of-truth and precedence

1. Latest **explicit owner decision**; the canonical Master Specification + Decision Ledger and their later approved/Locked amendments in GitHub.
2. This file for the **current operational completion state**, backed by the actual acceptance evidence and provider results cited below. This file cannot override a Locked product decision.
3. Dated detailed release, recovery, backup, and real-account acceptance reports for precise provenance.
4. Earlier historical checklists and PDFs as **evidence of work done at the time**. Their unchecked boxes, "next action" paragraphs, previous hosting settings, and old "0 credits" observations **must not silently replace later PASS evidence**.

### Documents reviewed and duplicate policy

- Historic chat exports: **`Build Web App.pdf` (66 pages); `Old Chat.pdf` (194); `Old 2.pdf` (33); `Recommend email domain hosting.pdf` (16)**. `Build Web App(1).pdf` is byte-for-byte identical to `Build Web App.pdf` (SHA-256 `ba2ec5feeff58c2a28add8c9567f532c12acaf92f6da093f079ea1ed190da7e8`); read **once**, not as an independent source.
- Supporting attachments: `Build Coffee Web App.txt`, the original `dial-in-collective.jsx` prototype reference, source-archive ZIPs and the 15-page `Espresso Extraction Windows by Roast Level and Shot Style.pdf`. The August `Espresso_Recommendation_Engine_Available_Archive_2026-08-21.zip` contains **reference manifests/chat-history pointers** for nine research reports, **not the nine original research report bodies**. Treat unavailable research as unavailable, not independently revalidated.
- Canonical historical Library sources: `The_Dial-In_Collective_Master_Specification_v1.0.md` (and human-readable DOCX companion) + `The_Dial-In_Collective_Decision_Ledger_v1.0.json`. The baseline contains 79 Locked and 20 Open entries as originally recorded; later Locked decisions and resolved questions live in **GitHub dated addenda/ledgers**, not by silently rewriting old decisions.
- GitHub source: complete `development/backend-foundation` tree, including Master Specification/Decision Ledger addenda, 20+ SQL migrations and regression suites, UI/engine modules, and `docs/` evidence; backup-only utilities/workflows on `main`. Historical docs are intentionally retained for an audit trail, not as independent lists of today's tasks.

## Current live application — VERIFIED

| Area | Latest evidence | Qualification |
| --- | --- | --- |
| Frontend production | `https://app.dialincollective.com`, Netlify deploy `6ad24660d0c6bdff2c065586`, published SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`, ready | Source still built/published from `development/backend-foundation`. Source-only GitHub documentation commits have **not** republished this site. |
| Visitor protection | Additional Netlify login **off on production** by owner approval; Netlify team SSO **on for non-production previews** | Supabase Auth, verified-email invitation/admission, RLS, and private/admin role checks retained. This later Locked access decision supersedes earlier "SSO for every deploy" text **only for production**. |
| Auth/real second member | Owner separately verified new email confirmation, redeemed single-use invite, and entered empty admitted non-admin workspace | Read-only database confirmed **2 admitted/confirmed users, only 1 administrator**. |
| Privacy/admin denial | Owner-provided real nonadmin browser screenshot displayed **Admin Access Unavailable** on `/admin.html`; test account had no owner library or shots | Database/rollback RLS role checks also passed; full adversarial client HTTP/security assessment not claimed. |
| Core loop | Owner confirmed real `Log Shot → Rate → Recommendation` and persisted reload/login; 4 owner coffees, 16 shots in production at last check | Doesn't prove every V1 recipe-family/recommendation tier or real offline/multi-device conflicts. |
| Coffee verification | 4 original owner submissions and corresponding canonical coffees verified; source verifier Edge v3 and preview v1 active, both JWT-protected | Real new **nonadmin** URL-to-source-to-pending/approval edge cases still untested. |
| Historical import | Owner’s 14-shot historical import completed, reviewed; 2 later shots were added | Server import-save gate stays **disabled**; original local history preserved. |
| Resend/Supabase Auth SMTP | Existing `no-reply@auth.dialincollective.com` via `smtp.resend.com:465`; owner received **real password-reset and new-member confirmation emails** | Resend outbound DNS (DKIM, two send CNAMEs) verified; overall domain displays `Partially verified`, consistent with inbound receiving not being needed. Password/key remains hidden and is not stored in GitHub. |
| URL, TLS and Cloudflare | Custom app domain and HTTPS, Supabase Site URL/redirect allowlist, Cloudflare DNS and a **working root-domain redirect explicitly confirmed by owner** | Root redirect was created and browser-tested in earlier `Build Web App.pdf`: owner said **“yes it works”**. Do **not** ask for it again as a new acceptance prerequisite. |
| Support mailbox | Cloudflare `support@dialincollective.com` routing, catch-all off, actual delivery **confirmed by owner** | Historical recipient was an Apple private-relay destination. No need for new forwarding configuration without a change/failure. |
| Scheduled backups | October 15 and 16 successful **schedule-event** GitHub encrypted exports, corresponding Drive files independently fetched and SHA-256/ZIP CRC **PASS** | Manual post-release export is separately identified and must not be confused with automatic courier evidence. |
| Exact encrypted backup recovery | The real October 16 private-key-rewrapped `backup.age` was decrypted and **restored into fresh isolated PostgreSQL 17.11**; 44/44 first-party/Auth table streams matched, 42 RLS tables, 40 policies, 85 first-party foreign keys and owner/nonowner simulated isolation pass | Original archive contained **1 account/14 shots** by the owner's explicit choice. A full managed-hosted Supabase/Netlify reconstruction has **NOT** been done. |
| Alerts | Owner received a **TEST** email from existing Apps Script error-mail handler; a separate **daily read-only ChatGPT backup watchdog** was enabled | Actual induced fail/stale condition and Apps Script trigger death aren't directly verified. No reason to break production backup pipeline to test. |

### DO NOT REPEAT

The first real user signup/invite, separate nonadmin Admin Access Unavailable, empty private workspace, root-domain redirect, Cloudflare support email delivery, real password-reset receipt, Supabase Site URL/redirect screenshot, Resend SMTP screenshot, Resend DKIM/send DNS, current Netlify SSO removal, owner log/refresh, backup-to-Drive digest matching, exact ciphertext Postgres restore, synthetic alert email and daily watchdog **already passed the stated tests**. Retest only when software or provider configuration changes, evidence of regression appears, or a *different* clearly identified edge case is under review.

## Genuine remaining gates — not duplicate work

### 1. NEXT: full hosted disaster-recovery rehearsal (externally dependent, cost-gated)

The database+source ZIP recovery is proven, but **managed-provider restoration is not**. Do **not** claim a full system restore until the following have been demonstrated in a separately authorized and isolated environment, with precise PASS/PARTIAL/NOT VERIFIED labels:

1. Pick the owner-approved Supabase **organization** for a disposable independent hosted project; obtain **actual provider cost quote**, explicitly confirm any nonzero spend. Do not silently create a project or branch, buy add-ons, use Netlify credits, or modify DNS.
2. Capture a **secret-free executable reconstruction runbook** for Supabase region/PostgreSQL/migrations, Auth email/redirects/password/confirm settings, project roles/grants, Realtime/Storage, extensions, Edge Function versions, API/JWT service configuration and secret-*names*. Hold actual service credentials in an owner-controlled secure vault; recovery identities/private keys remain offline and are never pasted into ChatGPT, repo or general docs.
3. Prepare/deploy an independent managed Supabase target and restore the approved **exact encrypted original backup** through owner-approved secure ephemeral rewrap if needed; reconcile platform-managed Auth schemas/roles/grants/Vault separately. Verify returned row inventory, policies and user account/sign-in/recovery functionality; rebuild or rotate nonportable platform secrets instead of attempting to expose originals.
4. Prepare a **nonproduction** Netlify recovery frontend from the exact GitHub release source (or isolated staging equivalent), set only required nonsecret browser env vars and authorized protected configuration, connect to restored Supabase target. Use a disposable Netlify URL for checks; **never change production app/redirect DNS** just to simulate failure, and keep existing production SaaS account untouched.
5. Test real confirmation/password reset, beta admission and role isolation **against the recovery environment**. Document SMTP/Resend sending-domain/DNS and Cloudflare zone/redirect/email routing reconstruction steps and owner access, including registrar account recovery and ability to reapply settings; production DNS cutover is not part of this isolated test.
6. Capture real restore time, provider-cost implications, evidence, cleanup and failures. Hosted deployment must not be described as restored if any provider settings remain unverified.

Prior evidence: [Exact encrypted archive restore](EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md), [live provider settings inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md), [release/recovery runbook](RELEASE_AND_RECOVERY_RUNBOOK.md).

**This is the next recovery workstream and remains a Locked pre-external-beta requirement.**

### 2. Member coffee lifecycle acceptance

Use the existing second confirmed/admitted nonadmin account for a **genuine** New Coffee URL → independent identity/release match → trusted source preview/verification or Pending flow; verify that owner-coffee data and community canonical records aren't silently altered. Confirm one-candidate vs ambiguous vs different-release safeguards using actual reputable coffee source data when possible. Avoid fabricated community results.

### 3. Real mobile/offline sync & core product parity

Actual iPhone Safari/PWA, reconnection after offline shot creation, durable queued state, account switching, multi-device edits/conflicts, recommendation history/current recipe behavior, accessibility, equipment/recipe families and agreed engine tiers need separate real-world acceptance. Existing synthetic Chromium and SQL tests are useful but not substitutes.

### 4. Admin operations and final security/hardening

Current Admin Dashboard is **read-only**. Pending-identity conflict review and beta invite management remain planned work under existing Locked behavior. Supabase advisor reports leaked-password-protection disabled (plan availability must be reviewed before an approved change). The Resend suggested optional `_dmarc` TXT was not visible in the owner's 11-record Cloudflare zone screenshot; do not conflate this optional hygiene with a broken email flow. Monitor backup file expiry/retention and real failure/staleness checks without causing service interruptions.

## Historical documents — interpretation

The following are **historical snapshots**, not current task lists: `docs/BACKEND_CHECKPOINT.md`, `docs/CLOUD_OWNER_TEST_CHECKPOINT.md`, `docs/NATIVE_IMPORT_CHECKPOINT.md`, `docs/PRIVATE_BACKUP_SETUP_CHECKPOINT.md`, `docs/RELEASE_2026-10-15_OWNER_PREVIEW.md`, `docs/REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md`, `docs/CONSOLIDATED_OWNER_RELEASE_CHECKLIST_2026-10-14.md`, and earlier sections of `docs/RELEASE_AND_RECOVERY_RUNBOOK.md` / `docs/RELEASE_RECOVERY_CONTINUATION_2026-10-16.md`. A paragraph saying "not yet deployed", "no email", "0 Netlify credits", "SSO all", "need first beta account", or "exact encrypted restore missing" is **point-in-time evidence only** and is superseded by later provider and owner acceptance evidence above. Preserve underlying reports/audit checks; do not delete original user chat PDFs or research sources.

## Rules for maintaining this index

- Each new milestone must record evidence, UTC/local time when known, true scope and confidence level, and whether the state was observed on a provider vs reported by owner.
- Update this status index and relevant detailed report after the milestone. Modify the Master Specification and Decision Ledger **only if a product decision changes**, with explicit owner approval and supersession trail.
- One owner question at a time; minimize unnecessary clicks/screenshots, subscription costs and Netlify production deploys; protect the fast **Log Shot → Rate → Recommendation** experience.
