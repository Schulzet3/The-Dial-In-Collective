# Current Requirements View — October 22, 2026

> **Navigation and conflict-resolution view, not a replacement specification.** GitHub's [Master Specification](MASTER_SPECIFICATION.md) and [Decision Ledger](DECISION_LEDGER.json) remain authoritative. A later **explicit** owner-approved narrow supersession governs only its stated scope; earlier requirements outside that scope remain in force. Read [CURRENT_STATUS](CURRENT_STATUS.md) and the [release queue](RELEASE_QUEUE.json) for **what is actually implemented, tested, READY or deployed**. An approval is not implementation or production release.

**Source checkpoint:** `development/backend-foundation` at `7ce3ecd587c0b9b6c14782d56feb93c3dccb46a6`. Generated from the canonical Decision Ledger's owner-decision keys and scoped-supersession registry. This document is a dated snapshot; reread canonical files before code or release changes.

## Current owner-specific operating and product boundaries

- **Log Shot → Rate → Recommendation** is the central journey. Every recommendation must remain honest about evidence and preserve actual measured values.
- **Outlier shot review is mandatory.** Members must confirm or correct an unusual shot before continuing. It is *not* optional or deferrable; no low-confidence personal measurements may bypass this decision.
- **Basket dose variance:** Show a dismissible advisory only for a **new shot more than 2 g** above or below the selected basket reference; exactly 2 g is not a warning. Do not block shot logging or rewarn on editing a historical shot. Keep its original basket snapshot and revision.
- **Passwords:** Preserve the current minimum 8 characters, one number, one special character. Do not change this policy without new owner approval.
- **Offline and access:** Preserve owner-specific offline storage, existing working airplane-mode behavior, queued event/receipt history and immediate denial when a server access check reports revocation. Never infer offline revocation without network contact.
- **Community:** Shared qualifying observations follow the verified consent, moderation/outlier and data-integrity rules; personal notes and identifiable member records remain private.
- **Extractor:** Keep existing IP throttling, per-member daily budget and 30-second cooldown. Optimize only when reliability, usability, efficiency and bounded safe URL fetching are no worse. Transient server/site retrieval errors should not consume successful-lookup quota; exact already-verified URL/coffee reuse must respect roaster, release and lot identity.
- **Admin:** Direct-save and one-click resolution are permitted only within existing authorized roles and the owner-approved duplicate/conflict behavior. Preserve shot, note, account and audit history.
- **New espresso style:** Fast-Flow is sixth and distinct from Turbo; any Turbo evidence is only a tightly scoped unproven fallback, never copied history or relabelled shots.
- **GitHub/release:** Keep repo private on GitHub Free. Development approval covers implement/test/merge/queue, never publication. One explicit publish command authorizes one selected READY source-bound release with required safety checks and independent live readback. Owner alone monitors Netlify credits; do not impose an assistant balance gate.
- **Scheduled checks:** Weekly Sunday comprehensive test at 08:00 UTC and daily encrypted backups at 08:00 UTC are the operational requirement. Default branch (`main`) schedules, not development copies, are the actual GitHub scheduler. A pre-destructive database snapshot remains required only for potentially destructive changes.

## Scoped supersessions in the canonical ledger

These topic entries are reproduced as a navigable **index of recorded supersessions**, not an independent resolution of every older quotation.

| Topic | Current authority/value | Narrow scope |
|---|---|---|
| Limited invitation-only technical pilot | PILOT-INVITE-ONLY-TECHNICAL-20261018-01 | Owner approved preparing a small trusted invite-only technical pilot, not declaring the §41 complete beta. #10/#12/#13 remain required and unfinished. No production SQL migration, Netlify publication, paid credits/purchases, real invitations/accounts, public admission or provider configuration changes may occur without a separate specific owner aut |
| Product name | The Dial In Collective; dial in, dialed in and dialing in without hyphens. | Current product wording only. Historical filenames and quotations are preserved. |
| Production access | ACCESS-20261016-PRODUCTION-SSO | Production's extra Netlify login only; nonproduction SSO, Supabase Auth, verified email, admission, RLS and admin checks remain. |
| Publication cadence | OPS-20261014-02 | Batch deliberate tested releases with verified credits. Ordinary source/docs pushes do not publish; prior 0-credit observations are historical. |
| Release holds | OPS-20261016-CONSOLIDATED-RELEASE and the later recorded universal-URL release | Consumed one-release approvals, not perpetual publication authorization. Current request explicitly prohibits deployment and production-data changes. |
| Routine recovery UI | VISUAL-20261015-01 | Remove routine Recovery Options UI only. Preserve historical import code, closed server save gate, password reset, emergency unsynced export and operator recovery. |
| Badge lettering and shape | VISUAL-BADGES-ORIGINAL-REFERENCE-06 | Exact original dark-JSX fills in both themes; white for Traditional/Ristretto, black for other mapped badges; flat pills; no shadows. Non-badge boundaries stay defined. |
| Text effects | VISUAL-NO-TEXT-SHADOWS-04 | No text shadows, halos, glyph strokes or glow anywhere, including admin. Preserve existing contrast caveat. |
| Shot history controls | UX-HISTORY-CONTROLS-04 | Grind capitalized; phone date left; compact expanded-only Edit left / Make Current Recipe right; immutable hardware context and literal notes preserved. |
| Recipe captions | VISUAL-TEMP-CAPTION-20261016 | Keep Basket-based under Dose, remove Recommendation under Temperature; retain calculated target and meaningful evidence. |
| Coffee approval | COFFEE-20261014-01 | Owning admin exception and trusted release-specific automated verification only; unresolved member entries stay private Pending and usable. |
| URL extraction breadth | Universal roaster URL preview section of docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md | Safe authenticated extraction from any public HTTPS roaster; trusted official-source Verified promotion remains separate. Do not weaken SSRF/bounds or infer screenshot/OCR implementation. |
| URL preview cooldown | COFFEE-URL-20261016-01 | Shared account-wide >=30 seconds on known and unknown roaster previews. Manual entry/logging remain available; current 60/rolling-day budget is engineering tuning, not Locked. Old 25/day is not silently reinstated. |
| Owner historical import | OWNER-IMPORT-20261014 | One-use, expiring owner-only exception, now closed. Does not authorize repeat imports or new data writes; later successful hosted recovery is acceptance evidence, not a blanket import unlock. |
| URL preview daily budget | COFFEE-URL-DAILY-20261016-02 | Owner-Locked starting 12 allowed claims per admitted account per 24-hour budget window, shared by known/unknown sources; >=30-second shared cooldown, manual entry/logging, and source verification remain unchanged. Future increases require owner approval. Production applied with separate SQL-only migration and verified checks; no Netlify deploy. |
| Seven-level roast scale | ROAST-TAXONOMY-20261016-01 | Seven exact Title Case categories; former Light-Medium means Medium-Light; preserve existing five categories' numerical starting priors and meanings; add Ultra Light and Very Light with conservative fallback priors, avoid inventing taste/roaster evidence. Source/read compatibility plus frontend/server promotion/DB CHECK must be updated together. |
| Five named coffee roast-level corrections | COFFEE-ROAST-20261016-02 | Owner expressly designated four Verified catalog coffees and private Pending Wuri; never silently reclassify other coffees or promote Wuri, change source evidence, ownership or shot/community history. Apply after frontend support release. |
| Roaster Page URL Autofill application timing | NEW-COFFEE-URL-AUTOFILL-20261017-01 | One click on Autofill From URL fills available blank fields. User then reviews/edits and explicitly Add Coffee; no separate Apply step, automatic save, data overwrite, verification bypass, changed quotas or weaker source security. Preserve original decision unchanged as history. |
| Netlify credit balance monitoring | OPS-CREDIT-OWNER-MONITORING-20261017-01 | Owner self-monitors and proactively reports low funds. Current screenshot proves 940/1000 Personal, grant expiration Nov 14, 2026. Assistant should stop repeatedly seeking screenshots. Known 15-minimum/expired/invalid evidence blocks remain; release CI, explicit marker and separate owner approval still required. |
| Approval before Netlify/Edge/data publication | OPS-PER-RELEASE-OWNER-APPROVAL-20261017-01 | Ask owner and obtain affirmative per-release permission before executing any new production publication or the coordinated live data rollout. Ordinary docs/dev pushes and CI checks must never publish; keep all security/recovery gates. |
| Daily backup monitoring and restore exercise cadence | OPS-BACKUP-WATCH-CADENCE-20261017-01 | Keep exception-only daily backup watchdog; six-hour duplicate disabled at owner preference. Prior full recovery drill remains accepted. Periodic restore exercises are risk-based; owner-confirmed Task Push+Email preferences not to be questioned again. Do not delete archives. |
| Agtron-backed roast preview in seven-tier taxonomy | COFFEE-ROAST-AGTRON-20261017-01 | Allow strictly source-labeled numerical Agtron manufacturer ground-coffee Gourmet/Commercial anchor interpolation; unknown scale/sample yields explicit provisional Gourmet-ground suggestion. Preserve explicit roaster labels, member-entered selections, owner-approved existing coffees, all 7 labels, source provenance and no automatic Verified promoti |
| Producer estate corroboration and anaerobic narrative extraction | COFFEE-PRODUCT-NARRATIVE-20261017-02 | Use bounded matched product narrative to validate title Estate/Farm producer, and choose Anaerobic when specific anaerobic-natural/fermentation evidence clarifies Natural; preserve source Adv Natural and 96h as extras. Do not create unsupported fields, infer from navigation/FAQ/other products, or automatically edit saved coffee/shot data. |
| Alternate recipe family interface and preference-aware single window | RECIPE-FAMILY-INTERNAL-ONE-VISIBLE-20261020 | Show exactly one current recipe; internal ratio-led families preserved. Respect explicit manual saved favorite, compatible setup/basket/feed/calibration and repeated successes; use clarity/body only as low-confidence ratio tie-breaker. No new screen, auto save, fake sensory class, data mutation or Netlify deployment. |
| One-time purge of two TEMP QA #9/#34 synthetic Community observations | QA-9-34-TWO-SHOT-EXCEPTION-20261020 | Single owner-approved permanent deletion of BASELINE and OUTLIER QA shots and notes, two Community projections, links and quality checks; sanitize only eight matching audit shot payloads and six matching receipt response payloads to safe tombstones retaining identity/action/timestamps/replay metadata, confirm no favorites/reviews, protect 18 origin |
| Issue #19 recommended style placement | UX-FIRST-EXPANSION-STYLE-20261021 | One-time first manual coffee expansion instead of Add Coffee; preserve all other Locked decisions and data. |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |
|  |  |  |

## Current-owner decision record index

There are **51** `current_owner_*` entries in the consolidated Decision Ledger. This is an index of provenance; some earlier records have later narrow supersessions, so **do not** treat each indexed entry as simultaneously controlling.

| Ledger key | ID or status |
|---|---|
| `current_owner_approved_daily_budget` | COFFEE-URL-DAILY-20261016-02 |
| `current_owner_approved_roast_taxonomy` | ROAST-TAXONOMY-20261016-01 |
| `current_owner_approved_url_autofill` | NEW-COFFEE-URL-AUTOFILL-20261017-01 |
| `current_owner_release_preferences` | Recorded decision |
| `current_owner_approved_agtron_narrative` | Locked |
| `current_owner_github_continuity` | OPS-GITHUB-LIVE-RECORD-20261017-01 |
| `current_owner_outlier_research_20261018` | COMMUNITY-QUALITY-REVIEW-RESEARCH-20261018 |
| `current_owner_required_outlier_review` | UX-OUTLIER-MANDATORY-20261018-01 |
| `current_owner_scoped_confirmation_retry_release_20261018` | OPS-COMMUNITY-RETRY-RELEASE-20261018 |
| `current_owner_scoped_pwa_release_20261018` | OPS-OFFLINE-PWA-RELEASE-20261018 |
| `current_owner_approved_community_nested_layout_20261018` | UX-COMMUNITY-GROUPING-20261018-01 |
| `current_owner_approved_community_release_context_20261018` | UX-COMMUNITY-RELEASE-CONTEXT-20261018-01 |
| `current_owner_preparation_community_release_20261018` | Preparation completed and later authorized migration/publication consumed; scoped real-account role acceptance completed in closed #41. |
| `current_owner_beta_breached_password_opt_out_20261018` | BETA-AUTH-BREACHCHECK-20261018-01 |
| `current_owner_permanent_admin_and_beta_invitation_access_20261018` | ACCESS-PERMANENT-20261018-01 |
| `current_owner_single_use_beta_invites_20261018` | ACCESS-SINGLE-USE-CODES-20261018-01 |
| `current_owner_beta_member_soft_remove_only_20261018` | ACCESS-REVERSIBLE-REMOVE-ONLY-20261018-01 |
| `current_owner_approved_invite_only_technical_pilot_20261018` | PILOT-INVITE-ONLY-TECHNICAL-20261018-01 |
| `current_owner_approved_pilot_release_20261018` | PILOT-APPROVED-ONE-TIME-RELEASE-20261018-01 |
| `current_owner_approved_extractor_semantic_byok_20261019` | EXTRACTOR-CLAUDE-BYOK-20261019 |
| `current_owner_extractor_deterministic_only_20261019` | EXTRACTOR-DETERMINISTIC-ONLY-20261019 |
| `current_owner_grinder_range_info_20261019` | UX-GRINDER-RANGE-INFO-20261019 |
| `current_owner_recommendation_single_intentional_change_20261019` | RECOMMENDATION-SINGLE-INTENTIONAL-CHANGE-20261019 |
| `current_owner_recommendation_display_choice_20261019` | RECOMMENDATION-OPTION-A-ARROW-INFO-20261019 |
| `current_owner_autofill_button_only_20261019` | NEW-COFFEE-AUTOFILL-BUTTON-ONLY-20261019 |
| `current_owner_approved_extractor_2mb_isolated_study_20261019` | EXTRACTOR-2MB-NONPRODUCTION-BENCHMARK-20261019 |
| `current_owner_approved_adaptive_extractor_production_release_20261020` | EXTRACTOR-ADAPTIVE-RETRY-COMPRESSION-COMPACTION-20261020 |
| `current_owner_pwa_freshness_extractor_reliability_release_20261020` | PWA-STALE-CLIENT-AUTOFILL-EXTRACTOR-RELIABILITY-20261020 |
| `current_owner_one_visible_recipe_internal_families_20261020` | RECIPE-FAMILY-INTERNAL-ONE-VISIBLE-20261020 |
| `current_owner_protected_continuity_single_use_release_20261020` | OPS-PROTECTED-BRANCH-ATOMIC-RELEASE-20261020 |
| `current_owner_github_free_private_no_upgrade_20261020` | OPS-GITHUB-FREE-PRIVATE-NO-UPGRADE-20261020 |
| `current_owner_approved_two_qa_shot_purge_20261020` | QA-9-34-TWO-SHOT-EXCEPTION-20261020 |
| `current_owner_duplicate_first_automatic_catalog_approval_20261021` | COFFEE-DUPLICATE-FIRST-20261021 |
| `current_owner_expedited_two_migrations_and_production_20261021` | OPS-EXPEDITED-BETA-RELEASE-20261021 |
| `current_owner_hands_free_release_from_chat_20261021` | OPS-HANDS-FREE-APPROVED-RELEASE-20261021 |
| `current_owner_admin_records_edit_20261021` | OPS-ADMIN-RECORDS-EDIT-20261021 |
| `current_owner_universal_deployment_consent_20261021` | OPS-UNIVERSAL-DEPLOYMENT-CONSENT-20261021 |
| `current_owner_admin_low_friction_review_20261021` | UX-ADMIN-LOW-FRICTION-REVIEW-20261021 |
| `current_owner_sitewide_low_friction_correction_20261021` | UX-SITEWIDE-DIRECT-SAVE-20261021 |
| `current_owner_admin_one_click_resolution_and_dose_warning_20261021` | UX-ADMIN-ONE-CLICK-RESOLUTION-AND-DOSE-WARNING-20261021 |
| `current_owner_remove_hide_shot_control_20261021` | UX-REMOVE-HIDE-SHOT-CONTROL-20261021 |
| `current_owner_retire_hide_shot_backend_20261021` | UX-RETIRE-HIDE-SHOT-BACKEND-20261021 |
| `current_owner_first_expansion_starting_style_20261021` | UX-FIRST-EXPANSION-STYLE-20261021 |
| `current_owner_defer_private_hide_shot_retirement_20261021` | UX-DEFER-PRIVATE-HIDE-SHOT-RETIREMENT-20261021 |
| `current_owner_fast_flow_hybrid_20261022` | UX-FAST-FLOW-HYBRID-20261022 |
| `current_owner_streamlined_release_20261022` | OPS-STREAMLINED-RELEASE-20261022 |
| `current_owner_autonomous_build_test_queue_20261022` | OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022 |
| `current_owner_single_instruction_development_and_publication_20261022` | OPS-SINGLE-INSTRUCTION-DEVELOPMENT-AND-PUBLICATION-20261022 |
| `current_owner_no_netlify_credit_checks_20261022` | OPS-NETLIFY-CREDITS-OWNER-ONLY-NO-GATES-20261022 |
| `current_owner_proactive_project_instructions_suggestions_20261022` | OPS-PROACTIVE-PROJECT-INSTRUCTIONS-RECOMMENDATIONS-20261022 |
| `current_owner_oct22_refinements_20261022` | UX-OWNER-REFINEMENTS-20261022 |

## Pending work and open owner decisions

- **0** entries currently listed in `open_current_owner_decisions`. This count is only that collection, not every backlog item or future product choice.
- Owner-approved but unfinished work is tracked in [Issue #80](https://github.com/Schulzet3/The-Dial-In-Collective/issues/80) and the release queue; the scoped READY work does not make the whole issue READY.
- If current source behavior conflicts with the explicit latest owner instruction, **flag it and preserve other-chat changes**. Do not silently replace already-approved product rules or apply an unrelated provider migration.
