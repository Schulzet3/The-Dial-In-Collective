## November 1, 2026 — verified final GitHub integration

[PR #345](https://github.com/Schulzet3/The-Dial-In-Collective/pull/345) merged non-force at `de2aaef2376485c186d2198af10385b152c2567c`. All nine original Markdown report paths under [`docs/research/originals/`](originals/README.md) were fetched from that exact merged SHA and the Git blobs matched the originals. The current [source register](../ai/SOURCE_REGISTER.json) pins those nine records to the merged source commit. No application deploy, provider/production write, research-policy alteration or unredacted JSON export occurred. The historical "pending integration" description below is preserved as a dated checkpoint.

---

## November 1, 2026 — permanent, byte-identical Markdown source storage follow-up

The owner-provided original archive remains unmodified. All **nine recovered Markdown report bodies (552,702 bytes total)** are now preserved in private GitHub under [`docs/research/originals/`](originals/README.md), one exact, independently readable file per source. Every complete Git blob SHA was compared with the original ZIP member and matched. [`SOURCE_REGISTER.json`](../ai/SOURCE_REGISTER.json) now includes the corresponding GitHub path, source SHA-256, byte size, Git blob SHA and provenance. The source-bearing commit is `23feea01906f1d1cc1de04b42701dd83cee2bdce` (feature branch integration evidence pending at time of this note). The prior section below correctly described **attachment-only storage at its historical intake checkpoint** and is preserved unchanged.

This preservation is **not** a scientific citation audit, peer-review certification, or permission to change Locked espresso recommendations. The nine raw JSON conversation exports, slow-feeding PDF, prior Implementation Pack and S019 PDF remain separate external materials. Bounded privacy pattern checks on Markdown identified no obvious contact identifiers, API secrets or account-token patterns; this does **not** establish exhaustive privacy or copyright clearance.

---

# Recovered espresso report intake and scoped implementation — November 1, 2026

**Archive observed in Project working files:** `Espresso_Research_Reports.zip`, SHA-256 `8ebd0cdfed6d7cc71dcb355f7987f6bf56dd56dd2dd19d9cfa76b18a7c998584`. The ZIP has exactly nine `Espresso_Research_Reports/Markdown/NN_*.md` texts and nine `Original_Data/NN_*.json` ChatGPT export records, plus a separate slow-feeding PDF (SHA-256 `a4db4f38c7c347de5c11332f762321e317a4abb24a323bed7a3b3d37ff156f33`). The ZIP README says **no factual or source audit was performed**. The Markdown's original ChatGPT citation markers are not independently resolvable externally. **These are user-supplied research reports, not independently verified peer-reviewed articles.** No raw exported conversation identifiers or user data added to GitHub. Full source files retained in user attachment, not duplicated in repo.

## Nine-report hash and conclusion index

| No. | Report | SHA-256 of extracted Markdown | Review summary |
| --- | --- | --- | --- |
| 01 | Causal Foundation of Espresso Extraction for Sensory Diagnosis | `fe6afc01a5922cf73c3a66a18115aa1adf8222c5ea2d0e4a68dee1c74adef7fe` | Treat taste as downstream of concentration, extraction and evenness; dose generally fixed near basket capacity; taste alone is not a direct actuator. |
| 02 | Causal Foundation of Espresso Extraction: Physics, Chemistry, Equipment, and Community Validation | `be1f19e2683e8d83c9a78851a63cc6d47eb68677146df622dea1502f051f030b` | Espresso puck is evolving, deformable porous bed; fines, packing and flow interact; universal time/pressure targets not reliable. |
| 03 | Causal Foundations of Espresso Extraction and the Effects of Coffee Characteristics | `270689e9a31014592ab5b9007e0c29121d23d5f1c594025cdc8d69f2881cd106` | Bean physical properties depend on roast, moisture, density and processing; coffee-to-coffee hydraulic responses are not interchangeable. |
| 04 | Causal Foundations of Espresso Extraction: Machine–Basket Interactions | `9b538cec2e2633774a75197af79882e520723c904611f948e54c101ae117e319` | Machine, basket and control regime interact; do not infer identical hydraulic behavior from machine category. |
| 05 | Establishing the Causal Foundation of Espresso Extraction: A Taxonomy of Nine Shot-Profile Families | `30f3367fab7fb1c09fbca4f976ed1885243e2a1ab5d9fda156e094457697c5f9` | Profile archetypes differ by transport and control; preserve app's separate style logic; no automatic cross-style time/grind copying. |
| 06 | Establishing the Causal Foundations of Espresso Extraction | `e36835579fadf24cd2fdb7738d597b93f8bd23908c52206e48ccfe9e69904a80` | Flow/time are coupled response variables, not independently controllable flavor targets; fines and evenness can reverse finer-grind intuitions. |
| 07 | Foundational Causal Report on Espresso Extraction and Sensory Outcome | `a7a1889a884aa25573a24c5b731449b61333ff14a67294bbe1559fe8462c92dc` | Time is observational, not unique target; finely-ground extraction can be non-monotonic; research cautions against universal sensory success targets. |
| 08 | Manual Audit of Espresso Extraction, Dosing, and Puck-Preparation Claims | `9219bf81c7307bfb1967d763edca13d739884e22e77a8f1f22cb94ded9793f49` | Manual audit says several popular grind/tamp/time causal rules are conditional and require experimental context. |
| 09 | The Causal Foundation of Espresso Extraction: Grinder and Burr Interactions | `a3f9ed5f29e8ade7f5a2d051d8b491401f96c20c446aff1ef0ec7ab301774f1d` | Different beans/burr systems/particle distributions change resistance; no universal grinder or timing correction, even for same nominal settings. |

The separately attached slow-feed PDF cautions that slow feeding changes PSD and can shift the useful grind zone substantially; there is no universally defensible numeric correction. The existing grinder-range and separate-feed safeguards are preserved; no duplicate unmeasured "slow-feed offset" is introduced.

## High-confidence engineering change supported by source framing

**Observed code defect:** `site/lib/engine.js` used `learnSensitivity(exact)||learnSensitivity(pairs)` when sizing a grind step from time feedback. The fallback learned seconds-per-grinder-unit from **other coffees** sharing setup/basket/style/calibration, then labeled the resulting advice as sized from comparable personal adjustments. Reports **03, 07 and 09** explicitly describe differences in coffee physical properties, porous-bed behavior and observational nature of time; this fallback falsely implies a coffee-specific calibration. Report **08** emphasizes not universalizing conditional effects. Narrow fix uses only exact-coffee history for timing sensitivity; insufficient evidence retains the existing bounded fixed grind step. Further excludes historical samples lacking measured dose/yield/time or timestamp, and sample pairs with unmatched/unknown temperature. It keeps all five taste ratings, successful family selection, non-universal extraction timing, separate Turbo/Fast-Flow and slow feed, and a single control change.

**Evidence grade:** the causal concern is supported by these **report narratives and directly inspected source code**; the app's chosen thresholds are legacy product heuristics. No new taste outcome accuracy is asserted, and no research-derived numeric espresso thresholds are installed. Factual citation claims in the reports still warrant independent source audits before numerical policy adoption.

**Implementation status at creation:** isolated branch `feature/335-exact-coffee-grind-sensitivity-20261101`, parent `0b74b9bceecb946fc0d266eb446b7e9e4ee8abe3`. Tests and CI pending; no deployment, hosted SQL/Auth/Edge/member data writes, or change to Locked decisions. Future empirical evaluation should compare recommendation acceptance, actual same-coffee dose/yield controlled interventions and undesirable taste movement; no synthetic PASS represents real-world quality.

## Independent external checks of two cited primary papers (November 1, 2026)

- Cameron et al., **Systematically Improving Espresso: Insights from Mathematical Modeling and Experiment**, *Matter* 2 (2020), DOI [10.1016/j.matt.2019.12.019](https://doi.org/10.1016/j.matt.2019.12.019): publisher page independently checked; experimental non-monotonic extraction versus grind under the tested conditions. This does **not** give one universal grind-step setting for unrelated beans.
- Smrke, Eiermann and Yeretzian, **The role of fines in espresso extraction dynamics**, *Scientific Reports* 14, 5612 (2024), DOI [10.1038/s41598-024-55831-x](https://doi.org/10.1038/s41598-024-55831-x): publisher article independently checked; fines fraction changes bed permeability and shot time, holding other factors within tested regime. Does **not** validate transfer of timing slope across different beans.

These two publication verifications **do not certify the rest of the nine report citations or broader numerical recommendations**. No empirical A/B outcome trial was conducted. Narrow code fix now safely nonforce merged at `9c585cc93a5bcd33f380822b25441ad6fb54f9a5` and source CI checks successful; queue READY, not published.
