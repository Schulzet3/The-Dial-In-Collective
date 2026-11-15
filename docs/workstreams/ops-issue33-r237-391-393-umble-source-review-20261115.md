# Issue #33 R237 — original603 Umble selected-product source review #391–393 (2026-11-15; DEVELOPMENT ONLY) [skip netlify]

DIC_PREFLIGHT_VERIFIED development_sha=12242c8a6503f51a232c2039a3fe434b95605a2d preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Authority and unchanged boundaries

The current live `development/backend-foundation` commit was resolved as `12242c8a6503f51a232c2039a3fe434b95605a2d`; its complete `docs/ai/PREFLIGHT.md` was fetched and its Git blob identified as `2fb236bbfa6bac48513eeb3bd157b260853af06d` **before** reading AGENTS, context routing, #33/#267/#96, current status, Locked decisions, approvals, queue and source evidence. The live development head was rechecked before this separate documentation branch. Work is restricted to individual selected-source manual review and future parser-regression design, without inventing a parser defect or manipulating a release.

Original immutable `docs/audits/issue33-original603-source-level-adjudication-20261029.csv` blob: `3e0d3036ea727de091f304f538c6de2dfcaa10d6`, 603 coffees / 201 roasters / 1,197 captures. The original oracle, scorer and historic captures are unchanged. #267 owns V2 line review; #96 owns real signed-in security testing.

## Fresh independent selected official pages, November 15, 2026

The live retailer product pages were individually opened at their **exact original official URLs**, with presently visible product H1 and associated product-specific description. This is bounded **readable-page, individual manual source evidence only**: no complete raw HTML bytes/hash, connection-time pinned guarded HTTPS execution, current application parser, Add Coffee UI or Source Review execution was available in this documentation step. These cases are **NOT** claimed current parser VERIFIED or 603-case certified.

### Original #391 Downshift — https://umblecoffee.com/products/downshift

- Exact current H1 **Downshift** matches the original selected identity. The seller now directly and repeatedly describes this product as its **medium-roast, single-origin DECAF** from Huila, Colombia; green **Washed** processing, 1,400–2,000 MASL, Castillo/Caturra/Colombia, and own **chocolate/caramel/hazelnut** tasting notes.
- Crucial distinct-method boundary: the product's own **PODCAST** recommendation says the roaster interviewed people at **Swiss Water** to explain decaf generally; this is educational/link content, **not a source claim that the selected Downshift lot uses Swiss Water decaffeination**. Its green `Process: Washed` does **not** identify a caffeine-removal method. **Do not silently autofill `Water Process` or another decaffeination method** from the podcast, unrelated reviews or the generic term `decaf`. Leave method blank unless an exact current selected-product specification elsewhere explicitly substantiates it.
- The original frozen extraction recorded medium/washed/origin/flavors but had no decaffeination field. This is a meaningful **current source change**, NOT a proved runtime parser defect; verify whether the current parser recognizes the product as decaf without borrowing the unrelated method.

### Original #392 Front Runner — https://umblecoffee.com/products/front-runner

- Exact current H1 **Front Runner**, direct current single-origin medium roast, Nariño, Colombia, 1,500–2,200 MASL, **Washed**, Castillo/Caturra/Colombia, **graham cracker/toffee/marshmallow**. The previously captured original source-derived core fields remain consistent with today's page.
- The seller mentions using this coffee for espresso at Umble HQ, but prints **no concrete dose/yield/time espresso recipe** in the selected details. Do not invent one or copy sibling brewing instructions, Downshift's decaf identity, or Prologue's sensory details.

### Original #393 Umble Reserve - Prologue — https://umblecoffee.com/products/prologue

- Exact current H1 **Umble Reserve - Prologue**, Huila, Colombia, **The Vargas Family**, 1,800 MASL, **Natural**, varieties Colombia/Caturra, own **apricot/raspberry/Pink Starburst** tasting notes.
- The frozen original expected `release_label: "Limited batch"`, but the presently accessible product-specific page does **not** itself substantiate that historical release label. Do not autofill `Limited batch` from the original oracle or turn copyright `© 2026`, generic `early releases` signup copy, customer reviews, educational discussion or another product into a distinct harvest/release. Current selected roast remains **unpublished/unclear** in this source review.
- The educational Natural-versus-Washed comparison is not evidence that this coffee simultaneously has Washed processing.

## Specific next executable source/CI acceptance

1. Use `DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS=391,392,393` with `scripts/audit/issue33-original603-focused-source-review.mjs` in a new path-scoped exact-source GitHub job. Preserve each raw official HTML capture plus SHA256, final URL, selected-product H1, and actual `extractPublicCoffeeFacts`, Add Coffee and Source Review output. If a product changes/disappears, re-adjudicate; do not transfer from archived identity.
2. Assert exact own fields and negatives: **#391** decaf identity versus **no unsupported Swiss Water method**; **#392** unique graham-cracker/toffee/marshmallow and no made-up espresso recipe; **#393** Vargas/Natural/three chosen notes, **no unfounded historical Limited batch or footer 2026 release**. Add synthetic positive/hostile tests only where the current real parser demonstrates a concrete gap, and repair narrowly if reproducible.
3. For any subsequent code/test/CI commit, fetch a **new live branch SHA and immutable preflight blob** and include the resulting `DIC_PREFLIGHT_VERIFIED` receipt in the SAME-COMMIT scoped journal; check concurrent Git and PRs, run appropriate exact-source hosted CI, merge nonforce with **merge commit [skip netlify]**, read back merged SHA and files before any narrow READY assertion. Do **not** count this manual page review as actual runtime or whole-603 verification.

## Disposition

**SOURCE-REVIEWED ONLY / PARSER UNVERIFIED.** Issue #33 remains OPEN; 153 context-qualified / 29 missing-literal-qualified cases, historical 35 source-present blank indications and changed/unavailable/recycled identities remain to be adjudicated without invented facts. No queue promotion, approval change or current DEPLOYED assertion; all other existing statuses preserved. No Netlify publication, production SQL/Edge/Auth/provider/member writes, account/secrets/purchases, backup, force Git, task/schedule, alert or notification change. No owner decision is needed for the next parser/test step.
