# Issue #455 R341 — original Cotter consumer coffee CSV row-count provenance (2026-11-18)

## Exact sources and earlier state

This is a **bounded primary-data source reconciliation**, not a new app rule, peer-review certification, research replication or full dataset audit.

- Existing canonical research source: `LIT-2021-COTTER-DRIP-CONSUMER-PREFERENCE-SEGMENTS` (no new source ID). Cotter et al., *Journal of Food Science* 86, 194–205, DOI [10.1111/1750-3841.15561](https://doi.org/10.1111/1750-3841.15561). Earlier R332 paper abstract and archive-methods inspection already recorded 118 consumers, one medium-roast washed Honduran coffee, 27 planned 3×3×3 **drip** brews, 9-point liking, five-point just-about-right ratings and check-all-that-apply descriptors, not DIC five espresso ratings.
- Original public author-archived dataset [Dryad DOI 10.25338/B8993H](https://datadryad.org/dataset/doi:10.25338/B8993H), publication date January 16, 2023. The archive abstract reports both **3,186 individual tastings** and **3,168 spreadsheet rows**. The corresponding 2022 Ristenpart et al. temperature report analyses the same people, not an independent panel.
- [Zenodo archival mirror, record 7542610](https://zenodo.org/records/7542610), version 1, lists the same original `cotter_dataset.csv` (about 542 kB; publisher-listed MD5 `0735b8d3b3302a7bc63cb96d5729f250`, **not independently computed**) and README.

## New bounded independent direct inspection (R341)

Directly opened the [public original CSV](https://zenodo.org/records/7542610/files/cotter_dataset.csv?download=1) as indexed plain text. Its visible header at indexed **line 0** contains the named 48 data fields, beginning with `Judge,Cluster,Week`; data begin at indexed line **1** and continue through populated indexed line **3186**. The text viewer reports **3,187 total indexed lines**, matching **one header + 3,186 apparent data records**. This agrees with the reported **118 × 27 = 3,186** design and conflicts with the landing description's **3,168** row statement. Therefore **3,168 appears to be an archive description/count error, not demonstrated evidence of 18 missing observations**. Preserve the conflict verbatim; do not silently correct the provider record.

**Boundary:** This inspection confirms the publicly indexed CSV start/end and line count only. It is **not** a line-by-line revalidation of all 48 columns, duplicate or missing `Judge × Brew` pairs, blank records, individual taste fields, raw CSV byte hash, archived MD5, original README bytes, publisher full PDF, raw sensory replication, or inference of cup-quality benefit. Dataset original bytes were not programmatically downloaded/hashed; MD5 above is **archive-reported metadata only**. No public row/person ratings were copied into DIC. The current 195 source identities are unchanged; add only `R455-EV-R341-COTTER-ZENODO-RAW-ROW-COUNT`, raising bounded claim checks **584 → 585**, with 261 existing research-only proposals unchanged.

## Source → live product reasoning and authority

The archive concerns **drip beverage consumer liking and temperature**, not blinded trials of DIC recommendations on repeated **same-coffee espresso** or DIC's independently named Extraction, Body, Clarity, Sweetness, Dryness five scales. The current original `site/lib/constants.js` taste definitions and `site/lib/engine.js` baseline/recommendation are owner-Locked and **remain unchanged**. Neither 3,186 observations nor any consumer segmentation should set universal espresso ratios, numerical targets, confidence thresholds, next-shot changes or user-facing science claims. No owner question is required from this source-only clarification.

**Privacy/safety:** No live DIC member-data access, telemetry, consent or study collection, production experiment, app code/test/CI, SQL/Auth/Edge/Netlify, deployment, release/production/main, backup, visibility, schedule or alert change. Preserve original nine archived Markdown studies; no duplicate #335 technical audit or #267 literal-line credit.

**Next:** If raw original CSV bytes and publisher full paper become legally/reliably accessible, perform distinct checksum and complete-record/condition/field validation, reconciling any remaining missingness without claiming 48-column audit now. Continue a distinct SAFE reproducible Log Shot → Rate → Recommendation UX fix or further primary citation check under #455. Original owner October 29 research implementation ZIP and standalone S019 roast/style PDF were **not found** by new Drive and Library searches this run; the separately indexed slow-feeding PDF is not either original.

**Current Git source binding:** initial live development `4ebb7f6556a41085ddb3524f7fce9d780f0050fc`, original PREFLIGHT.md Git blob `2fb236bbfa6bac48513eeb3bd157b260853af06d`, original canonical source ledger Git blob `9d8ffc544a9862e01c13c8dcc298b42a71120106`. No change to Locked product authority.
