# Issue #455 R455-251 — original-calibrated similar-coffee ratio/time reference [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=61e6ed07867508d8b5344b3b8042a09258a4649f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Owner scope and current source
Owner Option B permits independently verified SAFE, Locked-compatible code/test development without deploy. Immutable parent development 61e6ed07867508d8b5344b3b8042a09258a4649f; verified identical PREFLIGHT blob 2fb236bbfa6bac48513eeb3bd157b260853af06d; existing live `site/lib/engine.js` Git blob 3e20904291231a9c5a5a86e6d004a95a5489c6d6. #455 owns recommendation UX; #33 extractor, #267 exhaustive lines, #96 privacy and closed #335 remain independent. All GitHub source bytes are read at immutable parent. No member-state or provider read needed.

## Source-reproduced correctness defect and bounded SAFE change
`personalSimilarCoffeeReference` first gates historical donors through `familyEvidenceShots`, which validates the recorded *original* grinder snapshot/calibration plus measured dose, yield, time, temperature and five ideal ratings. A redundant second test then rejects a legitimately original-valid donor's grinder number merely because the member later revised the active espresso range. Example: old recorded [8,10], actual 9, now [0,5]—the donor's measured ratio/time is rejected even though this code path never copies its raw grind. The other-coffee prior is intentionally UNPROVEN; no real-member incident established.
Only remove the two active-range comparisons in this ratio/time donor path, retaining original-calibration eligibility, finite nonnegative grinder, physical bounds, five ratings, matching setup/version, style, feed, roast and basket ranking. No raw historical dial transfer, confidence inflation, taste target, scientific correction, display copy, database field or policy change. Original History and notes are not mutated.

## Same-commit changed paths, acceptance and failures
- `site/lib/engine.js`: remove redundant *current*-range donor restriction only.
- `tests/issue455-similar-coffee-old-calibration-prior.test.mjs`: synthetic positive old [8,10]/9 vs current [0,5], no grinder transfer and History preserved; negatives old-invalid 11, reversed old range, partial/nonideal five taste inputs, hidden, wrong style or feed; positive current-calibration unaffected.
- `docs/workstreams/ops-issue455-r251-similar-coffee-original-range-20261114.md`: this source-bound first-parent preflight receipt and exact scope.
- `docs/RELEASE_QUEUE.json`: one unique IN_PROGRESS R251 item; not READY or DEPLOYED.
At authoring, focused Node22 tests, full applicable Node/lint, cloud/mobile/offline, approval and isolated privacy/SQL checks are **NOT_RUN / PENDING**, not PASS. No existing suite is recredited. Next: run exact PR-head checks, fix failures, nonforce merge only upon sufficient safety/CI, read merged paths and CI back, reconcile queue/ledger/status and #455 checkpoint. No publish, release grant, main/release ref, provider/Auth/Edge/SQL/member write, backup/schedule/visibility change or #267 line audit credit.

## Research/source boundary
This is a reproducible local source correctness bug, NOT proof that similar-coffee recipe priors improve espresso taste. Existing nine archived Markdown reports, research-only October 29 pack and R250 canonical 141/404/204 evidence ledger unchanged. Standalone S019 PDF remains inaccessible. Optional consented next-shot all-five-taste evaluation requires separate owner authority.
