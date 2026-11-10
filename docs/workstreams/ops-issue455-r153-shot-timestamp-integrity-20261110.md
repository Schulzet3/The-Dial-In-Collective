# Issue #455 R455-153 — new-shot timestamp/recency integrity [skip netlify]

**2026-11-10 UTC | owner Option B, development only.** Exact prechange development SHA: `bb219a3f2b8e4f1580e48f6420f60334349c1ba5`. Code blob `d262f7343ef2556effc7572b86e7ecc026449288`; offline mapping blob `a02aee80e2e6447aa855982b500318932a1e8b40`; ledger prior blob `721253012a5a9c971fb0b1b3da059bafd276b8da`. This is a bounded application correctness defect, NOT a new espresso science rule or #267 line-audit credit.

## Negative reproducer from live source
`saveShot` previously accepted a truthy explicit `timestamp` (including `'definitely-not-a-date'` or whitespace), stored it unchanged and returned a successful save. `recommendation()` and `prefill()` require an actually parseable timestamp to rank the latest shot, so such new rows can silently vanish from next-shot/recency selection. `site/cloud/mapping.js::applyPending` invokes local `saveShot` for offline overlay and `shotPayload` ordinarily emits an ISO instant. This is deterministic source behavior, not a verified production member incident.

## Narrow safe change
Only reject a supplied malformed/nonstring/nonempty explicit new-shot timestamp **before mutation**. Missing timestamp retains `now()` default. Existing same-coffee shot ID returns its immutable original on offline replay **before new-shot validation**, including historical malformed timestamps. No history edit, notes change, data capture, taste/recipe numeric change, new inference, provider or publish.

## Same-commit paths and verification
- `site/lib/engine.js` — narrow pre-save guard; original historical offline replay untouched.
- `tests/issue455-shot-timestamp-integrity.test.mjs` — four isolated negative/positive cases: malformed input no mutation; valid explicit offset+private notes/five ratings+recency; missing timestamp; immutable existing-ID historical replay.
- `docs/audits/issue455-research-source-coverage-20261103.json` — APP-153-A/B and PROP-153; now 82 curated sources / 221 bounded checks / 114 proposals.
- This same-commit journal.

**At authoring tests NOT YET EXECUTED**; no Node22/lint/cloud/mobile/offline/SQL/Auth/real device result is claimed. Intended authority: safe Locked-compatible local shot validation, no live SQL/Auth/member/provider writes, no force Git, no production deployment. Existing #33/#267/#96 work unmodified; temporary public GitHub visibility under owner #630 left unchanged.

**NEXT:** create isolated PR to `development/backend-foundation`; run source-bound CI and explicit four-test results, fix failures and retest, nonforce merge only if safe, read exact blobs/merge and applicable merged CI. Reconcile `CURRENT_STATUS`, approval coverage and queue only as appropriate to verified readiness; post issue checkpoint. Keep #455 open.

## PR #1775 first exact-head governance failure and correction (same source bytes; 2026-11-10 UTC)

Initial PR head `04db577c32d7c229a6ada7ec8b6c6b8dfcac5bd9` had **approval/queue intake FAILED** [run 42757813470](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42757813470), caused by untracked deployable `site/lib/engine.js` (CI log: “HOLD: Untracked app change”). Other PR-head checks were running at this diagnosis; do not call incomplete runs PASSED. Repair is this **documentation-only same-branch follow-up commit** adding queue item `DIC-Q-455-new-shot-timestamp-replay-recency` with state **TESTING**, scope only deployable engine (the test module is not a deployable queue path); update this existing scoped journal. Engine code/test Git blobs remain unchanged from first source commit. Re-run all applicable exact final PR-head checks, diagnose and repair any new failure, then nonforce merge and verify merged source before READY. Original failure remains a real FAILED receipt and is never relabeled success.

## Nonforce merge of concurrent #509 source (2026-11-10 UTC)

After initial R153 tested head `e95fb32b52ab3a4732e78d357e92a28d555c6775`, development advanced independently from `bb219a3f2b8e4f1580e48f6420f60334349c1ba5` to `5964553fcdb3ba58db91584645f1e2b2a99ebbb2`, with six disjoint Issue #509 source/SQL/test/ledger paths and a shared release-queue addition. GitHub PR #1775 required queue conflict reconciliation. This two-parent **nonforce topic merge** preserves the complete current development tree and its distinct #509 queue item; re-adds exactly the R153 TESTING intake item; carries the original R153 engine/test/ledger content without change. Prior exact PR-head CI at `e95fb32b52ab3a4732e78d357e92a28d555c6775`: Node22 **3333 PASS/0 FAIL/6 SKIP**, four R153 tests explicit PASS; PR security, isolated SQL, cloud, mobile/browser, approval all completed SUCCESS; original603 SKIPPED. Current new combined head/merge CI must be freshly checked, do not claim prior outcomes for changed combined source.

## Integrated concurrent #509 documentation without altering tested R153 runtime

After tested topic head `cc82dcaea6893e3d4ff0047543775c762cfeaa7b` passed full source CI (Node22 3333/0/6, four R153 direct cases; browser/mobile, cloud, isolated SQL, source-security, governance), development advanced with **only** the four separate #509 documentation/queue paths to `2b2e08b46f427b6ed53b6a780c4a9d832d468f5d`. This explicit two-parent **nonforce PR-head merge commit** uses newest development as FIRST parent and tested #455 topic as SECOND parent, retains the latest #509 tree and appends the exact R153 TESTING queue entry without overwriting any concurrent row. Exact engine/test Git blobs equal tested `04db577...` and `cc82dcaea6893e3d4ff0047543775c762cfeaa7b`. Record new merged SHA and applicable merged checks after writing; no READY until independently verified. GitHub PR #1775 remains the traceable reviewed source. No main/production/Netlify/SQL/Auth/member writes.
