# Owner preview release checkpoint — October 15, 2026

This file records release intent and preflight evidence; creating it is **not** proof of an actual Netlify publish. After deployment, compare the Netlify published SHA to this release commit. This release remains owner-only and SSO-protected, **not** an external beta.

## Owner-approved deployment target
- Existing protected Netlify site `the-dial-in-collective`, branch `development/backend-foundation`.
- New primary HTTPS hostname: `https://app.dialincollective.com`; the apex domain redirects to the app through Cloudflare.
- Legacy Netlify hostname retained for rollback. Supabase Site URL and redirect allowlist now include the new app hostname; the old Netlify redirect remains allowed.
- Resend Free transactional email via `no-reply@auth.dialincollective.com`: owner reported genuine password-reset email received. Cloudflare `support@dialincollective.com` forwarding: owner reported genuine message received. These are **not** real new-participant signup tests.

## Preflight completed before intentional release
- GitHub [cloud CI run 38772906022](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38772906022): PASS — **109/109 Node tests**, Node 22 build, private tree not included in the published asset allowlist.
- GitHub [cloud regression run 38772905785](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38772905785): PASS — Node/syntax/build checks and **29/29 synthetic mobile browser checks**. Browser QA uses mocked auth/backend and is *not* a live multiuser test.
- Supabase project: ACTIVE_HEALTHY. Live data check: **4 verified coffees, 4 personal library entries, 14 historical shots, one admitted account, one administrator, zero Storage objects**. All public tables have RLS enabled. Historical import saving remains disabled.
- Supabase `dic-verify-coffee` Edge Function v2 ACTIVE, JWT required. Real outside-user signed-in HTML-source verification remains a separate acceptance step.
- Netlify site's current deployed SHA before release: `72e81688069b3a112dea65a2d46020db0ad76d1d` (older build). Existing visitor team SSO remains mandatory.
- Owner-provided Netlify Usage screenshot: **1,000 Personal-plan credits available for production** through Nov 14, 2026; separate **29.6 operational credits cannot fund deployment**; auto-recharge disabled and Free downgrade scheduled after current period. The ledger was updated and the release guard's new tests passed.
- Historical encrypted recovery and independent isolated restore previously passed; complete hosted Supabase/Auth/Netlify provider reconstruction is not represented as verified.

## One-production-release policy
This deliberately marked commit requests **one** production deployment. No routine development commit should deploy. Netlify must run `npm test && npm run build:cloud` with published secret-free assets. Keep team SSO, RLS, beta admission, recovery gates and owner data intact. Do not remove SSO before actual owner and genuine invited nonadmin browser checks pass. Avoid unnecessary redeployments.

## After publish — checks not yet completed
- [x] Verified 2026-10-15: Netlify published deployment `6ad1065eb1608955698efb7b` in `ready` state with SHA `acc7a47c9dc33a412fcf7cd82b0c7d09796a44c8`, HTTPS `https://app.dialincollective.com`, required Netlify team SSO, and 0 secret-scan matches across 122 scanned files.
- [ ] Owner signs in on `app.dialincollective.com` to the **new** build; confirms all 4 coffees, all 14 shots, Settings, admin dashboard, and Log Shot → Rate → Recommendation without fabricated owner data.
- [ ] Test real password-reset redirect on the new hostname; verify source-backed coffee behavior using genuine sessions.
- [ ] Owner-approved outside participant registers/confirms by Resend and demonstrates nonadmin RLS and no admin access; only then consider removing the Netlify SSO gate.
- [ ] Refresh Netlify actual postdeploy credit balance from provider and update `docs/NETLIFY_CREDIT_LEDGER.json` using a non-release, ignored documentation commit.

Historical v0.2.0 local prototype and its data remain untouched. All previous Locked product requirements are preserved.
