# Issue #33 R41 — Original603 #514 Bellevue current selected Mountain Water decaffeination

2026-11-08 UTC. DEVELOPMENT ONLY, TESTING. No release or production work.

## Authority, exact source SHA, scope

Owner Nov 6 notification policy; original #33 full603 source-specific source accuracy; AGENTS / AI entrypoint and PREFLIGHT; Current Status, Master Spec/Locked Decision Ledger, approval and release queue. Current parent development `3eac959c90d2614f4ac9615680232c9a42d05135` includes verified R40 regression merge `3eac959c90d2614f4ac9615680232c9a42d05135`, original immutable CSV blob `3e0d3036ea727de091f304f538c6de2dfcaa10d6`, R39 later source correction still IN_PROGRESS; R38 [PR1453](https://github.com/Schulzet3/The-Dial-In-Collective/pull/1453) owns different official-source workflow. #267 V2/#96 separate; no overlapping edits. No changes to source oracle/603 captures/CSV or release queue.

## Exact selected current official product source

Original row #514, `Bellevue - Decaf Blend`, URL https://www.lilrhodycoffee.com/products/bellevue-decaf-blend. The current publicly indexed product page viewed 2026-11-08 (web source crawl timestamp may be older; not a fresh raw HTTPS digest) still names that exact selected H1 and in its own Coffee Info prints `Current Coffee: Colombia Hulia MWP Decaf`. Direct selected description says `Bellevue is a single-origin mountain water decaf from Colombia`, tasting `milk chocolate, cherry, caramel`. Product calls itself a Blend despite direct description single-origin; do not infer an unprinted harvest/other components or an additional green processing method. Printed `Hulia` is kept literally in provenance, not silently corrected to Huila. Original October29 603-row adjudication recorded fields `{name,roaster,tasting_notes,origin:Colombia}`, with NO decaffeination_method; that historical omission is not proof of CURRENT HEAD behavior.

## Test-first direct-current mechanism and adversaries

The existing method enum maps explicitly named Mountain Water to Water Process, separate from Washed/Natural green-cherry processing. The selected-direct-prose method whitelist appears not to include `Bellevue is a single-origin mountain water decaf` syntax; test the current actual public parser before change. Same-commit focused `tests/coffee-issue33-original603-514-current-bellevue-mountain-water.test.mjs` supplies exact-selected H1/own source-shaped prose with six positive and hostile-negative cases: named chosen current method, no method, previous lot, unrelated recommended product, other named product and negation. Source-shaped fixture is NOT raw actual HTML nor live signed-in Add Coffee; no READY/full individual certification until separate live source capture, parsing, Add Coffee / Source Review and SHA provenance.

First proposed commit touches only this test and journal; if the PR-head focused Node test fails, identify exact observed current parser defect, add generic constrained selected-method evidence without roaster-specific string allowlisting, and add same-commit implementation/journal with focused positives/negatives. If it passes, retain regression only. Full 603 independent audit remains OPEN.

**Prohibitions:** no Netlify publish, production SQL/Auth/Edge/provider/member writes, accounts, paid services, force push, weakened security, original oracle/CSV/history change. Next: exact PR-head CI, diagnose real parser behavior, fix verified generic defect only, nonforce merge with applicable exact readback, document exceptions, keep #33 OPEN.
