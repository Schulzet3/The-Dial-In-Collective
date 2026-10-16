# Consolidated owner release: ready-to-publish checklist

**HISTORICAL OCTOBER 14 CHECKPOINT:** The consolidated October 16 release **was published** (Netlify deploy `6ad24660d0c6bdff2c065586`, SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`). Owner and second-account real browser checks, automatic encrypted backup→Drive, and exact ciphertext isolated PostgreSQL restoration were completed afterward. The October 14 plan's 0-credit/no-release/no-second-user statements are NOT current. Preserve original checklist for audit; use [CURRENT_STATUS.md](CURRENT_STATUS.md) for today's gates.

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
- **Owner reported six of six PASS** after decrypting the newest extracted `backup.age` locally with the previously secured private SSH/age recovery key using the corrected verifier. No private key, plaintext or terminal log was transmitted; owner report is the evidence for this local step. A separate isolated fresh-source restore already passed, but the specific decrypted Drive archive was not directly restored. Hosted Supabase/Auth/SMTP/OAuth/Netlify provider settings and secrets remain separate recovery items. Preserve private-key custody and the closed import gate.

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

## Zero-Netlify pre-release privacy verification (2026-10-14)

- Live populated-catalog Supabase SQL regressions `supabase/tests/coffee_automated_approval.sql` and `supabase/tests/coffee_identity_matching.sql` both **PASS**; no test mutations persisted.
- Original admin regression was updated for the now-actually-promoted owner; a separate synthetic admitted nonadmin is denied the admin overview while the existing owner receives sanitized/limited data. **PASS**, fully rolled back.
- New `supabase/tests/pre_release_cross_account.sql` **PASS**: the temporary confirmed admitted user sees verified coffee suggestions but zero owner shots, library, private submissions, administrator view, original archive or trusted source-verifier access. The real owner still sees the same baseline. This is a simulated database role, **not a genuine Auth-issued JWT or HTTP login**.
- Mobile regression CI now uses `npm ci` with committed lockfile, and Ubuntu 24.04 to match reproducible cloud CI.
- Detailed safe owner/invited-user steps and explicit gating are in [REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md](REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md).
- **Blocked only for real-user acceptance:** a newer production browser release needs actual Netlify credits and owner confirmation; a meaningful distinct outside user also requires approved invite flow and custom SMTP/email receipt. No Netlify publish, beta invitation or persistent external account was created during these checks.
