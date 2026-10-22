# Extractor #33 — 31-URL live tasting-notes and field completeness acceptance
**Checked:** 2026-10-22T00:55:44.132Z — October 21, 2026 America/Denver
**Status:** Development source IMPLEMENTED and verified in public-source CI plus isolated app/browser tests. **NOT deployed**, and **not field-by-field accepted on owner's signed-in device**.
**Owner scope:** improve missing tasting notes and other evidence-backed autofill across many exact products (especially PERC, SEY, Queen City, Sweet Bloom), with no Netlify publication, hosted SQL/Edge/Auth/member changes, billing, new AI/Claude/BYOK runtime, or automatic save/verification.

## Exact source and evidence
- **Current reviewed functional commit:** `14cb2641d4edecc0a677814c0ca5866845083d10`; later edits to this document are documentation only.
- **Actual public 31-URL run:** [39701686397](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39701686397), exact flavor/parser SHA `a5e93c81f93787dcfd080aaf12286ca6ccde7486`, **SUCCESS**. 31 requested public HTTPS URLs; 25 selected product pages parsed, **25/25 returning tasting notes**, 6 not parsed. Every row is a public product source *suggestion*, not owner-confirmed bag or verified canonical coffee.
- **Independent conditional 2MB product retry / public exact-product sources:** same run [39701686397](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39701686397) includes adaptive 16 scenarios: 15 parsed, one homepage correctly rejected; Picky Chemist 1,217,836 HTML bytes safely retried under the existing approved bounded product-only exception, producing nine source-backed fields and tasting notes. Mango Tree Blend matched public Ecwid source gave five supported fields, including tasting notes.
- **Further missing-field source probe:** [39702151013](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39702151013) checked 31 named entries and 17 adaptive cases (16 selected products read/parsed, one rejected homepage); **5** exactly bound public storefront API corroborations with **zero extra justified facts** on already-rich fields. SEY Kedida Gubata HTML and exact public Shopify API both lacked formerly indexed varietal/region/elevation/harvest information. This run included a subsequently *reverted unsafe* Wuri roast shortcut: do not use that one proposed Wuri value or call it accepted.
- **Exact code equivalence:** GitHub compare `a5e93c81f93787dcfd080aaf12286ca6ccde7486..14cb2641d4edecc0a677814c0ca5866845083d10` changed *only* public-probe scripts, synthetic tests, work journal and Current Status. The abortive roast shortcut was fully reverted, leaving actual extractor modules **unchanged** from the successful 25/25 note source. Do not claim `39702321109` executed a new real probe; it correctly SKIPPED because the final revert commit had no opt-in probe marker.
- **Current clean final CI:** [app build/Node/lint 39702321099](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39702321099), **583/583 Node22 tests PASS; 30 Node18 checks PASS, zero failures/skips**, shipping-file boundary PASS; [cloud/mobile UX 39702321078](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39702321078) **SUCCESS**; [approval/journal 39702321059](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39702321059) **SUCCESS**. An earlier deliberately more aggressive roast experiment FAILED six existing safety regressions [39702151073](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39702151073) and was **reverted** rather than weakening tests. All original roast/visual/XSS/false-positive safeguards remain.

## Real public URL matrix — all 31 requested probe targets
These are currently observed **product-specific** facts; some URL aliases represent the same release, some archived handles represent different releases, and these are not independent 31 different coffees.

| Product and storefront | Result | Notes | Fields returned |
|---|---|---:|---:|
| Corvus Echo Gesha | parsed | yes | 7 |
| Corvus Dead Reckoning Blend | parsed | yes | 5, roaster espresso recipe present |
| Corvus Dead Reckoning Subscription | parsed | yes | 3, espresso reference present |
| Corvus Hacienda Mario | source unavailable | unknown | — |
| Tim Wendelboe Gachatha | parsed | yes | 8 |
| Tim Wendelboe Gachatha Espresso | parsed | yes | 8 |
| Echo Raven Mexico | **parsed; fixed missing Tasting Profile** | **yes** | **8** |
| Proud Mary Ovidio Gomez | parsed | yes | 6, espresso ratio reference |
| Queen City Banko Gotiti Washed, variant URL | parsed | yes | 8 |
| Queen City Banko Gotiti Washed, canonical URL | parsed; same release matched | yes | 8 |
| Queen City homepage negative control | correctly rejected (no single product) | n/a | — |
| Onyx Mullugeta Muntasha current 2026 | parsed | yes | 8 |
| Onyx Mullugeta archive, different release | parsed separately | yes | 7 |
| PERC Franky Hoyos | parsed | yes | 9 plus recipe |
| PERC Kenya Mara Estate | parsed | yes | 9 plus recipe |
| PERC Nestor Lasso Ombligon | parsed | yes | 7 |
| PERC Outpost Coffee | parsed | yes | 9 plus recipe |
| The Picky Chemist Gesha Village | default 900KB cap refused; **conditional adaptive read succeeds** | yes under retry | 9 under retry |
| SEY Chorso Bule | parsed | yes | 8 |
| SEY Yaye Arbegona | parsed | yes | 8 |
| SEY Kedida Gubata | parsed | yes | 4; source/API currently omit other optional facts |
| Queen City Banko Gotiti Natural | source unavailable | unknown | — |
| Queen City Sonia Bolanos | source unavailable | unknown | — |
| Queen City Belafonte Double Origin | parsed | yes | 3; avoids inventing one origin/process |
| Sweet Bloom Wuri | parsed | yes | 8; roast *unverified* graphic, no inferred tier |
| Sweet Bloom Uraga | parsed | yes | 8; no unsupported roast guess |
| Sweet Bloom Felix Zaragoza | source unavailable | unknown | — |
| Black & White Los Altos Washed | parsed | yes | 8 |
| Little Wolf Tegu | parsed | yes | 8; original roaster wording preserved |
| Heart Phono | parsed | yes | 7 |
| Heart Ethiopia Halo | parsed | yes | 7 |

Field-count numbers refer only to returned `fields` JSON keys (name, roaster, tasting_notes, origin, roast_level, elevation_m, process, variety, producer, release_label). Published detailed espresso recipes and complex-source details are exposed separately when present, not added to these counts. Missing facts are not invented to inflate coverage. Selected same-release/roaster controls avoid mixing source facts across Onyx releases and Queen City variants; blend origin/process distinctions are retained.

## What was improved and how the safeguards behaved
1. Added bounded **selected-coffee tasting/flavor-profile DIV/P/UL/OL chip/list recognition**, only from positively named product regions, with short plausible sensory descriptors. Added positive chip/list/escaped-markup tests and negatives for unrelated cards, unlabeled marketing, process/fermentation claims, navigation and footer.
2. Recognized **`Tasting Profile:`** as an explicit flavor key for current Echo Raven Mexico; live retest now returns exactly the printed `Chocolate, cinnamon, green apple.` and its separate source-backed roast, variety, origin, elevation and processing facts. Generic `Coffee growers from` is **not** a named producer.
3. Expanded real public-source matrix's diagnostic summary to report fields present, notes missing, recipe presence, conflicts and failed URL reasons; saved no raw HTML or authenticated private data. Added carefully bounded source-label diagnostics to distinguish the actual current page from stale crawls.
4. **Rejected** tentative Wuri generic `Roast Level Light` parser change: six existing tests found it can be the end label on a graphic rather than a marked selected roast. Reverted implementation/tests, restored all original checks, kept roast blank until authoritative marked selection exists.
5. Original one-click URL Autofill only fills **blank** supported form fields; protects already typed values; displays preview for review before saving; does not automatically identify official verification, overwrite a bag/release or spend model tokens. Existing normalized seven-tier roast, confidence caveats, source matching, private preview admission, 12/24h budget, >=30s cooldown, bounded retry/decompression and pinned HTTPS/SSRF controls remain in force. These protections are covered by existing full Node/isolated regression suites and prior acceptance; a fresh *signed-in owner browser click-through* was not run in this session.

## Limits, acceptance and release boundary
- **Unparseable/unavailable:** Corvus Hacienda Mario, Queen City Natural/Sonia, Sweet Bloom Felix (unavailable), Picky oversized under normal base cap (recoverable under existing permitted product retry) and correctly rejected Queen City homepage. Source site/URL changes are external; an unavailable page never justifies invented coffee facts.
- **SEY Kedida:** four currently verifiable fields only; current selected HTML and same-release public Shopify API lack earlier technical metadata, which must stay blank for manual review. **Queen City Belafonte** names a double-origin blend without reliable components; don't impose single origin/process or guessed harvest.
- **Picky** correctly succeeds through separate existing adaptive HTML retry; the conventional 900KB-only probe still records its base-cap rejection. These are complementary checks, not contradictory statuses.
- **Wuri** label appears next to an ambiguous roast graphic; no source-proven selected category. Do not promote the scale endpoint `Light` into coffee roast.
- **Site variability:** 25/25 notes among *parsed* current source samples is not universal precision/recall, independent physical-bag validation, an authenticated real member’s page, or guarantee for future URLs. No new AI runtime; future roaster designs can change.
- **No production changes:** Netlify remains prior current/READY `6ad92fd1d706315f29032892` / released source `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`. No SQL, Edge, Auth, member data, test shot, secret, paid credits, DNS or Netlify settings were changed. Original one-use grant consumed. Next: separately authorize exact-SHA controlled release after checking live credits/provider/backup state, then owner-approved authenticated phone acceptance of actual product pages and blank-only UI.
- Issue [#33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33) **remains OPEN** for remaining truly unsupported products and real-device acceptance; do not mark full site compatibility complete.
