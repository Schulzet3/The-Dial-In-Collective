# Issue #37 — beginner guide release and acceptance register

**Status:** Unpublished candidate, not a public guide; Issue #37 remains OPEN. Read-only GitHub source + independent Netlify project/deploy readback, October 29, 2026. No app changes, customer data operations or publication.

## Stable release baseline (not development)

| Item | Independently checked |
| --- | --- |
| Published source commit | \`05cf9eb156f63110cd434034ec3914a1e92b76d3\` on \`release/production\` |
| Actual Netlify deploy | \`6ae27f32bfae09ad8745e19b\`, state READY/current, published Oct 28 2026 23:03:32 UTC |
| Public app URL | \`https://app.dialincollective.com\` |
| Source crosscheck | \`site/cloud/main.js\` (auth/setup/Add Coffee/shot/sync), \`site/lib/ui.js\` (taste controls), \`site/lib/constants.js\` (five scales/styles), \`site/cloud/shot_card.js\` (history) |
| Proposed guide | \`docs/guides/BEGINNER_QUICKSTART_DRAFT.md\`; no live link |

## Corrections from the previous draft

1. The true New Setup form **requires** Setup Name, Basket Dose and finest/coarsest espresso values; Machine/Grinder/Burr Set/Basket Model are **optional**. The old guide wrongly implied machine and grinder names were required.
2. A first-time beta member can select **Create An Account**, verify the email and then redeem a one-use invitation. The old guide started at existing-account Sign In.
3. **Save Shot & Get Suggestion** returns directly to the expanded coffee card; instructing users to reopen it was misleading.
4. **Use Recommendation** must be a deliberate choice; generated measurements are never silently written into actual yield/time/grind fields.
5. Clarified where to enable Slow Feed, and that offline Add Coffee/Community are unavailable.

## Source-only verification, not device certification

- Static document-to-current-app-label contract: \`tests/issue37-beginner-guide-contract.test.mjs\`. It checks displayed actions/setup fields, five taste scales, flow order and draft status against live-source-derived labels in checked-in code. CI result must be recorded, not inferred.
- Prior PR228's published-source audit remains valid for unchanged release \`05cf9eb\`.
- Existing synthetic browser/mobile and PWA/offline suites may check general layout/controls, but they **do not** prove an admitted production member completed this guide, VoiceOver/TalkBack worked or a user successfully read these steps on a physical phone.

## Outstanding acceptance — do not silently waive

| Requirement | Evidence needed | Status |
| --- | --- | --- |
| Final material format and launch window | Owner explicitly chooses written, video, or combined and publication timing | **OPEN OWNER PRODUCT CHOICE** |
| Real production screenshots | Capture admitted test member's real published UI for invitation/setup, Add Coffee, starting recipe, measured shot form, five ratings, returned feedback, history and sync; redact synthetic data as needed | **NOT CAPTURED** |
| Complete first-shot trial | Genuine admitted test account or owner-approved equivalent exercising the six steps against *deployed* source; confirm all data boundaries | **NOT PERFORMED** |
| Mobile reading and accessibility | Real-phone or verified equivalent viewport reading, focus/keyboard and named screen-reader evaluation; video captions/transcript if chosen | **NOT PERFORMED** |
| Link/publish | One explicit scoped owner publication instruction, then actual Netlify/provider readback | **NOT AUTHORIZED** |

Once the owner chooses a format, finish source-linked screenshots/tests appropriate to that format, record evidence, and create a scoped READY queue item only when publication scope is approved and all other gates are met. Never label this draft READY or mark #37 closed solely from GitHub CI.
