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
