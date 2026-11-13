# Issue #455 — R224 inherited #335 effectiveness evidence gate and research-only evaluation protocol

**2026-11-13 UTC · DEVELOPMENT RESEARCH / DESIGN ONLY · NO PRODUCT OR PROVIDER CHANGE**

DIC_PREFLIGHT_VERIFIED development_sha=3c191ac3ab85ac3505881a505302bb77ca2081bb preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Mandate and exact source boundary

Owner's #335-to-#455 transfer: [Issue #455 comment 6842646972](https://github.com/Schulzet3/The-Dial-In-Collective/issues/455#issuecomment-6842646972). Original nine Markdown reports are archived under `docs/research/originals/`; the October 29 48-case implementation pack is RESEARCH-ONLY and not an efficacy test. Reuse #335's four already-accepted safeguards and two primary publisher checks; no rerun or scientific certification implied. Current live development source SHA above; main `5e80f87e33ef331ee8c0a8fedfd1bd848eabc0f1`, release `2c02dbb267ca8fb1e56ddd0433c96c1bb4eca9d5`.

Direct source inspection at that SHA (Git blobs):
- `site/lib/engine.js` `3e20904291231a9c5a5a86e6d004a95a5489c6d6`: `recommendation`, `nextAdvice`, `saveShot`, `editShot`. `saveShot` preserves measured shot, all taste scales and calculated `suggestion`, but no durable parent-shot-to-advice-acceptance-to-next-shot outcome link.
- `site/lib/constants.js` `d3559dc1c9560c4d68fbcad1dc91e3a792a100a2`: five separate 1–5 sensory dimensions; ideals are 3 extraction, 3 body, 5 clarity, 5 sweetness, 1 astringency. No invented summed outcome threshold.
- `site/cloud/main.js` `6187c7287b7a40eacc9fc5b08b1b2048236fc18d` and `site/cloud/recommendation-use.js` `b35311db03a0f431c05623bca584a79e041d4c6b`: explicit **Use Recommendation** records attribution for a starting grind/temperature copied to Log Shot only while its measured value remains unchanged. It does NOT prove a displayed *post-rating Next Shot* suggestion was read, chosen or performed.
- `site/cloud/mapping.js` `a02aee80e2e6447aa855982b500318932a1e8b40`: `shotPayload` already persists the five tastes, measured dose/yield/time/grind, optional temperature/feed, notes and optional `recommendation_context`, but no consented study event or causal pair identifier.
- `site/lib/ui.js` `2ecde13b9d45ec329700654e1f054629d38bc95f` preserves uncertainty text and makes all five choices explicit; a generated recommendation is still not a verified observed change.

These are **source observations**, not production provider readback, member-data inspection, user behavior, device QA or observed cup improvements. Source code alone cannot establish that an exposure occurred, that the next shot followed it, or that the measured results were better. Post-save `suggestion` and hydrated advice may be derived/recomputed; do not infer historical display or adoption from present advice.

## Question and proposed analysis unit

**Question:** For an explicitly consenting member using an unchanged same-coffee/setup/grinder calibration/basket/style/feed context, when one feasible *Next Shot* recommendation is actually selected and that member records the immediately subsequent real shot, do their complete five sensory scores change in a desirable direction compared with the immediately preceding valid real shot? This is a possible **future** evaluation design, not an approved experiment.

**Candidate pair identification, if separately authorized:** immutable preceding shot ID, next-shot ID, recommendation version/identity and displayed exact one-control proposal, explicit opt-in and adoption/decline status, actual measured one-control delta and time ordering. Match *member, coffee identity, roast batch where known, setup version, grinder calibration and recorded original espresso range, basket, shot style (Traditional/Turbo/Fast-Flow/Ristretto/Lungo independently), feed mode*, and distinguish recipe family. Fixed dose/yield/time are not silently assumed: log their actual values, classify direct adjustments versus hydraulic mediation (grind changes naturally move time), and flag accidental simultaneous manipulations or absent equipment readings. Never turn a change in dependent shot time into a second deliberate control. No cross-style, new-roast, recalibration or different-coffee pooling.

## Outcomes, missingness and safety

- **Primary descriptive endpoint candidate:** the ordered vector of changes in all five recorded ratings, plus transition to/from **five actually present exact ideal values**. Preserve direction and scale semantics (astringency reverses). A blank/unrated value is **missing**, not green, not zero and not an improvement. Do not create a single score or statistical cutoff without explicit approval and pre-registration.
- **Adverse effects:** any worsening on a taste dimension, fall from complete five-ideal status, abandoned/declined suggestion, out-of-range measured controls, changed family, and reported inability to follow advice. Record unfavorable and neutral outcomes, not only success stories. Original measurements and notes remain private and unmodified.
- **Bias / confounding:** member expectation and voluntary adoption, roast age/batch, puck prep, water, equipment temperature/pressure, dose, ratio, order/practice effects, taste-rating drift, recipe family choice, ambiguous recommendations, missing follow-up and selectively logged successes. A one-shot pre/post pair is *not* evidence of causal efficacy; a better comparison would use pre-registered repeated within-member observations and, only under separate consent/approval, a defensible comparator. Do not imply randomization, blinding, power or confidence intervals without actual design/data.
- **Evidentiary minimum:** report counts for recommendation shown, eligible pairs, adopted, declined, missing/out-of-context, unchanged/worsened/improved full five-vector, and adverse outcomes with denominators. Small samples, censored/missing follow-ups and user selection must remain explicitly visible. Never call synthetic fixture pass/fail or the pack's 48/48 tests real espresso effectiveness.

## Privacy gate, alternatives and owner decision boundaries

**NOT AUTHORIZED:** retrospective member-table reads, individualized telemetry, new production fields/events, opt-in UX, experimentation, automatic intervention, provider writes, export of private notes/taste data or new numerical policy. Existing RLS/private histories and member/offline integrity remain intact.

Only after a **separate owner approval** could a next step be designed. Two deliberately deferred choices:
- **A. On-device voluntary comparison:** consenting member manually views a before/after comparison using their own already-accessible local data; no research collection or off-device sharing. Lower privacy exposure, but less robust and still observational. Any new UI requires approval.
- **B. Opt-in longitudinal research:** narrowly scoped purpose, explicit revocable consent, participant-controlled participation, consent separation from Community, minimal de-identified/aggregated export, per-member isolation/RLS, withdrawal/deletion plan, retention and security review before collection. Requires explicit owner approval plus independent #96/privacy review and real observed evidence before any efficacy claim.

No new decision is needed now to keep this as an unimplemented research protocol. If/when the owner authorizes a pilot, pre-register specific endpoints, eligibility, meaningful difference, comparison/analysis, sample/stop bounds, adverse-event handling and release/security gates before coding or member data.

## Traceability / disposition

| Record | Current approved behavior | Current gap | Severity/benefit | Status |
| --- | --- | --- | --- | --- |
| R455-R224-01 — post-rating exposure vs starting reference | One controllable suggestion; five independent taste ratings; display of evidence limitations | Existing explicit `Use Recommendation` attribution concerns a starting grind/temp, not verifiable exposure/adoption of the post-rating advice | High for **truthfulness of future efficacy claims**, no demonstrated current app bug | RESEARCH-ONLY / HOLD new instrumentation |
| R455-R224-02 — same-context paired taste outcome | Private measured history, original grinder calibration/style/feed and alternative successful families | No observed consented recommendation-to-followup matched outcome cohort; no basis for measured improvement | High for validating future learning, no current cup outcome measured | RESEARCH-ONLY / OWNER DECISION REQUIRED before any study |
| ORG-01 report (Git blob `4a52b0f938d533ff8c0d69fc09951bf51abc8d69`) | Existing Locked evidence-guided heuristics | Its informal `3/H` / `2/M` causal-confidence notation is an *author-assigned judgment*, not validated personalized DIC outcome probability | Guard against overclaiming | ARCHIVAL SOURCE READ; citations individually pending |

**Scope/coverage:** one bounded inherited #335 effectiveness-method work item and direct code/archival crosswalk; zero additional primary paper validations, zero new canonical source identities, and no #267 V2 literal line credit. Preserve the prior 123 source / 353 checks / 182 proposals ledger totals unchanged; this method proposal is tracked **here** and in Issue #455 pending optional canonical ledger reconciliation, not counted twice. The original standalone S019 roast/style PDF remains inaccessible; a distinct slow-feeding PDF was found in Library but is not S019. Targeted connected Google Drive searches for S019, espresso research and slow feeding returned no documents; Library result is metadata discovery, not a new reviewed file. No new external source claim promoted.

**Tests:** NOT_APPLICABLE to runtime because this is documentation and an observational design only. Exact-source PR docs-governance CI is to be checked separately after opening. Any SKIPPED/unrun run is NOT PASS. No production/Netlify/SQL/Auth/Edge/member/provider write, release/branch movement, change in Locked behavior, spending, forced Git or public/private visibility change.

**Next bounded #455 action:** resume discrete original-report external claim verification on a citation not covered by R221–R223, with original quote, primary source methods/result limitations, live logic crosswalk, evidence grade, and source/hash in canonical ledger. If a real safe UX defect emerges, write code/tests only with new SAME-COMMIT preflight journal attestation and exact-source CI. Keep #455 OPEN.
