# Issue #2638 — exact New Coffee conflict instruction

DIC_PREFLIGHT_VERIFIED development_sha=e8d926639b830740ef949481c348979d2283d19c preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Owner Nov14 exact instruction: remove `Review conflicting details` and previous full paragraph, display `Tap the correct option to autofill, or type  a value in the field`. No badge, no extra heading, no automatic option selection.
- Live mandatory preflight at e8d926639b830740ef949481c348979d2283d19c Git blob 2fb236bbfa6bac48513eeb3bd157b260853af06d; read AGENTS, scoped #2633/#2621, Current Status, Master Spec, Ledger, coverage and READY queue. Concurrent #2633 badge removal finalized READY at e8d926639b830740ef949481c348979d2283d19c with code merged `5a295c08219b91426971227153893e8749deeaa3`; preserve prior READY row/receipts and do not rewrite it. Existing PR #2637 used a stale queue snapshot (IN_PROGRESS #2633); supersede with this branch based on current queue instead of undoing verified #2633 results.
- Paths: site/cloud/coffee-url-autofill.js, tests/coffee-conflict-tap-to-fill.test.mjs, tests/coffee-preview-no-source-badges.test.mjs, docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, docs/RELEASE_QUEUE.json and this same-commit journal.
- Acceptance: exact visible phrase and no obsolete heading/paragraph; source-backed selectable alternatives and manual field untouched; no badge, no accidental source acceptance or auto-save; existing source diagnostic/oracle and safety remain.
- Five required exact SHA CI and merged Node/mobile browser check PENDING. Original PR #2637 tests might complete, but source docs differ; do not credit its results as exact new candidate tests. No duplicate manually launched suite/build. No provider/production/Auth/SQL/membership action. Owner Publish required separately.

## Full Node CI assertion repair on exact PR candidate [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=e8d926639b830740ef949481c348979d2283d19c preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Initial exact PR-head cf6dc4e7 full Node run 43577132460 FAILED 4,780 total / 4,767 PASS / seven failed / six intentionally SKIPPED. All seven failures were stale user-facing text assertions (`Review conflicting details` or `Nothing was selected automatically`) in six targeted source/provenance tests; source parser, conflict evidence and alternative options remained correct. Other exact prior PR-head checks cloud/mobile 43577132381, SQL 43577132363, source security 43577132335 and approval 43577132311 SUCCESS, not credited to this newer candidate commit.
- Preserve all real parser and provenance assertions; replace old text-only expected strings with exact new owner phrase, and ensure old `Nothing is saved until Add Coffee` paragraph is absent. Changed six test files only, queue record and this SAME-COMMIT journal; no additional production code, SQL, Auth, privacy or provider writes. Rerun five exact-new-head checks; no duplicate manually triggered suites; do not count failed CI PASS.
