# Recovery-only Auth, email and frontend reconstruction plan — 2026-10-16

**Status: isolated frontend/email + original hosted database/Auth-row restore VERIFIED, final restored-owner browser sign-in PENDING (2026-10-16).** The new independent managed recovery Supabase project `bgstplvefumsnplhqpvd` has a reconstructed database/Edge backend. This is the remaining provider configuration plan, not approval to modify production.

## Nonsecret recovery inputs already verified in production

| Setting | Actual production configuration | Recovery-environment action |
| --- | --- | --- |
| App origin | `https://app.dialincollective.com/` | **Do not use the production app as the recovery frontend.** Use a separate temporary HTTPS staging hostname to avoid pointing live sessions at a different Supabase project. |
| Supabase Auth Site URL | `https://app.dialincollective.com/` | Set to the **actual dedicated recovery frontend URL only** after site exists. |
| Auth redirect allowlist | Production app plus historical `https://the-dial-in-collective.netlify.app/` | For recovery, allowlist the exact dedicated staging URL. Do not assume prod URLs prove the clone's callbacks. |
| Supabase SMTP | Custom SMTP enabled | Re-enable custom SMTP on **recovery project only**. |
| SMTP from | `no-reply@auth.dialincollective.com` | Same sender on recovery test if owner authorizes send; label any synthetic test messages. |
| Sender name | `The Dial In Collective` | Same sender name. |
| SMTP transport | `smtp.resend.com:465` | Same host/port, username `resend`. |
| SMTP password | Configured and hidden in production | **NOT RECOVERABLE from screenshot.** Owner must create/reuse a Resend SMTP API key in private credential manager and enter it directly in the recovery Supabase dashboard; never paste in ChatGPT, GitHub, screenshots or project docs. |
| Resend domain | `auth.dialincollective.com` outgoing DKIM and CNAME verified, overall partly verified | **Do not modify DNS or enable inbound receiving.** Sender domain and Cloudflare configuration already work. |
| Signup admission | Confirmed-email signup and one-use revocable invite; role admin server-controlled | Reconstruct provider-side Email Auth confirmation/redirect settings on recovery. SQL schema, invitation handler and RLS already recreated in isolated project, but no real second login yet. |
| New-password app requirement | Minimum 8 characters, uppercase + special character | Preserve; do not add an unapproved digit/lowercase condition. Independently verify hosting Auth settings do not conflict. |
| Edge source | Two active JWT-gated functions verified | Already deployed to recovery with exact production bundle SHA; system project credentials must remain isolated. |
| Browser bundle | Latest published source commit `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8` | Build a dedicated staging copy from that exact source and configure **recovery** `SUPABASE_URL` and public `SUPABASE_PUBLISHABLE_KEY` there, never overwrite the existing live site's env vars. |

## Hosting credit gate

No Netlify recovery site/deploy has been created yet. The last owner-provided usage screenshot (985 credits) predates the October 16 publishing event. The production release was expected to spend approximately 15 build credits, but the live **current remaining credit balance is not exposed by the Netlify connector**. The product has an explicitly Locked *batch releases / no surprise charges* policy.

Before initiating a new staging deploy, get a **fresh current Netlify Usage/Billing screenshot**, confirm the project can be deployed under the existing allowance and the owner approves this deliberate recovery build. The duplicate screenshot warning applies to already completed **DNS/Auth/SMTP tests**, not to new post-release cost evidence.

A separate Netlify staging site should remain SSO-protected, never link or overwrite the live `app.dialincollective.com` domain, and must not change production visitor controls.

## Acceptance sequence (genuine new work, not repeating production)

1. Isolated Supabase project and first-party DB migration/RLS guard/Edge source reconstruction — **PASS**. See [managed restore checkpoint](HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md).
2. Hosted backup record import: original ciphertext verified in previous independent offline test; **not yet restored into the fresh managed Supabase project**. Continue using owner-controlled offline private-key custody; do not request raw private key, decrypted dump or SMTP password in chat.
3. Deploy protected temporary frontend after **credit and explicit approval**, with recovery-only public Supabase coords.
4. Configure recovery Supabase Auth Site URL, redirect allowlist and custom Resend SMTP in the owner-facing provider dashboard; credentials stay in the provider/vault. Existing production screenshots and actual delivered emails already supply the configuration facts.
5. Exercise fresh test signup→confirmation→invite→login; nonadmin admin-denial; admin role; password recovery callback; authenticated source-preview/verification using the isolated backend.
6. Reconcile logged/Auth-data snapshot, mark full or partial provider recoverability exactly, archive or delete disposable project only after user confirms evidence is preserved and no test data is needed.

**Do not claim the full hosted disaster-recovery drill is passed until those last steps are actually observed.**


## October 16 recovery frontend publication — independently verified

- User confirmed the extracted recovery-only static ZIP was manually published to the separate Netlify site `dic-recovery-20261016`.
- Independently checked Netlify project ID `fd4a4dba-0c71-4b06-be63-9f5f689aba1b`: current deploy **`6ad29fd7a4349d2132a0528c`**, **ready**, published **2026-10-16 22:06:19 UTC**, production-context manual deploy with no connected branch/commit ref, HTTPS `https://dic-recovery-20261016.netlify.app/`.
- Site Netlify team SSO remains **required for all deploys**. Live production `app.dialincollective.com` still reports its original deploy `6ad24660d0c6bdff2c065586` as `ready`, with additional Netlify SSO only for nonproduction previews. No change to Cloudflare/custom domain.
- Dedicated recovery Supabase project `bgstplvefumsnplhqpvd` is `ACTIVE_HEALTHY`; recovery Edge preview/verification endpoints active and JWT-required. Existing recovery-only provider public env variable names were already configured. Source package was checked before manual upload for a recovery-only Supabase config; **Netlify does not expose uploaded asset bytes through the current connector**, so static file contents at the published URL have not been independently re-read.
- Actual incremental Netlify credit deduction for this manual publication has **not** been independently observed. Last owner screenshot immediately prior was **970 / 1000** Personal credits and **29.2 / 30** Operational, auto-recharge disabled; do not claim a new post-publication balance without fresh evidence.
- **Owner-reported COMPLETE (saved):** On the separate Supabase recovery project (`bgstplvefumsnplhqpvd`), Site URL and exact redirect were set to `https://dic-recovery-20261016.netlify.app/`. The owner explicitly replied “saved” after the requested settings step. This is owner confirmation, **not** a separately retrieved Supabase Auth settings API read. The live project's Auth URLs were not requested to be edited.
- **NEXT (recovery-only):** Configure SMTP in the new project's Authentication → SMTP Settings with a **distinct restricted Resend sending key** entered directly in Supabase, using the same verified sender/domain/SMTP host and port. Do not request, upload, or log its password. Email provider and confirmation settings must be checked through a genuine recovery test.
- Thereafter restore the real archived Auth user + 14 shots into the new managed project through an owner-controlled secure key workflow and test live recovery-site email/Auth paths. No tests should conflate a brand-new synthetic account with successful restoration of the original archived account.


## Recovery-only custom SMTP configured — owner confirmation, 2026-10-16

The owner reported **“saved”** after being instructed to create a *separate Resend sending-access API key* and enter it **only** in recovery Supabase `bgstplvefumsnplhqpvd` under Authentication → SMTP Settings. Expected nonsecret SMTP settings: enable custom SMTP, sender `no-reply@auth.dialincollective.com`, sender display name `The Dial In Collective`, host `smtp.resend.com`, port `465`, username `resend`. The recovery-only SMTP password value was never provided or stored in ChatGPT, GitHub, or the handoff. This is a **user-confirmed save**, not an independently fetched provider Auth settings object or successful delivery test. Production SMTP untouched.

**Next independent acceptance (not a repeat of production tests):** Open **`https://dic-recovery-20261016.netlify.app/`** as an authorized Netlify team viewer, use the already owner-controlled **second email address** (not the historic archived administrator account) to create a new account in the **isolated** Supabase Auth instance, and inspect the newly delivered email link. The signup must present `Check your email`, send one confirmation email, and verification must redirect back to the **recovery** Netlify hostname, never production. This new user will remain **unadmitted** until a recovery-only invitation is created and redeemed. Full managed archived Auth/account restore is still pending; the extra test Auth user may need removal before replaying the actual older backup. Do not ask the owner to send credentials.

## Real recovery-site confirmation accepted — 2026-10-16

**PASS (owner observation, independently supported by read-only SQL):** After saving recovery-only Auth redirect and distinct SMTP settings, the owner opened the isolated Netlify recovery site, created an account using their separate owner-controlled test address, received the email confirmation and followed its link back to the same recovery site. The site displayed the **Use Invitation** / invitation-code gate. This is real recovery-project confirmation/redirect/email evidence, not a simulation of production signup.

**Independent read-only recovery database after this observation:** 1 `auth.users`, 1 confirmed email, **0 admitted beta members, 0 admins, 0 coffees, 0 shots**, and `private.import_control.saves_enabled=false`. Production independently remains **2 confirmed accounts, 2 admitted, 1 admin, 4 coffees, 16 shots**, with imports disabled. No account ID, emails or passwords were copied into this report.

The owner specifically requested **not to repeat** the invitation redemption test already performed in production: the gate is visibly present and the role/invite handlers passed rollback-only recovery SQL simulations. **Recovery invitation redemption is NOT individually passed**; record it as untested, not assumed passed. The missing milestone for a full hosted recovery is restoring the **original archived 1-admin/14-shot snapshot** into the recovery project's managed Auth/database and verifying sign-in to that restored account with separate recovery project JWT settings.

Archived recovery private identity remains only on the owner's Mac. Earlier one-time test-envelope private identity was deliberately deleted after the isolated local PostgreSQL restore. A new secure one-time re-encryption is required to import the exact source archive into the managed recovery project; do not request the permanent private key or a plaintext dump, and do not equate current clean test-user signup with original-identity restoration.

## Subsequent milestone: exact archived hosted data and Auth user restored (PASS)

This is newer evidence than all preceding “not yet restored” checkpoints. The owner supplied the encrypted one-time Mac rewrap ZIP, decrypted with a new temporary identity. The original backup manifest and dump hash matched prior independent GitHub/Drive checks. The actual **original archived admin identity, 14 shots, four library entries and coffee catalog** plus related audit/import records are now committed to **the separate managed Supabase recovery project**, keeping the newly signed-up recovery test user as confirmed but unadmitted. One complete rollback-only restore rehearsal and the final commit both passed per-row/table parity for the 44 source tables. The recovery project now holds **2 confirmed users / 1 admin / 1 admitted / 1 pending / 4 verified coffees / 14 shots**. Production remains at **2 admitted / 16 shots**. Auditing/RLS/trigger safety remained intact, and a separate SQL role test confirmed recovered original admin private history and denial to the pending user. See [full managed restore evidence](HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md).

**Current next user check:** On `https://dic-recovery-20261016.netlify.app/`, sign out of the temporary second-email account, then sign in with the **original administrator account/password from production**. Expect 4 coffees, 14 older shots, and access to Admin Dashboard. This is a **recovered account** authentication test, distinct from the recovery signup/email test that already passed. If password changed after the archived snapshot, use recovery-only reset and keep live project unaffected. Record actual user acceptance before marking fully hosted recovered. **Do not ask for another key or repeat the completed Mac rewrap.**
