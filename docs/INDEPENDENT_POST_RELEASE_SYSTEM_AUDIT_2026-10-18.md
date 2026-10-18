# Independent post-release system audit — October 18, 2026

**User request:** After separate-chat release, independently verify all deployed functionality, data safety, security, providers, backups, release/source fidelity, and documentation. Inspect rather than trusting historic status. GitHub is the running record. This is a **read-only production audit**; documentation edits only and no production migration/deploy or personal-shot changes.

**Audit status:** IN PROGRESS. Durable early checks below; additional functional/security and provider review and conclusions will be appended. Never construe pass of a synthetic test as an authenticated production acceptance.

## 1. Deployed application and source (independently reproduced)

- Netlify site `153277f2-e19e-4862-b9a6-f2e18ccde271`, current published READY deploy `6ad46be2f45996b6f3f821fd`, production deploy published 2026-10-18T06:49:38.865Z, release source `2d790f9b4d49fdbce5eb8649d69d262f88fef07b`; no provider-reported deploy error. Public hostname `https://app.dialincollective.com`. Nonproduction visitor SSO required; production SSO off, Supabase Auth/beta admission intended.
- Re-ran GitHub compare deployed SHA vs `development/backend-foundation` HEAD `30b17f7d1683d7202d4ea2728a2831c4702b3470`: **five changed paths, ALL documents** (`docs/CURRENT_STATUS.md`, `docs/README.md`, `docs/COMMUNITY_OUTLIER_RESEARCH_2026-10-18.md`, `docs/PRODUCTION_RELEASE_POSTFLIGHT_RECONCILIATION_2026-10-18.md`, `docs/RELEASE_2026_10_18_MANDATORY_OUTLIER_AND_COFFEE_EDIT.md`). No code, SQL, build or test drift. Do not pay for an identical release.
- Netlify published function `coffee-url-preview` active at `/api/coffee-preview`; exactly one function in deploy, protective HTTP headers rule included and Netlify secret scan **208 files, zero matches**.
- Netlify recent 12-hour observability: **200=348, 301=7, 304=22, 404=79, 5xx=0**. Top 404 source is `/wp-admin/install.php` (38 hits), followed by mostly WordPress/Joomla scanning, plus missing generic `/favicon.ico` (4); required `/cloud/main.js`, `/lib/ui.js`, `/vendor/supabase.js`, `/cloud/client.js` and other shipped assets had successful retrievals. **Do not call 404 scanners an app fault**. True signed-in end-to-end login is not yet tested; direct HTTP calls from the audit runtime are DNS/network-inaccessible, which is not proof that the public site is down.

## 2. Production Supabase and Community

- Supabase live migrations **28**, newest `20261018064703_dic_contextual_quality_community_ui`. Two Edge functions ACTIVE with `verify_jwt=true`: `dic-preview-coffee` v3 and `dic-verify-coffee` v4.
- Independently aggregated production live records: **15 personal shots, 15 private shot notes, 4 canonical coffees, 4 workspace coffees, one Community observation, one eligible, zero Pending, zero held, one private contribution link, one quality review and one distinct eligible contributor**. No audit writes.
- Exact Community row: verified **Orinoco Coffee & Tea / Yirgacheffe**, Turbo **18 g / 49.8 g / 21.1 s** (ratio 2.7667), all five green (3/3/5/5/1), quality outcome `eligible`, reason `valid`, reviewed 2026-10-18 06:54:44 UTC. Read-only joined source/quality check confirms original shot visible/all-green, identical structured values, original source revision = contribution-link revision = quality-check revision, canonical-library-coffee matching and pseudonymous contributor resolves to original source owner. No second review needed or executed.
- All **23 public app-owned tables** have RLS enabled. Direct `authenticated SELECT` on `public.community_shots` **denied**; likewise public anon table grants denied. Member-facing browse/confirm RPCs are callable by `authenticated`, *not* `anon`; private contribution/quality source tables not directly SELECT-able by users. Five deliberate `SECURITY DEFINER` callable public RPCs continue to trigger **one grouped provider security WARN**; real admitted/other-member SDK/HTTP tests remain open. Supabase second security WARN is leaked-password protection disabled. Security advisor private RLS no-policy INFO and performance index INFO remain tracked in #27.

## 3. Backup and recoverability — **NEW independent offsite receipt**

- Scheduled 2026-10-18 GitHub encrypted backup [workflow run 39131254933](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39131254933) **SUCCESS**. Its ciphertext ZIP artifact is GitHub **artifact ID `12137024904`, size `894341` bytes**, created 13:23:10 UTC; archival ZIP digest `sha256:9a90e1e93d1023cb6ddff0a7549d739d644b510af13e8e564a22746ccf2986a0` (GitHub-reported).
- Independently browsed owner's private Google Drive folder `DIC Automated Encrypted Backups`; found exact `dic-nightly-12137024904.zip`, **894341 bytes**, created 2026-10-18 **15:20:16 UTC**, file ID `1OzDuPlny82N9sOIvtCsVeQ2H8YgmcVuu`. **Same GitHub artifact ID in the filename and exact byte size**, ~117 minutes after original artifact. This is a fresh independent **offsite delivery receipt**, stronger than the prior unverified status. **We have not calculated the actual Drive ZIP SHA-256 or decrypted and restored this exact offsite file**, so cannot claim byte-for-byte digest equivalence or verified Drive-based disaster restore.
- Additional 2026-10-18 weekly [isolated database recovery verification workflow 39134655253](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39134655253) **SUCCESS**; GitHub job specifically reports `Restore all user application tables to a disposable, network-isolated PostgreSQL` PASS. This validates its separate hosted-to-isolated restore pipeline, **not** a restore from the latest Drive upload.
- `main` branch `ecab2902ac2acff5f739a440e4cfa87afdae03be` backup-only workflow checks out exact published app SHA `2d790f9b4d49fdbce5eb8649d69d262f88fef07b`. Verify Apps Script unattended trigger/courier logs and cryptographic Drive download when available; do not manipulate the backups or alert configuration for an audit.

## 4. Remaining checks to finish

- Review current production SQL/API implementation and role privileges against source and Locked decisions, including all outlier correction, anonymous browser count and own-coffee edit protections.
- Verify GitHub CI on exact deployed SHA, third-party Edge/Netlify source, backup logs/advisories and real HTTP runtime signals without incurring production writes/credits.
- Inspect connected provider limitations (Cloudflare, Resend, Google Apps Script) and any actual new failures; do not overstate unavailable integrations as passing.
- Reconcile current-status/index statements and affected issue #28 using source-backed evidence; preserve dated historical sections as history, do not silently modify Locked product decisions.
- Distinguish passing automated/proxy evidence from any outstanding genuine multi-account authenticated, mobile/offline, restore and provider-setting acceptance.

**Next action:** finish remaining checks, record pass/fail/unknown, reconcile GitHub docs and issues, make no live deploy/mutation without the separate Locked release gate.
