# 2026-10-18 — Multi-roaster URL Autofill: tasting notes and source-accuracy verification

**Status:** Extractor implementation and real-public-URL source acceptance PASS in development. **Not published** to Netlify; fresh explicit owner release approval required. This is the continuity/handoff record for [issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33). It does not supersede or edit any Locked decision. GitHub `development/backend-foundation` remains source of truth, `main` is reserved for backups.

## Exact owner request and invariants

After reviewing `AGENTS.md`, current GitHub status, Master Specification, Decision Ledger, historical universal URL, Queen City, PERC and Agtron handoffs, the owner asked us to fix missing **Tasting Notes** and comprehensively check autofill for SEY, PERC, Queen City, Sweet Bloom and other actual roaster webpages.

Honor existing Locked and implemented behavior: URL -> one click **Autofill From URL** -> populate **only blank supported fields** -> member reviews/edits -> **Add Coffee**. A preview does **not** verify canonical source identity, create a duplicate, save a coffee, overwrite typed values or promote a Pending submission. Verified canonical identity remains separate. Other verified data can only come from an exactly matched release. Unknown facts remain blank. User-authenticated preview quota is 12/day with 30s shared cooldown; do not weaken security, source redirects, connection-time DNS, 900 KB HTML cap, or cost controls. AI is not charged for deterministic URL extraction.

## What broke and what changed

1. **Onyx flavor chips:** A selected coffee's `<p class="tasting-notes"><span class="note">…` sequence was previously ignored. The product heading embeds extensive audio markup and exceeded the old product-title crop. Both are handled in bounded, selected-product HTML.
2. **Sweet Bloom flavor tagline:** Flavor descriptors in `<em class="product__ingredients">…` were lost. Worse, `<main-product-selector>` was incorrectly treated as a `<main>` HTML tag in a second parsing pass and removed the selected product's heading. Correctly distinguish HTML main from similarly named custom elements. A neighboring producer metric incorrectly assigned **since 2026** as Producer; reject that relationship-year value. Genuine `850 small scale producers` / `850 Small Holder Farmers` remains.
3. **PERC narrative:** Product-specific `THE DEETS!` stories disclose `notes of …` and explicit farm-grown producer names. Parse within the bounded selected-lot story, stop before brew and related content; do not treat coffee-fermentation duration as espresso time. Confirmed named growers Franky Hoyos and Jhon Rodriguez where their own lot narratives credit them.
4. **Heart:** Selected product's `ProductMeta__Text` provides a short tasting tagline, distinct from its processing/location descriptions.
5. **Black & White:** Product's named `TAKE A SIP` comparisons provide explicit flavor nouns, not an arbitrary adjective list.
6. **Onyx elevation:** Selected lot's named `a-stat-desc[data-stat-id=elevation]`, with matching Elevation heading and numeric value, provides **2150 MASL**. Generic altitude education remains excluded.
7. **Explicit labels:** Add conservative `Tastes Like`, `Flavor Profile`, `Cupping Notes` aliases while preserving existing Tasting Notes/Reminds Us Of. Only populate text when directly corroborated by that product. Escape markup and reject malformed/numeric/nonflavor lists.

Implementation: `src/server/coffee-flavor-evidence.mjs` (new), `src/server/coffee-product-scope.mjs`, `src/server/coffee-product-layouts.mjs`, `src/server/coffee-page-metadata.mjs`, `tests/coffee-flavor-evidence.test.mjs` (new), `scripts/audit/coffee-roaster-live-probe.mjs`. No production database SQL, historical coffee record, member shot, Supabase edge function, or published website changed in this effort.

## Exact real-product source matrix (2026-10-18)

Run [24-URL real HTTPS probe 39104806647 — PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39104806647), source [`scripts/audit/coffee-roaster-live-probe.mjs`](../scripts/audit/coffee-roaster-live-probe.mjs) lists each exact URL. All checked with the production preview's bounded, DNS-pinned, HTTPS fetch path in **unprivileged GitHub Actions** (no user token, lookup quota or production writes). **19 of 24 entries parsed; 1 expected homepage rejection, 1 size refusal, 3 currently unavailable.** The two Queen City Washed URLs are one coffee via product/variant URL; the two Onyx Mullugeta URLs show DIFFERENT actual archived releases (different notes/Agtron) and must not be silently conflated.

| Product | Tasting notes (exact roaster wording where present) | Other verified fields / behavior |
| --- | --- | --- |
| Proud Mary — Ovidio Gomez | Blackcurrant, winey, & tropical | Natural, producer Ovidio Gomez, Catuai; Espresso ratio 1:2.5 but **not** fabricated dose/time |
| Queen City — Banko Gotiti Washed, variant URL | Peach Brulee & Cantaloupe | Banko Gotiti CWS, Gedeb/Yirgacheffe Ethiopia, Washed, heirloom, 2170 masl; source-specific fermentation/drying; no roast/harvest/espresso invented |
| Queen City — same Washed coffee, canonical URL | Same as variant, byte-for-byte factual equivalence | Product identity and 8 core factual values agree; no duplicate source record implied |
| Onyx — Mullugeta Muntasha 2026 | Strawberry, Honeysuckle, Pink Lemonade, Peach | Ultra Light expressly marked, Ethiopia, Natural, Landrace, **2150 MASL**, Agtron #133 retained as source number, filter/espresso note |
| Onyx — archived Mullugeta release | Strawberry, Jasmine, Pink Lemonade, Honey | Separate archive's product-specific details, Agtron 102, November '23 and different production roaster; **no roast tier invented** |
| PERC — Franky Hoyos | orange cake, marmalade, and bubblegum vibes | Named producer **Franky Hoyos**, Pitalito, Orange Bourbon, Washed/Adv Washed Co-ferment, 1650 MASL; Agtron 74.7 -> provisional Light; published espresso 16g/40g/25s, 205°F |
| PERC — Kenya Mara Estate | strawberry, guava, honeydew, and sweet cream | Mara Estate, Narok, Batian/SL28/Ruiru11, 1800 MASL, Adv Natural with corroborated anaerobic sealed-tank 96-hour fermentation -> Anaerobic, provisional Light via Agtron 78.4, 16g/40g/26s, 205°F |
| PERC — archived Nestor Lasso Ombligon | Watermelon Jolly Rancher, peach, and white sugar | Archived lot, Natural, Ombligon, Bruselas, 1850 MASL; absence of official time/roast respected |
| PERC — Outpost Coffee | milk chocolate, cherry syrup, graham cracker, and marshmallow | Named grower **Jhon Rodriguez**, San Adolfo, Caturra, Washed/Adv Washed, 1700 MASL, Agtron 75.8 -> provisional Light, espresso 16g/36g/27s, 205°F |
| SEY — Chorso Bule | ripe peach, melon, and honeysuckle | Washed, Ethiopian Landrace, Gedeb, 2450+ masl, published January 2026 harvest |
| SEY — Yaye Arbegona | watermelon, a lovely florality, and berries | Washed, Ethiopian Landrace, Arbegona/Sidama, 2300 masl, January 2026 harvest |
| SEY — Kedida Gubata | honeydew, peach, and coffee blossom | Honey, Ethiopian Landrace, Kochere, 2275–2500 masl, January 2026 harvest |
| Queen City — Belafonte | Smooth Chocolate & Sweet Berries | Coffee identified as a double-origin offering; origin, process, elevation deliberately remain empty rather than assigning one invented value |
| Sweet Bloom — Wuri | citra hops, mandarin, sugarcane | Washed, heirloom, Gedeb Ethiopia, 2000–2100 masl, 850 small scale producers; espresso 18.5g/36g/20–22s; roast graphic uncertain -> not auto-classified |
| Sweet Bloom — Uraga | guava, raspberry, milk chocolate | Natural, heirloom, Guji Ethiopia, 2150–2250 masl, 850 Small Holder Farmers; same published espresso reference; no guessed roast tier |
| Black & White — Los Altos Washed | apricots, pecan, milk chocolate | UCANOCH cooperative, Mexico, washed, field blend, 1200–1700 MASL |
| Little Wolf — Tegu | Lime, White Team, Vibrant | Source displays **White Team**; kept as-is without silently rewriting the roaster wording; Kenya Nyeri, Washed, 1700m, SL28/SL34/Batian/Ruiru11 |
| Heart — Phono | fig, caramel, cream | Piendamó, Pink Bourbon, washed, 1700–1800m; no unsupported producer/roast |
| Heart — Ethiopia Halo | nectarine, honeysuckle, strawberry candy | Gedeb, Heirloom, Washed, 1900–2200m |

### Non-parsed cases, explicitly not disguised as success

- **Queen City homepage** — correct rejection: `ambiguous_or_missing_product`. Category/site listing is not a single coffee.
- **The Picky Chemist Gesha Village** — `page_too_large`. Preserve 900KB privacy/availability limit; the site needs an alternate smaller trustworthy product source or manual entry.
- **Queen City Banko Gotiti Natural**, **Queen City Sonia Bolanos**, **Sweet Bloom Felix Zaragoza** — `source_unavailable` at tested URLs. May be retired/stale or temporarily inaccessible; **no claim of verified fields or parsing success**. Retry only with currently accessible exact release URLs.

## Acceptance and regression scope

- [Full cloud tests/lint/build CI 39104400688 — 330/330 tests, ESLint, build, artifact leak guard PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39104400688) before the last two additional field tests.
- [Expanded cloud tests in UX job 39104806648 — 332/332 PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39104806648) on final field extraction (full build/lint separate job may be cancelled due concurrent development; check latest job conclusion before release).
- [Real 24-URL acceptance 39104806647 PASS](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39104806647) including real on-page name, producer, process, elevation, roast evidence, tasting notes, published espresso recipe, Queen City variant/canonical equivalence and negative homepage check.
- Regression fixtures cover named and narrative notes, nested headings, very long Onyx H1, nested HTML `main-product-selector`, producer false positives, explicit Onyx elevation vs generic educational paragraph, unrelated products, malformed flavor lists, HTML escape, source-only processing and recipe scoping.
- Prior and ongoing URL safety/regression suites cover HTTPS private IP/SSRF/redirects, identity matches, member quota/cooldown, preview-only noncanonical mode and blank-only form filling. No fresh authenticated full browser click-through or release verification was run during this anonymous public-source probe.

### Current unresolved limitations and release gate

**Do not advertise universal site coverage.** 19/24 source attempts produced unverified public webpage *suggestions*, not reviewed canonical coffee records. Some roasters omit certain fields or use dynamic content, and archives can change or disappear. Color-based roast assumptions are not source facts: Agtron-ground/Gourmet classification is labeled provisional when scale/sample unspecified. Never fill the blank fields by guessing. Do not store site HTML, cookies, credentials or arbitrary page text.

The rest of the repository may be under concurrent development (#9 Community/MAD). Recheck current HEAD and all required CI checks for the proposed release SHA; do not attribute unrelated account/UX regressions to the extractor or silently waive them. In particular, earlier concurrent runs showed failures in account-transition/review-message and mobile selector suites even while extractor tests passed. Preserve the issue record until final status is reconciled.

**Production remains on the previously owner-approved Netlify READY deployment; these parser improvements are source-only**. Owner approval is needed before one controlled Netlify deployment. No Netlify credits, Supabase mutation, or authenticated preview quota were spent by the GitHub public-source probes. Recheck Netlify credit guard and acceptance flows before approved publication. The project has a separate queue of Community/backup/security work not altered here.

## Seamless next-session entrypoint

Read `AGENTS.md`, `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, this report, [issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33), the exact real-source probe script and tests. Verify source HEAD and CI latest first; do not start over, infer missing sources or redeploy without new permission.
