# #455 R455-197 — Manual Log Shot temperature source provenance — SAME-COMMIT checkpoint

**Authority:** Owner Option B SAFE, Locked-compatible UI integrity only; no release authorization. Date 2026-11-11 UTC.

## Source-bound recovery
- Development parent: `a85526bee99748d7cb0cc9d12ae2820cd1e31856`, Git tree `6d7a3e7cbc3cf816e1ddbe627590db50efa82f73`; `main` `f2673889d71b3f440bfd0fcfe5e8e294574509bb`; `release/production` `a106f5fc0f5208b6d56710e5ccaa9d1af68c47b0`.
- Original code Git blob `site/cloud/main.js`: `17cb7ba7d8424fd2c97b3959174056067503089c`. Read AGENTS, context/PREFLIGHT, Master/Decision, approval, CURRENT_STATUS, source register, queue metadata, #455/#335/#267/#33/#96, and concurrent PRs; no overlapping open temperature PR observed.
- Research archive nine original Markdown studies retained and indexed; reference pack scenarios are RESEARCH-ONLY. Drive S019 and slow-feeding queries returned no matches; Library search returned separate slow-feeding PDF but not standalone original S019. No additional scientific claim or numeric correction. No #267 literal review credit.

## Reproducible defect
R195 exposes a truthful `Last used on Traditional` helper on a new Turbo shot, and R196 clears it if Use Recommendation replaces the temperature. But `CloudApp.input` handled manual edits without clearing this helper; `readDraft` accepted the changed value while retaining the stale `tempSource`. Result: a member-entered new temperature falsely appears to originate from another style. This is deterministic source/UX behavior; no real-member incident asserted.

## Narrow implementation
- `site/cloud/main.js`: remove stale helper and clear only draft `tempSource` immediately on a changed temperature input. Also clear at `readDraft` for a changed value arriving without an input event. Same-value input, notes-only and grind-only edits retain correct measured origin; optional absent temperature stays safe.
- `tests/issue455-r197-manual-temperature-provenance.test.mjs`: six synthetic negative/positive client tests using existing rawFixture, covering changed input, unchanged notes, programmatic Save/Rate readback, grind-only edit, same style, absent temperature. Source original History, five unrated tastes, private notes, grinder range, distinct styles, Slow Feed, target/time math and Cloud/RLS logic untouched.
- This checkpoint resides in the same commit as code/tests. Branch `fix/issue455-r197-manual-temperature-origin-20261111`. GitHub exact-head PR CI (Node22, browser/mobile/offline, SQL/privacy and governance) **NOT RUN at journal authoring; NOT PASS**. Frozen603 not claimed.
- Next: verify exact head CI and source SHA, diagnose failures and safely repair, nonforce integrate after checks, read back merged SHA/blobs and applicable merged CI; only then separately reconcile release queue/coverage ledger/CURRENT_STATUS and mark development-only READY. No production, main/release, provider/Auth/SQL/member writes, forced history, purchase, visibility or Locked changes.
