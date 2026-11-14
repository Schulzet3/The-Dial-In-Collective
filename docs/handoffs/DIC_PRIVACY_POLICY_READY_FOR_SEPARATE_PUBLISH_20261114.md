# The Dial In Collective — privacy policy READY for separate owner Publish

**Date:** November 14, 2026. **Repository:** `Schulzet3/The-Dial-In-Collective`. **Owner authorization:** Build and READY only; publication is NOT authorized in this chat.

## 1. Exact verified release scope

- Queue item: `DIC-Q-28-owner-oauth-privacy-policy-20261114`, state **READY (development/source only)**.
- Development merge commit: `d0b450db85f0c25b05fc65007de639852436ff66`; PR [#2686](https://github.com/Schulzet3/The-Dial-In-Collective/pull/2686).
- Exact tested source commit: `e46c92bd624cac54673cd713e16537a5272c68b7`.
- Four deployable paths: `build_cloud.mjs`, `site/cloud/main.js`, `site/privacy.html`, `site/styles.css`.
- Associated proof/packaging: `scripts/audit/site-integrity.mjs`, `tests/privacy-policy.test.mjs`. Six exact Git blobs match between tested source and development merge.
- Existing 11px muted, underlined, keyboard-focusable footer "Privacy" link is rendered for signed-out and signed-in visitors. Standalone static policy has no login requirement, no tracking scripts and no API calls.
- Target public URL after authorized deployment: `https://app.dialincollective.com/privacy/`. Homepage: `https://app.dialincollective.com/`. Authorized domain: `dialincollective.com`.

## 2. Five required exact-source CI checks: PASS

| GitHub status | Actions run | Recorded source/conclusion |
|---|---:|---|
| `approval` | [43600235102](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/43600235102) | e46c92bd / SUCCESS |
| `validate` (Node22/full app build) | [43600235024](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/43600235024) | e46c92bd / SUCCESS |
| `cloud-tests` and `mobile-browser-qa` | [43600235015](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/43600235015) | e46c92bd / SUCCESS |
| `sql` | [43600235065](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/43600235065) | e46c92bd / SUCCESS |

These are **PR-head** runs; later CI may supersede them. Recheck current refs, GitHub source blobs and exact applicable checks before release. Deployment and authenticated Google OAuth remain NOT VERIFIED. Original frozen-coffee test SKIPPED, not credited as a pass.

## 3. Mandatory release safety

1. **Wait for a separate explicit owner `Publish` command.** Merely preparing READY, merging development or selecting this handoff does not grant release permission.
2. Recover the **live** development SHA and its `docs/ai/PREFLIGHT.md` Git blob, `AGENTS.md`, Master Specification, Decision Ledger, current status, release queue, `main`, `release/production`, and latest Netlify production before any release. Use the existing #417/#457/#2169 one-use publisher/runbook; no direct Netlify deploy or manual fallback not authorized by its controls.
3. Select **only** `DIC-Q-28-owner-oauth-privacy-policy-20261114` for an owner-authorized READY-only release. There are unrelated READY/unfinished app items; preserve their exact files and exclude them unless separately authorized. **Specifically exclude the corrected #509 TESTING SQL migration**, even though it exists in development. PR [#2688](https://github.com/Schulzet3/The-Dial-In-Collective/pull/2688) records why its former READY label was invalid. Do NOT weaken checks, add duplicate publisher, cherry-pick unreviewed code or overwrite concurrent changes.
4. Verify correct source-only candidate isolation, one applicable exact-source build/test set, mandatory approval, consumable one-use publication grant, nonforce `release/production` change through the existing `main` controller and Netlify READY/current provider readback. Preserve original published app and member data. No Supabase DDL/DML, Auth, Edge, backup deletion, Google permissions or paid services.
5. After authorized publication, request the homepage and policy URL **without signing in**; independently verify HTTPS 200, correct policy HTML rather than SPA shell, 11px visible footer link, mobile readability, keyboard accessibility, no redirect to authentication, valid root-domain redirect and no secrets. If public verification fails, do not claim DEPLOYED or submit Google OAuth Branding.
6. Once genuinely DEPLOYED, reconcile this queue item to DEPLOYED with exact tested source, GitHub/Netlify deployment IDs and policy URL readback. Then in original Google Cloud project (not a new one) set homepage `https://app.dialincollective.com/`, privacy-policy `https://app.dialincollective.com/privacy/`, authorized domain `dialincollective.com`, complete Branding and publish OAuth. Google's actual review/publishing status remains subject to its console; public policy alone does not prove approval.

## 4. Distinct backup follow-up (NOT part of this release)

Separate operations [draft PR #2684](https://github.com/Schulzet3/The-Dial-In-Collective/pull/2684) stages a personal Google Drive `drive.file` courier replacing the Apps Script large-ZIP memory bottleneck. **Do not merge, enable or activate it merely by publishing the policy**. The owner must complete Desktop OAuth authorization locally, select the existing private Google Drive folder `1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf`, pass disposable Drive upload/readback, install GitHub Actions secrets privately and pass a real GitHub-runner transfer with integrity checks. Continue existing Apps Script and all historical encrypted archives until independently verified replacement.

## 5. Privacy/address review and limitations

The policy uses the owner's existing account email `schulzet3@gmail.com` as public contact. If the owner wants a different contact, substitute only a confirmed working address with a separately tested and authorized source change. Independent legal review, live unauthenticated site validation and Google OAuth approval have NOT occurred. The policy describes prospective owner-only `drive.file` backup use conditionally, not a working new transfer.

**Operational end state in this handoff:** READY/source-certified, NOT DEPLOYED, no production/provider writes. Owner's next message in a different chat can explicitly command **Publish only this READY privacy item**, subject to up-to-date release controls.
