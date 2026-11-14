# Issue #455 R263 — Edited History recommendation-source truthfulness [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=697e75cb9f4b559fa7466e9526f9cfe4253584fe preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Scope, authority and source diagnosis
Owner Issue #455 Option B SAFE Locked-compatible Log Shot → Rate → Recommendation integrity; reuse existing R455-PROP-220 and accepted R220 UI history provenance without duplicating research source credit. Original recorded physical measurements, all five ratings, notes, personal family history and optional source context must be retained. Preflight Git blob independently matched at immutable source `697e75cb9f4b559fa7466e9526f9cfe4253584fe` before reading project sources and rechecked before candidate writes.

At `697e75cb9f4b559fa7466e9526f9cfe4253584fe`, `site/cloud/shot_card.js` original Git blob `cbf37095a0274347281b825ed3b7caf5cb242209` always prints `Used grind/temperature from ...` for `recommendationContext` even if `revision>1`. Live `site/cloud/main.js` edit branch sends updated grind/temperature/tastes/notes without new recommendation context; `site/cloud/mapping.js` hydrates persisted context and offline corrected preview `applyPending` retains original context. Existing 2026-10-24 SQL source captures context only on INSERT; the November 14 null-element guard does not alter edit behavior. A corrected historical numeric control can therefore continue to show an unqualified starting-reference label. This is source-reproduced potential misleading UI, NOT a verified real-member incident and NOT evidence of improved espresso.

## Bounded SAFE candidate
- `site/cloud/shot_card.js`: when `revision>1`, label the existing origin **Originally used** and state that the record has since been edited and current values may differ; for new/unchanged `revision<=1`, retain original text exactly; no source or measurement mutation.
- `tests/issue455-r263-edited-recommendation-provenance.test.mjs`: explicit positive unedited and negative edited, pending sync, absent context, HTML source escaping and five taste/private-note immutability cases.
- `docs/RELEASE_QUEUE.json`: exactly one new `TESTING` item; no READY/DEPLOYED claim. This SAME-COMMIT journal is indexed by Issue #455.
- Retain original Source Register and current canonical 147-source/422-check/210-proposal ledger untouched: this reproduces an already tracked R220 provenance hazard, not a new espresso paper. #267 V2 literal-line credit ZERO. #33 extractor, #96 security, #335 archived tests untouched.

## Acceptance / test state at authored commit
**ALL CI PENDING / NOT PASSED at authorship**: focused Node22, full applicable source-bound Node/lint/build, cloud/mobile/Chromium/offline, isolated SQL/privacy, approval/continuity as relevant. No real member/user experiments, new telemetry, Auth/Edge/production SQL writes, Netlify deploy, release/main movement, purchases, backup or schedule/visibility changes. Preserve previously accepted backups and one-use publication permissions. Next: verify exact PR-head CI, repair if red, safely nonforce merge with literal [skip netlify] in merge title/message, check merged Git blobs and applicable CI, and reconcile this scoped queue row only if evidence suffices. Issue #455 remains OPEN.
