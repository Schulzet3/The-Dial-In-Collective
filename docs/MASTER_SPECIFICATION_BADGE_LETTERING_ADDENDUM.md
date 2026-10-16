# Master Specification Addendum: Badge Lettering by Theme

Owner-approved amendment to `VISUAL-BADGES-LEGACY-DARK-01`: retain the exact original JSX **badge fills** in both themes and the defined borders, but use **black `#000000` text in Light** and **white `#FFFFFF` text in Dark** for Dialed In, shot styles, Pending and Admin status badges. This supersedes only the original-lettering portion of the previous addendum. Preserve all other Locked decisions.

**Later owner-approved amendment `VISUAL-BADGES-CLEAN-03`:** Do not use any text shadows, halos, strokes, or background overlays on badge lettering. Badge text must be crisp like the original app, retaining black in Light and white in Dark. This explicitly supersedes the earlier text-halo suggestion; preserve the original badge fills and defined outlines. Some text/fill combinations do not intrinsically reach WCAG 4.5:1 contrast, and an independent accessibility audit is still required. Keep sensory taste-chip contrast treatment unchanged, and preserve readable body/actions and the Log Shot -> Rate -> Recommendation workflow.

Review branch only: `work/visual-refresh-20261015`. No Netlify deployment, database or access changes before owner approval.

## Later owner-approved global rule: `VISUAL-NO-TEXT-SHADOWS-04`

**No text shadows anywhere in the app**, including badges, links, labels, ratings, action buttons, forms, overlays and Admin screens, in either theme. Do not reintroduce text glows, strokes, faux backgrounds behind glyphs, or decorative flourish to simulate contrast. Make text legible with appropriate font weight, clear solid fills, spacing, and conventional borders. Prefer clean, border-defined surfaces over decorative box shadows. Do not alter theme-specific black/white badge text or exact JSX badge fills without further owner approval. Existing WCAG contrast caveat remains.

This expands the scope of `VISUAL-BADGES-CLEAN-03` from badge lettering to the entire application. No Netlify deployment is authorized during screenshot review.

## Later owner-approved review refinements: `VISUAL-BADGES-ORIGINAL-BLACK-05` and `UX-NEW-COFFEE-SINGLE-SECTION-01`

**Badges:** Use the exact original dark-JSX badge fill colors in both themes with **plain black `#000000` lettering in both Light and Dark**, superseding the earlier white-in-Dark instruction. Render badges as flat, solid, borderless pills with compact Inter medium-bold labels: closer to the original app screenshots. This is a badge-specific exception to the otherwise Locked stronger UI borders. Never add text shadows, halos, outlines on glyphs, or decorative glow. The original darkest blue backgrounds with black text may not meet 4.5:1 WCAG AA contrast: flag for owner review rather than changing the Locked colors without consent.

**New Coffee:** Remove only the `Optional Coffee Details` heading, its open disclosure wrapper and its top divider. Preserve all original fields and the existing side-by-side Origin/Roast Level/Elevation/Process/Variety/Producer grid, with full-width Tasting Notes after it. The form is one continuous section; submission, validation, labels and data handling stay unchanged.

Changes are staged on `work/visual-refresh-20261015` for screenshot review. No Netlify publication, identity, backend or data changes are authorized.
