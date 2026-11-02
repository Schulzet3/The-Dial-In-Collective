# Recommendation Engine — nine recovered research reports vs current source

**Review checkpoint:** November 1/2, 2026 UTC. Engine `site/lib/engine.js` from pinned pre-change `40f0bc3272cd9e99fd2f9d4372ffa5943eace083`, updated and merged in [PR347](https://github.com/Schulzet3/The-Dial-In-Collective/pull/347) at `68a77bfa12682fd6150e2b1014c9edb3a451f96c`. This is a **scoped recommendation-behavior and research-consistency review**, not a certification that each of the nine supplied reports' external references is correct or that every eligible application source file was re-reviewed. See [original report hashes, titles, and links](originals/README.md), [initial research intake](espresso-originals-review-20261101.md), [Master Specification](../MASTER_SPECIFICATION.md) and [Decision Ledger](../DECISION_LEDGER.json).

## Report-by-report relevance

| Original report | Source narrative relevant to the engine | Existing engine / decision boundary | Disposition |
| --- | --- | --- | --- |
| **01 — Sensory Diagnosis** | Sour/bitter, body, sweetness and clarity are downstream results of concentration, extraction and evenness; mixed faults are ambiguous | `nextAdviceRaw` keeps five taste scales and diagnostic/no-op evenness feedback rather than fabricating a numeric change | **Preserve** Issue335 diagnostic correction; no new sensory threshold |
| **02 — Physics, Chemistry, Equipment, Community** | Dynamic porous-bed flow, fines, mixing and setup context make broad time and sensory thresholds conditional | Source-aware personal/community prior and style-specific baselines remain cautiously labeled | **Preserve**, not universalized |
| **03 — Coffee Characteristics** | Different roast/process/bean material can change permeability and grind response | Previously corrected `learnSensitivity` only learns controlled pairs for exact coffee/version/calibration/basket/feed/style | **Preserve** prior READY fix |
| **04 — Machine–Basket Interactions** | Machine/basket geometry and pressure/flow regime affect extraction; an old reading may not transfer to a changed setup | `chooseRecipeFamily` ranks matching setup/basket/feed/calibration, and other-setup time is not called proven | **Preserve** context checks; direct grinder dial transfer was a gap |
| **05 — Nine Profile Families** | Describes multiple brew-control archetypes, not evidence that a user must select all nine | Owner-Locked five selectable current styles: Traditional, Turbo, Fast-Flow, Ristretto, Lungo. Custom historical only; distinct successful ratio families retained internally | **Do not add** unapproved profiles or copy Turbo time/grind |
| **06 — Extraction Causal Foundations** | Shot time is a response to interacting flows/bed resistance; finer setting may not monotonically improve extraction | `nextAdviceRaw` uses conservative single-variable adjustments; time-based slope requires controlled exact-coffee pairs | **Preserve** bounded adjustments, do not make seconds pass/fail |
| **07 — Sensory Outcomes** | Multiple valid extraction paths and non-monotonic grind-response undermine universal flavor shortcuts | `chooseRecipeFamily` preserves distinct all-green success families; preference tie-breaker remains low confidence | **Preserve** owner preference and all-green semantics |
| **08 — Dosing and Puck-Prep Claim Audit** | Dose, tamp and distribution effects have conditional causal support and deserve conservative diagnostics | Evenness/clarity/dryness diagnostic should not invent measured changes; basket dose stays distinct from actual dose | **Preserve**, no automatic dose policy |
| **09 — Grinder and Burr Interactions** | Burr geometry, fines, particle-size distribution and dial settings are not portable physical equivalents | `grindGuidance` now avoids blindly carrying an old raw dial across setup-version range changes | **Fix** PR347: valid relative-range estimate marked unproven; never claim measured burr-spacing equivalence |

## Implemented narrow change

Before PR347, `grindGuidance` found successful same-coffee/style/feed shots from another setup version with matching nominal grinder and burrs, then returned the **raw median grind dial** even if older and current espresso calibration ranges differed. A historical 3 on 0–5 was thereby presented as 3 on 10–60. PR347 now translates a history sample only when old min/max and current min/max are finite and valid, then uses a median of converted relative positions; the example becomes an explicitly **unproven** starting estimate of 40 on 10–60. Null/missing/inverted bounds are excluded. This is an arithmetic mapping of relative index within the member-entered range, **not** a physical statement that burr gap or PSD matches between calibrations. Original shots are untouched; exact current-calibration proven success takes precedence.

Five source-bound regressions cover differing ranges, identical ranges, incomplete snapshots, proven precedence and unmatched equipment. Merged CI 41368639725: 2,191 Node tests, 2,185 pass, 0 fail, 6 intentionally skipped; lint/build success. Source-specific PR approval, security, SQL, cloud and visual checks also passed. Original frozen603 workflow skipped and does not represent universal extractor coverage.

## Independent external checks versus supplied report narratives

- Cameron et al. (2020), [Matter DOI 10.1016/j.matt.2019.12.019](https://doi.org/10.1016/j.matt.2019.12.019): publisher landing-page abstract supports that observed espresso extraction efficiency can be non-monotonic across grind settings under studied conditions.
- Smrke, Eiermann and Yeretzian (2024), [Scientific Reports DOI 10.1038/s41598-024-55831-x](https://doi.org/10.1038/s41598-024-55831-x): publisher text supports that fines affect permeability and flow/time within its experimental conditions.

**Not verified:** the remaining citation markers in the nine owner-supplied reports, whether the relative dial mapping improves actual cup quality, and general effectiveness across all grinders/beans. The earlier [Implementation Pack](espresso-originals-review-20261101.md) and S019 extraction windows remain **secondary complementary research**; the slow-feeding PDF is distinct. No universal numeric roast-specific target, new style or mandatory data field was installed.

## Prioritization for later evidence work — not approved behavioral changes

1. **Measurement-quality evidence:** controlled same-coffee, same-setup paired observations spanning calibration and feed conditions, collected only through existing consented member flows; don't manipulate production or historic member records.
2. **Empirical acceptance:** compare next-shot recommendation adoption and subsequent rated outcomes in an explicitly authorized pilot, stratified by style/setup, with source/context quality and negative outcomes recorded.
3. **Scientific citation audit:** independently resolve each actionable original source claim to publisher text before proposing new numeric thresholds. Distinguish exploratory recommendations from approved Locked policy.
4. **Caution with false precision:** validate the usefulness of range-relative translation against actual grinder hardware; until then retain `proven:false` and starting-estimate language.

**Release state:** Only the narrow verified PR347 correction is READY; empirical performance and new scientific policy remain OPEN. No application production deployment under this instruction.
