# Issue #455 R455-234 — canonical DOI identity normalization and recovered R232 research shard [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=b59f23c0bdfd3d7a79131dab0478f547415d928c preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Date: 2026-11-13 UTC. Owner authorizes SAFE evidence-ledger/documentation correction only, no new espresso product rule or data capture.

## Exact source and authority
- Mandatory preflight: initial live development SHA b59f23c0bdfd3d7a79131dab0478f547415d928c, fetched PREFLIGHT.md at immutable SHA, independently fetched matching blob 2fb236bbfa6bac48513eeb3bd157b260853af06d, full 5532 UTF-8 bytes.
- Development rechecked before writing: b59f23c0bdfd3d7a79131dab0478f547415d928c; main read-only 5e80f87e33ef331ee8c0a8fedfd1bd848eabc0f1; release/production read-only 2c02dbb267ca8fb1e56ddd0433c96c1bb4eca9d5.
- Prior canonical ledger original Git blob f561490681c6a8c5f555d8f081e775383d274d3e; **full 1,334,900-character JSON** read by GitHub Git blob-by-SHA endpoint after contents API returned SHA with empty body; parsed, all 131 source /369 check /189 proposal records preserved (except explicit R223 alias metadata).
- Master Spec/Decision Ledger supersessions, AGENTS, scoped #455 and #335/#267/#33/#96, SOURCE_REGISTER, CURRENT_STATUS, approval matrix and release queue inspected; no product authority inferred from research.
- Prior full-publisher R162 and R150 sources and later R223/R232 publisher-based reviews and their exact journals checked. Primary DOI links: https://www.mdpi.com/2304-8158/15/4/678 and https://www.mdpi.com/2297-8739/13/6/166. Separate publisher PDF/raw people/individual shots and independent espresso outcome validation **NOT VERIFIED**.

## Substantive finding and change
- Six exact-DOI duplicate groups among 85 DOI-bearing source records, leaving **79 distinct normalized DOI identities**; 46 non-DOI source records are still not certified unique. The old 131 **records** must not be represented as 131 independently tested primary publications.
- Explicit `alias_of` on R223 Guinard method re-review pointing to original R150 Coffee Cuality publication. Retained BOTH historical reviews and all four evidence checks, rather than erasing provenance.
- R232 Lo Vecchio re-review was an independent *review of the same R162 paper*, not an independent study: mapped its proposed alias onto existing R162, added its two exact bounded method/sensory claim-check receipts and P3 no-change proposal. No new source identity. Preservation validation: original 131 source records in order (only alias annotation added), original 369 evidence checks and 189 proposals byte-identical as parsed JSON; new totals **131 source records /371 bounded checks /190 proposals**.
- Positive/negative accounting checks: six DOI groups, 79 canonical DOI keys, no duplicate source/check/proposal IDs, original records immutable except labeled alias, no duplicate R232 publication and no invented external confirmation. Historical R202 metadata retained with separately dated addendum.
- Changed paths (same Git commit): `docs/audits/issue455-research-source-coverage-20261103.json`, `docs/workstreams/ops-issue455-r234-canonical-doi-alias-ledger-20261113.md`. No code, tests, CI, SQL, RLS, Auth, Community, member data, published runtime, release queue or approvals changed. No #267 semantic literal-line credit.
- Standalone original S019 PDF remains inaccessible after focused current connected Google Drive and Library search, unrelated slow-feed PDF not substituted.

## Tests, release and next action
- Before PR: JSON parse, old-record preservation, ID uniqueness, duplicate DOI identity and source-reference checks PASS locally in tool memory (not hosted Node22 or app CI).
- Hosted PR-head governance, merged-source checks and Git readback: **NOT RUN YET at authoring**, require actual observation. Docs-only no unneeded Node22/build/offline/SQL claims. No member taste experiments or improved cups claimed.
- No READY, DEPLOYED, Netlify/publication, provider or production change; main/release unmodified. Issue #455 remains OPEN.
- Next: verify exact PR-head/merge commit CI, safe nonforce integration, read back matching Git blobs and document Issue #455; continue a distinct unreviewed source/real reproduced SAFE Log Shot→Rate→Recommendations defect. Do not change Locked policy or collect telemetry without owner authority.
