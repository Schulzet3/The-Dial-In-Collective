# Issue #2592 — tap-to-fill source conflict alternatives

DIC_PREFLIGHT_VERIFIED development_sha=4b09788c9bf18c344085da088b44567bf987f275 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- **Authority:** November 13 owner explicitly directed tapping one of multiple extractor alternatives to autofill the associated field and said Build it. Exact preflight source 4b09788c9bf18c344085da088b44567bf987f275, blob 2fb236bbfa6bac48513eeb3bd157b260853af06d; AGENTS/CURRENT_STATUS/Master Spec/Decision Ledger/coverage/queue and #33/#2389 reviewed. Narrow supersession of manual TYPING only; human choice remains mandatory.
- **Acceptance:** accessible mobile target and human-initiated one-field fill; competing option retap replaces previous choice; valid dropdown vocabulary only; unsupported evidence visible without a guess; unchanged source provenance; no stale URL/source selection; no automatic save, catalog validation, or other coffee field change.
- **Changed paths:** site/cloud/coffee-url-autofill.js, site/cloud/main.js, site/visual.css, tests/coffee-conflict-tap-to-fill.test.mjs, docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, docs/RELEASE_QUEUE.json, this scoped journal.
- **Test design:** focused Node22 positive and hostile rendered controls, XSS escaping/source links, state replacement, manual edit, canonical dropdown, elevation, stale URL guard and no request/save. Existing URL conflict and Add Coffee regressions plus one packaged build and cloud/browser checks by applicable PR CI; tests unexecuted at authoring, do not label PASS.
- **Source/release:** nonforce isolated PR against development/backend-foundation; queue remains IN_PROGRESS with CI blockers. No production/Netlify/Supabase/member/SQL/Auth/Community/backups writes. Source review JSON remains original unmodified evidence.
- **Next action:** inspect exact PR-head checks, repair failures, nonforce integrate, independently verify merged files/CI; then reconcile queue/issue/status to READY only if appropriate. No owner Publish granted.

## Concurrent development first-parent integration, nonforce

DIC_PREFLIGHT_VERIFIED development_sha=c134eafe6ea5a3eeae9bde75dff4dc13826e2b3f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Preserved latest independent #33/Proud Mary changes and revised queue. No new tests claimed yet; source UI/test blobs from original reviewed commit unchanged. Nonforce merge ancestry parents issue-2592 head and current development. Continue exact CI before READY. No production/provider action.

## Focused failure repair and explicit-choice variant preservation [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=c134eafe6ea5a3eeae9bde75dff4dc13826e2b3f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Initial PR-head approval run 43562855009 FAILED because IN_PROGRESS queue row omitted required ci_runs array; fix item metadata with empty [] and retain failed receipt. Initial 43562855052 cloud/mobile browser, 43562855032 isolated SQL, 43562855077 security SUCCESS; 43562855008 Node test/build still running at time of source correction, not counted as PASS for this corrected commit.
- Real UI defect found during review: an explicitly tapped roast conflict matching current base roast would be overwritten by a later roast-variant choice. Guard explicit member selection against automatic variant replacement and add a focused negative regression in the same test file. A member can still explicitly tap a different conflict choice.
- Unchanged application source outside selected UI helper; no server, auth, product source, production, SQL, Netlify or member writes.
- Next: rerun only applicable exact-source PR CI after corrected code+queue commit; repair any actual failures, verify safe nonforce merge and READY queue criteria.

## Lint-only repair after complete exact-source Node pass [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=c134eafe6ea5a3eeae9bde75dff4dc13826e2b3f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

- Corrected PR head 4d53ba86 Node run 43563094055 executed **4737 PASS, 0 FAIL, 6 intentional SKIP** including all 10 new tap/negative/variant tests. **Overall run FAILED** at ESLint: unused coffeeConflictReviewOptions import in tests/coffee-conflict-tap-to-fill.test.mjs line 5; 0 lint errors, 1 warning and max-warnings 0. Build not started; do not call PASS.
- Narrow repair removes only the unused test import; no runtime/parser/Locked behavior changed. Earlier exact PR-head approval 43563094053, security 43563094065, SQL/privacy 43563094041 and cloud/browser 43563094044 SUCCESS. Full combined validation awaits final exact source head and packaged build.
- Initial Node 43562855008 **FAILED** with 4735 PASS, 1 FAIL unrelated to touched code (tests/html-resource-security.test.mjs subprocess stress test 4-second ETIMEDOUT), 6 SKIP. The later 43563094055 Node run passed all 4743 cases; no parser/security threshold weakened. Both failed workflow attempts preserved, not counted PASS.
- Next: exact new PR head full CI, then nonforce merge, exact merged-source proof, READY reconciliation. No production or provider writes.
