# #455 R340 — independent row-level reanalysis of the original Gagné 11-shot grinder comparison
**Review date:** November 18, 2026 UTC. **Scope:** research/evidence only; no DIC product-policy or runtime modification.

## Provenance and exact-version boundaries
- Original author article: [Gagné, *A Comparison between Standard and Low-Fines Espresso Shots*, May 10, 2021](https://coffeeadastra.com/2021/05/10/a-comparison-between-standard-and-low-fines-espresso-shots/); original article links its [public 11-shot Google Sheet](https://docs.google.com/spreadsheets/d/1r33CI6lczJhuYcNjy8z3jABagZoxO8Z0kkd6h5Ppos0/edit?usp=sharing) (visible table rows 2–12; dataset title *Public- EG1 vs Niche Decent Blooming Experiment March 2 2021*).
- Previously archived original DIC report: `docs/research/originals/09_The_Causal_Foundation_of_Espresso_Extraction_Grinder_and_Burr_Interactions.md` Git blob `1e1b8bbef0ecb05ed0b20195191bcad26663cf0d`, especially its direct article discussion around report lines 137–139, 370–371.
- Source register identity: existing `LIT-2021-GAGNE-ULF-NICHE-ESPRESSO` (prior R315 full author-article review); no new study identity or independent replication created. Current preflight development `facbc8178a46b4c257557a48f08005d5f760010a`, immutable preflight Git blob `2fb236bbfa6bac48513eeb3bd157b260853af06d`; current live engine `90c55379be60a252a2026e01bb3d786b66c49aef`, constants `d3559dc1c9560c4d68fbcad1dc91e3a792a100a2`.
- Access **verified**: directly read all **11 publicly rendered original author Sheet rows** via the source article's own sheet link, not a secondary paraphrase. **Not** verified: downloadable spreadsheet/export bytes SHA-256, complete version history, raw linked DE1 shot-files ZIP, original pressure/time traces, independent calibration, original PDF/author raw sensory data. The live Sheet is mutable and has no frozen Git blob; results below are valid for the publicly rendered rows read this run, not proof of immutability.

## Independently replicated arithmetic, not experimental efficacy
For each row, computed extraction yield percentage `EY = output weight (g) × TDS (%) / dose (g)`; TDS-f denotes author's filtered sample. No missing dose/TDS values were invented. Input columns are the author's visible rounded values; display three decimals for reproducible arithmetic, not measured accuracy.

| Shot | Grinder | Output g | Dose g | Raw TDS % | Filtered TDS % | Recomputed raw EY % | Recomputed filtered EY % |
|---:|---|---:|---:|---:|---:|---:|---:|
| 11 | EG1 | 74.5 | 18.2 | 6.47 | 5.69 | 26.484 | 23.291 |
| 10 | Niche | 74.8 | 18.3 | 6.02 | 5.50 | 24.606 | 22.481 |
| 9 | EG1 | 75.1 | 18.1 | 6.54 | 5.92 | 27.136 | 24.563 |
| 8 | Niche | 75.0 | 18.1 | 6.01 | 5.46 | 24.903 | 22.624 |
| 7 | EG1 | 74.9 | 18.2 | 6.46 | 5.83 | 26.585 | 23.993 |
| 6 | Niche | 75.1 | 18.2 | 6.09 | 5.60 | 25.130 | 23.108 |
| 5 | EG1 | 75.2 | 18.0 | 6.67 | 5.96 | 27.866 | 24.900 |
| 4 | Niche | 75.5 | 18.2 | 5.99 | 5.59 | 24.849 | 23.189 |
| 3 | EG1 | 74.6 | 18.1 | 6.49 | 5.90 | 26.749 | 24.317 |
| 2 | Niche | 74.5 | 18.1 | 5.94 | 5.40 | 24.449 | 22.227 |
| 1 | EG1 | 74.8 | 18.2 | 6.38 | 5.69 | 26.221 | 23.385 |

| Recomputed cohort statistic | EG-1 / SSP ULF (n=6) | Niche Zero (n=5) | Difference, EG-1 minus Niche |
|---|---:|---:|---:|
| Raw EY sample mean | 26.840% | 24.787% | 2.053 percentage points |
| Filtered EY sample mean | 24.075% | 22.726% | 1.349 percentage points |
| Raw EY within-group sample SD | 0.587 pp | 0.265 pp | — |
| Filtered EY within-group sample SD | 0.644 pp | 0.412 pp | — |
| Raw EY descriptive standard error of group mean | 0.240 pp | 0.119 pp | — |
| Filtered EY descriptive standard error of group mean | 0.263 pp | 0.184 pp | — |

The author reported raw averages 26.8 ±0.2% versus 24.8 ±0.1%, difference 2.1 ±0.3 pp, and filtered averages 24.1 ±0.3% versus 22.7 ±0.2%, difference 1.3 ±0.3 pp. Visible-row arithmetic agrees **at displayed rounding** (raw difference 2.053 pp; filtered 1.349 pp). Our SDs and descriptive SEMs are **calculated solely from eleven displayed individual shots**, not a replication of the author's full measurement-uncertainty propagation, an independent confidence interval, a randomized p-value, or cross-population effect. No participant-level tasting outcomes were assessed.

## Specific original-record and scientific limitations
1. The author used ONE washed Colombian coffee, alternated six EG-1/SSP ULF shots with five Niche shots, DE1+ blooming profile, ~30 s bloom, 1:4 mass ratio and controlled nominal 2 mL/s shower-head flow. The grinder, burr, grind setting, puck setup and possible temperature trajectories are bundled conditions; there is no independent PSD measurement or multigrinder/multicoffee factorial assignment.
2. The article says Niche stayed at a factory-zeroed grind size **10.0** during all counted shots (article description around its dial-in). Yet the **Niche shot #2 source log comment explicitly says “9.5”**. Without the corresponding original DE1 files or independent contemporaneous evidence, whether this was a note error or a setting difference is **UNRESOLVED**. Do not silently replace either version or claim all observations are definitely one fixed Niche setting.
3. The visible Sheet has a `NaN` drip entry for EG-1 shot #5 although its comment estimates drip 4.2; an older Niche #2 comment says “bevw746.5 (probably 74.5 but check in shot data)” while the structured Output weight cell is **74.5 g**. Reanalysis uses the structured 74.5 entry and explicitly records the unresolved note; no unseen DE1 readback asserted.
4. The author disclosed altering filtered TDS prism sample size after the sixth measurement, and used variable ±0.01/±0.03 TDS measurement estimates; temperature stability and within-run dependence matter. Descriptive shot variance is not systematic uncertainty or robust efficacy proof.
5. The article states burr fines PSDs were **not measured**; viscosity/pressure mechanisms and possible optimized shorter ratios/temperature adjustments are hypotheses. This is extraction-yield measurement, not blinded five-dimensional human sensory preference, causal next-shot improvement or universal grind correction. The source archive's explanatory language must retain that distinction.

## Live application crosswalk, authority, disposition
At the immutable cited development source, `site/lib/engine.js` uses measured dose/yield/time, grinder calibration/range and coffee/setup/style/feed/basket provenance to offer qualified references and single-control changes. `site/lib/constants.js` retains all five taste inputs and independent Turbo/Fast-Flow styles. This author experiment cannot justify adding a universal burr-class offset, extraction target, temperature target or any new taste heuristic. **Existing Locked behavior unchanged.** Existing proposal `R455-PROP-315-ULF-NICHE-EFFICACY-SCOPE` absorbs these three new bounded source-claim checks, **not** a duplicate proposal. No new member data, telemetry, Auth/RLS/SQL/Edge, product experiments, release, deployment or production writes; no #267 literal-review line credit.

**Verification:** locally recomputed the original author's 11 rendered Sheet row calculations using ordinary JS arithmetic; dataset row identity and inputs visible in author-linked sheet, means crosschecked against first-party article. These are **research-only static checks**: no DIC Node22, browser, SQL or hosted CI claimed PASS. Further independent verification requires original DE1 ZIP and optionally a frozen exported Sheet, but neither is required to preserve the truthful limited inference here. S019 and the 29 October implementation ZIP were searched in connected Drive/Project Library this run and not re-accessed. Continue distinct source-backed research or narrow SAFE UX defect after exact docs PR/merge governance verification.
