# The Dial-In Collective
## Master Product & Build Specification

**Version:** 1.0  
**Date:** September 8, 2026  
**Status:** Canonical pre-build requirements baseline  
**Primary purpose:** Preserve product decisions in enough detail to design, implement, migrate, test, and later evolve The Dial-In Collective without losing the intent established during the requirements workshop.

---

# 1. Source-of-truth rules

This specification is the canonical requirements baseline for the rebuild.

When implementation sources conflict, use this precedence:

1. The latest explicit product decision made by the product owner.
2. This Master Product & Build Specification and its Decision Ledger.
3. The latest current application source, `dial-in-collective(2).jsx`, for behavior that has not been explicitly superseded.
4. The supplied screenshots for visual hierarchy, interaction patterns, and current UX behavior that has not been superseded.
5. The supplied export/backup data (`Pasted text.txt`) as a migration fixture and a real-world example of shot history behavior.
6. Earlier espresso research modules and evidence reviews, once placed in the same project/workspace, as the evidence base for recommendation rules.

A newer explicit decision always overrides an older implementation detail. The rebuild should not preserve a current-code behavior merely because it exists if the product decision has changed.

Future decisions should update both this specification and the decision ledger. Important behavior must not live only in chat history.

---

# 2. Product vision

The Dial-In Collective is a mobile-first espresso dial-in journal and recommendation system that becomes more useful as the user and community log successful shots.

The core experience must remain extremely simple:

**Open the app -> current coffee is ready -> Log a Shot -> rate taste -> get the next recommendation -> walk away.**

The app may contain sophisticated recommendation, community, equipment, identity, and validation logic underneath, but the user should not feel as though they are maintaining a database.

## 2.1 Product principles

- **Simple on the surface, sophisticated underneath.** Advanced modeling must not create routine data-entry burden.
- **Experimentation is a first-class behavior.** Espresso is not a fixed target. Recommendations are reference points, not rules.
- **Personal taste matters.** Two successful recipe families may both be valid; the best recommendation can differ by user preference.
- **Observed success beats generic theory.** A user's own successful shots on the same coffee/setup are highly valuable.
- **Community learning must be robust.** More shots improve confidence, but one heavy user must not dominate the Collective.
- **Raw data is preserved.** Derived recommendations and aggregates must be reproducible from underlying shot records.
- **Coffee identity must be reliable.** Similar names must not cause accidental merging or duplicate community records.
- **Facts and opinions are separated.** Coffee facts have one validated canonical record; user taste, notes, bags, and shots are user-level.
- **Progressive disclosure.** Community detail, bag detail, advanced equipment, and diagnostics are available without crowding the main workflow.
- **No false precision.** Once repeated successful shots exist, a useful recipe is often a successful window plus a centerpoint rather than one magical number.

---

# 3. Release scope and audience

## 3.1 Initial release

- Private beta to a small group selected by the product owner.
- Mobile-friendly web app / PWA is sufficient for V1.
- Native iOS/App Store distribution is not required initially.
- The app should be installable and feel app-like on mobile.

## 3.2 Long-term direction

- Potential broader sharing in espresso communities, including Reddit.
- Potential paid product later.
- Architecture should not prevent public scale, subscriptions, app-funded AI, or richer community features later.

## 3.3 Non-goals for initial beta

- Native mobile apps.
- Mandatory AI usage.
- Complex coffee-library filtering.
- Heavy social-network features.
- Required detailed bag-aging maintenance.
- Automatic AI coaching on every shot.
- Admin review of ordinary shots or ordinary fuzzy matches.

---

# 4. Private beta access and authentication

## 4.1 Beta access

- Beta signup is available through a private signup URL/link controlled by the product owner.
- The beta link can be revoked and replaced without affecting existing accounts.
- Public signup can replace the private beta gate later.

## 4.2 Accounts

- Username/login identifier: **email address**.
- Email is required.
- Primary authentication is password-based.
- Passwordless may be added later, but is not the primary V1 path.
- Use an internal immutable User ID that is never used as the public identity.
- Sessions should persist securely for as long as practical, using rolling/refresh-session behavior, until manual logout or security invalidation.

## 4.3 Public identity

- Community-facing shot displays do not expose email or a persistent visible anonymous contributor handle.
- Public UI should normally say **Community Shot**, not identify the contributor.
- Internally, the system may retain a privacy-preserving contributor relationship for weighting, abuse prevention, and analytics.

---

# 5. Core information architecture and screen model

The rebuild should reduce the current "everything expands inside everything" feeling while preserving the inline comparison interactions that are genuinely useful.

## 5.1 Main coffee screen

The home screen is primarily the user's coffee library and current dial-in workspace.

The current coffee is the most important object on app open.

The main screen should contain:

- Header/branding and theme/settings access.
- Add Coffee action.
- Current coffee pinned at the top when not searching.
- Other coffees below in Recent or A-Z order.
- Expandable coffee cards.
- Search/sort controls tucked into a caret/dropdown menu.

## 5.2 Dedicated focused screens/sheets

Use focused screens or sheets for tasks that benefit from reduced clutter:

- Settings.
- Add Coffee.
- Log a Shot.
- Potential future account/admin tasks.

## 5.3 Inline interactions that must remain

- Coffee cards expand inline on the main page.
- Shot-history rows expand inline on the current page.
- Multiple shot-history entries may be expanded at the same time to compare shots, including radar graphs.
- Do not force Shot Details into a separate modal if doing so prevents quick multi-shot comparison.

---

# 6. Current coffee, ordering, and library behavior

## 6.1 Current coffee semantics

**Viewing a coffee is not the same as using that coffee.**

- Tapping/expanding an older coffee does **not** make it current.
- A user may inspect an old or similar coffee purely for reference.
- **Logging a shot for a coffee is the action that makes that coffee current.**
- No separate "Select Coffee" button is needed in V1; it adds a redundant step.

## 6.2 App-open behavior

On normal app open:

- The current/most recently used coffee is pinned at the top.
- Its card is already expanded.
- Its current/preferred recipe or active dial-in state is immediately visible.
- **Log a Shot** is immediately available.
- The last-used equipment setup is already selected.
- If an Experiment is active for that coffee/setup, the Experiment panel is visible and the main Log a Shot action continues that experiment.

## 6.3 Changing current coffee

When a shot is successfully logged for another coffee:

- That coffee becomes current.
- It moves to the top.
- It is expanded.
- The previous current coffee automatically collapses.
- The previous current coffee becomes second in Recent order unless another coffee was used more recently.

## 6.4 Ordering

Default order below the pinned current coffee: **Most Recently Used**, determined by actual shot logging, not by viewing.

Available sort modes:

- **Recent** - default.
- **A-Z**.

Even when A-Z is selected, the current coffee remains pinned at the top outside search mode.

## 6.5 Search

- Search and sort are always tucked away under a caret/dropdown menu, regardless of library size.
- There are no filter builders or advanced filtering controls in V1.
- One simple search box searches all useful coffee-card metadata:
  - coffee name
  - roaster
  - origin
  - producer
  - roast level
  - elevation
  - process
  - variety
  - tasting notes
- During an active search, show only matches.
- If the current coffee does not match, it temporarily disappears from the search result list.
- Clearing search restores the current coffee pinned at the top.
- Searching never changes which coffee is current.

---

# 7. Coffee card behavior and visual hierarchy

## 7.1 Collapsed card

Preserve the compact current design language. A collapsed coffee card should communicate the essentials without turning into a dashboard.

Expected information:

- Coffee name.
- Shot-style badge/icon.
- Dialed In badge when applicable.
- Roaster.
- Origin.
- Roast level/status where known.
- Expand/collapse affordance.

Bag detail should **not** appear on the collapsed card.

## 7.2 Expanded card - primary content

The expanded card should prioritize:

1. Current/preferred recipe or current dial-in state.
2. Log a Shot.
3. If not dialed in: previous-shot feedback and next recommendation.
4. If an experiment is active: Experiment panel.
5. Shot History.
6. Alternate Dialed-In Recipes, collapsed by default.
7. Coffee facts and source/roaster details.
8. Community detail behind progressive disclosure.
9. Optional Bag Details behind progressive disclosure.

## 7.3 Existing visual language to preserve

The product owner likes the current overall design language and wants refinement rather than a visual reset.

Preserve or closely echo:

- Fraunces-style editorial serif for primary display headings.
- Inter-style sans serif for UI/body.
- Monospaced numerical treatment for recipe metrics where useful.
- Warm cream / espresso / copper palette.
- Muted blues for shot-style badges.
- Green-to-red sensory ramp.
- Light and dark themes.
- Compact rounded cards.
- Subtle borders rather than heavy separators.
- Progressive disclosure rather than permanent secondary statistics.

The rebuild may improve spacing, responsiveness, hierarchy, accessibility, and navigation while maintaining this visual identity.

---

# 8. Canonical coffee identity

The rebuild must replace the current shared-key/bucket identity system with a true canonical coffee model.

## 8.1 Canonical Coffee ID

Every distinct coffee release/lot has a stable canonical Coffee ID.

Identity must not depend on mutable text fields such as display name, roaster spelling, URL query parameters, or user-edited metadata.

## 8.2 Release-level identity

- Same coffee name in a different harvest, lot, or release is a **separate canonical coffee**.
- Related releases are linked in a relationship/group so the recommendation engine can use them as weaker fallback evidence.
- Historical/unavailable releases remain searchable indefinitely.
- Availability is a status, not identity.

Recommendation fallback order should generally be:

**Exact release -> related release(s) -> highly similar coffees -> broader roast/style/equipment evidence.**

Each step down should reduce confidence.

## 8.3 URLs and aliases

Maintain normalized/canonical URLs and aliases separately from identity.

- Tracking parameters should not create a new coffee.
- Multiple URLs may point to the same canonical release.
- A changed URL does not change the Coffee ID.

---

# 9. Add Coffee workflow

URL and/or screenshot remain the primary new-coffee inputs because they improve identity matching and data quality.

## 9.1 Primary flow

1. User opens Add Coffee.
2. User may paste a roaster product URL, add screenshot(s), or both.
3. System checks the canonical coffee database before spending AI/API usage.
4. Exact canonical/URL match:
   - add the existing canonical coffee to the user's library immediately;
   - no AI call is required.
5. Very likely fuzzy match:
   - show the likely existing coffee;
   - require **user confirmation** before merging/using it.
6. User says it is different:
   - continue as a new-coffee verification flow.
7. Only genuine identity conflicts or ambiguous canonical duplicates should reach admin review.

## 9.2 Duplicate policy

- Normal fuzzy-match confirmation is a user action, not an admin bottleneck.
- The system must prioritize avoiding accidental merges while keeping Add Coffee fast.

## 9.3 Required vs optional fields

Preserve the current principle that only a small number of fields are required.

Current user-facing baseline:

- Name / Bag Label: required.
- Roaster: required.
- Origin: optional.
- Elevation: optional.
- Roast level: optional.
- Process: optional.
- Variety: optional.
- Producer: optional.
- Tasting notes: optional.
- Roaster URL: optional.
- Shot style: has a recommended/default selection and can be changed.

The backend canonical model can be more structured, but the user should not be forced to complete missing facts manually.

## 9.4 Missing information

Secondary sources may fill a missing field only when the source can be confidently verified as referring to the **exact same coffee/release** and, where relevant, the same roaster.

If the match cannot be verified, the field remains blank.

Do not invent values merely to complete the record.

---

# 10. Canonical coffee facts, verification, and audit history

## 10.1 One validated factual record

The following are canonical coffee/release facts rather than user-specific alternate truths:

- Coffee/lot/release name.
- Roaster.
- Product/source URL(s).
- Origin.
- Elevation.
- Variety.
- Process.
- Producer.
- Roast level.
- Roaster tasting notes.
- Roaster-published espresso recipe.
- Availability status.
- Related-release relationships.

## 10.2 User corrections

- Users can propose corrections or additions.
- Users should not create private conflicting factual versions of the same canonical coffee.

## 10.3 Source hierarchy

Preferred evidence order:

1. Exact roaster product page / official roaster source.
2. Other reliable sources verified to the exact same coffee/release.
3. Derived estimates only where explicitly allowed and labeled as estimates.

## 10.4 Hybrid verification

- Strong, source-backed, non-conflicting update: may auto-apply.
- Actual conflict between credible sources: admin review.
- Preserve a change/audit history with prior value, new value, source, and date.

---

# 11. Pending coffees when AI is unavailable

The app must remain usable without a Claude API key.

If a user enters a genuinely new coffee and the app cannot complete automated extraction/verification:

- Create a **Pending Coffee**.
- The user can log shots immediately.
- Pending-coffee shots remain private/non-community until the coffee is approved.
- Pending coffee goes to the admin verification queue.
- On approval, previously qualifying dialed-in shots automatically become community-eligible.
- If the pending coffee is rejected because it is a duplicate, reassign the library entry and shots to the existing canonical coffee without data loss.

---

# 12. AI and API strategy

## 12.1 Provider

- V1 AI provider: **Claude only**.
- Keep the provider layer modular so another provider, including OpenAI, can be added later without redesigning the app.

## 12.2 AI purpose

Primary V1 AI use:

- Extract and structure coffee data from roaster URLs and screenshots.
- Assist in exact-release identification/normalization when useful.

AI is **not** required on every shot.

Shot recommendations remain deterministic/data-driven by default.

## 12.3 BYOK

- Users provide their own Claude API key if they want automated extraction.
- The key is stored **on the device only**.
- Do not write the key to the central Dial-In Collective database.
- App remains functional without a key.
- The natural consequence is that a user using multiple devices may need to enter their key on each device.

## 12.4 Future AI Coach

A future optional, user-triggered AI Coach / Ask AI feature is desirable.

- It should be explicitly invoked by the user.
- It should not silently consume API credits on ordinary shot logging.
- If the app later becomes paid, app-funded AI can be reconsidered if pricing covers usage.

## 12.5 Screenshot retention

- User-uploaded screenshots used for extraction are discarded after successful extraction/processing.
- Preserve structured extracted data, source references, and an official roaster image/thumbnail when appropriate.
- Do not accumulate user screenshots as long-term storage by default.

---

# 13. Equipment model

## 13.1 Beginner-first setup

The default experience should behave like one equipment setup.

An advanced user may create additional setups such as:

- Home.
- Office.
- Travel.
- Same machine with a different grinder/burr set.

Additional setups should live behind an Advanced Equipment / Additional Setups affordance.

## 13.2 Setup fields

Current V1 baseline fields to preserve:

- Usual Dose.
- Grinder espresso range.
- Track brew temperature toggle.
- Temperature unit (F/C) when tracking temperature.
- Tasting Preferences / Notes.
- Claude API key - local/device-only and not part of central equipment data.

Expanded optional equipment details supported by the new schema:

- Espresso machine model.
- Grinder model.
- Burr set.
- Basket size/type.
- Pressure/flow capability.
- Other equipment attributes needed by future recommendation logic.

These details should remain optional unless required for a specific feature.

## 13.3 Setup selection

- Remember the default/last-used setup automatically.
- Keep the setup switcher small and secondary.
- The user should not repeatedly select equipment for every shot.

## 13.4 Historical integrity

Every shot must permanently record the setup used.

Every shot should also preserve an immutable equipment snapshot/version as it existed at shot time.

Editing a setup later affects future shots only; it must not rewrite historical shot context.

## 13.5 Grind-range concept

The current app defines an espresso range for the grinder and normalizes community grind position against that range. This concept should be preserved, but public-scale implementation must support arbitrary grinder scales reliably.

A final product decision is still needed on grinder direction and discrete/stepless handling. See the Open Questions register.

---

# 14. Shot logging - core UX

The Log Shot experience should be a focused screen/sheet, not a large inline form embedded inside the coffee card.

## 14.1 Open behavior

From the current coffee card, the user should be able to tap **Log a Shot** immediately.

The form should be optimized for speed and minimal typing.

## 14.2 Required fields

Required for a new shot:

- Dose.
- Yield.
- Time.
- Grind Setting.
- All five sensory scales.

Optional:

- Temperature, when temperature tracking is enabled.
- Notes.

## 14.3 Dose prefill

Priority:

1. Previous **actual** dose for this coffee + active equipment setup, if available.
2. Otherwise the equipment setup's **Usual Dose**.

Dose remains editable on every shot.

## 14.4 Yield

- Required.
- Always blank when opening a new shot form.
- Never silently prefilled from a recommendation or previous shot.

## 14.5 Time

- Required.
- Always blank when opening a new shot form.
- Never silently prefilled from a recommendation or previous shot.

## 14.6 Grind

- Required in the rebuild.
- Prefill is specific to **coffee + equipment setup + shot style**.
- If a previous actual grind exists for that exact combination, prefill it.
- If there is no previous actual grind for that style, leave the actual log field blank.
- Show a separate **Suggested Grind** recommendation when available.
- Never silently insert a derived recommendation into the field as though it were measured/actual.
- Provide **Use Recommendation** to copy the suggested value into the actual field.
- Record internally that the entered value originated from the recommendation when the button is used.
- The user is always free to enter any other valid value without warning or judgment.

## 14.7 Temperature

- Optional because many machines cannot control brew temperature.
- Controlled by a Settings toggle.
- If tracking is off, hide temperature from shot logging and recipe display.

When tracking is on, prefill priority:

1. Previous actual temperature for exact coffee + setup + style.
2. If none for the style, most recent actual temperature for the same coffee + setup from another style; label context subtly, e.g. "Last used on Traditional."
3. If no prior actual temperature exists for that coffee/setup, leave the actual field blank.

Separately:

- Show the recommended temperature.
- Provide **Use Recommendation** to copy it into the actual field.
- Record recommendation-origin metadata when used.
- Do not flag or criticize a user who chooses another temperature.

## 14.8 Recommendations stay visible

Recommended grind/temperature should remain visible even when they match the current value. They are confirmation/reference, not compliance rules.

Do **not** show deviation labels such as "2 F cooler than recommended" merely because the user chooses differently.

## 14.9 Save/return behavior

After the user rates and saves a shot:

- Close the Log Shot screen/sheet automatically.
- Return to the expanded coffee card.
- Immediately show the new shot result and relevant recommendation in the appropriate workspace.

---

# 15. Sensory system

Preserve the five existing 1-5 sensory scales and their conceptual meanings.

## 15.1 Scales

1. **Extraction** - Sour <-> Bitter, balanced in the center.
2. **Body** - Thin <-> Heavy, balanced in the center.
3. **Clarity** - Muddled -> Distinct.
4. **Sweetness** - None -> Exceptional.
5. **Astringency / Dryness** - Severe -> None in the displayed direction; less is better.

## 15.2 Required input

- Nothing is preselected.
- All five scales must be actively rated before saving a shot.

## 15.3 Current pure-green values

The current visual ramp treats these as pure green:

- Extraction = 3 (Balanced).
- Body = 3 (Balanced).
- Clarity = 5 (Distinct).
- Sweetness = 5 (Exceptional).
- Astringency = 1 (None).

## 15.4 Radar graph and tasting chips

Preserve the existing concept:

- Tasting chips/bubbles summarize the five axes.
- The radar/extraction compass visualizes the same scale values.
- The same color logic should be shared between input, chips, and radar so they cannot visually contradict each other.

---

# 16. Definition of Dialed In

This is an explicit change from the current application.

**Dialed In = all required sensory markers are pure green.**

Style time/ratio guidelines do **not** veto an all-green plausible shot.

A shot can be outside a typical style range and still be Dialed In if the user rates all required sensory markers green.

## 16.1 Community eligibility

- All shots stay in personal history.
- Only Dialed-In shots are eligible for community learning.
- Only Dialed-In shots appear in Community Shots browsing.
- A non-dialed shot remains private/non-community.

## 16.2 Established coffee state

Once a coffee has been dialed in, it remains marked Dialed In even when later experimental or ordinary shots are not green.

A bad later shot does not erase successful history.

---

# 17. Recipe concepts - do not collapse them into one number

The rebuild must distinguish several concepts that the current application partly merges together.

## 17.1 Starting Recommendation

The system's best pre-shot suggestion based on:

- exact coffee data if available;
- user's own history;
- exact/related community data;
- equipment/setup;
- roast/style baseline;
- roaster recipe where relevant;
- taste preferences;
- deterministic espresso logic.

## 17.2 Successful / Dialed-In Window

Once multiple successful shots exist for a recipe family, show a range rather than pretending one value is universally exact.

Example using the supplied Bavyeyi IV data:

- Dose: 18.0 g.
- Yield successful range: **49.7-51.2 g**.
- Time successful range: **18.5-22.0 s**.
- Grind: 0.2.
- Temperature: 193 F.
- Centerpoint: approximately **50.5 g and 20.8 s**.

For a small number of successful shots, observed min/max can be useful.

With many successful shots, use a **robust successful range** rather than raw lifetime min/max so one unusual but legitimate green shot does not permanently stretch the recommendation window.

The centerpoint should also use robust statistics when the dataset becomes large.

## 17.3 Current / Preferred Recipe

A user can mark a successful recipe as their current/preferred recipe.

This is a preference state, not a deletion of other successful recipes.

## 17.4 Alternate Dialed-In Recipes

- Preserve older successful recipe families when a new one becomes preferred.
- Show only the current recipe prominently.
- Put others behind a collapsed control such as **Alternate Dialed-In Recipes (2)**.
- Any alternate can later become current again.

## 17.5 Recipe families

Do not average materially different successful approaches into one giant range.

Cluster them as separate **recipe families**.

Examples might include:

- a higher-clarity, longer-ratio Turbo family;
- a higher-body, shorter-ratio family;
- a different-temperature family;
- a different style.

Community recommendation logic may choose among families based on the user's preferences and equipment context.

---

# 18. Experiment system

Experimentation should feel intentional and positive, not like the user has violated a rule.

## 18.1 Meaningful-change detection

A meaningful change is a possible signal of intentional experimentation.

Initial trigger thresholds:

- Dose: **0.5 g** or more.
- Yield: **5 g** or more.
- Time: **5 s** or more.
- Temperature: **2 C / approximately 4 F** or more.
- Grind: adaptive to the grinder's configured espresso range; for the product owner's 0.0-5.0 grinder range, **0.1** is meaningful.
- Shot style: any explicit style change is meaningful.

Crossing **any one** threshold is enough to trigger possible-experiment logic.

These are not warnings, errors, or hard bounds.

Time should not infer experimentation for small natural shot-to-shot variation; approximately 5 seconds is the starting threshold.

## 18.2 Prompt timing

Do not interrupt the user while filling out the shot form.

After the user finishes rating/saving a meaningfully changed shot, prompt with a lightweight question such as:

**Trying something different?**  
This shot changed meaningfully from your current recipe.  
**Start an Experiment** | **No, just log it**

## 18.3 Experiment workspace

If the user confirms:

- Coffee remains Dialed In based on the established recipe.
- Existing preferred recipe remains intact.
- Show a distinct, lightly separated **Experiment** panel with a small badge.
- The Experiment panel contains:
  - latest experimental shot;
  - radar graph;
  - tasting bubbles;
  - what changed;
  - next-shot recommendation;
  - experiment-specific history/progress as appropriate.
- Main Log a Shot action automatically continues the active experiment.
- User does not reconfirm "experiment" for every subsequent shot.

## 18.4 End Experiment

- User can choose **End Experiment**.
- If the new approach is not preferred, ending the experiment returns the interface to the original preferred recipe.
- Failed/non-green experimental shots remain in private personal history.

## 18.5 Candidate and confirmation lifecycle

- First materially different **all-green** experimental shot -> **Candidate Recipe Family**.
- Second successful repeat -> **Confirmed Alternate Dialed-In Recipe Family**.
- User may choose **Make Current Recipe** immediately after the first successful candidate if they love it.
- Candidate/confirmed status and current/preferred status are separate concepts.

## 18.6 Successful experiment that is not preferred

If an experiment produces an all-green result but the user decides the old recipe is still better:

- The successful experimental shot remains valid.
- It remains community-eligible.
- It may remain a candidate/alternate recipe family.
- Ending the experiment only changes the user's active preference/workspace; it does not invalidate the successful shot.

---

# 19. Non-experiment dial-in display behavior

## 19.1 Coffee not yet dialed in

The current app behavior is valuable and should be preserved.

For a coffee that is **not yet Dialed In**, prominently show:

- Previous/latest shot radar graph.
- Tasting bubbles.
- Shot result context.
- Clear recommendation for what to change on the next shot.

This is the active dial-in workspace.

## 19.2 Coffee already dialed in

- Current/preferred recipe/window is primary.
- Shot History remains available for inspection.
- A later non-green shot does not automatically replace the main recipe with a large dial-in panel.
- The large Experiment workspace should appear only after the user confirms that the meaningful change is an experiment.

A remaining UX detail is open regarding how much brief feedback to show for a non-green shot on an already dialed-in coffee when the user chooses "No, just log it." See Open Questions.

---

# 20. Shot History

## 20.1 Compact rows

Shot History should be scannable in compact form, showing useful metrics such as:

- dose -> yield;
- ratio;
- time;
- grind;
- temperature when tracked;
- date;
- style;
- Dialed In badge when applicable;
- concise sensory chips.

## 20.2 Expand inline

Tapping a shot expands it **inside the current page**, not in a separate full-screen detail view.

Expanded shot detail should include:

- full radar graph;
- all five sensory markers/chips;
- dose;
- yield;
- ratio;
- time;
- grind;
- temperature if tracked;
- style;
- equipment/setup snapshot/reference;
- notes;
- Dialed In status;
- Experiment/recipe-family status where relevant;
- Edit action;
- personal delete/hide action subject to community durability rules.

Multiple shots may remain expanded simultaneously for comparison.

---

# 21. Shot editing and deletion

## 21.1 Personal editing

Users can edit their own shot records.

The current app correctly treats edits as potentially affecting downstream recipe logic. The rebuild should preserve historical integrity and recompute relevant personal derived state where needed.

## 21.2 Personal deletion/hiding

Users can remove a shot from their personal history.

If the shot has already contributed a qualifying anonymous community contribution:

- personal visibility/association can be removed;
- the qualifying anonymous community contribution is retained.

The product owner does not want legitimate community data deleted except for corruption, invalid data, or abuse.

## 21.3 Account deletion

On account deletion:

- delete account/auth/email/settings and direct personal associations as required;
- previously qualifying community contributions remain as anonymous durable community data;
- preserve contributor-balancing capability using a privacy-preserving detached identifier if technically required.

The privacy disclosure must state this clearly.

---

# 22. Community data model

## 22.1 Raw shots are the source of truth

The new architecture stores every individual shot record centrally where appropriate, rather than only sum/count aggregates.

Also maintain precomputed aggregates/caches for speed.

Reasons:

- future re-analysis;
- robust aggregation;
- new variables;
- recipe-family clustering;
- recommendation evaluation;
- equipment behavior analysis;
- anomaly detection;
- optional AI Coach later.

## 22.2 Community eligibility

Only qualifying Dialed-In shots from approved canonical coffees contribute to community learning.

Pending-coffee shots remain private until approval.

## 22.3 Community Shots browsing

Users may browse individual qualifying anonymous Community Shots, including useful data such as:

- dose;
- yield;
- ratio;
- time;
- sensory ratings;
- style;
- relevant equipment context;
- notes where allowed;
- other useful shot variables.

Display them as **Community Shot**, without a visible persistent contributor ID.

## 22.4 Counts to surface

Where confidence/sample context is shown, distinguish:

- qualifying shot count;
- unique contributor count.

Example:

**42 dialed-in shots - 18 contributors**

---

# 23. Community aggregation and contributor balance

The current sum/count aggregation is insufficient for the rebuild.

## 23.1 Robust statistics

Use robust techniques such as:

- medians;
- trimmed/weighted means;
- quantiles or robust ranges;
- sample-size confidence;
- outlier-resistant estimators.

Exact implementation can be tuned, but raw data must remain available.

## 23.2 Diminishing contributor weight

Personal recommendations may use all of a user's shots fully.

Community recommendations should use diminishing returns so one high-volume user does not dominate.

Initial configurable effective contributor weights:

| Qualifying shots from one user for coffee + style/family | Effective weight |
|---|---:|
| 1 | 1.0x |
| 2 | ~1.2x |
| 3-4 | ~1.4x |
| 5-7 | ~1.6x |
| 8-12 | ~1.8x |
| 13+ | maximum ~2.0x |

Treat these as tunable configuration, not permanent constants.

Extra shots still matter for:

- repeatability;
- variance;
- personalized learning;
- equipment behavior;
- anomaly detection;
- recipe-family confidence.

## 23.3 Confidence labels

Subtle labels are acceptable when useful:

- **Early Data**.
- **Moderate Confidence**.
- **Strong Confidence**.

Do not clutter every recipe card with confidence text. Use progressive disclosure.

---

# 24. Validation and anomaly handling

The admin queue should stay very clean.

## 24.1 Hard validation

Use required-field and plausibility validation to catch obvious errors/typos.

## 24.2 Outlier comparison priority

When evaluating an extreme shot, compare in this order where possible:

1. Same user's prior shots on same coffee/style/setup.
2. Other users on exact coffee/style/family.
3. Related release if exact data is sparse.
4. Broader context as needed.

## 24.3 Extreme outlier flow

- Temporarily withhold an extreme outlier from aggregate calculation.
- Ask the user to confirm/correct it.
- If it was a typo, fix it.
- If the user confirms the unusual value is real and plausible, normally accept it.
- Only obvious abuse/impossible data should go to admin.

Legitimate unconventional espresso should not be deleted merely for being unusual.

---

# 25. Recommendation engine - governing principles

## 25.1 Recommendations are suggestions, not rules

- Always allow users to change dose, yield, time, grind, temperature, and style within plausible input constraints.
- Do not score a user negatively for deviating from a recommendation.
- Do not add visual warning copy merely because the user experiments.

## 25.2 Data hierarchy

For a user's recommendation, stronger context should generally outrank weaker context:

1. User's successful shots on exact coffee + setup + style/family.
2. User's successful shots on exact coffee + setup across related family/style where appropriate.
3. Exact coffee community family data.
4. Related releases.
5. User's own similar coffees on the same setup.
6. Similar coffee community data.
7. Roast/style/equipment baseline.
8. Generic baseline.

Exact ordering may differ by variable. For example, grind should strongly favor the user's own grinder history.

## 25.3 Roaster recipe

A roaster-published espresso recipe is a strong prior, particularly for Traditional-style starting points, but real successful data should eventually outweigh it.

## 25.4 Taste preferences

The current app's taste-preference nudging is liked and should be preserved/evolved.

- Preferences should tune rather than overpower evidence.
- The app should explain when a recommendation was influenced by the user's preferences.
- Example: "Recommended because this is a light, fruit-forward coffee and you prefer clarity."
- Keep explanation short by default.

## 25.5 Preference-aware family selection

When multiple successful recipe families exist, the engine may recommend different families to different users based on preferences such as:

- clarity;
- fruit-forward expression;
- body;
- richness/texture;
- other preference signals.

The user always retains final choice.

## 25.6 Mechanical vs sensory feedback

The deterministic engine can still use shot time and other mechanics to help explain a non-green shot, but style/time ranges are guidelines and no longer veto a green result.

---

# 26. Research governance for recommendation rules

The recommendation engine should not be built by treating every coffee attribute as equally causal.

Preserve the project's earlier evidence discipline.

## 26.1 Variable hierarchy

Direct brewing controls include:

- dose;
- beverage yield;
- brew ratio;
- grind setting/distribution;
- time;
- temperature;
- pressure;
- flow;
- preinfusion;
- shot profile;
- puck preparation;
- basket.

Coffee characteristics such as origin, elevation, variety, process, roast, density, and tasting notes can influence likely starting points but should not be treated as direct causal controls without evidence.

## 26.2 Research modules already defined

The project established seven major research areas:

1. Extraction fundamentals.
2. Coffee characteristics.
3. Grinder/burr interactions.
4. Machine/basket interactions.
5. Shot-profile families.
6. Sensory diagnosis.
7. Community validation.

## 26.3 Evidence confidence labels

Use the established meanings:

| Confidence | Meaning |
|---|---|
| High | Controlled research or multiple strong independent sources |
| Moderate | Consistent expert evidence with plausible mechanism |
| Preliminary | Limited testing or one credible expert source |
| Anecdotal | Community or individual experience |
| Inferred | Logical synthesis not directly tested |
| Conflicted | Credible sources materially disagree |

## 26.4 Claim audit discipline

Before turning research into production rules, verify important claims for:

- whether the citation actually supports the claim;
- scope and coffee/equipment conditions;
- observed result vs inferred mechanism;
- extraction vs flavor preference;
- preserved disagreement;
- shot-profile applicability;
- expert preference vs universal rule.

Community popularity should validate or challenge the foundation, not replace scientific/mechanical foundations.

---

# 27. Shot styles - V1 guidelines, not hard definitions

Current V1 style set:

- Traditional.
- Turbo.
- Ristretto.
- Lungo.
- Custom.

The style selected by the user remains the shot's style. Remove the current rigid automatic reclassification logic.

## 27.1 Baseline ratio and time guidance

Use the current tables as initial recommendation priors, not hard gates.

| Style | Light | Light-Medium | Medium | Medium-Dark | Dark | Typical target time |
|---|---:|---:|---:|---:|---:|---|
| Traditional | 1:2.5 | 1:2.35 | 1:2.0 | 1:1.9 | 1:1.8 | 25-32s; darker 22-28s |
| Turbo | 1:3.0 | 1:2.8 | 1:2.6 | 1:2.4 | 1:2.2 | 12-18s |
| Ristretto | 1:1.5 | 1:1.4 | 1:1.3 | 1:1.2 | 1:1.1 | 20-25s; darker 18-23s |
| Lungo | 1:3.2 | 1:3.0 | 1:2.8 | 1:2.6 | 1:2.5 | 30-40s; darker 28-36s |

Temperature baseline by roast may initially retain the current model:

- Light: 95 C.
- Light-Medium: 94 C.
- Medium: 93 C.
- Medium-Dark: 91.5 C.
- Dark: 90 C.

These are starting priors that can be overridden by successful personal/community data.

## 27.2 Updated user-facing style descriptions

**Traditional**  
Balanced, conventional espresso. Starting targets vary by roast level - roughly 1:1.8-1:2.5 and 22-32 seconds - then adapt based on the coffee, your equipment, successful shots, and taste preferences.

**Turbo**  
Fast, high-flow espresso using a relatively long ratio and coarser grind. Typical starting territory is about 1:2.2-1:3.0 in 12-18 seconds, often favoring clarity, juiciness, and fruit over body. Targets adapt from there.

**Ristretto**  
Shorter, more concentrated espresso. Typical starting territory is about 1:1.1-1:1.5 in 18-25 seconds, often emphasizing body, texture, and intensity. Ratio matters more than hitting an exact time.

**Lungo**  
Longer-ratio espresso. Typical starting territory is about 1:2.5-1:3.2 in 28-40 seconds, often increasing openness and clarity while reducing concentration. Ratio matters more than hitting an exact time.

**Custom**  
Set your own targets with no style assumptions.

## 27.3 Style recommendation on Add Coffee

- The app should recommend a starting style based on coffee characteristics, successful evidence, and the user's taste preferences.
- Recommended style is preselected automatically.
- Label it subtly as **Recommended for you**.
- The user can choose any other style before saving.
- Show a one-line reason, e.g. "Recommended because this is a light, fruit-forward coffee and you prefer clarity."

---

# 28. Bag model - intentionally simple in V1

The product briefly explored richer bag-aging tracking and intentionally simplified it to avoid turning the app into work.

## 28.1 Coffee vs Bag

- Canonical Coffee represents the release.
- A user's Bag represents a specific purchase/roast instance of that coffee.
- Buying the same canonical coffee again can create a new bag rather than overwriting old bag data.
- Shots can be tied to the specific bag.
- Coffee-level recipe learning can still learn across bags.

## 28.2 V1 visible bag fields

Only:

- **Roast Date** - optional.
- **Frozen** - optional boolean/status.

Defer richer room-temperature/refrigerated/opened/thawed lifecycle UI.

## 28.3 UI placement

- Bag details are hidden inside the expanded coffee view.
- Do not show bag age/status on the collapsed card.
- Do not ask bag questions during ordinary shot logging.
- Do not issue maintenance reminders by default.

## 28.4 Frozen logic

- Frozen status effectively pauses age-related recommendation logic.
- Batch-frozen users can leave a bag marked Frozen while logging individually frozen doses.
- Do not assume a shot means the whole bag has thawed.

## 28.5 New bag behavior

- One bag may be marked active for a coffee.
- New shots attach to the active bag automatically.
- Creating a new bag archives the prior active bag by default.
- Archived bags remain viewable and can be reactivated.
- When starting a new bag of a previously used coffee, carry forward the prior coffee-level dialed-in recipe/window as the starting recommendation while building new bag-specific history.

---

# 29. Community visibility and progressive disclosure

Community information should exist without dominating the primary coffee workflow.

On the main coffee card, prioritize personal recipe/logging/history.

Put deeper community content behind an expandable section/tab, including:

- aggregate recipe families;
- qualifying shot count;
- contributor count;
- confidence;
- individual Community Shots.

Avoid permanent dashboard clutter.

---

# 30. Privacy and retention

## 30.1 Protected personal data

Treat these as private/protected account data:

- email;
- authentication/session data;
- account settings;
- device-local Claude key;
- any other directly identifying account data.

## 30.2 Community contribution durability

The product owner wants legitimate community data to remain useful even if the original user later removes it from personal history or deletes their account.

The privacy/terms copy must accurately disclose that qualifying anonymous community contributions may persist after account deletion.

The current app sentence claiming no personal information is recorded becomes inaccurate once accounts exist and must not be reused unchanged.

## 30.3 Free-text community notes

Individual Community Shots may display notes, but public launch will require a policy/technical approach for abuse and accidental personal information. This can be lighter in private beta but must be addressed before broad public release.

---

# 31. Offline behavior

Basic offline support is desired.

Offline-capable:

- view already-saved coffees;
- view cached recipes/history;
- log shots;
- queue writes locally;
- sync automatically when online returns.

Online-only or connectivity-dependent:

- canonical coffee lookup;
- community search/browse updates;
- Claude extraction;
- admin actions.

Offline should not complicate the routine user experience.

A formal conflict-resolution strategy is still required before implementation.

---

# 32. Admin dashboard

Initial beta admin should be minimal and high signal.

Primary admin needs:

- Pending Coffee verification.
- Genuine canonical coffee conflicts/duplicate identity cases.
- Beta signup link revoke/replace.
- Basic app health/activity.
- Only true abuse/impossible-data shot cases after automatic validation.

Ordinary fuzzy matches, normal source additions, and legitimate unusual shots should not create admin work.

---

# 33. Migration from the current app

Architecture first, migration second.

The current data is useful but should not constrain the new schema.

## 33.1 Migration approach

- Build the correct new data model first.
- Implement a one-time importer for the current JSON/export format.
- Preserve as much user coffee/shot/equipment history as practical.
- A small amount of migration loss is acceptable if preserving an obsolete field would damage the new architecture.
- Do not reproduce the old shared-key/bucket architecture.

## 33.2 Supplied migration fixture

The supplied export contains:

- equipment settings;
- coffee index;
- full coffee records;
- shot history;
- personal samples;
- community aggregate records;
- theme.

The Claude API key is intentionally excluded from export in current behavior and should remain device-local.

---

# 34. Real-world acceptance fixture - Bavyeyi IV

The supplied Bavyeyi IV data should be used as an acceptance test for the new recipe/window model.

Known successful Turbo shots:

| Dose | Yield | Time | Grind | Temp | Result |
|---:|---:|---:|---:|---:|---|
| 18.0 g | 50.8 g | 18.5 s | 0.2 | 193 F | Dialed In; note: "Best one yet! Perfectly balanced" |
| 18.0 g | 51.2 g | 22.0 s | 0.2 | 193 F | Dialed In |
| 18.0 g | 49.7 g | 20.8 s | 0.2 | 193 F | Dialed In |
| 18.0 g | 50.2 g | 22.0 s | 0.2 | 193 F | Dialed In |

The new model should interpret these as a repeatable successful recipe family rather than replacing the recipe with the latest single shot.

Expected personal display concept:

- Yield window: **49.7-51.2 g**.
- Time window: **18.5-22.0 s**.
- Robust/initial centerpoint: approximately **50.5 g / 20.8 s**.
- Dose: 18.0 g.
- Grind: 0.2.
- Temperature: 193 F.

The most recent 50.8 g / 18.5 s shot can still be marked by the user as preferred/current because they explicitly considered it the best shot yet.

Two older non-green Bavyeyi shots remain personal history and do not affect community learning.

---

# 35. Current application audit - behavior to preserve

The latest supplied source and screenshots confirm these current behaviors that align with the desired rebuild unless explicitly superseded:

- Mobile-first compact card UI.
- Light/dark theme.
- Multiple coffee cards can be expanded.
- Shot History supports detailed radar/sensory inspection.
- Five required sensory scales with nothing preselected.
- Yield and time start blank on each new shot.
- Current app moves a coffee to the top when a shot is logged.
- Shot style is stored on the shot so historical shots do not silently relabel when coffee style changes later.
- Coffee details include roaster/source information and editable metadata.
- Add Coffee supports roaster URL and screenshots.
- Add Coffee can extract roaster-published espresso recipes.
- Tasting Preferences influence recommendation logic and the UI explains the influence.
- Temperature tracking is optional.
- Backup/import exists and excludes the device-local API key.
- Past-shot editing replays downstream personal recipe logic.
- Grinder community normalization uses relative position within the user's configured espresso range.

---

# 36. Current application audit - explicitly superseded behavior

The rebuild must **not** preserve the following current behavior unchanged:

| Current behavior | New required behavior |
|---|---|
| Community identity based on mutable shared keys/buckets | True canonical Coffee ID / release model |
| Community stores mainly aggregates | Store raw qualifying shots plus derived aggregates |
| Dialed In also requires a broad style/time tolerance | Dialed In depends on all required sensory markers being green; style ranges are guidelines |
| Great shot may be automatically reclassified by numerical style thresholds | Remove rigid reclassification; preserve selected style |
| Latest dialed-in shot can become the single current recipe | Build successful windows, centerpoints, and distinct recipe families |
| Grind is not actually required by current save-readiness logic | Grind is required in the rebuild |
| Derived grind recommendation may be inserted into log field | Actual field remains blank without prior actual value; recommendation stays separate with Use Recommendation |
| Current temperature fallback may come from derived recipe target | Prefer prior actual by coffee/setup/style; recommendation remains separate |
| One equipment setup only | One simple default plus optional multiple setups, with immutable shot snapshots |
| Shared coffee details can be changed through user copies without canonical verification model | One validated canonical factual record with source/audit workflow |
| "We do not record any personal information" footer | Replace with accurate account/privacy disclosure |
| Single recipe aggregate can blend materially different successful approaches | Separate recipe families |

---

# 37. Gap and contradiction audit

The workshop resolved many important contradictions. The following still require explicit design decisions or technical confirmation.

## 37.1 Build-blocking or schema-sensitive open decisions

### A. Meaning of "Make Current Recipe"

We have established that a user can make a successful shot/family current and that the old family remains as an alternate.

Still to define precisely:

- Does pressing **Make Current Recipe** make the exact individual shot values the primary next-shot target?
- Or does it make that shot's **recipe family/window** primary while continuing to display a robust centerpoint?

Recommendation for later review: family/window should remain the durable object, with the selected shot optionally marked as the user's favorite example. This avoids reverting to one-shot false precision.

### B. New coffee before its first shot

Current-coffee semantics say a coffee becomes current when a shot is logged, not merely viewed.

When a brand-new coffee is added but has no shot yet, decide:

- current coffee remains pinned and the new coffee opens below it; or
- Add Coffee creates a temporary "ready to dial" focus without changing the persisted current coffee.

Do not silently make a coffee current merely because it was added unless explicitly decided.

### C. "No, just log it" after a meaningful deviation

If the user declines Start an Experiment:

- the shot should still be logged;
- if non-green, it remains personal/private;
- if all-green, it is community-eligible by the global Dialed-In rule.

Still to define: should an all-green meaningful deviation that the user says was **not** an experiment affect the personal current family/window, form a hidden candidate family, or be retained as a successful outlier without changing personal recipe state?

### D. Experiment trigger reference point

Thresholds are defined, but the comparison baseline is not yet explicit.

Candidates include:

- current preferred family centerpoint;
- current preferred window boundary;
- previous actual shot;
- current displayed recommendation.

This matters especially for time and natural variability.

### E. Grinder scale semantics

Current app assumes lower numbers are finer.

Public V1 should decide how to handle grinders where:

- higher numbers may be finer;
- the scale wraps across rotations;
- the grinder is stepped vs stepless;
- the meaningful adjustment step is not one decimal place.

This affects normalization, experiment detection, and "Use Recommendation."

### F. Community correction after editing an already-contributed shot

The user can edit a shot and community contributions are durable.

Need to distinguish:

- legitimate correction of a typo/measurement, which should update the anonymous contribution;
- personal deletion/hiding, which should not delete a valid contribution;
- corruption/abuse, which can remove/replace the contribution.

The new backend needs an immutable contribution ID/versioning policy.

### G. Recipe-family scope across setups

Every shot is tied to an equipment setup.

Need to formalize whether preferred/current recipe family is keyed by:

- coffee + equipment setup + style; or
- coffee globally with setup-specific variants.

Recommendation: treat setup as a first-class recipe-family dimension so a recipe on one grinder/machine does not overwrite another setup's preferred recipe.

## 37.2 Important recommendation-model questions that can be solved during engine design

### H. Robust successful range algorithm

Need exact sample thresholds and estimator.

Suggested design direction:

- small N: observed successful range;
- larger N: robust quantile/MAD/trimmed window;
- center: median or trimmed mean rather than raw mean when outliers accumulate.

### I. Adaptive grind experiment threshold

The product owner confirmed 0.1 is meaningful on a 0.0-5.0 grinder.

A candidate general rule is approximately one real adjustment increment or a small percentage of configured espresso range, but this is not yet approved.

### J. Preference-aware recipe families vs strict green sensory targets

There is a conceptual tension worth resolving carefully:

- community family selection should support a user who prefers more clarity vs someone who prefers more body;
- current Dialed-In criteria require Body exactly at the green center and Clarity at the maximum green value.

Possible solutions include:

- infer family sensory tendency from recipe/style/equipment mechanics while green ratings only establish quality;
- add a lightweight optional preference/favorite signal after a successful shot;
- allow preference-specific interpretation of "ideal" without increasing routine input burden.

Do not change the five-scale UX until this is intentionally decided.

### K. Existing deterministic suggestion rules after style ranges become guidelines

Current engine prioritizes time correction before flavor in many cases.

The rebuild should preserve useful mechanical diagnosis but revise logic so:

- an all-green shot is not "corrected" merely for missing a time guideline;
- style range deviations inform, not veto;
- non-green shots can still use time to diagnose grind/flow issues.

This rule set should be re-audited against the prior research modules before production.

### L. Hard plausibility bounds vs experimentation freedom

Current user input bounds include approximately:

- dose 12-28 g;
- yield 12-100 g;
- time 5-60 s;
- temperature 85-99.9 C.

These are useful typo guards but may be too strict as hard blocks for unusual valid espresso.

Before production, decide which values should hard-block vs warn-and-confirm.

## 37.3 UX questions that can be decided after schema/architecture

### M. Feedback after a non-experiment bad shot on an already dialed-in coffee

The user does not want the Experiment panel unless they confirm an experiment.

Still decide whether the app shows:

- a brief temporary recommendation after save;
- only the shot in history;
- or a small non-persistent result card.

### N. Multiple expanded coffee cards when current coffee changes

The previous current coffee should collapse when another coffee becomes current.

Still decide whether unrelated reference coffees the user had expanded stay open or collapse too.

### O. Add Coffee canonical-search presentation

Canonical lookup behavior is defined, but exact screen choreography is not:

- whether exact matches appear automatically under URL entry;
- whether there is a separate "Find existing coffee" affordance;
- how to display likely fuzzy match confidence without clutter.

### P. Screen vs bottom-sheet choices

The user likes separate screens/sheets for Settings, Add Coffee, and Log Shot.

Exact breakpoint behavior and which are full-page vs bottom-sheet can be decided during responsive design.

## 37.4 Public-launch/deferred questions

### Q. Free-text Community Shot notes

Need moderation/reporting and accidental-PII handling before broad public release.

### R. Monetization/app-funded AI

Deferred until a paid model is defined.

### S. Additional shot-profile families

Earlier research covers blooming, declining-pressure, lever-style, low-flow, allonge, modern high-extraction, etc.

Current product UI supports Traditional, Turbo, Ristretto, Lungo, Custom.

Decide later whether advanced named profiles should become first-class styles or remain under Custom/advanced equipment modes.

### T. Native apps

Deferred; PWA first.

---

# 38. Contradictions already resolved

The following issues were explicitly reconciled and should not be reopened without a new reason:

- **Browsing vs current coffee:** browsing does not change current; logging a shot does.
- **Dialed-In persistence:** later bad shots do not remove Dialed-In status from a coffee with established successful history.
- **Community eligibility:** non-green shots never affect community aggregates; green shots do.
- **Recommendation deviation:** user may freely ignore a recommendation; no deviation warning is needed.
- **Style enforcement:** style ranges are guidelines; remove rigid numeric reclassification.
- **Recipe precision:** repeated success should create a window/centerpoint rather than overwrite with each latest shot.
- **Multiple successful approaches:** materially different successful approaches become separate recipe families, not one widened range.
- **Experiment confirmation:** possible experimentation is detected after rating; user confirms before Experiment workspace begins.
- **Experiment continuity:** once started, subsequent Log a Shot actions stay in the experiment until End Experiment or promotion.
- **Candidate lifecycle:** first successful experiment can become current immediately; second successful repeat confirms the family.
- **Successful but not preferred:** valid all-green experiment can remain a community/candidate recipe even if user returns to the old preferred recipe.
- **Bag scope:** V1 bag detail stays simple - optional Roast Date + Frozen only.
- **Search:** simple search + Recent/A-Z only; no filters.
- **Current coffee pinning:** current coffee remains pinned even in A-Z, except it can disappear temporarily when search does not match.
- **Shot detail:** expand inline to enable multi-shot comparison.

---

# 39. Recommended relational data model

This is a direction, not a final provider-specific schema.

## 39.1 Core entities

### User

- id
- email
- auth metadata
- account status
- created_at / deleted_at

### UserSettings

- user_id
- theme
- tasting_preferences
- default_equipment_setup_id
- other UX preferences

### BetaInviteLink

- id/token hash
- status
- created_at
- revoked_at
- optional usage metadata

### EquipmentSetup

- id
- user_id
- name
- active/default flags
- machine model
- grinder model
- burr set
- basket
- capabilities
- usual dose
- grinder range metadata
- temperature tracking/unit

### EquipmentSetupVersion / Snapshot

- immutable versioned equipment state used by historical shots

### CanonicalCoffeeRelease

- stable Coffee ID
- release/lot identity
- roaster
- canonical facts
- availability
- related-release group

### CoffeeAlias / CoffeeURL

- normalized URLs
- aliases
- prior names/URLs

### CoffeeSource / CoffeeRevision

- source URL/type
- extracted facts
- verification status
- change history

### UserCoffeeLibraryEntry

- user_id
- coffee_release_id
- library state
- added_at
- current/preferred context as appropriate

### Bag

- user_library_entry_id
- roast_date optional
- frozen optional
- active/archived

### Shot

- id
- user_id while account exists
- coffee_release_id
- bag_id optional
- equipment_setup_id
- equipment_snapshot/version id
- style
- dose
- yield
- ratio derived
- time
- grind actual
- temperature actual optional
- sensory values
- notes
- dialed_in
- experiment_id optional
- created_at
- edited_at
- recommendation-origin metadata

### Experiment

- id
- user/coffee/setup scope
- baseline family id
- status active/ended/promoted
- created_at/ended_at

### RecipeFamily

- id
- scope (personal/community)
- coffee release
- setup/style dimensions as applicable
- status candidate/confirmed
- robust parameter distributions/window
- centerpoint
- confidence/sample counts

### UserPreferredRecipe

- user + coffee + setup context
- preferred family id

### CommunityContribution

- durable anonymous contribution derived from qualifying shot
- detached contributor-group identity for weighting
- shot/contribution version semantics

### CommunityAggregate / RecipeFamilyAggregate

- cached robust aggregate metrics
- shot count
- contributor count
- confidence

### PendingCoffee

- temporary identity + source material/structured fields
- verification status

### AdminReview

- pending coffee conflict
- canonical fact conflict
- abuse/impossible shot

---

# 40. Technical architecture direction before provider selection

The current single-file/browser-storage artifact architecture should be replaced with:

- Mobile-first PWA frontend.
- Proper backend API/service layer.
- Relational database suited to canonical identity and shot relationships.
- Auth provider/service with secure persistent sessions.
- Local cache/offline shot queue.
- Modular AI extraction service.
- Derived community aggregate jobs/cache.
- Admin interface.

Provider/hosting choices remain open and should be selected after budget/operational preferences are known.

---

# 41. Acceptance criteria for the core beta loop

A beta build is not ready unless all of these are true:

1. Existing user opens the app and immediately sees current coffee expanded with Log a Shot ready.
2. Looking at another coffee does not silently change current coffee.
3. Logging a shot on another coffee makes it current and collapses the prior current coffee.
4. Yield and time open blank; dose/grind/temp follow the approved prefill rules.
5. Grind is required.
6. All five sensory ratings are required.
7. All-green sensory ratings mark the shot Dialed In regardless of style-time guideline.
8. Non-green shots do not contribute to community data.
9. Repeated green shots build a successful window and robust centerpoint.
10. Materially different green recipes can remain separate families.
11. Experiment prompts occur after rating and only start the Experiment workspace if the user confirms.
12. Candidate/confirmed alternate recipe lifecycle works.
13. Old successful recipes are never destroyed merely because a new one becomes current.
14. Shot details expand inline and multiple shots can be compared.
15. Current coffee stays pinned outside search.
16. Search matches all defined coffee-card metadata and does not alter current coffee.
17. Community shot counts and contributor counts are distinct.
18. Account/private data is separate from durable anonymous community data.
19. Claude is optional; no key still permits Pending Coffee and shot logging.
20. Imported Bavyeyi data produces the expected successful window/family behavior.

---

# 42. Build-readiness status

The product definition is now mature enough to begin formal architecture and prototype planning, but implementation should not begin blindly.

Before coding the persistent backend/schema, resolve the **schema-sensitive open decisions** in Section 37.1 and choose the technical stack/hosting/auth approach.

Most other open questions can be answered one at a time during UX and engine design without blocking the overall architecture.

The recommended next sequence is:

1. Preserve all relevant chats/files in one ChatGPT Project/workspace.
2. Treat this specification and decision ledger as the canonical requirements record.
3. Import/move the prior espresso research conversations into that same project so the evidence reports are available during recommendation-engine implementation.
4. Resolve the schema-sensitive questions one at a time.
5. Choose hosting/backend/auth stack and budget.
6. Draft the database schema and API contracts.
7. Draft recommendation-engine modules and test fixtures.
8. Build the mobile-first beta shell and core logging flow.
9. Add canonical coffee ingestion/community systems.
10. Migrate current data and run acceptance tests.

---

# 43. Change-control rule going forward

For every future product decision:

- Ask one question at a time.
- Record the answer as **Locked**, **Open**, **Deferred**, or **Superseded**.
- Update the master specification before implementation if the decision changes behavior or data modeling.
- Preserve prior rationale when a decision is superseded so the team can understand why the design changed.
- Do not silently infer a new requirement from an implementation shortcut.

The goal is to keep the app simple for users while keeping the project record detailed enough that nothing important falls through the cracks.

---

# Appendix A. 2026-10-14 owner-only historical import exception (approved)

**Status: Approved, scope strictly limited.** On 2026-10-14, the owner explicitly approved importing previously reviewed personal espresso history into their **existing, authenticated, admitted, private cloud account before completing an end-to-end hosted Supabase service rebuild**. This is an explicit, narrow exception to the order of recovery verification for owner-only testing, not a claim that full disaster recovery has passed. The previously Locked privacy, account ownership, backups, and public-beta release requirements remain in force. The original v1.0 sections are preserved above.

## Scope and implementation safeguards

- Only the original existing admitted account may perform one atomic native import of its reviewed personal backup into an empty cloud workspace. Server authorization is restricted to that account, independent of browser UI state and untrusted file claims. No admission or public registration is enabled. Preserve Netlify visitor/team SSO.
- The owner retains the original untouched iPhone/Mac v0.2.0 application and personal data, the reviewed original JSON, and the separately downloaded import-recovery JSON. Do not place private exports, notes, credentials, or original history in GitHub or public test fixtures.
- Before enabling the exception, independently check sole admitted-account status, empty target workspace, unchanged import guard, privacy policies and current encrypted offsite backup. Existing verified evidence includes a source-inclusive ciphertext GitHub-to-Google-Drive delivery and an offline PostgreSQL recovery of 35 first-party tables, row counts, 37 RLS policies, 91 indexes, 19 app triggers, 29 functions and the first-party signup trigger. These checks **do not** verify restoring Supabase-managed configuration, authentication services, SMTP/JWT, Netlify access, or future Storage object bytes.
- The import guard is a one-time server-side owner-identity-scoped exception, with a finite expiration and immediate re-lock after successful commit. Do not falsely set `recovery_verified_at` to indicate hosted restoration. All other admitted users remain ineligible, even if invited later. If the eligible owner does not complete the import before expiry, re-check safety before any renewal.
- The owner must review the local counts and coffee names, run real server-side validation, keep the independent recovery download and acknowledge the source-device preservation before committing. Validation alone leaves cloud rows unchanged. Any successful import is all-or-nothing and idempotent; conflicting inputs must not silently overwrite history. Preserve missing grind as missing, recorded zero as zero, unknown historical feed as unknown, historical dates/notes/versions, and Current Coffee semantics. Never fabricate shot records for the added unlogged coffee.
- After the owner commits, verify actual per-owner row counts, family associations, personal notes, provenance, idempotent replay, app reload and the Log Shot -> Rate -> Recommendation flow. Independently create and check a fresh **encrypted source-inclusive, offsite** backup of the now-nonempty source; restore those populated rows into an isolated instance and compare counts before treating the milestone as recovered.

## Requirements that are NOT waived

Full hosted Supabase restoration and recreation/verification of provider Auth and settings, email SMTP and redirects, JWT/API signing and secrets, Netlify/GitHub/Drive operational access, real cross-account privacy, real-device tests, admin workflow and community qualification remain release blockers before **external beta**. This exception does not authorize public access, new user onboarding, paid services, DNS/domain purchase, any loosening of RLS, or deletion/replacement of original local history. Reassess and record any later change in both canonical specification and Decision Ledger before implementation.
