# Agtron / PERC narrative extraction — engineering research and owner approval

**Date:** 2026-10-17 Denver / October 18 UTC. **Owner-requested implementation STAGED IN DEVELOPMENT; NOT PUBLISHED.**

## Why this was necessary

Owner added a PERC coffee via URL and reported three problems: the numerical `78.4 Agtron` was not used, `Mara Estate` was absent from Producer, and PERC's `Adv Natural` label was reduced to Natural despite the product description explicitly saying anaerobic natural fermented 96 hours in sealed tanks. The precise [Kenya Mara Estate product](https://perccoffee.com/products/kenya-mara-estate?variant=53093321998650) lists:

- Product Kenya Mara Estate; origin **Narok County, Kenya**; elevation **1800 MASL**; varieties **Batian, SL 28, Ruiru 11**.
- Display label **Adv Natural**, a roast color of **78.4 Agtron**, rest suggestion **8–10 days**, espresso recipe **16g dose, 40g yield, 26 seconds, 205°F**.
- Its selected product story explicitly names **Mara Estate**, characterizes the lot as an **anaerobic natural**, and describes **96-hour sealed anaerobic fermentation** followed by drying on raised beds. Those are stronger processing facts than the unexplained shorthand alone.
- The original source wording remains visible in supplemental `processing_detail`; the app's existing **single-select Process** may suggest **Anaerobic**. No new compound-process enum, data column or automatic official verification was created.

**Note on actual account record:** A read-only production query at this checkpoint found no catalog coffee, Pending submission, or source evidence for PERC/Mara Estate. This does not prove the owner did not add it: they may have used local/offline state, a different bag, or an unsynced operation. **Do not fabricate a server edit or silently backfill historical entries.** The new extractor helps new preview requests; old entries still require explicit member correction.

## Manufacturer-based classification, not marketing guesswork

[Agtron manufacturer's M-BASIC II roast-development chart (PDF)](https://www.agtroninc.com/wp-content/uploads/m-basic-operating-system.pdf) provides the following correlations **for ground coffee**. More positive scores indicate lighter roasting:

| Locked label | Gourmet nominal | Commercial nominal |
| --- | ---: | ---: |
| Ultra Light | 95 | 71.7 |
| Very Light | 85 | 64.3 |
| Light | 75 | 56.9 |
| Medium-Light | 65 | 49.4 |
| Medium | 55 | 42.0 |
| Medium-Dark | 45 | 34.6 |
| Dark | 35 | 27.1 |

The code selects the closest manufacturer anchor by numerical midpoint; it is not a newly defined universally recognized Agtron roast standard. For a **Gourmet ground** measurement: 90+ Ultra Light (below 100 underdeveloped anchor), 80–<90 Very Light, 70–<80 Light, 60–<70 Medium-Light, 50–<60 Medium, 40–<50 Medium-Dark, and 25–<40 Dark. Commercial midpoint bands use the manufacturer's separate commercial correlation rather than incorrectly reusing Gourmet cutoffs. At 100 Gourmet and 75.4 Commercial the manufacturer calls the roast **under-developed**, so values at or beyond those upper limits are not normalized into Ultra Light. Values below 25 Gourmet are outside our seven labels. Onyx explicitly labels some coffee **Ultra Light** even with an Agtron #133; that numeric score is preserved but **not blindly interpolated** beyond our table, and the explicit roaster label remains valid.

**PERC 78.4:** 78.4 is closer to the Gourmet Light anchor (75) than the Very Light anchor (85): **Light**, if and only if the score uses a *ground Gourmet* reference. The product itself says only "78.4 Agtron" and does not specify Gourmet versus Commercial or whole bean versus ground. The extractor therefore makes a **provisional Light suggestion** and shows a review note naming its assumption. A Whole Bean score is never normalized using the ground table. An explicit conflicting roaster roast label is preserved with a visible caution rather than silently replaced.

Agtron is objective within a specified analyzer, scale, preparation and calibration; it does not alone prove the total flavor profile, tasting quality, fermentation details or recommendation accuracy.

## Evidence-first producer and fermentation semantics

- Parse the **selected matched product** and product narrative bounded to The Deets / Story / About this Coffee, stopping at brew guidance/Agtron FAQ/related content. Ignore global navigation, menus, hidden scripts, other coffees, FAQ explanations and cross-page guesses.
- Suggest **Mara Estate** because the selected **Kenya Mara Estate** name AND its own story independently name that producer. A Farm/Estate suffix alone is a hint, not universal proof of production ownership; do not confuse retailers, importers and co-ops.
- Use **Anaerobic** only when PERC's specific narrative explicitly confirms **anaerobic natural** or anaerobic sealed-tank fermentation; retain **Adv Natural** and **96 hours** as display-only provenance. `Natural` without that language remains Natural; composite Washed & Natural remains withheld for member review, not guessed.
- Preserve original member-entered form fields; URL Autofill fills blank fields only and requires the later explicit **Add Coffee** click. `roaster_details` and `roast_hint` are preview details and are **not written into unsupported storage columns**.
- Both generic Netlify product extraction and the trusted official Supabase Edge parser share **identical** bounded Agtron implementation. If updating `dic-preview-coffee` at a future owner-approved publication, supply `dic-preview-coffee/agtron-roast.mjs` in addition to existing `index.ts`, `preview.mjs` and relative `dic-verify-coffee/evidence.mjs`; retain `verify_jwt=true`, roaster host checks and response-size protections.

## Test and rollout boundary

Development code:
- `src/server/agtron-roast.mjs`, `src/server/coffee-product-layouts.mjs`, `src/server/coffee-page-metadata.mjs`, `site/cloud/coffee-url-autofill.js`
- `supabase/functions/dic-preview-coffee/preview.mjs`, `supabase/functions/dic-preview-coffee/agtron-roast.mjs`
- `tests/coffee-agtron-narrative.test.mjs`, `tests/official-agtron-preview.test.mjs`

Tests include manufacturer anchors, differences between Gourmet and Commercial, exact 78.4, commercial underdevelopment, invalid `666`, explicit roast precedence, no category for whole-bean only, estate corroboration, full coffee-specific story, unrelated-product isolation, anaerobic specificity, preserved original PERC recipe and exact Edge copy parity. Other product/extractor security tests remain in the full CI.

**Deployment not authorized by this user request.** Never automatically run Netlify with `[dic-publish]`, update `main` published-source backup SHA, mutate a personal coffee or redeploy Supabase Edge. Await a *new* explicit owner approval for a coordinated release after all current CI checks pass. The public PERC webpage was reviewed as external source evidence; fixtures exercise representative HTML and tests do not prove a new live authenticated user flow until a later acceptance check.

Sources: [PERC Kenya Mara Estate](https://perccoffee.com/products/kenya-mara-estate), [Agtron manufacturer documentation](https://www.agtroninc.com/wp-content/uploads/m-basic-operating-system.pdf), [Agtron analyzer operation guide](https://www.agtroninc.com/analyzers/mbasiciii/).
