# Community Outlier Validation — Research and Implementation Decision (2026-10-18)

## Owner request and scope

Owner asked where the existing **4× relevant median espresso time** cutoff came from, instructed web research and amendment if needed, requested an in-app confirm/correct prompt and completion of the Community feature. This document records source-grounded conclusions, intentionally conservative implementation choices and remaining acceptance limits. **No earlier Locked decision was silently superseded.**

## Original threshold provenance

The `time_s > median_time * 4` / `time_s < median_time / 4` rule, alongside ratio `>3×` / `<1/3×`, was introduced as a **local engineering heuristic** during the October 18 development tranche. It was **not** sourced from a peer-reviewed espresso extraction study, Scott Rao, Lance Hedrick, James Hoffmann, Barista Hustle or NIST. It is not defensible as a coffee quality verdict. Equating unusual duration with an invalid Dialed-In shot directly contradicts the product's Locked Master Specification §§16, 22–24.

## Independent sources and their limits

1. [NIST Engineering Statistics Handbook, §1.3.5.17: Detection of Outliers](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm) distinguishes **labeling** a suspicious point from **identifying** data error and deleting the point. It explains median/MAD modified Z scores, cites Iglewicz/Hoaglin's conventional **|modified Z| >3.5** *potential-outlier flag*, notes misleading conventional Z scores at small N and cautions about assumed distributions and masking. This is **general statistical methodology**, not an espresso-validated threshold.
2. [NIST: Median Absolute Deviation](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/mad.htm) gives scaled MAD = MAD/0.6745 (~1.4826×MAD), a robust scale estimator. This supports use of the median/MAD rather than unqualified multiplicative cutoffs when a sufficiently coherent comparison group exists.
3. [Scott Rao, My Two-Week Espresso Education on the Road (2023)](https://www.scottrao.com/blog/2023/7/24/my-two-week-espresso-education-on-the-road) describes a blooming espresso technique incorporating a 30-second bloom pause and subsequent pressure phases, producing legitimate quality espresso beyond ordinary recipes. A 60+ second *total duration* is therefore not automatically erroneous.
4. [Barista Hustle, ACM 4.07 — Ineffective Voids](https://www.baristahustle.com/lesson/acm-4-07-ineffective-voids/) examines extraction as espresso times vary from approximately 15 to 60 seconds. This further contradicts an inflexible typical-window test as the definition of shot correctness.
5. [Scott Rao, Delicious Filter Coffee From an Espresso Machine (2021)](https://www.scottrao.com/blog/2021/9/28/decent-coffee-shots) documents a blooming-espresso pause and related extended profiles. It is anecdotal technique evidence, not a universal statistical outlier calibration.

**Bottom line:** Research supports **context-dependent potential-error review** and **accepting user-confirmed legitimate unconventional shots**. It does NOT supply a validated universal numeric espresso rejection cutoff, nor does NIST prove an espresso-time MAD score follows a normal model. Style, setup, recipe family, preinfusion and profile differences affect the distribution.

## New development implementation (not a product-locked time range)

Forward-only GitHub staged migration: `supabase/migrations/20261018061030_dic_contextual_quality_community_ui.sql`, updating `private.dic_review_community_shot(uuid)`. This revises *review eligibility only*, not the meaning of Dialed In.

- Compare prior all-green shots from **same owner, exact coffee, setup version and style**, requiring **five prior samples**; if insufficient, compare **five distinct eligible contributors** on the **exact verified coffee and shot style**. No cross-style or cross-release time pooling.
- Compute reference median and MAD independently for time and brew ratio. Set `robust_scale = max(1.4826 × MAD, 5 seconds)` for time and `max(1.4826 × MAD, 0.25)` for ratio to avoid zero-MAD infinite alerts.
- Only **temporarily flag** an observation when both `absolute difference / robust_scale > 3.5` and a practical deviation floor is passed: for time **> max(10 seconds, 40% of median)**, or for ratio **> max(0.5, 35% of median)**.
- **Five**, **5 s**, **10 s**, **40%**, **0.25**, **0.5**, and **35%** are chosen **conservative product heuristics**, **not scientifically or experimentally validated espresso thresholds**. They should be tuned on real consented data and monitored for false positives, never given the authority of a Locked recipe window.
- Sparse or mixed data cannot justify a strong statistical verdict. Existing column/field plausibility and all-green/verified exact-coffee/source-version gates remain authoritative. Do not invent comparison data.
- If a shot is flagged, user may choose **“Yes, It’s Correct”**, **“Correct Shot”**, or **“Later”**; confirmation is bound to owner, source revision and observation fingerprint. Flagging is not rejection, does not alter Dialed In, and does not rewrite personal history.
- Example: **62 s** against five comparable **25 s** shots is held for confirmation (zero-MAD floors make this meaningful, not a dogmatic 62-second ban); **62 s** among other 60 s recipes is not flagged. A 62-second shot with insufficient comparable data is not presumed invalid. Observations with schema-impossible time/dose/yield remain invalid independent of comparison.

## Related UI and privacy boundaries

New `public.dic_my_community_outliers()` returns only the admitted owner's outstanding, revision-bound held shots; the prompt is nonblocking and invisible in normal workflows. Member-only `public.dic_browse_community_shots(limit,offset)` returns eligible verified coffee observations with **no accounts, private notes, shot UUIDs, private contributor IDs or user-entered equipment names**. It exposes shot count and distinct contributor count separately and uses progressive confidence labels, with no claim of scientific accuracy. `site/cloud/community.js` renders these exact limited DTOs.

**Delivery boundary:** All changes are development-only until a new migration and app release are explicitly approved and tested. Existing production validator currently retains its earlier 4× cutoff until that authorized rollout; Community browsing and prompt remain unpublished until then. No unrelated membership, personal shot, backup or billing changes are authorized.

## Original product safeguards preserved

[Master Specification §16](MASTER_SPECIFICATION.md): all required sensory markers green = Dialed In; style windows never veto an all-green plausible shot.

[Master Specification §§22–24](MASTER_SPECIFICATION.md): verified canonical coffee gating, durable anonymous Community data, source correction, independent contributors, automatic validation, and owner confirmation of legitimate unconventional extraction.

[Master Specification §25](MASTER_SPECIFICATION.md): strongest personal exact setup/style evidence outranks community; grind/time copied from unrelated styles would be misleading. Community browsing does not by itself complete #10 recipe families or #12 contributor-weighted recommendation hierarchy. Those remain separate dependencies and must not be called finished without new tests.

## Verification ledger

Development SQL integration fixtures test extreme 62-second time against prior same-owner shots and peer groups, user confirmation, role permissions, correction, verified canonical coffee, Pending exclusion, deletion/hide behavior and distinct contributor counts. Site tests check zero-leak Community DTOs, prompt actions and mobile UI. Record **actual** Actions run IDs, outcomes and limitations in [issue #9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9), [issue #11](https://github.com/Schulzet3/The-Dial-In-Collective/issues/11) and [CURRENT_STATUS](CURRENT_STATUS.md), never claim hosted test success from isolated fixture results.

**No scientific source establishes that 3.5 modified Z is optimal for this app's espresso measurements; a genuine field-data evaluation remains necessary.**
