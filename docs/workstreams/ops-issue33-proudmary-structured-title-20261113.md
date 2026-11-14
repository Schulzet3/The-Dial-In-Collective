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
