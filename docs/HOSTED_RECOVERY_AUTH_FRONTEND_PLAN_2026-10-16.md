# Recovery-only Auth, email and frontend reconstruction plan — 2026-10-16

**Status: recovery frontend PUBLISHED (verified 2026-10-16 22:06 UTC); hosted Auth configuration and actual managed data restoration NOT YET COMPLETE.** The new independent managed recovery Supabase project `bgstplvefumsnplhqpvd` has a reconstructed database/Edge backend. This is the remaining provider configuration plan, not approval to modify production.

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
- **Next owner-only settings change, recovery project exclusively:** Supabase dashboard → `DIC Isolated Recovery Drill 2026-10-16` (`bgstplvefumsnplhqpvd`) → Authentication → URL Configuration. Set **Site URL** `https://dic-recovery-20261016.netlify.app/` and add an exact **Redirect URL** `https://dic-recovery-20261016.netlify.app/`. Do not add production hostname as a recovery sign-in target, do not change the live project, and do not use a wildcard. Owner should confirm save before configuring new-project SMTP/password settings.
- Thereafter restore the real archived Auth user + 14 shots into the new managed project through an owner-controlled secure key workflow and test live recovery-site email/Auth paths. No tests should conflate a brand-new synthetic account with successful restoration of the original archived account.

