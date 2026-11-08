# Issue #33 R40 — original603 #501 current selected locality completeness

2026-11-08 UTC. Development only. TESTING, not READY, not deployed.

## Recovered authority and scope

Exact source parent `780abd613874c20930d413f974132a30ea74ab05` on `development/backend-foundation`; AGENTS, AI entrypoint/preflight, current Master Specification and Locked Decision Ledger, approval matrix, release queue, Issue #33 and its newest R39 source/CI, #267 V2, #96 and concurrent open R38 PR #1453 checked. Original 603-row CSV blob `3e0d3036ea727de091f304f538c6de2dfcaa10d6` is immutable. This is a distinct case, no edits to the R38 official-source workflow, the frozen scorer, or runtime code.

## Real exact current selected official source

Original row #501, `Organic Ki-Saya - Tenejapa Microlot`, URL https://www.ixxacoffee.com/products/organic-ki-saya-tenejapa-microlot, same selected H1 on current public page observed 2026-11-08 (web current page, not raw-HTML archive). Its selected description explicitly states the Ki-Saya coffee is **from Chiapas**, `This lot hails from Tenejapa`, and `Notes Of: Chocolate, creamy caramel, honey, hazelnut`. No roast category is published on selected page; the frozen expected Medium must NOT be backfilled. Historical source-level CSV row reported `origin: Tenejapa`, whereas both locality and state are directly printed in the exact current selected description (historical old expected origin `Tenejapa, Chiapas`). This is a testable precision gap, not proof that current HEAD still fails.

Separately inspected current selected row #504 https://www.kamiakcoffeeco.com/products/tanzania-aa-amcos: H1 Tanzania AA - AMCOS; explicit current `Country Tanzania; Region Mbeya; Farm AMCOS Cooperative; Variety Bourbon Derivatitves [source misspelling]; Altitude 1870 masl; Proc. Method Washed`, and own tasting honeydew/agave/mild peatiness. The generic About the Farm AMCOS educational description is NOT individual named-grower proof. Historical parser already captured these facts; #504 remains semantic-review-only, no duplicated correction. Exact pages were visible publicly, but no raw HTML download, product digest or in-app live signed-in claims for these new observations.

## Same-commit first-stage test intake

New focused test `tests/coffee-issue33-original603-501-current-tenejapa-chiapas.test.mjs` uses directly selected product-shaped HTML and explicitly asserts both printed Tenejapa and Chiapas; adversarial cases reject inferred location, stale prior lot and related coffee, and preserve no invented roast. This is intentionally TESTING: first PR-head actual parser result must establish whether the proposed field is genuinely missed. If it fails, analyze failing assertions, implement the narrowest generic selected-current-product correction with same-commit journal and focused negatives; if it passes, no unnecessary parser change. Independent guarded public HTTPS extraction plus Add Coffee/Source Review and source artifact hashing STILL REQUIRED before any full individual certification / READY claim. Full original603 manual adjudication and changed/inaccessible cases remain OPEN.

No production SQL/Edge/Auth/provider/member writes, Netlify publication, release grant, paid services, secrets, forced Git, or changes to immutable corpus/other queue rows. Next: verify actual PR-head CI; resolve failures; integrate only after completed appropriate checks, independently verify source and close this narrow receipt without closing #33.

## R40.1 — verified initial PR-head failure and first focused repair

Exact initial PR-head `42c8321c06f60fc4c969896f8cb4f97e57d93fa0` Node [42502601288](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42502601288) **FAILED** (2,042 passed / 1 failed / 0 skipped), solely because a new test title at line 25 contained an unescaped apostrophe `lot's`, producing `SyntaxError: missing ) after argument list`; this did NOT execute the intended #501 assertions. The other applicable initial source-archive, isolated SQL, cloud UX and approval workflows SUCCEEDED; original frozen603 job SKIPPED (not PASS). This same commit changes only the test's display title to a syntactically safe name and adds this scoped journal explanation. No parser code or assertions are weakened. Next: independently inspect the new exact PR-head Node result for the substantive #501 canonical origin assertion, and repair only evidence-backed, adversarially guarded real defects before nonforce merge. No READY or live official HTML verification yet.
