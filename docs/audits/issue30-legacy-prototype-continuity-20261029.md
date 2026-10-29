# Issue #30 — original JSON and 5,288-line JSX prototype continuity audit

**Date:** 2026-10-29 UTC. **Primary goal:** preserve all previously approved, unsuperseded prototype behavior, improve it in the authenticated product, and never resurrect explicitly retired features. **No production publication authorized.**

## Source identity and actual availability

- **Original JSON located; no owner upload required.** `docs/archive/requirements/The_Dial-In_Collective_Decision_Ledger_v1.0.json` contains exactly **79 original Locked and 20 original Open decisions** (original Git blob `bc4ca3be971a35d21586d21bb985227a8c098f7b`, 22,815 bytes). Its entire parsed JSON equals **`docs/DECISION_LEDGER.json#/baseline/content`** property for property; no decision text or status was dropped.
- **Original Master Specification located.** `docs/archive/requirements/The_Dial-In_Collective_Master_Specification_v1.0.md` preserved at 1,929 lines/69,795 bytes, and consolidated into Master Specification with later scoped owner amendments. This older specification is not a mandate to resurrect a later-retired feature.
- **Owner Project original React JSX file accessible:** Project file `dial-in-collective.jsx`, **289,465 bytes / 5,288 lines / SHA-256 `54971f6286175aba7554351096c6d3640fec0211b4cef78fa13503d3c18ee980`**. Different from historical GitHub `claude/artifact-import-e8h9kx:src/DialInCollective.jsx` (238,311 bytes / 4,421 lines). Original Project file must not be silently replaced by the old branch variant.
- **Per-line source inventory actually generated:** 5,288 records in `DIC_Original_JSX_5288_Line_Crosswalk_2026-10-29.csv` (1,347,389 bytes, SHA-256 `18741fff2b0dd07043cba47d0da63e1aabaf9ace8036b2e6ec107513070b9cc9`), available as a conversation artifact, plus `DIC_Original_JSX_Audit_Summary_2026-10-29.json`. TypeScript JSX parser produced **0 syntax diagnostics**, 186 top-level AST statements and 199 named/nested function nodes. Every line has its top-level/inner function owner, area, treatment, candidate current module and boundary note. **This is a complete static source inventory, NOT 5,288 independently tested semantic equivalence assertions.** Test source behavior independently below.

## Mapping of original JSX line intervals to current modules and approved disposition

| Original lines | Legacy responsibility | Current implementation/evidence | Disposition |
| --- | --- | --- | --- |
| 1–144 | Theme, palette, typography | `site/styles.css`, `site/cloud/appearance.js`, `site/lib/ui.js`; modern responsive visual tests | Preserved/improved, approved later palette overrides |
| 145–282 | Roast levels, styles, five sensory scales | `site/lib/constants.js`; 7 roast tiers and five active styles | Preserved/revised; Custom selection retired |
| 283–501 | Browser-local state and roaster-name bucket keys | `site/cloud/client.js`, `site/cloud/outbox.js`, `site/lib/model.js`, Supabase schema | Authenticated canonical identity replaces unsafe shared keys |
| 502–711 | Browser scraper, screenshots, Claude-assisted extraction | `src/server/coffee-*.mjs`, `site/cloud/coffee-url-autofill.js` | Official source-backed URL/manual entry; Claude/screenshot expressly retired by Oct 28 decision |
| 712–1284 | Personal shots, coffee metadata, inferred roast levels | `site/lib/engine.js`, `site/lib/model.js`, `src/server/coffee-source-facts.mjs` | Preserve raw shots; don't infer/fabricate unknown roast |
| 1285–1545 | Simple raw community sums and roast heuristics | `site/lib/community-evidence.js`, `site/lib/engine.js`, `site/lib/constants.js` | Evidence-tier community prior and retained labeled heuristic priors |
| 1546–1998 | Grinder and starting recipe calibration | `site/lib/engine.js`, `site/lib/model.js`; recommendation test suite | Per-setup calibration and style/family-aware starts; no universal grinder setting |
| 1999–2389 | Old success rules and `suggestNext` | `site/lib/constants.js`, `site/lib/engine.js`, `site/lib/ui.js` | All-green five-rating success, style ratio/time only guidance, single-control next-shot advice |
| 2390–3044 | Legacy community bucket and personal JSON backup | `site/cloud/mapping.js`, `site/cloud/outbox.js`, `site/cloud/import-preview.js`, server SQL/RLS | Private authenticated data, bounded backward importer and durable eligible community data |
| 3045–3266 | Radar, badges, modal presentation | `site/lib/ui.js`, `site/styles.css`, `site/cloud/shot_card.js` | Preserved/improved and test-covered |
| 3267–3796 | Main controller and local state | `site/cloud/main.js`, `site/cloud/client.js`, `site/cloud/outbox.js` | Authenticated PWA, resilient offline, no shared mutable personal local identity |
| 3797–4262 | Cards, equipment and basket edit UIs | `site/cloud/main.js`, `site/lib/model.js` | Preserve simple setup/history, retire member-facing equipment/basket version management |
| 4263–4850 | Style selector, Add Coffee and extraction | `site/cloud/main.js`, `site/cloud/coffee-url-autofill.js`, `src/server` | Official URL preview/manual, five active styles; remove obsolete AI/screenshot |
| 4851–5099 | Coffee details, shot history/radar | `site/cloud/main.js`, `site/cloud/shot_card.js` | Inline multi-shot expansion and original measured fields retained |
| 5100–5288 | Rating/logging/recipe display | `site/lib/ui.js`, `site/lib/engine.js`, `site/cloud/main.js` | One visible family/window, full raw shot history, recommendation provenance |

## Explicit owner supersessions that MUST override old source

Do **not** reimplement these historical JSX features: `UX-RETIRE-CUSTOM-STYLE-20261026`, `UX-RETIRE-EXPERIMENTS-20261026`, `UX-RETIRE-BAG-MANAGEMENT-20261026`, `UX-RETIRE-BASKET-EQUIPMENT-VERSION-MANAGEMENT-20261026`, `current_owner_retire_screenshot_claude_20261028`. One visible recommendation with distinct *internal* successful families is governed by `current_owner_one_visible_recipe_internal_families_20261020`. Fast-Flow was later explicitly approved as a distinct style. Original plausible shots, metadata, notes, history, and internal immutable equipment snapshots must survive all retirements.

## Newly added exact-source regression tests

`tests/legacy-prototype-continuity.test.mjs` runs five Node-native cases:

1. Deep equality of **every** original JSON decision against consolidated canonical baseline and exact 79/20 counts.
2. All five owner-retired product decisions remain Locked; active styles equal exactly Traditional, Turbo, Fast-Flow, Ristretto, Lungo.
3. All five taste ratings are required; a plausible Turbo **18 g → 72 g, 50 s** with five green taste ratings remains Dialed In despite both typical style windows, and its raw shot/notes and family survive.
4. Fresh shot inputs keep measured yield and time empty, all five ratings unset, and reuse only actual comparable prior grind measurement.
5. Viewing/searching a second coffee cannot silently make it Current; only saving a shot changes Current and both shots remain individually stored.

These behavior tests use the current `hydrate` model + `saveShot`/recommendation engine with existing source fixtures; **not** production Supabase writes or physical-device testing. Existing cloud/session/offline, permission, recipe-family, single-visible-window, visual/browser tests remain in the exact-source CI. Run, repair and independently read back applicable checks before declaring merged code READY.

## Legitimately unresolved vs discarded source

The owner explicitly says the old standalone workshop addendum need not be recovered. Do not make the research reports or complete private chat transcripts blockers to normal app operation; the user will commission new structured espresso scientific research separately. Preserve source provenance; do not invent missing historical reports or approvals. The user says relevant old chats belong to the ChatGPT Project; Project storage cannot independently prove every past chat's full transcript is available in the connected export. Do not claim full transcript inventory or require the owner to reupload the already located JSON or JSX.

## Verification boundaries and status

- **Verified static:** parsed original JSX all 5,288 lines into an area/function ownership crosswalk; found original JSON and confirmed exact equality with canonical baseline; inspected current engine/main/model/constants/Community modules and existing tests. A prior GitHub `2026-10-21-requirement-traceability.json` had already mapped 79 baseline Locked decisions to follow-up issues but was not a blanket runtime PASS.
- **New executable coverage:** five specific scoped behavior tests as above, verified by exact-head CI separately.
- **Not certified:** literal manual semantic equivalence of every JSX expression, full historical transcripts, live authenticated multi-device interaction for every historical view, or 100% science validity of old heuristic roast/style numbers. The research package must propose source-cited improvements to the current engine, subject to Locked constraints and separate tests.
- **No new app behavior migration necessary from this bounded audit:** Existing implemented logic and explicit retirements cover these tested original flows. Future bug reports and independently demonstrated gaps remain tracked under #96 or applicable issue, not silently declared resolved by a filename crosswalk.

**No production deployment, SQL, member-data or backup change authorized.**
