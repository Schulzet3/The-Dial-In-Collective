# The Dial In Collective — Conductor readiness snapshot

**Date:** October 26, 2026 UTC. **Scope:** Extractor #33, UI/UX, Backend and source-to-release readiness. **Owner directive:** no publication until extractor is ready, then separate explicit publish instruction.

## Exact current pointers

- Development application source after concurrent PR152 merge and before this docs-only reconciliation: `f8940ffca7c02200bd207b8edfa2c73da55eabd8`. The previously verified coordinator PR153 merge is `55feef07bf95792dd6a3fb6ca35863988ef58425`.
- Operations branch `main`: `d4f50a7213de614823256b34d207e9f2c71c5dd4`. It is intentionally independent from development; do not merge branches merely to erase ahead/behind counts.
- Production branch `release/production`: `65ee38609db6bd5977dd0f2b393e7791a5e1b766`.
- Actual Netlify current/READY deploy: `6adc20c03a07673c4dd08035`, app.dialincollective.com, published Oct 24; new Community/frontend/extractor/Custom retirement not published.
- Supabase production: 49 applied migrations. The already-applied Oct 24 source SQL filenames have provider versions `20261024052303`, `20261024052411` and `20261024052419`, all **MUST NEVER BE REPLAYED**. The unneeded Oct 26 Custom-target migration is absent from current repository source and never applied. Read-only Custom aggregate 0 shots, workspace selections, personal families and experiments. Disconnected device-local queues not directly accessible.

## Workstream ownership, latest evidence, source disposition

| Workstream | Completed and integrated (source) | Remaining work / limitation |
| --- | --- | --- |
| Extractor #33 | Candidate12 full original603 source package and multiple narrow packages READY; most recent PR149 source merged `b8ec73427b896723e5b4aec78a94602c2b37f3ea`, parser blob `6ba19638395cd09a71cd9d4884ed212e1a6af8fb`, original 603/201 unchanged cases, 3068 exact/112 missing/822 review, 5458/337/679 supplementary retention unchanged, previous exact losses zero. PR149 head Node/cloud/SQL/security/approval/visual and merged app/approval pass; hosted private original603 SKIPPED. | Parent Issue33 **OPEN IN_PROGRESS** for 112 missing / 822 review. PR152 MERGED at `f8940ffca7c02200bd207b8edfa2c73da55eabd8` but remains **TESTING / RELEASE HOLD**: its parser blob `53875bcb...` **differs** from original603 receipt-tested blob `395d596b...`. Exact PR-head CI and merged app/approval passed, but the hosted original603 was SKIPPED. The full original603 must be replayed on the actual merged parser (or a corrective non-force PR restore tested source) and the source-bound receipt updated before READY. Do not change frozen originals. |
| UI/UX | PR136 `9b8e20dd...` READY: accessible Log Shot keyboard focus, validation focus and truthful offline/pending indicator; exact merged approval 40389190256, app 40389190260, cloud/mobile synthetic 40389190347 and visual 40389190196 PASS. | Issue26 remains OPEN for full accessibility/device checks. Physical iPhone/VoiceOver and true multi-device acceptance are NOT claimed passed. Issue13 P0 experiment-confirmation/lifecycle and other approved backlog remain open, not silently marked READY. |
| Backend | Issue5/10/12 accepted source/back-end integration, protected owner-scoped SQL and Community recommendation evidence. Source READY for #12 Community frontend. Issue14 owner-Locked retirement source READY; PR148+150 merged, old Custom UI PR142/145/146 closed unmerged, removed unused new Custom-target migration. | Provider/permission/device residual Issues27/22 remain open. Three already-applied Oct24 SQL migrations **must not be replayed**. No new production migration required for Custom retirement. Signed-in live acceptance not inferred from isolated SQL/HTTP. |
| Coordinator | PR153 merged `55feef07bf95792dd6a3fb6ca35863988ef58425`: added independently verified PR149 READY and promoted original Issue5 source-carryover to Git SOURCE-ONLY READY; original SQL feature remains DEPLOYED, explicit anti-replay. Five PR153 head CI checks and merged exact approval passed. | Conductor Issue133 stays open to track parallel work. Operations Issue134 remains open pending a successful corrected full Sunday scheduled regression. |

## Conflicts and source gates

- No currently open UI/UX or Backend code PR overlaps Extractor source. PR152 merged after PR149 with no cross-workstream file conflict. Its remaining issue is original603 evidence-source mismatch, not a Git merge conflict.
- Current changed deployable app paths against published tested source `28f908dc9828a45558bd56b532fed17022cef3d8`: **42**. All 42 have an eligible READY **source path** after PR153's SQL carrier. This is a source-coverage inventory, NOT a combined release preflight pass.
- PR152 is intentionally tracked as `TESTING`, `merged_source_sha:f8940ffca7c02200bd207b8edfa2c73da55eabd8`. Its code IS in development but NOT READY. Release-queue strict gate must HOLD on this unready merged item despite 42/42 READY source-path coverage. Do not combine unverified source merely because its CI is green.
- Original Issue5 SQL source blob `2a9eca5b32e37dd937a5257a02981dd6113b84f7` equals previously deployed source; installed private retry function read back with structured non-mutating stale conflict. Promoted source-only companion to READY with original exact CI; provider-migration execution remains prohibited.
- Source READY and actual DEPLOYED are separate. No GitHub direct development push publishes Netlify; deployment requires one NEW owner publication instruction and serialized one-use release record after combined source/test/SQL preflight. The owner has postponed the combined publication until extractor parent acceptance.

## Release readiness conclusion

**Individually source READY:** 14 active queue items: 10 independently READY extractor source packages including PR149, #12 Community UI, #26 Log Shot UX, #14 retirement, and #5 SQL source-only bookkeeping (recompute from live queue before any release). **Not READY:** Issue33 residual source acceptance, MERGED but TESTING PR152 source mismatch, full Issue26/22/27/13 backlog. This document is a date/SHA-bound snapshot, not authority to publish.

**Next safe action:** Extractor workstream validates merged PR152 exact Git parser blob on immutable original603, updates the receipt and source CI (or integrates a source-corrective PR non-force). Conductor verifies exact corrected merged source and promotes only evidence-complete code to READY, then reruns strict combined release preflight. Independently rerun combined source and release gate when owner eventually approves publication. No production changes until then.
