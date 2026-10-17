# Queen City Exact-URL Extractor Improvements and Work Handoff

**Date:** 2026-10-17 UTC / America/Denver. **Status: this extractor pass is complete in development; ready for the owner's separate Work error sweep. Not published.** No claim of a perfect extractor, exhaustive app audit, or complete coverage of arbitrary future websites.

## Scope and baseline

The owner supplied `https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia?variant=52819513737447` and requested the strongest practical extraction improvements before a separate Work final sweep. Latest instructions defer publishing until that sweep and the owner's Netlify credit screenshot. Preserve all Locked product decisions and the planned seven-tier rollout.

Baseline development SHA: `c7c3a519700362c29220232e02fa9289dc937338`. Controlled pre-change source probe: [run 39051144827](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051144827), source commit `c6d67c5270690fad51bf13fe2b0237e35d070172`. It proved the exact variant and canonical product URLs already parsed seven fields, but omitted the washing station and the product's processing/drying detail. The Queen City homepage correctly remained an ambiguous/missing-product negative control.

## Implemented and independently exercised

Implementation commit: [`4486e58ff82d4a8de36a5a71bf1aa8650b65e8f9`](https://github.com/Schulzet3/The-Dial-In-Collective/commit/4486e58ff82d4a8de36a5a71bf1aa8650b65e8f9).

- `src/server/coffee-delimited-specs.mjs`: bounded evidence-only parsing of paired producer/locality and process/variety/elevation lines. It handles inline strong/span/em formatting, adjacent short paragraphs, Unicode names, commas, altitude ranges and plus signs. It requires a plausible matching product specification rather than guessing from a title, shipping address, importer biography or unrelated story. Distinct competing specification tuples return no match; duplicate responsive representations are tolerated. Unknown-country labels and nonmatching structures remain conservative no-matches.
- `src/server/coffee-product-layouts.mjs`: connects that helper to the actual shared extractor; removes the two superseded loose Queen City inference blocks instead of leaving redundant parsing paths. Existing explicit fields remain higher priority and typed member data is not overwritten. Other roaster-specific logic is unchanged.
- Fermentation and drying descriptions are shown through the existing source-only supplemental details disclosure. They are not treated as roast classifications, espresso brew times, coffee-rest recommendations, or automatically saved canonical records.
- `tests/coffee-delimited-specs.test.mjs`: **19 new tests**, including invalid bounds, conflicting tuples, compound-process rejection, nested markup, accents, omitted evidence, navigation/related-product/template/script exclusions, and importer-vs-producer isolation.
- `tests/queen-city-url-preview.test.mjs`: **7 new end-to-end parser/UI tests** covering the exact supplied URL, canonical/variant/tracking equivalence, washed-versus-natural identity, missing roast/harvest/recipe values, supplemental rendering and typed-field preservation. Fixtures are small representative structures, not purported original HTML archives.
- `scripts/audit/coffee-roaster-live-probe.mjs`: tests the exact variant plus a canonical control and homepage negative control; records source SHA-256 digests instead of raw HTML; actual Queen City assertions now fail the live job on missing fields or unexpected identity/value drift. Temporary bounded source-markup diagnostics from the preflight were removed.

The pinned-DNS/HTTPS, redirect, decompression and **900,000-byte** fetch safeguards are unchanged. The admitted-member checks, shared **12 previews per 24-hour budget window / 30-second cooldown**, private Pending/Verified distinction, source permissions, manual entry and no-credentials-to-roaster rules are untouched. No production tokens or member preview quota were used.

## Verified live Queen City result

[Final public source probe run 39051887621](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887621) completed successfully for the implementation SHA. At approximately **2026-10-17T17:00:57Z**, the exact variant response was **271,735 bytes**; its SHA-256 was `75091274c065f629d79e83fc38f03c2a307a455f294e0fa45e2ef0e718e51a7d`. Dynamic HTML can change between requests; the digest identifies this read, not an invariant source version.

| Extracted field | Observed value |
| --- | --- |
| Name | Banko Gotiti ~ Washed // Ethiopia |
| Roaster | Queen City Collective Coffee |
| Producer/station | Banko Gotiti CWS |
| Origin | Gedeb, Yirgacheffe, Gedeo Zone, Ethiopia |
| Process | Washed |
| Variety | heirloom (source wording preserved) |
| Elevation | 2170 masl |
| Tasting notes | Peach Brulee & Cantaloupe |

Supplemental source details now retain the **24- to 48-hour fermentation in water tanks** and **raised African drying beds for roughly 10 to 15 days**. No explicit roast category, harvest/release, or espresso recipe was obtained; those values are intentionally absent. The importer mentioned in the biography is not incorrectly installed as Producer.

The canonical URL without the variant returned identical eight core fields. The refreshed multi-roaster probe made **11 requests**: two URLs for this same Queen City coffee, one homepage negative control, and eight other product pages. **Nine product URL requests parsed, representing eight distinct coffees**; Queen City's homepage correctly failed product identification, and The Picky Chemist still safely returned `page_too_large`. All other previously successful roasters remained parsed. This is not evidence that every possible field on each roaster is captured.

## Test evidence

- [All checked-in Node tests, clean dependency installation, static build and private-source exclusion: PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887637).
- [Cloud regression, syntax/build and synthetic 390px mobile Chromium QA: PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887663).
- [Actual bounded public source reads and explicit Queen City assertions: PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887621).
- Local Node 22.16 syntax checks and the 19 focused helper/layout tests also passed before the production-path CI run. The modified existing layout file was reconstructed locally and its original Git blob SHA was checked against `375476b321a9ff87fa0b4cfac5af78a622f5d8ba` before editing; the resulting server code blobs match those committed.

No SQL, Edge Function, frontend release, database row, provider setting, credentials, backup configuration or billing change was performed in this pass. A final Netlify read still returned READY published deploy `6ad2c872ad7a8fa78dc410dc` with SSO limited to non-production. This was a focused extractor refinement, not a new database acceptance test or a completed all-app security audit.

## Work sweep: exact next task

Read `AGENTS.md`, [Current Status](CURRENT_STATUS.md), both canonical requirements, this report and [the queued seven-tier rollout](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md). Start from the actual latest development head, not an old transcript, and run the owner's broader code/error sweep before requesting the Netlify credit screenshot or releasing anything.

Review the changed parser and existing shared paths for conflict precedence between JSON-LD and visible facts, stale metadata, related-product isolation, compound processing, malformed markup, Unicode, request/decompression bounds, variant identity, optional-field preservation, and safe failure. Check full app dependencies, runtime/import graph, tests, browser/offline paths, role/privacy safeguards, migrations and documentation. Preserve deliberate historical import/recovery code and tests; unused-in-current-UI does not automatically mean safe to delete. Keep all identified issues and acceptance limits explicitly tracked rather than converting a clean test suite into a perfection claim.

Known outstanding scope remains: The Picky Chemist oversized/Wix case, real authenticated browser/device acceptance, and the previously tracked broader app/security/backup gaps. Solving the oversized case must not silently increase limits, add paid services or weaken safe fetching. Original nine missing research reports remain an evidence gap, not newly recovered content.

After the sweep passes, obtain the owner's current Netlify credit screenshot and perform the approved coordinated release under the existing guard. Verify the seven-tier frontend is actually live **before** applying the already-authorized exact coffee reclassification migration; preserve Pending Wuri and all shot/community history. Only then update the published-source backup pin and verify backup delivery. No taxonomy or named-coffee approval needs to be asked again.

The previous full `CURRENT_STATUS.md` is preserved byte-for-byte as [CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md](CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md), in the same directory so its relative evidence links remain valid. It is historical, and its prior "next action" sections do not override this later Work-first handoff.
