# Issue #30 — original JSON/JSX reconciliation and science handoff, 2026-10-29

Owner confirms relevant history remains in the ChatGPT Project, the standalone workshop addendum is not needed, original JSON should be read from Project docs, and the original app code should be compared line by line against the current app. Owner will commission a fresh structured scientific research pack separately (Samo Smrke first, Lance Hedrick second, James Hoffmann and Kyle Rowsell subsequently).

## Recovered provenance

- Original GitHub archived decision JSON `docs/archive/requirements/The_Dial-In_Collective_Decision_Ledger_v1.0.json`: 79 Locked + 20 Open, deep-equal to `docs/DECISION_LEDGER.json#/baseline/content`. No reupload required.
- Original GitHub archived specification v1.0 exists, complete 1,929 lines; Project JSX `dial-in-collective.jsx` exists at 5,288 lines, 289,465 bytes, SHA256 `54971f6286175aba7554351096c6d3640fec0211b4cef78fa13503d3c18ee980`, distinct from older 4,421-line GitHub source variant. Original source has 5,288 linewise AST ownership/area mappings in named user-download CSV; the inventory is not an independent behavior test.
- Detailed [source/feature disposition, existing implementation references and new tests](../audits/issue30-legacy-prototype-continuity-20261029.md). Old AI/screenshot, Experiment, Bag Management, Custom and member basket/version controls are retired by explicit later owner approvals; restoring these old JSX paths is forbidden.
- New Node regression `tests/legacy-prototype-continuity.test.mjs`: original JSON exact value preservation, active style list/retirement, taste-only Dialed In outside time/ratio starting windows, fresh measured field handling, and non-mutating search/current coffee semantics.
- Applicable suites must run on exact source SHA and be read back. A code/test commit includes this journal in the SAME commit and `[skip netlify]`; no external app deployment.
- The research prompt is supplied in the owner chat as a practical independently executable assignment to generate schema-validated JSON rule pack, citations, deterministic tests, and proposal only, without repository/provider mutation.

## Known limits and next action

Static AST line mapping cannot prove 5,288 manual semantic equivalences. The old nine research study bodies and a standalone workshop addendum remain unrecovered, but the owner does not want them as ongoing build requirements. The user says chats are in their Project, not a direct API export guarantee. No blocked access to the original JSON or JSX. Repair any source test failure, run all required exact-source CI, merge without force, reconcile issue status and stop before publication. If a specific unsuperseded behavior is later proven missing, track it as an implementation bug rather than recreating obsolete code.
