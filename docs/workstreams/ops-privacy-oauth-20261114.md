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
