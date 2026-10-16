# Hosted-provider recovery inventory — 2026-10-16

**Purpose:** Secret-free inventory of the actually deployed cloud app and currently accessible provider settings; first stage of the owner-requested **complete hosted reconstruction**. This is not a certification of complete hosted failover. Canonical Master Specification and Locked Decision Ledger prevail over historical source comments.

## Deployment and source: verified live

- Source: private GitHub repository `Schulzet3/The-Dial-In-Collective`. Production build sourced from branch `development/backend-foundation`, verified deployed SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`. Site source recovery from exact encrypted October 16 app-source archive and version control already proven.
- Netlify project: `the-dial-in-collective`, site ID `153277f2-e19e-4862-b9a6-f2e18ccde271`, team ID `6acc6a709f486ce5587dfcdc`, primary site `https://app.dialincollective.com`. Published deploy `6ad24660d0c6bdff2c065586`, `ready`, published 2026-10-16 15:44:45 UTC. No Netlify functions or Netlify Edge Functions; backend uses Supabase.
- **Actual live visitor protection:** No Netlify team login for **production**, requires Netlify team SSO for **non-production** previews. This reflects the owner's later October 16 Locked decision (the deployment's original description and an old comment in `netlify.toml` still say 'SSO-protected' and are **historical**, not a current instruction to reinstate all-environments SSO). Leave production Supabase Auth + beta admission unchanged.
- Checked-in `netlify.toml`: `npm test && npm run build:cloud`, output `dist`, Node `22`, and `node ./scripts/netlify/should-ignore-build.mjs` release-credit guard. App package pins `@supabase/supabase-js` 2.117.3.
- Netlify site environment variable **names** were read through the connector: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (each configured for context `all`, with build/functions/post-processing/runtime scopes). These are public browser project coordinates, not privileged server-side keys. The recovery inventory intentionally does not copy **values** into documents or expose other credentials. The Netlify connector does not reveal provider Billing/credits; pre-release 985-credit screenshot is historical and a fresh provider screenshot is required before any release.
- Netlify team-account recovery rights, production SSL/custom-domain settings and linked Git provider permissions: partially inferable by ownership/provider responses, **not** independently reproduced in a replacement site.

## Supabase: verified hosted metadata and restored snapshot

- Project `The Dial In Collective`, ref `azviqqejypsefzilgonr`, organization ID `wasoqqlcjozuuvvbedme`, region `us-east-2`, status `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.003`.
- Hosted migration history: **21** migrations, ending `20261016154252 dic_url_first_and_autofill_preview`; checked-in staged migration timestamps intentionally differ for the URL-first and admin migrations, as recorded in the October 16 release handoff. Do not replay already applied SQL.
- Active Edge Functions: `dic-verify-coffee` v3, `dic-preview-coffee` v1; both require JWT. Source files tracked in GitHub. A replacement project needs provider-authenticated deployment and secret setup.
- Installed database extensions include `supabase_vault` 0.3.1, `pgcrypto`, `pg_trgm`, `unaccent`, `pg_stat_statements`, `uuid-ossp`, `plpgsql`.
- Read-only current inventory: 2 `auth.users`; 2 admitted beta members; 16 shots; zero Supabase Storage objects. The historical import gate remains `saves_enabled=false`. The owner's initial live log/refresh/auth flow and real nonadmin signup/invitation/privacy/admin-denial are separately confirmed.
- **Proven:** exact Oct 16 age-encrypted backup was decrypted through a one-time rewrapped envelope and restored into an isolated PostgreSQL 17.11 database. Its older snapshot contained one Auth account/identity, 4 verified coffees, 14 shots, 4 library items and 4 submissions; 42/42 first-party RLS tables and all matching policies and constraints tested. This is not a clone of all hosted Supabase services.
- Security advisor: 4 expected private no-policy deny-by-default tables (INFO); **Leaked Password Protection Disabled** (WARN), provider advice [link](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Whether the currently used plan supports it and enabling it is appropriate must be separately checked; do not change Auth controls without review.

## Auth/email/DNS/secret configuration: documented direction, NOT yet independently exported

- App uses Supabase email/password, confirmed-email beta admission and strict private data isolation; expected new-password policy is minimum 8 characters, at least one uppercase and one special character, no extra digit/lowercase requirement. The owner verified real signup/confirmation and a separate test member.
- Prior owner records document Resend Free transactional sending via `no-reply@auth.dialincollective.com`, Cloudflare-based DNS for `dialincollective.com`, a root-domain redirect to the app, and Cloudflare support-email forwarding. These are **historical configuration facts**, not a freshly collected provider configuration export.
- **Missing or unverified for full reconstruction:** confirmation/signup/recovery options, SMTP password/key custody and sending limits, password/have-I-been-pwned setting, JWT signing-key rotation approach, Supabase project service keys and Edge Function secret names, provider-level Auth templates/settings, storage policies beyond database snapshot, Cloudflare complete DNS/MX/SPF/DKIM/DMARC records and page rules, Resend provider domain verification/settings, domain registrar recovery access, and encrypted owner-vault inventory of credentials. **Supabase Auth Site URL, redirect allowlist, and nonsecret SMTP settings are verified below.** None of these credentials belong in GitHub/chat.
- **Next owner-assisted read-only checkpoint:** Resend Dashboard → Domains → `auth.dialincollective.com`. Capture domain verification status and DNS authentication records (SPF, DKIM and any supplied MX/DMARC), omitting or redacting any API key. Then compare against Cloudflare public DNS and its zone configuration.

### Supabase Auth URL configuration — verified from owner dashboard screenshot 2026-10-16

- **Site URL:** `https://app.dialincollective.com/`.
- **Allowed redirect URL 1:** `https://the-dial-in-collective.netlify.app/`.
- **Allowed redirect URL 2:** `https://app.dialincollective.com/`.
- Total allowlisted redirects: **2**, exactly as displayed, with no wildcard rules in the screenshot.
- The current production domain equals the Site URL and appears explicitly as an allowed redirect. The historical Netlify default domain remains permitted for existing fallback/rollback references; preserve it until a deliberate future review rather than silently removing or changing live Auth settings.
- Cross-checked app source `site/cloud/main.js` constructs its signup/reset `redirectUrl` as `new URL(location.pathname,location.origin).href`; `site/cloud/client.js` uses that for email confirmation and reset. For current production home page this resolves to `https://app.dialincollective.com/`, an exact allowlisted URL.
- This screenshot **does not verify** custom SMTP, URL delivery outside the existing tested signup, email templates, or Auth provider secrets.
- No provider settings were changed, and this is a state-capture checkpoint, **not a new Locked product decision**.

### Supabase Auth SMTP configuration — verified from owner dashboard screenshot 2026-10-16

- **Custom SMTP:** enabled.
- **Sender email:** `no-reply@auth.dialincollective.com`.
- **Sender display name:** `The Dial In Collective`.
- **SMTP host:** `smtp.resend.com`.
- **SMTP port:** `465`.
- **SMTP username:** `resend` (standard provider identifier, not a secret).
- **SMTP credential:** present in Supabase but hidden in the dashboard screenshot; the value and its ownership/rotation/recovery remain unverified. Never request it in chat or include it in GitHub.
- The owner's genuine second-account signup verification email was successfully delivered earlier, consistent with this live configuration. The screenshot itself proves the settings shown, not an independent SMTP login/delivery event or reproducible provider recovery.
- **Hosted restore dependency:** Rebuild requires access to the owner-controlled Resend account, domain verification, ability to create or recover a suitable SMTP API credential, and re-enter it directly in a new secure Supabase dashboard. Never export an SMTP password or API token to the GitHub recovery repository, plain notes, or screenshots. Record only credential **location/custodian**, never its value.
- No production provider settings were modified; this is state capture, not a new Locked product decision.

### Resend sending-domain DNS verification — owner screenshot 2026-10-16

- Domain being inspected: `auth.dialincollective.com` in Resend Domains. The timeline shows `Missing records` (earlier historical event) and the currently highlighted `Partially verified`; `Domain verified` is not marked complete. **Do not describe the overall domain as fully verified.**
- Resend's official March 2026 product guidance defines `Partially verified` as one of two separate capabilities—**sending or receiving**—being verified. For DIC, Resend is the outbound Supabase Auth SMTP sender, and inbound support routing belongs to Cloudflare. The partial badge is not itself a failed outbound SMTP configuration. Source: https://resend.com/changelog/domain-verification-events . **Receiving capability is not proven by this screenshot**; do not enable it merely to achieve a full-status badge.
- `Enable Sending`: **ON**.
- **DKIM:** TXT at dashboard-relative name `resend._domainkey.auth`, TTL `Auto`, **Verified**. The long TXT public key was visually truncated; do not invent or copy an incomplete key into recovery instructions.
- **Sending/SPF subsection:** CNAME `rsend.auth` → `rsend.forge.rmta.net` and CNAME `send.auth` → `send.forge.rmta.net`; both DNS Only, TTL Auto, **Verified**.
- **DMARC (Optional):** screenshot displays TXT `_dmarc` with `v=DMARC1; p=none;` and TTL Auto. Its verification/status cell is not visibly confirmed, and the owner has not separately shown a live Cloudflare zone export; whether the record is deployed at the root or a subdomain cannot be conclusively inferred from the dashboard-relative name alone. The `p=none` value is a monitoring policy, **not a reject/quarantine enforcement policy**.
- Real signup verification mail to the second account succeeded earlier through Supabase's connected SMTP configuration. This corroborates **functional outbound sending**, but does not prove separate incoming mail functionality.
- Screenshots are accurate **read-only account configuration evidence**. No DNS provider/API query was successfully completed in this review. Next verify matching Cloudflare DNS records and support forwarding, without changing entries.

## Backups and monitoring: passed with remaining boundaries

- GitHub scheduled encrypted dump runs on main; configured 30-day GitHub artifact retention. Owner's Apps Script courier polls GitHub every 3 hours, selects trusted successful schedule/manual runs and SHA-verifies ciphertext to a private Drive folder. Oct 15 and 16 scheduled archives independently downloaded from Drive byte-for-byte matched GitHub SHA-256 and ZIP CRC; manual post-release backup separately identified.
- Real owner received a clearly marked **TEST** email from the existing Apps Script `sendBackupAlert_()` function. This proves mail delivery but not real transfer-failure or overdue-failure triggers.
- The user enabled a separate **daily ChatGPT independent backup watchdog** to flag missing, late, mismatched or unverifiable scheduled GitHub/Drive backups. It is read-only and does not modify production.
- Actual periodic provider configuration restore, SMTP/Cloudflare rebuild, independent new hosted Supabase project, and end-to-end restored Auth/Netlify tests **not performed**. No paid infrastructure provisioned or changes to existing Netlify/Supabase/Cloudflare.

## Next acceptance gate

Supabase Auth URL, nonsecret SMTP and Resend sending-domain record statuses are now documented. Next verify Cloudflare DNS authoritative records, root-domain redirect/support forwarding, and secure credential custody. Only after a cost quote and the owner's explicit agreement should a new hosted recovery instance be provisioned. A disposable local PostgreSQL restore is not a full hosted provider reconstruction.


### Cloudflare authoritative zone screenshot — 2026-10-16, read-only verification

Owner supplied Cloudflare `dialincollective.com` → DNS → Records screenshot, showing **11 of 200 records**. Values below were visually verified from that dashboard screenshot. This does not establish live public DNS propagation, redirect rules, or the email-forwarding routing rules.

| Type | Owner-relative DNS name | Value shown | Cloudflare proxy/TTL |
|---|---|---|---|
| A | apex `dialincollective.com` | `192.0.2.1` (documentation-range placeholder; may be used only with Cloudflare HTTP redirect rules) | Proxied / Auto |
| CNAME | `app` | `the-dial-in-collective.netlify.app` | DNS Only / Auto |
| CNAME | `rsend.auth` | `rsend.forge.rmta.net` | DNS Only / 1 hour |
| CNAME | `send.auth` | `send.forge.rmta.net` | DNS Only / 1 hour |
| MX | apex | `route3.mx.cloudflare.net` | DNS Only / Auto |
| MX | apex | `route2.mx.cloudflare.net` | DNS Only / Auto |
| MX | apex | `route1.mx.cloudflare.net` | DNS Only / Auto |
| TXT | `cf2024-1._domainkey` | `v=DKIM1; h=sha256; k=rsa; p=...` **truncated screenshot** | DNS Only / Auto |
| TXT | apex | `v=spf1 include:_spf.mx.cloudflare.net ~all` | DNS Only / Auto |
| TXT | `resend._domainkey.auth` | `p=MIGfMA0GCSq...` **truncated screenshot** | DNS Only / 1 hour |
| TXT | `subdomain-owner-verification` | Verification text present; do not reproduce unnecessary token-like value | DNS Only / Auto |

The `resend._domainkey.auth` DKIM and both `rsend.auth` / `send.auth` sending CNAME names/targets match the earlier Resend dashboard screenshot; their **Resend provider statuses were Verified**. Full DKIM TXT key cannot be independently reconstructed from screenshots and must be preserved via provider/Cloudflare export, not invented. The apex SPF and MX records relate to Cloudflare mail routing and should not be conflated with authentication-subdomain sender policies.

**Open discrepancy:** The Resend dashboard *suggested* an optional `_dmarc` TXT record with `v=DMARC1; p=none;`, but **no `_dmarc` record appears in the entire 11-record Cloudflare screenshot**. Record missing/absence requires deliberate later review; do not claim DMARC was deployed or silently modify DNS. Current real signup email delivery and Resend verified sending records support outbound functionality independent of this optional suggestion.

**Historical acceptance cross-check:** The earlier owner conversation has already confirmed that the Cloudflare root-to-app redirect works and that the `support@dialincollective.com` forwarding test delivered. The root's proxied placeholder A record alone would not prove this, but direct owner reports of successful browser/email tests are preserved in the reconciliation below. Do not request duplicate screenshots or another basic email test. The provider-specific redirect and forwarding rules have not been recreated in a new Cloudflare account, which is a separate full-recovery exercise.


### Reconciliation against earlier owner acceptance — no duplicate setup or screenshots

**Historical sources were re-read, not assumed:** The complete `Build Web App.pdf` export (two Library copies have identical SHA-256 `ba2ec5feeff58c2a28add8c9567f532c12acaf92f6da093f079ea1ed190da7e8`) contains direct owner acceptance that was missed during this inventory sequence:

- **Root redirect DONE / owner-tested:** The owner followed the Cloudflare `Main domain to app` wildcard redirect setup after creating the proxied `@` A record `192.0.2.1`. The archived conversation explicitly asked to open `dialincollective.com` and the owner answered **“yes it works.”** Do not ask them to provide the same redirect-rule screenshot again. The already accepted initial root redirect remains subject to the Locked future-homepage decision. This proves the user-tested redirect at that time, not an independently exported provider rule or a live network probe today.
- **Support email forwarding DONE / owner-tested:** The Cloudflare Email Routing screenshot showed active `support@dialincollective.com`, catch-all disabled and an Apple Private Relay destination. Owner sent an actual inbound email and replied **“It worked!”** Earlier cloud backend addendum separately records this delivery success. No new screenshot/another routine send test needed absent a failure or account change.
- **Resend SMTP DONE for operational outbound email:** The archived conversations confirm earlier real password-reset email receipt; the current owner-controlled nonadministrator successfully received email verification. The current Supabase SMTP and Resend screenshots are exact-configuration recovery evidence, not newly activated services.
- **DNS/app/auth DONE for ordinary service:** Custom app hostname, HTTPS, Supabase Site URL and exactly two allowed redirects have been observed and owner login succeeded. Current Cloudflare snapshot independently confirms relevant A/CNAME/MX/Resend DNS entries. Optional `_dmarc` proposed by Resend is absent from the 11 displayed Cloudflare records; review as nonblocking email-hardening only if deliberately prioritized, not as an excuse to restart email setup.
- **Beta account security DONE for initial real-account gate:** The owner signed in with their second email, completed email confirmation and single-use invitation, saw an empty personal workspace, and sent a screenshot of **Admin Access Unavailable** from `/admin.html`. Owner completed Log Shot → Rate → Recommendation as admin. These later acceptance facts supersede older unchecked runbooks; do not request initial invitation, nonadmin role denial, or empty workspace tests again. More adversarial API/multidevice coverage remains distinct work.
- **Backup and recovery DONE for the tested scope:** Two scheduled GitHub encrypted artifacts matched their automatically delivered private Drive ZIPs byte-for-byte; the specific October 16 ciphertext was restored into isolated PostgreSQL with original app/Auth table counts and RLS validation. Owner also confirmed receipt of a test-only Apps Script error email. Independent daily backup watchdog now enabled. Older Oct 13–15 notes that call these unverified are point-in-time historical documents.

**Still genuinely unverified:** brand-new hosted Supabase project/managed Auth/JWT/SMTP/Netlify reconstruction and DNS redeployment; repeatable owner-held recovery access/secret escrow (never paste secrets here); real nonadmin fresh-coffee URL → metadata/source-verification and pending/approval lifecycle; real iPhone/offline/online session and conflict behavior; actual backend failure/36-hour stale alert execution (distinct from successful test-mail delivery). The periodic watchdog limits monitoring risk; no need to induce real production failures. Source reports also identify optional leaked-password protection and long-term DMARC/retention hardening as separate, nonblocking concerns until approved.

**Process safeguard:** Consult this **latest reconciled evidence** and the dated October 16 release/restore/backup acceptance reports before trusting unchecked boxes in older snapshots; do not repeat a working setup merely to populate a new inventory. To finish full hosted disaster recovery, document reproducible steps or conduct a separately quoted, owner-authorized isolated hosted rebuild; a screenshot of working configuration is not the same as a reconstructed service. Preserve the canonical Master Specification and Locked Decision Ledger; no product decisions were changed by this reconciliation.
