# Owner and external-user acceptance runbook

**Prepared 2026-10-14; not yet executed using real Supabase-issued user sessions.**
This supplements the Locked Master Specification, Decision Ledger, and `CONSOLIDATED_OWNER_RELEASE_CHECKLIST_2026-10-14.md`. It never authorizes an unreviewed extra Netlify deploy, a new paid service, an external public beta, or a permanent test account.

## Safe readiness already demonstrated, no Netlify needed

- **Owner's actual data:** 4 verified canonical coffees, 4 approved original submissions, 14 historical shots, one admin account, one admitted confirmed Auth user, zero Storage objects; import gate closed. No synthetic test records persisted.
- **Transactional SQL regression:** `supabase/tests/coffee_automated_approval.sql` passed again with the populated catalog: admin auto-approval, nonadmin Pending, idempotency, earliest original name, user-confirmed alias, trusted official source promotion.
- **Catalog match regression:** `supabase/tests/coffee_identity_matching.sql` passed again: all five Sweet Bloom variants, origin and harvest collision safeguards, URL tracking/variant distinction, nonadmin and anonymous access guards.
- **Administrator dashboard regression:** `supabase/tests/admin_read_only_dashboard.sql` rebuilt to test a distinct admitted *nonadministrator* in a rolled-back transaction, while the already promoted owner reads only sanitized queue information; PASS.
- **Cross-account isolation:** `supabase/tests/pre_release_cross_account.sql` passed with temporary admitted user: can find global verified catalog candidate but sees zero owner shots, library entries and private submissions, cannot read admin queue, original import archive, source fetch budget or trusted verification. The owning admin still sees their real history and cannot forge service-role source evidence. All test writes rolled back.
- **Source Edge Function:** `dic-verify-coffee` is active, JWT required. This is *deployment/configuration evidence*, not proof of a real signed-in HTTP invocation.
- **Source delivery:** Current published Netlify app is an older commit protected by team SSO. Tests on the newer code and disposable SQL identities are **not** proof of the actual Auth HTTP/browser experience.
- **Release safety:** The last verified credit ledger shows 0 remaining. Browser deployments remain blocked and the original v0.2.0 prototype is untouched.

## Gate 1 — One deliberate owner-preview Netlify publication, only after owner authorization

1. Owner independently confirms Netlify plan status and provides a new **actual billing/credits** snapshot. Refresh `docs/NETLIFY_CREDIT_LEDGER.json` and its tests; do not infer balance from the plan label.
2. Recheck all cloud Node/browser CI suites, versioned migrations, active Edge Function SHA/version, private SSO and artifact allowlist. Do not weaken access guards to get the tests green.
3. One owner-approved, intentionally release-marked commit `Release DIC: reviewed owner bundle [dic-publish]` must be built and published from `development/backend-foundation`. A GitHub merge, ignored build or prepared checklist is **not** a Netlify release.
4. Confirm the published Netlify SHA equals the intended release SHA, the site is SSO-protected, and `dist` contains no keys, email secrets, personal exports or backend service-role credentials.
5. Confirm actual billing after the deployment. Avoid multiple retest/redeploy cycles consuming production credits.

## Gate 2 — Real owner Auth session and read-only data acceptance

The owner should use a normal browser and their existing password, **not share credentials, browser storage, refresh tokens, session JWTs or cookies** with ChatGPT or GitHub. Testing must not use fake JWT claims as substitute for this gate.

- [ ] Enter the Netlify SSO-protected owner site at `https://the-dial-in-collective.netlify.app`, sign in to **Supabase** with the existing admitted confirmed account.
- [ ] Confirm actual signed-in status, account admission, and an administrator-only Settings link to `/admin.html`. A nonadmin must not see this link.
- [ ] Confirm four known coffees (David Armijos, Yirgacheffe, Bavyeyi IV, Hambela) and 14 historical shots, with the earlier Slow Feed correction preserved.
- [ ] Open admin dashboard; read-only aggregated queue and approved status render without exposing private notes or any other account's identity.
- [ ] Reload the page, then sign out and sign in; confirm stable library, current coffee, recipe families, setup, shot history and recommendation behavior.
- [ ] Check the fastest Log Shot → Rate → Recommendation flow with **one genuinely pulled shot only if the owner elects to log it**. Never fabricate a coffee or historical measurement in the shared owner account to satisfy a test.

## Gate 3 — Genuine confirmed nonadministrator Auth session

Requires the owner's separate invitation authorization **and** reliable custom SMTP delivery; Supabase's built-in SMTP restrictions block meaningful outside-inbox tests. Do not create a synthetic production Auth user as a shortcut. Use a distinct authorized participant and distinct browser profile.

- [ ] Deliver and receive a genuine confirmation email at the invited address, follow the redirect, and sign in with a **real** Supabase-issued session.
- [ ] Confirm nonadmin status and no admin dashboard access; no owner private shots, library, notes or original archive are visible, while verified catalog names are available for matching.
- [ ] Add one **genuine** new coffee with an approved roaster's HTTPS product URL. Confirm atomic Pending save and normal shot logging if unverified, and server-side automatic verification only if the actual external page supplies trustworthy Product evidence for this specific release.
- [ ] Use a genuine near spelling such as Sweet Bloom's Hambela/Hambella to verify the user sees the existing canonical suggestion, can confirm **same coffee** and retain their original library entry plus shot IDs. Database canonical display name remains the first original `Hambela`.
- [ ] Use a genuinely different harvest/release to verify it stays a distinct Pending item; never auto-merge two vintages or unrelated origins.
- [ ] Confirm data isolation again between the owner and participant from distinct browser profiles/devices. Review backend audit for approved/pending/alias action without exporting personal data.
- [ ] Revisit once offline/online behavior, account switching and refresh-token session hydration are observed. Mark HTTP Auth/email and external source verification PASS **only after actual results are seen**.

## Failure handling and limits

- On any cross-account data leak, unexplained merge or unapproved globally verified coffee: halt testing and external invitations. Preserve evidence and avoid accidental destructive data cleanup; repair through reviewed code/migrations and a new deliberate owner-approved release.
- A 401/403 on an intentionally unauthenticated endpoint is only a **negative** auth test, never proof of a successful signed-in workflow.
- A successful source-code unit test, GitHub Actions run, direct SQL role simulation or deployed Edge Function does **not** certify real Auth/session/emails.
- No nonadmin external account exists yet in this beta, and custom SMTP verification remains incomplete. Do **not** claim the full beta release gate is met.

**No Netlify publishing and no permanent external-user/Auth/data changes occurred while creating this runbook.**
