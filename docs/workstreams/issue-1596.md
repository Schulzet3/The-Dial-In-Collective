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
