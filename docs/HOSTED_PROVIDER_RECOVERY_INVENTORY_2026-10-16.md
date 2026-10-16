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
- **Missing or unverified for full reconstruction:** confirmation/signup/recovery options, production SMTP identity and sending limits, password/have-I-been-pwned setting, JWT signing-key rotation approach, Supabase project service keys and Edge Function secret names, provider-level Auth templates/settings, storage policies beyond database snapshot, Cloudflare complete DNS/MX/SPF/DKIM/DMARC records and page rules, Resend provider verification/settings, domain registrar recovery access, and encrypted owner-vault inventory of credentials. **Supabase Auth Site URL and redirect allowlist are now verified below.** None of these credentials belong in GitHub/chat.
- **Next owner-assisted read-only checkpoint:** Supabase Dashboard → Authentication → SMTP Settings. Capture whether custom SMTP is enabled, sender name/address, host and port (redact any credential, username or API key). Independently verify SMTP setup before planning provider recreation.

### Supabase Auth URL configuration — verified from owner dashboard screenshot 2026-10-16

- **Site URL:** `https://app.dialincollective.com/`.
- **Allowed redirect URL 1:** `https://the-dial-in-collective.netlify.app/`.
- **Allowed redirect URL 2:** `https://app.dialincollective.com/`.
- Total allowlisted redirects: **2**, exactly as displayed, with no wildcard rules in the screenshot.
- The current production domain equals the Site URL and appears explicitly as an allowed redirect. The historical Netlify default domain remains permitted for existing fallback/rollback references; preserve it until a deliberate future review rather than silently removing or changing live Auth settings.
- Cross-checked app source `site/cloud/main.js` constructs its signup/reset `redirectUrl` as `new URL(location.pathname,location.origin).href`; `site/cloud/client.js` uses that for email confirmation and reset. For current production home page this resolves to `https://app.dialincollective.com/`, an exact allowlisted URL.
- This screenshot **does not verify** custom SMTP, URL delivery outside the existing tested signup, email templates, or Auth provider secrets.
- No provider settings were changed, and this is a state-capture checkpoint, **not a new Locked product decision**.

## Backups and monitoring: passed with remaining boundaries

- GitHub scheduled encrypted dump runs on main; configured 30-day GitHub artifact retention. Owner's Apps Script courier polls GitHub every 3 hours, selects trusted successful schedule/manual runs and SHA-verifies ciphertext to a private Drive folder. Oct 15 and 16 scheduled archives independently downloaded from Drive byte-for-byte matched GitHub SHA-256 and ZIP CRC; manual post-release backup separately identified.
- Real owner received a clearly marked **TEST** email from the existing Apps Script `sendBackupAlert_()` function. This proves mail delivery but not real transfer-failure or overdue-failure triggers.
- The user enabled a separate **daily ChatGPT independent backup watchdog** to flag missing, late, mismatched or unverifiable scheduled GitHub/Drive backups. It is read-only and does not modify production.
- Actual periodic provider configuration restore, SMTP/Cloudflare rebuild, independent new hosted Supabase project, and end-to-end restored Auth/Netlify tests **not performed**. No paid infrastructure provisioned or changes to existing Netlify/Supabase/Cloudflare.

## Next acceptance gate

Supabase Auth URL settings are documented and verified. Next capture SMTP sender/provider settings, then Cloudflare/DNS and secure credential inventory. Only after a cost quote and the owner's explicit agreement should a new hosted recovery instance be provisioned. A disposable local PostgreSQL restore is not a full hosted provider reconstruction.
