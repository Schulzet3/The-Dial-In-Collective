# Issue #2621 — New Coffee cleaner preview and tap-to-fill post-add differences

DIC_PREFLIGHT_VERIFIED development_sha=4854b80adcc661c84adbe48da736e744f603f66d preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- **Owner scope:** November 14 screenshot and instructions to make tap-to-fill on Add Coffee differences work; remove duplicated extracted field list, Published source information/download UI, and exact unverified-page warning sentence; propose, but do not implement, broader redesign.
- **Source:** current development 4854b80adcc661c84adbe48da736e744f603f66d, PREFLIGHT Git blob 2fb236bbfa6bac48513eeb3bd157b260853af06d; AGENTS, #2592 (previously deployed pre-save choices), #33/#2389 universal intake, CURRENT_STATUS, Master Spec, Decision Ledger, coverage, queue. #2592 covered pre-save source conflicts; a separate post-add Saved versus Submitted differences panel still used inert text. New code adds post-add explicit selection without claiming a verified physical handset reproduction.
- **Acceptance:** 48px keyboard/mobile buttons choose saved/submitted per field; switch back or manually correct; supported taxonomy only; no automatic save/canonical changes. Initial URL preview removes duplicated field list, Published source disclosure, structured records explanation and source download UI; maintains source conflict buttons/links, warnings, published espresso reference and original bounded source snapshots. Existing Auth/privacy/offline/Community/shot history unchanged.
- **Paths:** site/cloud/coffee-url-autofill.js, site/cloud/main.js, site/visual.css, tests/coffee-conflict-tap-to-fill.test.mjs, docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, docs/RELEASE_QUEUE.json and this journal.
- **Tests:** five new focused/hostile tests and prior regressions; required hosted CI, one build and browser visual validation PENDING. No PASS/READY claim until exact-source readback.
- **Provider:** NOT_APPLICABLE. No Netlify production, Supabase SQL/Edge/Auth, member-record write, spending, backup or publication.
- **Next:** inspect exact PR-head checks, fix selectively, nonforce merge explicit [skip netlify], read back merged SHA and tests; reconcile queue/status/issue only if evidence passes. Separate NEW owner Publish required.

## PR-head queue intake schema repair [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=4854b80adcc661c84adbe48da736e744f603f66d preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Exact #2622 PR-head approval 43571046587 failed with `DIC-Q-2621... invalid merged source SHA` because the IN_PROGRESS row omitted this required property. Repo validator explicitly accepts `null` for work not yet merged; repaired to `merged_source_sha: null` without fabricating a merge or changing application/runtime code. Hosted source security 43571046600 and isolated SQL 43571046601 SUCCESS on prior head; Node/build and browser source-bound outcomes must be rechecked for the final PR head. Retained failed checks, no bypass.
- After this repair: inspect final exact-source CI; nonforce development integration with [skip netlify]; source-bound READY queue reconciliation only after tests. No publication.
