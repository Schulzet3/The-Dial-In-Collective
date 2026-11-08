# Issue #33 R37.2 — exact selected purchase H2 identity guard
2026-11-08 UTC · DEVELOPMENT ONLY · TESTING (not READY) · SAME-COMMIT source journal.

## Recovery / evidence authority
Source parent 5a6769286eb2bca966f91dc7ee54b28b8e2a8944 after #1446 nonforce merged; observed exact-head official [42493456372](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42493456372) SUCCESS for 3 public source fetches/actual parser/Add Coffee and Source Review, but its **#480 original selected coffee identity had no proof**: `selected_h1=[]`, `selected_form_h2=[]`, `selected_heading_identity_verified=null`. Prior `requiredFocusedSourceFailures` returned zero for absent H1, silently letting source CI go green without positive identity. This is an acceptance guard defect, NOT evidence of actual member extraction corruption. Recovered AGENTS/AI preflight, master/Locked decisions, status/approval/queue, current #33 R36, #267 separate V2 and #96 Auth owner; original603 CSV blob `3e0d3036ea727de091f304f538c6de2dfcaa10d6` untouched.

Raw [artifact 13621999668](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42493456372/artifacts/13621999668) independently downloaded. Exact ZIP SHA256 `9a4923d4b33e2e2dee26c37cd3c0c1576c39914bf831104da0e5592f9c2960cb`, JSON `fec1390883464b092c758678a1c5bbcb6dd496fb387f573240fffceee630d805`, HTML #477 `cff71437ba9da9759bc130d5123e5e7641de23a1ff98799e0fb34e11148a9749`; #480 `60abda95392bffe7c87e82730163e2b0e4b7047da5d9ee644f2d1ee2e290ecca`; #483 `c59287158886e8ea8907395f6de133aa3079d62b1e01bf4956e33247b6bb3747`. Direct raw current #480 product DOM: one `product-root.product-page--root`, one own `.product-page--right-column`, one literal `h2.product-page--heading` `Strawberry Fields Forever (seasonal release)`, one same-column `form.product-buy-buttons--form[action="/cart/add"]`. An unrelated raw JS template includes `<h1`, so never trust global regex.

## Same-commit correction
1. `scripts/audit/issue33-selected-product-heading.mjs`: generic bounded product root H2 purchase-bound title; fail for unrelated/duplicate/other-H1 form/heading.
2. `scripts/audit/issue33-original603-focused-source-review.mjs`: audit additional exact root H2 and compare both literal old original name and current chosen parser name.
3. `scripts/audit/issue33-focused-source-acceptance.mjs`: no H1 or verified H2 can no longer PASS as implicitly selected.
4. `tests/coffee-issue33-selected-heading-identity.test.mjs` and `tests/coffee-issue33-focused-source-acceptance.test.mjs`: positive, missing form/root, conflicting, related, foreign-H1, negative identity, fail-closed.
All source/html artifacts are public coffee product bytes, no private data; no application parser or member data changed.

## Preliminary semantic adjudication, not whole corpus certification
#477 real chosen notes dark chocolate/warm spices/pecan and paired Guatemala/El Salvador washed lots valid. #480 selected current page has different direct notes lists (Juicy Strawberries/Milk Chocolate/Peach versus Juicy Strawberry/Dark Chocolate), actual parser correctly leaves canonical tasting_notes blank with `conflicting:true` source facts. Component anaerobic co-ferment and washed combine as `Other/Unknown`, not one universal process; altitude component disparity qualified. #483 direct source Semi-Washed preserved as source fact; intentional single-select mapping `Other/Unknown` not a Washed defect. This change is **audit source-identity assurance only**, no asserted new flavor extraction.

## Acceptance/next actions
Run applicable exact PR-head CI; safe nonforce merge then require exact merged official #477/#480/#483 with all 3 strict selected identities TRUE, real parser, Add Coffee and Source Review, independent fresh ZIP/JSON/HTML SHA256. Full frozen603 manual_certified=0; whole #33 OPEN. All previously READY/DEPLOYED queue states preserved; no Netlify, release, SQL, Edge, Auth, provider, or member writes, new accounts, paid service or force history.
