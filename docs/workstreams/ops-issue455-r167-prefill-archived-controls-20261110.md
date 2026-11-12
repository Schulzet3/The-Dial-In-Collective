# Issue #455 R455-167 — source-bound SAME-COMMIT code, tests and evidence [skip netlify]

Authoring parent development `af1a56d57b8472d7a8686b6336fe11c048f76538`, tree `ce87a6611cb558cc9f3bdb108d02676c35a3886f`; engine blob `f8028270254d15a1b6e9494aa431a8eca4f33c15`, ledger blob `d54e491c348ef7c55d104cfdffa7c3d6273a5a44`. Current main `11e1e8c7c36dad488519476d8a969bb682915d31`; release/production `a106f5fc0f5208b6d56710e5ccaa9d1af68c47b0`. Read AGENTS, CONTEXT/PREFLIGHT, Master/Decision/latest owner supersessions, status, approval matrix, queue, source register, #455/#335/#267/#33/#96 and concurrent PRs. #455 owns prefill; #267 literal coverage zero; original S019 unavailable/unreviewed after Drive and Library search; no research-policy change. Owner temporarily PUBLIC GitHub Nov 4–30 under #630; no visibility change.

## Negative and positive source reproduction

Before change, `prefill()` trusted archived records meeting dose/yield/time bounds for the `doses` pool, even when a newer saved record carried an impossible explicit grinder or temperature. It could seed a new Log Shot dose/grind/temp from a nonloggable archived row. Synthetic older valid 18 g/2/93 C versus newer 27 g/4/invalid temp is the negative case; no observed member incident or empirical cup improvement is asserted. Original private History and all five taste values are never modified.

## SAFE exact scope

`site/lib/engine.js`: prefill-only admissibility of explicitly recorded grinder and optional 70–100 C temperature; old shot's own archived espresso range used where available, otherwise current version; missing legacy optional readings retain dose eligibility. Existing current grinder clamp for actual grind prefill remains; original notes, shots, family/style/feed, advice, settings, Community/RLS/privacy and Locked numeric taste policies untouched.

`tests/issue455-prefill-archived-controls.test.mjs`: five synthetic positive/negative tests: invalid grinder, invalid temperature, inclusive valid upper endpoints, null legacy optional controls, old snapshot range different from current. Each asserts original shot array unchanged. **Tests authored, NOT YET RUN OR PASS**. No SQL/Auth/Edge/provider/member writes or synthetic production user.

`docs/audits/issue455-research-source-coverage-20261103.json`: R455-EV-APP-167-A/B and R455-PROP-167, 92 sources/250 checks/128 proposals, continuation anchored to original SHA. Source register's existing ledger pointer remains valid; no speculative science or owner decision. Same source commit includes all four paths. Release item NOT READY pending testing/merge/reconciliation. Next: exact PR CI and focused repair, nonforce integration/readback, then queue/CURRENT_STATUS evidence. [skip netlify]
