# Master Specification Addendum: Original Dark Badge Colors

## Owner-approved refinement of VISUAL-20261015-01

The project file `dial-in-collective.jsx`, specifically its dark `THEME_CSS` variables and `STYLE_BADGE` mapping, is the source of truth for badge fill and text colors. Apply those original dark colors identically in both Light and Dark modes. Do not substitute brighter approximations or reintroduce theme-dependent badge fills. Preserve the newer layouts, clear badge outlines, spacing, label capitalization and behavior.

Exact pairs and source-file fingerprint are in [BADGE_PALETTE_SOURCE.json](BADGE_PALETTE_SOURCE.json). The source's blue progression is Ristretto `#2C506D`, Traditional `#3E7098`, Custom `#588FBB`, Turbo `#92B6D3`, and Lungo `#BED3E4`. Dialed In uses `#6CBB58`. Traditional and Ristretto use white lettering; the remaining original badges use `#1A120D`. Reuse the original dark sensory ramp for taste chips in both modes; the shared rating/compass colors follow the same ramp without changing sensory interpretation.

Pending, Conflict and Pending Sync have no direct badge counterpart in the JSX. Map their existing amber treatment to the source's dark gold `#E5BC6B`, with `#1A120D` lettering. This is a documented mapping for newer statuses, not a claim that those badges existed in the original. Borders retain the newer, defined outline treatment and are not claimed to be legacy borders.

Only the badge/taste palette is refined. All other Locked product, recovery, admission, data and calculation requirements remain unchanged. Source review is not permission to publish: keep this work on `work/visual-refresh-20261015`; no Netlify production or preview deployment, SSO change, database migration or account creation. Refresh browser screenshots for owner review.

Decision record: [DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json](DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json).
