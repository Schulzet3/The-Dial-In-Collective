# Consolidated owner release: ready-to-publish checklist

**Prepared:** 2026-10-14. **Netlify publishing intentionally paused** until the owner reports the paid plan is active and a current verified credit balance is recorded. GitHub testing and Supabase database work require no Netlify deploy.

## Source and backend
- Production owner-preview source branch: `development/backend-foundation`.
- GitHub PRs #1–#6 incorporate owner-approved setup names, per-setup Slow Feed, optimized shot-history actions, Recovery options, private admin dashboard, normalized roaster matching, earliest-entered canonical identity, and automatic owner/source-backed coffee verification.
- Supabase now contains four verified original coffees, four approved submissions, 14 historical shots, one admin. Historical import saving remains disabled.
- `dic-verify-coffee` JWT-gated Edge Function is active; no public service-role key is exposed to clients. Verified roaster URLs are restricted and rate-limited.
- GitHub CI: 106 Node tests and 29 synthetic mobile checks passed on reviewed source; re-run against release head before publishing.

## Disaster recovery gate: strong, not full hosted-platform clone
- Encrypted post-approval backup created by GitHub workflow run 38651451190; artifact 11934399256; source/Drive ZIP SHA-256: `4cd62b5ee672712e2b12fb0aebc690acfb74b6a9124c6cdd7fea1131adb4c121`.
- [Private Drive copy](https://drive.google.com/file/d/1if9H3H_RTfsKkk5GmrDmO4A-pIrk9nIJ/view?usp=drivesdk) uploaded and independently re-downloaded to confirm exact byte match.
- Independent isolated restore of a fresh read-only production source snapshot passed in run 38651515568: all 41 app tables plus core Auth rows, exact row fingerprints, first-party RLS/policies/triggers/functions, four verified coffees and 14 historical shots.
- Private Drive archive decryption with the owner-held offline key has **not** been checked for *this* newest archive. Hosted Supabase/Auth/SMTP/OAuth/Netlify provider settings and secrets are separate recovery items. Preserve original private-key custody and import gate.

## Honest real-user verification boundary
- Rollback-only tests simulated a real owner **database role** and verified permissions, admin automatic approval, ordinary-user Pending creation, matching, idempotent mutations, canonical first spelling, and protected trusted-source promotion. This does **not** equal a browser session using a genuine Supabase-issued JWT, and the published Netlify owner preview is still an older build.
- The Edge Function is active, but an actual signed-in **ordinary non-admin account with a genuinely reachable official product URL** must complete end-to-end HTTP fetch → match → verified DB record → preserved personal library entry → app confirmation. Do not seed throwaway user credentials, obtain the owner's password, or loosen Auth permissions just to fake the test.
- External non-team user signup remains gated by Supabase's default SMTP limitation until approved custom SMTP and email confirmation are configured. Safe end-to-end testing with owner may exercise the JWT authorization and source-fetch rejection path but cannot substitute for a non-admin auto-verification flow.

## When Netlify credits are available
1. Owner confirms plan update, and the verified Netlify billing snapshot is refreshed in `docs/NETLIFY_CREDIT_LEDGER.json` (currently zero remaining). No upgrades/purchases by ChatGPT.
2. Reconcile `development/backend-foundation` commit SHA, applied Supabase migrations, active Edge Function version, documented Locked decisions, 106 tests and mobile QA. Record approval of a single release bundle.
3. Use **one deliberate** release commit subject `Release DIC: reviewed owner bundle [dic-publish]` after checks pass. The `netlify.toml` guard rejects ordinary development commits and stale/insufficient credit snapshots. Do not bypass the guard using build hooks.
4. Check the Netlify **published deploy commit** matches the release commit, the site is ready and SSO-protected, import save gate is closed, and no secrets have been included in the site bundle.
5. From the owner login, exercise Setup Rename, Slow Feed home/office defaults, Log Shot → Rate → Recommendation, Edit vs Make Current, Settings Recovery, admin read-only queue, pending confirmation, source verification result and cross-device hydration. Verify no duplicate canonical coffees or missing history.
6. Only after actual real-user checks may we describe the feature as verified end-to-end. Log any fails and avoid unreviewed repeat production deploys.

**Release is prepared but not published.** A credit purchase is not required for backups, SQL tests, isolated recovery or GitHub CI. One controlled Netlify publish is required to put the new browser experience in front of the owner.
