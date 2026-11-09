# Issue #33 R55 — selected #597 direct cultivar/elevation omission (2026-11-09 UTC)

Authority: owner Issue #33 continuous DEVELOPMENT-only; recover-first base `c81c6a281010a318b393e492aa9251d02f5b52f9`, original frozen603 CSV blob `3e0d3036ea727de091f304f538c6de2dfcaa10d6` unchanged; separate #267 V2 and #96 ownership. Open R38 #1453 affects #487–489 only. No publication.

## Exact current evidence / reproduced omission

- Fresh official current selected source [run42571947591](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42571947591), job `129011080323`, HTML #597 420517 bytes sha256 `ec3bdc78c5e41e7dfc1a76eb72949e83eb5b2c84f225515f13f236bc7d5e4c3a`. Same selected H1 Kenya Nkumari, P1 C, direct What’s in it paragraph: `Variety: SL28 and Ruiru 11 (which are exclusive varieties to Kenya). Farm: Nkumari. Producer: Naman Meme. Region: Meru. Elevation; 1400 meters above sea level`. The actual parser (same job's FOCUSED PUBLIC FIELD EVIDENCE) returned name, roaster, notes, origin Meru Kenya, producer and Washed, **but omitted both `variety` and `elevation_m`**. This is not inferred from original oracle.
- R54 original selected #594 currently Sumatra despite URL Timor slug; #600 direct Vietnam Lam Dong unchanged. Existing #597 region correction [PR1601](https://github.com/Schulzet3/The-Dial-In-Collective/pull/1601) merged with exact tests, but ZIP artifact 13653437085 remains externally UNHASHED; retain its separate TESTING queue item.

## Narrow candidate

- `src/server/coffee-page-metadata.mjs`: only after same selected H1/current country/unique compound Process+Variety+Farm+Producer+Region proof already succeeds, extract at most one literal validated named botanical cultivar list and one physically valid explicit `Elevation;/: metres/masl`. A second label, nonbotanical value, missing unit, mismatched product or unrelated sections must never donate data. Never overwrite existing fact or conflict. Record direct source facts.
- `tests/coffee-issue33-r54-597-selected-inline-region.test.mjs`: positive actual-parser/Add Coffee/Source Review and source-hostile/ambiguous negatives.
- `scripts/audit/issue33-r54-594-597-600-afterproof.mjs`: require freshly fetched current merchant direct variety/elevation before accepting the parser, with matching selected identity and independent raw HTML hash validation.
- `docs/RELEASE_QUEUE.json`: add ONLY the R55 narrow item as TESTING; all prior 250 items and states preserved.

## Acceptance / pending

Exact PR-head CI, nonforce source integration, exact merged Node/lint/build, cloud/mobile/security/SQL/approval as applicable, current official afterproof, independent ZIP/hash check and documentation reconciliation remain **PENDING**, not PASS or READY. The old frozen603 replay is not claimed for this scope. The 603 individual manual semantic certification is still incomplete and Issue #33 stays OPEN. No GoTrue real-user/device claim, Netlify release, SQL/Edge/Auth/provider/member changes, costs, accounts, secrets, or forced history.

Next: examine actual PR-head CI, fix any real failing tests, rerun selectively, merge nonforce only after passing evidence, then verify exact merged source and artifact before READY.

## PR-head approval failure and correction (same-commit)
Initial exact PR-head `a2e28183e44052946eebb60a6028b7fe6b58c653` approval [run42576934185](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42576934185) **FAILED**: `scope paths must be exact deployable files`. The queue entry incorrectly listed tests and source-audit proof as deployable scope. Corrected only `scope_paths` to `src/server/coffee-page-metadata.mjs`; all test/audit paths remain under same-commit journal and PR source. Prior passing/other checks are not converted to PASS for the corrected SHA. Await new exact approval/Node CI before merge.

## Genuine test failure / corrected negative fixture
Exact PR-head `2456222c199d4123b82ed3884e9f108d71563885` Node [42577052851](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42577052851) **FAILED** 1 of 3,195 tests (3,188 pass, 1 fail, 6 skips). The new negative changed the current selected H1 to `Kenya Another Coffee` but kept the paragraph inside that product's own description: the generic extractor properly treated it as selected source and offered its direct fields. Thus the test's implied unrelated source was **not actually unrelated**. Replace only that invalid premise with `selectedCurrentInlineCompoundRegion` proof call whose requested identity `Kenya Nkumari, P1 C` does not match visible H1 `Kenya Another Coffee`, which truly must return null. Existing separate real-parser Related Products negative remains. This is a **test correction**, not a runtime relaxation. No skipped/failed CI misreported. New exact-source checks pending.
