# Recovery-only Auth, email and frontend reconstruction plan — 2026-10-16

**Status: prepared, NOT YET APPLIED.** The new independent managed recovery Supabase project `bgstplvefumsnplhqpvd` has a reconstructed database/Edge backend. This is the remaining provider configuration plan, not approval to modify production.

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
