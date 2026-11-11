# Issue #455 R455-187 — original-valid historical grinder range and Log Shot prefills (2026-11-11 UTC)

## Authority, exact original source and negative reproduction

Owner's Option B authorizes safe Locked-compatible repairs only, development-only; no publication, live SQL/Auth/Edge/member/provider writes, paid services, forced Git or Locked product choices. Prechange `development/backend-foundation` parent `1987d9fd49557b8d7aa90dbe9f443f9285823395`, exact `site/lib/engine.js` blob `7ef0a465d6b98483a604d17b3247560d98de736b`. Read current AGENTS/AI entry/preflight, Master Specification/Decision Ledger and later supersessions, approval/status/queue/source register, #455/#335/#267/#33/#96, prior R186 code and regression tests, concurrent PRs. Separate scientific findings remain research-only.

Deterministic source-level synthetic flaw: historical original calibration [8,10], valid measured shot dial 9, with no optional snapshot, but current calibration [0,5]. `familyEvidenceShots()` properly accepted that originally valid measurement. Later `prefill().admissible` rechecked the *current* [0,5] fallback and dropped the valid historical 24 g /96 C dose and temperature, wrongly preferring an older 18 g /93 C shot. Original old-scale grind must **never** become a current-calibration grind. No actual member incident or espresso sensory-quality change is asserted.

## SAME-COMMIT paths and safeguard

- `site/lib/engine.js`: resolve original saved calibration bounds ahead of current range fallback for admissible historical dose and temperature. `familyEvidenceShots()` continues guarding impossible or malformed old ranges, plus exact current-range restriction on new grind prefill. Unknown legacy calibrations remain conservative and retain today's fallback.
- `tests/issue455-prefill-original-range-transfer.test.mjs`: seven real-module synthetic tests with positive/negative cases for old valid and inclusive endpoints, invalid and reversed ranges, unknown legacy calibration fallback, snapshot-only original range, invalid metrics, no old-grind transfer, no private History/notes/ratings mutation.
- `docs/workstreams/ops-issue455-r187-prefill-historical-range-20261111.md`: this authoring receipt in the SAME COMMIT.

At authoring: Node22/lint, Chromium/mobile/offline, SQL/privacy, security, approval and original603 CI **UNRUN / NOT PASS**. No claim of tested app, production data, cross-style transfer or empirical brew outcome. Next: verify all applicable source-bound PR-head workflows; fix failures; non-force integrate if safe; inspect exact merged blobs/SHA and post-merge Node22/UX/governance; reconcile #455 source claim ledger, CURRENT_STATUS and development-only READY queue only after verified CI. #267 literal line-review receives ZERO credit. Separate S019 remains inaccessible/unreviewed; distinct slow-feed PDF not substituted. No source visibility mutation (#630 temporary public owner exception).
