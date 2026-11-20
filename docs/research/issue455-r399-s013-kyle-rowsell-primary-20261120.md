# #455 R399 — S013 Turbo/Traditional source date and chapter verification (2026-11-20)

**Scope:** owner-authorized #455 Option B, research/provenance correction only, on development. No product, privacy, SQL/Auth, offline, Community, recipe policy, release queue or deployment change.

## Immutable source provenance

- Preflight: development `1409901348ae9d2f462d0077f421fcc699f07b6e`, `docs/ai/PREFLIGHT.md` verified Git blob `3742fed0176c809b115320c698a0e8b1675b2d3e`.
- Original October 29 research ZIP: 66,421 bytes, SHA-256 `7d562a4536cf4f79bfa17898672ff6a2ec30aa6c1147e7a33f3d06017776bf1d`, freshly re-fetched from connected owner-only Drive and independently hashed **before this review**. `sources.json` archived member SHA-256 `d67901197e0af2aff46ff69bcbc956afe95f2579afc2f9c3d2a3f062dd0cffbe`; original archive/member bytes remain unchanged and are **not copied into GitHub**.
- The archived **S013** entry identifies Kyle Rowsell's original `https://www.youtube.com/watch?v=0UfVUoTuVrk&t=288s` but gives `publication_date: 2022-06-20`. That field is a **source metadata mismatch**, not a product requirement.

## New independent public-source check

- The video publisher's **YouTube listing** identifies creator **Kyle Rowsell**, title **Modern Espresso: Turbo Shot Vs Traditional Shot**, publication **June 24, 2022**, with chapter markers **1:05 Traditional Espresso**, **4:48 Turbo Shot**, **6:30 Turbo Explanation**, **8:12 Notes on Turbos**. Primary listing: https://www.youtube.com/watch?v=0UfVUoTuVrk .
- Kyle Rowsell's **own Patreon sitemap** independently records **June 24, 2022 — HOW TO MAKE MODERN ESPRESSO: Turbo Shot Vs Traditional Shot**: https://www.patreon.com/kylerowsell/sitemap . Thus the archived June 20 date conflicts with two creator-controlled published records. **Derived citation date should be June 24**; do not rewrite the byte-preserved research archive.
- `288 s = 4:48` verifies the archived **S013 start-of-Turbo chapter navigation** against the primary publisher description; it does **not** verify a specific 17g→51g dose/yield, a 15–18s recipe, video audio/transcript, roast-specific superiority, or improved cup quality.
- Direct streaming playback of the original video and timecoded spoken transcript remain **unverified**. Third-party timestamp/recipe transcriptions are secondary, not equivalent to independent controlled experiments. Grade **B** for creator/date/chapter metadata; grade **D/UNVERIFIED** for transferable numeric or personal sensory-effect claims.

## Current approved behavior crosswalk

- At development `1409901348ae9d2f462d0077f421fcc699f07b6e`, `site/lib/constants.js` blob `d3559dc1c9560c4d68fbcad1dc91e3a792a100a2` keeps **Traditional, Turbo and Fast-Flow distinct** among five selectable styles. Existing Turbo ratio priors and 12–18s intervals differ from distinct Fast-Flow 10–16s starting intervals and are explicitly **heuristics, not universal pass/fail boundaries**.
- `site/lib/engine.js` blob `7c588587f684c748ce9bd1a73fd91050f00af184` preserves five-complete-rating abstention and all-green success before style/timer corrections. The current Master Specification and Decision Ledger lock those behaviors, independent successful recipe families, original measurements/notes, same-coffee context and one genuinely controllable adjustment.
- **No reproducible app defect established** from this citation correction. No policy update, new time/ratio threshold, style merge, telemetry, member-data read or experimental claim is justified. Earlier #335 original science and #455 R380 F027 35-cell research-only grid remain separately credited; no duplicate review or test count.

## Acceptance / evidence / next action

- **Verified:** original archived S013 date `2022-06-20` disagrees with both first-party public listings `2022-06-24`; the S013 288-second citation navigates to the video's first Turbo chapter, not proof of its recipe claims. Owner-private archive and creator identities preserved.
- **Not done / not claimed:** video playback/transcript, numerically validated turbo optimum, independent personal espresso quality gain, standalone S019 original PDF, exhaustive #267 source-line audit, application test/build/CI pass or READY status. No app/test/SQL/CI source changes in this documentation-only increment.
- **Status:** provenance correction documented, app change **NOT_APPLICABLE**. Next distinct bounded increment should target an unverified primary *content* claim or a reproducible Log Shot → Rate → Recommendation defect; do not repeat S013 chapter/date check.

