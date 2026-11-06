# Issue #33 original603 #25 selected Coffee profile aroma/flavor correction — November 6 2026 UTC

Authority: owner autonomous DEVELOPMENT ONLY; original selected-product semantic review; **not** permission to publish, write production providers/members, or certify 603 automatically.

Source parent: `34356b09626746f14cf0a0344bf713e78e547ece`; original public selected product: https://bleucoffee.com/products/copy-of-papua-new-guinea; current H1 **Sumatra Mandheling| Fair Trade Organic**, despite recycled Papua New Guinea URL handle. Fresh public page confirmed full exact printed prose: Coffee profile: Coffee features floral, fruity, and sweet aromas of vanilla and pipe tobacco, with rich, lush, and smooth flavors of black cherry, tobacco, and cocoa.
Prior source-bound selected raw HTML SHA256 `7ea5f71b56cc2e0f7ddf4215ed9ecb3804d0b420b417110e9577dc0c52129ea2` (run 42133761142, source archived in existing issue33 original603 #13/#19/#25 receipt). This is prior captured evidence, **not** a claim that this commit has already probed current HTML.

Before: canonical `tasting_notes` held only "rich, lush, and smooth flavors of black cherry, tobacco, and cocoa"; omitted directly printed preceding **vanilla and pipe tobacco aromas**. All other #25 origin/variety/elevation assertions left unchanged; unpublished process and roast remain blank. Root cause: `selectedLiteralFlavorSentence()` intentionally selected the flavor clause alone and discarded the preceding same-sentence aroma clause.

Changed paths in THIS commit:
- `src/server/coffee-flavor-evidence.mjs`: strictly require exact same-product, unqualified, labeled `Coffee profile: Coffee features/offers/has ... aromas of ..., with ... flavors of ...` sentence; preserve its *literal* complete aroma+flavor wording as one ranked explicit profile. Preserve other actual printed independent list conflict path and leave all other product/story/SEO/conditional paths untouched.
- `tests/coffee-issue33-25-selected-complete-profile.test.mjs`: synthetic positive and hostile source/conditional/history/other-coffee/SEO/unsupported syntax tests. Synthetic fixtures are not live verification.
- `scripts/audit/issue33-original603-focused-source-review.mjs`: fail-closed strict exact selected #25 live official source contract on the existing #13/#19/#25 bounded cohort, including identity, listed descriptors, blank unknown process/roast, UI and source review. Source hash is captured at execution.
- `docs/workstreams/ops-issue33-25-selected-complete-profile.md`: same-commit source authority, evidence, safety and next action.

Verification **PENDING**: exact head PR targeted Node/lint/build/source, approval/continuity and required risk-based checks; merged source live official #13/#19/#25 with selector `[dic-issue33-fiftythird3]` on non-force merge; independent raw HTML rehash if available. Reject CI SKIPPED as PASS. If source changed, identity mismatched, competing current notes contradicted, or tests fail, fix before narrow queue READY.

Original immutable 603 coffees/201 roasters/1,197 captures, CSV `3e0d3036ea727de091f304f538c6de2dfcaa10d6`, oracle/scorer unchanged. #85 separate labeled Notes/story review unresolved, #267 V2 and #96 Auth distinct. Issue #33 stays OPEN until whole original603 individual completion. No deployment, production SQL/Auth/Edge/provider/member writes, new paid services, secrets, forced history.

Next action: run exact PR-head CI, diagnose failures, nonforce merge only passing reviewed source; capture actual live source/parser/Add Coffee and HTML hash, reconcile narrow queue state and report meaningful results to Issue #33; then continue distinct unresolved source cases. [skip netlify]
