# Issue #455 — R455-202: independently counted research publication identities (2026-11-12 UTC)

## Source and authority checkpoint

Pinned original development parent **`10c240212b23c22a2e9f1f4533d3be3f81c30f59`**, `main` **`44372ffdbce3f2771c4c5349b66ee6b46cc56db4`**, `release/production` **`d0bc07df641af6411435daac74ee3cb16d1bdb61`**; initial ledger blob **`4b5f35dd3e64fb38d7ee3a3e4bd64eb343eebd84`**. Reviewed AGENTS, context/PREFLIGHT, CURRENT_STATUS, Master Specification, Decision Ledger and later supersessions, approval matrix, release queue, source register, nine original report README and original Markdown #08, active Issue #455 comments and #335/#267/#33/#96, current engine.js, model/constants and concurrent PR metadata. Owner-approved temporary PUBLIC visibility exception #630 is unchanged; do not misclassify it as a new incident. Drive searches for S019 and espresso research found no independent S019; Library search did not establish original S019 PDF access. The separate slow-feed evidence is not a validated universal rule.

## Actual independently checked finding: duplicate paper identities

The existing 106 **source/review records** do **not** mean 106 independent published studies. Of these, 66 contain nonempty DOI fields with **61 different normalized DOIs**. Exactly **five** DOI/title pairs identify the same publication twice under independently useful but NOT independent-study review records:

| DOI | Canonical prior source ID | Preserved alias/review ID | Boundaries |
| --- | --- | --- | --- |
| `10.1111/1750-3841.16531` | `LIT-2023-SENSORY-BCC` | `LIT-2023-GUINARD-DRIP-PREFERENCE-BCC` | Drip/filter consumer strength-extraction preference chart, NOT a validated espresso five-taste preference prior |
| `10.1371/journal.pone.0219906` | `LIT-2019-COFFEE-CFD-UNIFORMITY` | `LIT-2019-MORONEY-CFD-BED-UNIFORMITY` | Moroney et al. original PLOS bed model and 60-g/1-L/250-mL-min experimental rig, not independently replicated conventional espresso taste evidence |
| `10.3390/foods12152871` | `LIT-2023-ESPRESSO-FLOW-FRACTIONS` | `LIT-2023-SCHMIEDER-ESPRESSO-EXTRACTION-KINETICS` | Schmieder et al. same flow-rate/particle-size/temperature extraction-kinetics article, two distinct review depths not independent trials |
| `10.1016/j.jfoodeng.2022.111301` | `LIT-2023-ESPRESSO-PSD-COMPRESSION` | `LIT-2023-VACA-GUERRA-PSD-BED-COMPRESSION` | Vaca Guerra et al. same six-PSD packed-bed-compression paper, one abstract-only check and one author-manuscript substantive review |
| `10.48130/bpr-0024-0040` | `LIT-2025-FITRI-ESPRESSO-ORIGIN-SENSORY` | `LIT-2025-FITRI-ORIGIN-ESPRESSO-CATA` | Fitri et al. identical original 3-origin CATA and espresso-based formulation study; multiple reviews do not multiply participant samples |

R202 adds `same_publication_as` and `same_publication_doi` to the **later five** entries rather than deleting/moving anything. All old claim checks (313), proposal records (160), citations, original Git bytes, study versions and paper-specific access levels are retained and can be independently referenced. Existing primary DOI URLs include [Moroney et al. 2019](https://doi.org/10.1371/journal.pone.0219906) and [Vaca Guerra et al. 2023](https://doi.org/10.1016/j.jfoodeng.2022.111301). PLOS's 60 g / ~1 L / 250 mL per minute bed rig is explicitly not a conventional five-taste espresso sensory experiment; the PSD original author manuscript is distinct from the inaccessible final publisher PDF and raw data. More reviews do not equal more replicates. The other **40 no-DOI records** have NOT been proved mutually unique.

## Exact change and verification boundaries

**Same-commit changed paths only**: `docs/audits/issue455-research-source-coverage-20261103.json` (source alias fields, DOI denominator, two bounded traceability evidence checks, one proposal) and `docs/workstreams/ops-issue455-r202-source-identity-dedup-20261112.md` (this receipt). Result expected: 106 source records, 315 evidence checks, 161 proposals, 5 repeated-DOI aliases. No code, tests, CI workflow, Master/Locked decisions, privacy, SQL, Auth, member/offline records, original research bytes, CURRENT_STATUS, release queue or existing source register references changed.

**Positive identity checks:** five matching original DOI/title pairs verified source-ID-to-source-ID; all 106 old records preserved and in original order; original 313 checks/160 proposals untouched. **Negative controls:** no association for different DOI, no renumbering, no claim that these papers are independent replications, no certification of inaccessible S019 or publisher PDFs, no #267 direct-line-review credit. Node22/browser/offline/SQL/Auth and original frozen603 **NOT RUN** (documentation-only; not PASS). **GitHub PR/source-bound governance CI NOT RUN at authorship** and no merged-source claim until it actually completes.

Original R201 code SAFE status and the composite R198/R201 READY queue row remain under #2169's independent gates; existing 319 queue rows (312 DEPLOYED, 2 READY, 5 IN_PROGRESS) are not edited. Original published Netlify source not touched.

**Next:** verify actual two-file PR diff, exact-source CI (no skipped==pass), nonforce merge only on SUCCESS; independently reread merged ledger source and journal blobs, post durable Issue #455 checkpoint. Then continue a distinct claim/source or Log Shot → Rate → Recommendation correctness increment. No owner product approval presently requested.
