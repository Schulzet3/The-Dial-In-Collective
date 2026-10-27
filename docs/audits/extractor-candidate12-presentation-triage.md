# Issue #33 — safe presentation-equivalence triage (2026-10-26 UTC)

This is an independently reproducible **non-scoring** analysis of the original Candidate12 frozen 603-coffee comparison. The document does not claim that unresolved discrepancies have been corrected in the extractor.

**Provenance:** original reviewed source/benchmark run [40074270907](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/40074270907), uploaded artifact `dic-frozen603-candidate12-40074270907-1`; exact original `candidate12-comparison.json` SHA-256 `5d9b48038fd5fae12720caf2253c0a8e583dd6ac0e8a37cb873b815aa657df95`. No source packets, original expected answers, scoring code, selected-product behavior or member data changed.

## Actual local analysis

The new read-only script `scripts/audit/coffee-corpus-presentation-review.mjs` replays all 603 original comparison records and verifies all 4,002 canonical totals. Run it with:

```sh
node scripts/audit/coffee-corpus-presentation-review.mjs candidate12-comparison.json presentation-triage.json
node --test tests/coffee-corpus-presentation-review.test.mjs
```

Local test run (Node 22 compatible): **5 passed / 0 failed**. The comparison script required all 603 distinct case IDs, 4,002 original canonical assertions, and exact reconciliation of the 3,046 exact / 132 missing / 824 review-required counts.

| Field | Original review-required | Provisional print-equivalent | Still requires real source review |
|---|---:|---:|---:|
| Elevation | 186 | 180 | 6 |
| Tasting notes | 245 | 87 | 158 |
| Variety | 39 | 26 | 13 |
| Roast level | 6 | 4 | 2 |
| Producer | 93 | 2 | 91 |
| Origin | 206 | 0 | 206 |
| Processing | 24 | 0 | 24 |
| Release label | 7 | 0 | 7 |
| Roaster | 18 | 0 | 18 |
| **Total** | **824** | **299** | **525** |

**All 132 missing assertions remain missing**. The 299 are potential print-only equivalences, not additional canonical exacts and not independently verified completeness. Neither user-visible extraction behavior nor the strict frozen score changes. The 525 other review-required assertions retain original source-review status, as do all 65 properly withheld conflicting assertions and 50 unresolved conflict assertions.

## Guardrails and next action

The classifier compares numerical elevation measurements in meters with identical range/approximation/plus semantics, identical ordered literal note/producer/variety lists separated by alternate conjunctions, and the previously approved Light-Medium spelling alias. It refuses subset note matches, changes in measurements, changed/unknown units, guessed location/producer roles, and generic similar wording. The original 603 oracle is **not** modified or weakened to make any case pass.

Further Issue #33 work requires examining the original competing evidence for the 525 substantive review cases and the 132 blank fields, implementing narrowly supported parser changes, then repeating the unchanged full corpus and live acceptance. No newly paid services, API keys, production migration, member-data operations or publication are authorized.

**Disposition:** this audit helper can be verified independently without a full corpus replay because it only reads existing immutable comparison outputs. The separate source-accuracy follow-on remains **IN_PROGRESS**, and Issue #33 must stay OPEN. The pre-existing Candidate12 source package remains independently READY and NOT DEPLOYED.
