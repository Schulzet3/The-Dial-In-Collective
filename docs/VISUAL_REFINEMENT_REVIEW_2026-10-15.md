# Coordinated visual refinement - review 7: original badge treatment and shot-history restoration

**State:** implemented on `work/visual-refresh-20261015` for owner screenshot review only. No Netlify deployment, SSO removal, production migration, import unlock or test-account creation is authorized here. Production remains on its existing release.

## Included
Original JSX dark-mode green and graduated blue badge fills, identical in Light and Dark, with black lettering in Light and white lettering in Dark; defined coordinated badge borders; stronger card and input edges; visible full-width Search & Sort toggle; coherent primary/secondary actions and selected states; title-case interface labels without reformatting personal names or units; simplified heading ligatures; consistent Settings dividers; Add Another Setup adjacent to Active Setup; Sign Out last with its icon; saved Light/Dark/System shared with the read-only admin page. Taste controls place endpoint labels below the targets to avoid overlap.

The routine Recovery UI has been removed by explicit amendment to `UX-20261014-05`. The closed server import gate, historical importer source, automatic encrypted backup system and operator recovery remain intact. An emergency Save Pending Changes action remains only when there are unsynced local changes. Password-reset functionality remains.

## Badge revision source and scope
The owner requested exact original dark badge colors rather than the first review's brighter palette. [Source manifest](BADGE_PALETTE_SOURCE.json) records the JSX fingerprint, variable mapping and exact colors. [Master Specification addendum](MASTER_SPECIFICATION_BADGE_COLORS_ADDENDUM.md) and [Decision Ledger amendment](DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json) record this refinement. The original Custom blue replaces review 1's purple; original Lungo pale blue replaces review 1's teal. Dialed In, Ristretto, Traditional and Turbo also use their original dark fills and text. New pending statuses use the source's dark gold, as a documented mapping rather than an original badge match. The taste ramp uses original dark values in both modes. No layout or calculation changes are included in this revision.

## Later owner-approved lettering amendment
White badge lettering in Dark and black in Light explicitly supersedes the original JSX lettering requirement, but not the original badge fills. The later owner-requested adjustment removes text halos/shadows/strokes entirely for the cleaner original app appearance. Some raw text/fill pairs fall below WCAG 4.5:1 and have not passed an independent accessibility audit. See [specification](MASTER_SPECIFICATION_BADGE_LETTERING_ADDENDUM.md) and [ledger](DECISION_LEDGER_BADGE_LETTERING_AMENDMENT.json).

## App-wide no-shadow rule
The owner rejected text shadows **anywhere in the app**, not only on badges. The visual review now globally disables text shadows on all elements and pseudo-elements in both themes; removes decorative card, dialog and toast box shadows; and uses strong borders and clear separation instead of faux text glow. Plain black badge letters in Light and white in Dark remain. The change is recorded as Locked decision `VISUAL-NO-TEXT-SHADOWS-04` in the [lettering amendment](DECISION_LEDGER_BADGE_LETTERING_AMENDMENT.json).

## Verification boundary
- The original recommendation engine, data model, Supabase migrations, API permissions and Cloud client are unchanged.
- Node tests cover the approved UI, existing behavior, appearance fallback, account-scoped admin theme fetch, body/action contrast, theme-specific badge lettering and exact legacy badge fill matching in both themes.
- Existing synthetic 390px regression covers shot logging, required ratings, mutation replay, offline queue, signout protection, coffee identity confirmation and layout.
- `tests/browser/visual_review.py` captures real Chromium renders of app/admin source in both modes. It tests home, Search & Sort, Settings, Log Shot, history, Add Coffee, sync, styles, sign-in, confirmation, read-only Admin and narrow widths. Account/backend responses are mock fixtures; no production data is used.
- Private rendering font files are used only to load the real fonts for screenshots. They are not included in the review deliverables or app source.

These are not real nonadministrator account/email acceptance tests, an independent full accessibility audit, an iPhone Safari test, or proof of complete hosted recovery. Those gates remain separate.

## Review hold
No release marker is included in this change. The Netlify build guard explicitly rejects production, branch and deploy-preview contexts for this review branch. Do not merge or publish until owner screenshot feedback is resolved.

## Review 6: owner-requested targeted adjustments
Original dark JSX badge fills are unchanged. All badge text is plain black in both themes; badge outlines are removed to match the flat clean style of the earlier app, while other interface boundaries stay defined. This later owner decision supersedes previous white-on-Dark text and bold badge-border treatments only. The New Coffee dialog has one continuous form without `Optional Coffee Details` or its divider; all inputs survive, including the six side-by-side metadata fields. The browser review includes assertions for absence of the heading and persistence of two-column form layout. Contrast limitations on black text over the darkest blue are disclosed; this is not WCAG approval.

## Review 7: original JSX alignment and recommendation hierarchy
The owner approved the badge reference preview (white text on Traditional/Ristretto; black text on green/lighter blue/gold, original fill colors, flat borderless pills) and supplied original-app screenshots for shot-history density, date layout and contextual notes. Shot History is restored to one-line measurement summary and right-hand numeric date where space permits; setup/basket/feed are revealed only at the bottom after expansion, with Expand All / Collapse All per coffee. Redundant local recipe-family explanatory sentence removed; no recipe calculations or cloud policy changes in this UI batch.
Canonical Master Specification Section 25.2 remains the recommendation-engine hierarchy. The current beta only partially implements the agreed eight tiers. Before claiming more specific coffee/community evidence, perform a verified engine rollout with tests; never infer weak coffee-density or process claims merely from origin/elevation. Screenshots use synthetic data; no public release.

## Verified personal-similar-coffee fallback (Section 25.2 tier 5)
An unproven coffee can conservatively use this user's **own successful shots** on the *same setup, style, feed condition and roast*, prioritizing shared process/origin/variety and basket. Ratio and time starting centers are lightly blended with roast/style priors, not copied as an exact recipe. Counts and source provenance are visible; the coffee is not marked Dialed In. Existing exact successful family and same-coffee cross-style evidence outrank the fallback. Historical unknown feed is not silently treated as Standard Feed. Grinder and temperature safeguards continue to apply. This is not a community aggregate or a claim of cross-account personalization. Full tier 3/4/6 community/release evidence and contributor weighting remain separate blockers for the complete engine.

## Review 10: compact actions, typography and unproven grinder search bands
As requested: Shot History labels Grind consistently; mobile date aligns with left-hand measurements; Edit and Make Current Recipe move into a compact bottom action row within expanded details. Taste chips use badge-level font weight and radar axes gain modest weight. An unproven starting grinder suggestion uses a bounded calibrated band plus a Try center, rather than claiming one exact setting. Proven successful Grind and explicit next-shot instructions keep a precise setting. The website's New Coffee URL matching and guarded post-submit official-source verification are present, but automatic extraction/fill is not. Continue screenshot review before publishing.

## Review 11 — URL preview and consistent controls
- New Coffee starts with Roaster Page URL and Autofill From URL. An opt-in source preview shows proposed structured fields and possible existing-catalog matches; Apply Suggested Details fills only blank fields. Preview uses fictional official metadata in screenshots; live service remains undeployed.
- Staged backend matching prioritizes URL candidates even if spelling differs, but treats mismatching releases or names as review-only. The immutable canonical Coffee UUID is NOT generated from a URL.
- Shared button tokens and improved type/casing reduce inconsistent overrides while retaining the original badge palette. All five sensory ratings and recommendation targets remain.
- Basket-based under Dose and Recommendation under Temperature are preserved verbatim for owner decision.
- No Netlify/Supabase deployment or RLS/auth policy change. Production integration and real roaster metadata coverage remain unverified until staged deployment and testing.
