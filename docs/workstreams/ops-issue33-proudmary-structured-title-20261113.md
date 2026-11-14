# Issue #33 — Proud Mary structured product title / user-approved correction [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=0d914e4a223d58361a837b5356f3685844698326 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Owner request and approval — November 13, 2026

Exact requested source: https://proudmarycoffee.com/products/costa-rica-las-lajas-finca-san-isidro-caturra-catuai-natural-2026
The owner's QR URL also contains UTM parameters, which are not product-name evidence.
The actual roaster's accessible collection/product listing publishes the selected title
`COSTA RICA | Las Lajas - Finca San Isidro | Caturra & Catuai | Natural`.
Its current visible product details separately publish Country Costa Rica, Variety Caturra & Catuai,
and Process Natural. Owner explicitly approved the clean `name=Las Lajas - Finca San Isidro`.

## Scope, acceptance and safety

- Parse only four literal, pipe-delimited, typed pieces: exact known country, nonempty name,
  complete recognized cultivar phrase, and exact recognized process. No inference from URL,
  other product, SEO, or the merchant hostname. For ambiguous names retain the full title.
- Preserve the entire original published title in source facts for audit/review.
- Apply name presentation only after exact-product identity/metadata extraction, preserving the
  existing scope, authenticity, conflicts, editable Pending, source evidence, and all other fields.
- Keep Shopify public JSON exact-handle admission strict while accepting the normalized selected name.
- Regression tests cover Proud Mary, second same-roaster product, another roaster, negative/ambiguous
  titles, actual HTML/JSON parser integration, retained title, and cross-source Shopify merge.
- Frozen original603 fixtures/oracles are unchanged. No SQL, Netlify, production, member data,
  unrelated workflows, paid services, or publication is authorized.
- Original user-supplied deep link could not be fetched by the browser tool; an official
  collection-filter product page was directly verified. This test fixture is modeled on its
  published fields. A live hosted authenticated preview is NOT asserted here.
- CI and exact merged-SHA verification remain required before READY; Issue #33 stays OPEN.

## Nonforce source-correction receipt — November 13, 2026

DIC_PREFLIGHT_VERIFIED development_sha=fe96f983c1c4f697fdecfa39d2f077a3b6ca77a6 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

The first PR head contained a mechanical JavaScript replacement artifact: a literal replacement token duplicated the remainder of the identity module. Before merge or any passing-test claim, the exact original identity module was restored and only the intended structured-title helper inserted safely. No unrelated source, tests, release state, or provider data changed. Verify the repaired PR head with hosted exact-source checks; the original head is not evidence of passing tests.

## Required release-queue TESTING intake — November 13, 2026

DIC_PREFLIGHT_VERIFIED development_sha=f1dc5fd4be99bdbd5a9d4b6a2123ba8e8c0bbe4c preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

GitHub PR-head approval gate 43562350446 correctly blocked untracked deployable files. Added unique `DIC-Q-33-proudmary-structured-title-20261113` TESTING item with all three exact source paths; no READY/deploy claim. PR #2588 current targeted Node/lint and approval must pass before nonforce merge. Separate source/merge/queue checks remain required.

## CI intake repair — November 14, 2026 [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=f1dc5fd4be99bdbd5a9d4b6a2123ba8e8c0bbe4c preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

Exact PR head e2839a103072fb3b1a1fe477ea8e562c4198f2f8 approval run 43562350446 failed queue intake: missing IN_PROGRESS ownership for src/server/coffee-identity-evidence.mjs and src/server/coffee-shopify-ajax.mjs. Added only the scoped IN_PROGRESS queue item (not READY); retained the original failure. Recheck new exact head CI, focused tests and nonforce merge before any READY claim. No publication or provider changes.

## Exact merged-source CI and READY certification — November 14, 2026 [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=c134eafe6ea5a3eeae9bde75dff4dc13826e2b3f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

PR #2588 merged nonforce 48379dc5a6e34c1dc0b6d7e97c3392dea56b85bf. Tested PR head c29e657e78c76790d456096e43d73d49cd4e1779 had five applicable exact-head SUCCESS checks: approval 43562474269, cloud app/focused regression/lint 43562473846, UX 43562473750, SQL 43562473745, security 43562473912. Six changed Git blobs matched the merged commit; three runtime blobs remain unchanged on current development c134eafe6ea5a3eeae9bde75dff4dc13826e2b3f. Exact merged approval 43562658690, cloud app/focused regression 43562659036, and UX 43562658921 all SUCCESS. Scoped queue entry now READY with zero blockers, not DEPLOYED; issue #33 remains OPEN. Independent R60 Wrecking Ball source job 43562473909 FAILED and is not credited as PASS or conflated with this fix. No new builds or production writes.
