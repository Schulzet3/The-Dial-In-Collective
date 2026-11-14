# November 14, 2026 — discreet OAuth privacy policy site change (DEVELOPMENT ONLY) [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=0e56e6ff501f7b3bc4078d6c98441e399f9c95db preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Owner expressly approved BUILD of a standalone privacy policy page with the least prominent compliant homepage link; no publication command. The app footer contains a modest 11px muted, keyboard-accessible link visible in the signed-out and signed-in homepage; not made invisible as Google and accessibility require discoverability. New public /privacy/ static page covers existing app account/shot/community privacy and proposed owner-only Google Drive backup OAuth limited use, with conditional wording for not-yet-enabled integration. Contact uses the verified owner Gmail address already associated with the private backup folder; owner review of publicly displayed address remains recommended before publication.

Scope site/cloud/main.js, site/styles.css, site/privacy.html, build_cloud.mjs, tests/privacy-policy.test.mjs, this journal. No authentication, RLS, member record, production, Netlify, Google Cloud or backup mutation. Privacy page only becomes reachable after separate owner-authorized publication. Acceptance requires exact-source privacy tests, source/build validation and applicable GitHub CI; no claim of current live URL.

## Follow-up same-commit generated route allowlist [skip netlify]
DIC_PREFLIGHT_VERIFIED development_sha=0e56e6ff501f7b3bc4078d6c98441e399f9c95db preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Include the deliberately generated privacy/index.html as a legitimate static output in scripts/audit/site-integrity.mjs so the production packaging allowlist verifies the new policy page rather than flagging it as unexpected. Do not weaken general extra-file or missing-file detection. No publication.

## Release-queue intake repair after exact PR CI [skip netlify]
DIC_PREFLIGHT_VERIFIED development_sha=0e56e6ff501f7b3bc4078d6c98441e399f9c95db preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Initial PR #2686 approval CI run 43597666305 correctly held new untracked application paths; as required by the existing release safety policy, register all four changed deployable application paths under new DIC-Q-28-owner-oauth-privacy-policy-20261114, IN_PROGRESS, separate from all READY items. Do not mark READY, merge, or deploy without exact tests and explicit independent publication approval. This is a repair of queue intake, not weakening the gate.


## November 14, 2026 — final preparation, test receipt, and Google OAuth dependency [skip netlify]

**Exact current staged source at documentation time:** \`d97d3a1ec1fdc3cd1880ac05741556a0c35f0b6b\`; draft PR #2686, base development \`0e56e6ff501f7b3bc4078d6c98441e399f9c95db\`. Current operations main \`34c5bda912263365aeb06aad93042b61585eecbd\`, published release/production \`69b066171b64a54f92d828ce99c51f29afb32780\`. All these are source-bound snapshots; **recheck live refs before any integration/release**.

### Owner decision and release scope

- Owner approved building a discreet, minimally intrusive privacy policy page linked in the app's existing footer. This is **build approval, not a new owner Publish instruction**; deployment is required later for Google OAuth to verify that the public HTTPS policy page exists.
- Do not use invisible/background-colored text or hide the policy behind beta sign-in. The visible 11px muted-color, underlined and keyboard-focusable footer link is the least intrusive compliant approximation. Signed-in and signed-out app render paths share this footer. Application homepage URL is \`https://app.dialincollective.com/\`, policy URL after deployment \`https://app.dialincollective.com/privacy/\`, authorized domain \`dialincollective.com\`.
- Existing app data/privacy language in Settings -> Community & Privacy remains intact; this new page supplements it. The privacy policy makes conditional, prospective statements for the owner's not-yet-active OAuth courier; never claim this automated Google transfer already works.
- The user owns the domain and has an existing Google Cloud project \`The Dial In Collective\`, external OAuth \`The Dial In Collective Backups\`, desktop client \`The Dial In Collective Backup Setup\`, and Google Drive API. Screenshot November 14 shows OAuth \`Testing\` and disabled \`Publish app\` until Branding is completed. Do not recreate the project/client by default.
- Final public contact address currently rendered by the page is \`schulzet3@gmail.com\`; this is **publicly visible after publication**, and must be explicitly reviewed for suitability. Alternative owner-controlled support inbox can be substituted before release if wanted.

### Exact implementation and packaging

1. \`site/privacy.html\`: standalone, self-contained semantic HTML policy; no login, dynamic scripts, third-party calls, trackers, cookie banners or database reads. Discloses core account/email/authentication, coffee, shot, preferences, community/admin, security, providers, encrypted offsite backup, \`drive.file\` scope, retention and contact. Language is limited to observed service behavior and conditional future OAuth operations; independent legal adequacy is **not certified**.
2. \`site/cloud/main.js\`: adds a brief \`Privacy\` anchor to the preexisting footer only. No changes to shots, ratings, recommendations, OAuth sign-in, member-admission or Admin actions.
3. \`site/styles.css\`: \`11px\` muted footer link, understated underline, hover and visible keyboard focus; same-color-as-background or opacity-zero intentionally rejected as noncompliant/inaccessible.
4. \`build_cloud.mjs\`: copies \`site/privacy.html\` to \`dist/privacy/index.html\` during the existing owner-gated build; leaves existing Netlify command, credentials and release gating unchanged.
5. \`scripts/audit/site-integrity.mjs\`: adds only \`privacy/index.html\` to the strict generated asset allowlist; no weakening of import validation, missing/extra file checks or security response headers.
6. \`tests/privacy-policy.test.mjs\`: two focused static verification cases covering signed-in/signed-out footer markup, restrained link CSS/focus, policy contents, no credential exposure and packaged path.
7. \`docs/RELEASE_QUEUE.json\`: new isolated \`DIC-Q-28-owner-oauth-privacy-policy-20261114\` entry, **IN_PROGRESS**. Four changed deployable paths are intake-tracked. No other READY item or protected queue state was intentionally altered.

### Hosted exact-head CI observed on PR #2686 at \`d97d3a1ec1fdc3cd1880ac05741556a0c35f0b6b\`

| CI | Workflow run | Result | Interpretation |
| --- | --- | --- | --- |
| Cloud build and tests | 43597779170 | SUCCESS | Source/build tests passed; real Netlify publish NOT done |
| Cloud UX regressions | 43597779210 | SUCCESS | No observed UX regression in hosted suite |
| Isolated SQL release regression | 43597779175 | SUCCESS | Disposable SQL tests, no production SQL |
| Source security/dependency | 43597779167 | SUCCESS | No observed source security check regression |
| Coffee audit Python | 43597779139 | SUCCESS | Separate repository compliance check |
| Approval, implementation, continuity | 43597779195 | FAILURE | **Not a privacy-policy failure**: existing queue item \`DIC-Q-509-recommendation-context-null-control-guard\` lacked applicable successful exact-source five-check evidence; the required READY evidence gate held the whole PR |
| Frozen coffee corpus | 43597779186 | SKIPPED | Not a PASS and not pertinent to this scope |

The **prior** PR source \`4b77698f...\` failed queue-intake on untracked new website paths. The source now records all four paths in an IN_PROGRESS queue entry; subsequent approval job confirmed \`[DIC queue intake] PASS 13 tracked deployable paths\`. Its separate preexisting #509 gate still failed. **Do not modify #509 READY evidence or bypass the gate merely to ship the privacy policy.** No CI result above proves actual Google OAuth approval or public website reachability.

### Operational dependencies and exact next steps

1. Review public privacy-policy wording and public contact address. The policy is an operational draft, not legal advice. Confirm whether member data deletion/access contact handling, retention exceptions and Google Drive use claims are still accurate.
2. Reconcile unrelated READY evidence failure for #509 through that issue's existing authorized workstream, **without falsifying CI or downgrading/unreadying unrelated records solely to force this release**. Recheck relevant refs, PR changes and CI after any concurrent integration. Keep this privacy item IN_PROGRESS until actual release readiness criteria are satisfied.
3. Through the established GitHub nonforce development process, integrate only the reviewed privacy paths when the project's nonrelease PR gates permit. Reconcile queue/status/journal for the exact integrated source; mark this privacy item READY only after applicable exact-source acceptance. No implicit app publication.
4. At the owner's separate, explicit **Publish** request, use the **existing** source-scoped, one-use, READY-only release controller and its required five exact-source checks. Isolate from all other IN_PROGRESS/TESTING paths, preserve the published working app and backend, and verify the unique Netlify READY/current deploy. Do not deploy manually as a shortcut, auto-stage or consume a release grant without the prescribed authorization.
5. Independently visit unauthenticated \`https://app.dialincollective.com/privacy/\` and root homepage; verify HTTPS 200, full policy body, footer link, keyboard access, mobile presentation, no sign-in redirect, no exposed secrets, and that \`https://dialincollective.com\` resolves/redirects appropriately. Check that Netlify SPA/PWA routing serves the intended \`privacy/index.html\` rather than silently returning the app shell. This is **not yet tested**.
6. In the **existing** Google Cloud console project, set OAuth homepage \`https://app.dialincollective.com/\`, privacy URL \`https://app.dialincollective.com/privacy/\` and authorized domain \`dialincollective.com\`; complete Branding and publish the external OAuth application. No new service account, project or domain purchase required. Google's verification/publishing policy must be checked against the actual scope/config; a publicly accessible policy alone does not guarantee approval.
7. Continue the **separate** draft Google Drive backup courier operations PR #2684 only after OAuth is usable. Owner performs the local Google authorization with the originally created desktop OAuth client and narrowly scoped \`drive.file\`; perform a disposable upload/readback and safely clean up only that disposable test. Protect refresh tokens/client secrets as GitHub encrypted Actions secrets, never Git commits, issues, ChatGPT text, or browser screenshots.
8. Only after a genuine GitHub Actions runner test demonstrates one encrypted ZIP delivered to the existing private Drive folder \`1Nxs_AYpacPdgGEwKvI-ej4KFszZwPLhf\`, with verified SHA-256/size, correct parent, duplicate handling and least-privilege access, separately approve/implement the automated courier and reconcile the legacy Apps Script backup retention/alerts. Preserve all existing ciphertext archives and original Apps Script recurring trigger until independent end-to-end checks pass.

### Completion status and hard safety boundaries

**Source prepared and staged; hosted functional checks observed mostly SUCCESS. Overall privacy PR is NOT READY because approval gate failed on an independent READY item; page is NOT DEPLOYED, URL NOT VERIFIED, Google OAuth remains TESTING, backup courier remains NOT ACTIVE.** These states must not be reinterpreted as pass from local/source tests or mere existence of draft PRs. No production SQL/Auth/member data, Netlify deploy, cloud billing, backup archive deletion, secret changes, or Drive folder permission changes were performed.

## November 14 2026 - integrate verified #509 governance correction into privacy preparation branch [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=a93ac17d10b0eeebb346122d6f2106ff372e0f8b preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Independent #509 false-READY correction merged by PR #2688 into development a93ac17d10b0eeebb346122d6f2106ff372e0f8b after approval CI 43600072650 SUCCESS. Changed only source-evidence queue record and issue-509 journal; no SQL or runtime changes. This privacy PR now incorporates the exact new development base and preserves its original privacy IN_PROGRESS queue item without reverting #509 TESTING or any unrelated queue records. Privacy source bytes unchanged; exact new head CI still required before integration. No publish, production, backups, member data or provider change.

## November 14, 2026 — source-certified READY after merged privacy PR #2686 [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=d0b450db85f0c25b05fc65007de639852436ff66 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

GitHub merged PR #2686 into development at `d0b450db85f0c25b05fc65007de639852436ff66` as a nonforce first-parent merge with `[skip netlify]` in the merge title. All four deployable privacy paths and both site packaging/test paths have unchanged Git blobs from PR tested source `e46c92bd624cac54673cd713e16537a5272c68b7`. PR head exact-source checks all SUCCESS: approval `43600235102`, validate `43600235024`, cloud + mobile `43600235015`, sql `43600235065`. The separate #509 invalid READY was source-corrected by PR #2688 and reclassified TESTING, not deployed. Now mark only privacy queue item `DIC-Q-28-owner-oauth-privacy-policy-20261114` READY with merged source d0b450db85f0c25b05fc65007de639852436ff66 and these four cited workflow runs; preserve production_deployed=false. No Netlify/Google/Drive/auth/member/provider writes; existing app publisher remains the only deployment authority. This commit also updates CURRENT_STATUS and adds a dedicated publication-only handoff. Owner explicitly wants to deploy in a separate chat, NOT this one.
