# Issue #1596 — first-setup welcome

## Authority and recovery — November 8, 2026 Denver

Owner approved the reviewed welcome-screen prototype, exact concise Settings recall copy and both-theme contrast, then asked to prepare for READY without publication. Previous Issue #37 delivery remains DEPLOYED and closed. The new placement is bounded by decision UX-FIRST-SETUP-WELCOME-20261108 in both canonical files.

- GitHub development base: `9be89d5ef6f3f6145a38a1f51d46e58271b99adb`; main and release/production untouched.
- Approval changes only the existing admitted no-setup welcome route: Account → Welcome → Setup, same-source media and guide, existing New Setup action.
- Existing members with a saved setup bypass welcome; no new Auth gate, invitation bypass, account flags, backend or member-data changes.
- Files: site/cloud/help.js, site/cloud/main.js, site/visual.css, tests/issue37-in-app-help.test.mjs, tests/issue1596-onboarding-welcome.test.mjs, Master Specification, Decision Ledger and this indexed scoped journal.
- Original 135.56s MP4 and captions/transcript untouched; preserve Settings → Help & Getting Started, private data, offline, five ratings, Log Shot → Rate → Recommendation.

## Verification status before code integration

- Source before-write checks: existing no-setup anchor uniquely found; exact approved copy verified; decision JSON parsed; all changed files source-bound to base.
- **PENDING:** exact PR-head CI, source build, browser/mobile checks, merge readback and exact merged-source checks. No unrun tests claimed PASS.
- **Next:** open PR, diagnose/fix actual failures, nonforce integrate, independently read back exact SHA, then add a READY queue record only with passing applicable evidence.
- No release candidate staging/certification, provider/Netlify writes or deployment without new owner Publish.

## First exact PR-head CI correction — November 9, 2026 UTC

PR #1597 first reviewed head `30373e503975d1a4f339f733db8c9ba70619c275`: owner decision/approval coverage step passed, but `release-queue.mjs --enforce-intake` correctly failed (run 42568664121) because three app files lacked an IN_PROGRESS/TESTING/READY record. Not an authorization or runtime issue. Added scoped `DIC-Q-1596-first-setup-welcome-guide-video` as **TESTING** with all three deployable paths, preserves existing queue items. Recheck exact new PR head and merged source before READY; earlier failed check remains documented. Frozen603 SKIPPED is NOT PASS. No publication.

## First full Node run failure and scoped repair — 2026-11-09 UTC

Exact second PR head `fe140832f47ca37c7ada6f279a28bb8057fea975` passed approval/intake 42568792285, SQL42568792600, security42568792168, cloud/mobile/browser 42568792147. Frozen603 42568792422 SKIPPED (not PASS). Node 42568792585 ran **3,186 tests: 3,179 PASS, 1 FAIL, 6 intentional SKIP** (before lint/build). The ONLY failure was historical `tests/issue37-beginner-guide-contract.test.mjs` asserting all UI labels must literally appear in main.js; `Set Up My Workspace` is now correctly rendered from firstSetupWelcomeMarkup in site/cloud/help.js. Repaired source inventory to include the actual rendered onboarding markup while still checking every label against the guide. Source behavior remains unchanged. Re-run exact new head and inspect full CI/build before merging; failed history retained and not counted PASS. No publication.

## Nonforce concurrent-development reconciliation checkpoint — 2026-11-09 UTC

Repaired PR #1597 exact head `b3707375754dffe48f9f09824e129c4b60b0d580` verified: Node full suite/lint run 42569148301 SUCCESS, one compiled UI build/mobile/visual/contrast/keyboard/accessibility in 42569148227 SUCCESS, approval and queue intake42569148201 SUCCESS, SQL42569148225 and security42569148228 SUCCESS, frozen60342569148206 SKIPPED (not PASS). Historical CI failures 42568664121 missing intake and 42568792585 legacy literal location were corrected, not erased.

Concurrent verified development base `ab591f33dd47d2c4fde4ad7f46a80ac17e446cdd` changes main.js, Master, Ledger, queue and workstream index. Prepared an additive nonforce integration tree from **current development's full bytes**, reapplying only the approved UI insertion and merging the two new Locked decision entries and TESTING queue intake; preserving all unrelated concurrent commits, records and media. Existing PR source remains second parent to preserve provenance. Merge-source CI **PENDING**; the feature is **TESTING**, NOT READY or deployed until exact merge SHA and CI are verified. Release/production, providers, Auth/SQL data unchanged.
