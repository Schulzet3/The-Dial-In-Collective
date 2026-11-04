# Issue #37 — beginner guide and video acceptance register

**Current status (November 3, 2026 Denver): COMPLETED / DEPLOYED / OWNER-ACCEPTED.** The six-step in-app guide and captioned companion video were published in Release 13 (October 30). The owner subsequently saw both and played the video in the live app. This acceptance closes Issue #37 without misrepresenting unperformed optional device, screen-reader, end-to-end first-shot or instrumented HTTP-range tests.

## Historical pre-release source — verified October 29, 2026

| Evidence | Verified value |
| --- | --- |
| Actual published Git source | `816949840f22b2a181670de20410786d0a8de79b` on `release/production` |
| Netlify deployment | `6ae38ba0a56bed8fa17d20ac`, `ready` and `current`, published October 29 at 18:09:16 UTC |
| App | `https://app.dialincollective.com` |
| Earlier October 28 baseline (historical) | `05cf9eb156f63110cd434034ec3914a1e92b76d3`; Netlify `6ae27f32bfae09ad8745e19b` |
| Published-source label verification | `site/cloud/main.js`, `site/lib/constants.js`, `site/lib/ui.js`, `site/cloud/shot_card.js` |
| Support address source | `docs/MASTER_SPECIFICATION.md` confirms owner-observed successful Cloudflare Email Routing delivery test for `support@dialincollective.com` |
| Written reference file | `docs/guides/BEGINNER_QUICKSTART_DRAFT.md` (legacy filename); live six-step guide implemented by `site/cloud/help.js` |
| Companion storyboard (historical) | `docs/guides/ISSUE37_VIDEO_STORYBOARD.md`; live video is `site/media/first-shot-walkthrough.mp4` with WebVTT captions and transcript |

## Owner choices

- **Format: APPROVED — written guide + accompanying short video**, requested October 29, 2026. Previous "format undecided" state is superseded only for output format.
- **In-app tutorial release: COMPLETED.** Owner separately approved Release 13 and it published on October 30. Any broader marketing/public beta launch date is a distinct product choice and is not established by this guide acceptance.
- The published 135.56-second video uses synthetic demo account/coffee/shot data. It does not show genuine private member records. Owner confirmed live playback on November 3.

## Content improvements

1. Reformatted six dense paragraphs as six titled sections with concise bullet points and accessible detail headings.
2. Reorganized history, Slow Feed, Community/privacy, offline, and source uncertainty under independent scannable headings.
3. Added exact verified support contact `support@dialincollective.com` at the **end of If You Get Stuck**; the guide does not expose private mailbox forwarding destinations.
4. Updated published application SHA/deploy baseline from October 28 to actual October 29 Release10; retained old source IDs only as historical QA evidence.
5. Added concise companion video script/storyboard and accessibility captions plan without pretending to have authenticated production UI footage.

## Verification status and remaining acceptance

| Requirement | Status |
| --- | --- |
| Six-step guide labels and semantic order checked against GitHub source | **PASS** — Issue #37 contract and Release 13 source-scoped CI |
| Verified support email address in official Master Specification | **PASS — historical owner-observed delivery test**, not a newly sent live support email |
| Accurate published Netlify deploy and Git SHA | **PASS** — Release 13 verified on Oct 30; later Netlify READY/current source readback retained media |
| Format choice | **SETTLED: BOTH** |
| Genuine authenticated production screenshots / screen recording | **NOT CAPTURED** |
| End-to-end admitted-account first-shot acceptance | **NOT PERFORMED** |
| Physical phone and named screen-reader accessibility | **NOT PERFORMED** |
| Video captions/transcript, pacing and source-media QA | **PASS** — source QA and synthetic browser checks; named screen-reader test remains unperformed |
| Video publication and guide link in the application | **DEPLOYED** in owner-authorized Release 13; owner saw both and played video November 3 |
| Broader marketing/public launch date | **SEPARATE** — not required to complete this already published tutorial |

The guide and video are **already DEPLOYED**, not merely source-READY. The owner confirmed the live app presents both and plays the video. Maintain versioned documentation and reassess it after relevant product changes; the absent physical-phone, named screen-reader, admitted-account end-to-end first-shot and instrumented HTTP-range checks are not represented as passing. This closure documentation makes no Netlify/backend/SQL/Edge/Auth/member-data change.

## October 29: owner-approved green sensory rating representation

The owner observed that the app's taste ratings are not presented as numbers. The written draft's Dialed In table now uses **🟢 Green** in every row together with the on-screen descriptions: Extraction/Body **Balanced**, Clarity **Distinct**, Sweetness **Exceptional**, and Astringency / Dryness **None**. Confirmed against current app `site/lib/ui.js` colored severity buttons and `site/lib/constants.js` taste labels, severity zero, and `isDialed` criteria. The selected option displays a checkmark; the guide does not rely on color alone. A static regression contract now derives table expectations from the source and rejects exposed internal values.

**Scope:** documentation and tests only; no actual rating-engine or production change. Existing video storyboard contains no numeric targets and remains accurate. Final signed-in production/user-device acceptance and publication remain outstanding.


## Updated source-READY evidence — October 29 MDT / October 30 UTC
Previous historical draft-only statuses above describe the earlier concept and should **not** be read as the latest implementation status. Owner subsequently authorized in-app first-use and Settings integration of the already reviewed corrected video, not its Netlify publication. PR268 merged at `00fbb23a4dabea4d2e85309e1dd3405ff981f9d7`, final tested PR head `f6385df194569c2fcd1aeaf7a30ff86ff41d170e`. The exact 2,320,714-byte 135.56-second MP4, Git blob `81e8c145336f1837bbc8580bf91e2980e019e8b6` and SHA-256 `e8235c3c03f17541f07e0a3f0f9907f61c90c748586f069dfb93b7d49591b2aa`, is now in the GitHub source; build hash gate prevents missing/replaced bytes. Self-hosted video has controls, caption track and transcript; it is **not** service-worker-pre-cached, preserving expected streamed-byte-range semantics. All six applicable final PR-head and four merged-source GitHub workflows SUCCESS; immutable603 intentionally SKIPPED. Independent FFmpeg full decode and local Chromium actual media (via data URL, NOT host CDN) at 390/1280 widths verified 16:9, seek/play, 20 cues, no JS errors. Synthetic browser QA checked the actual Settings UI video/guide interactions at 390px. Scope-specific source is READY; Netlify publication and live user/member, physical device, named assistive-technology, provider-delivered HTTP Range and actual authenticated production screenshot acceptance remain **UNVERIFIED**. Keep Issue #37 OPEN through those broader acceptance items. No live deployment was instructed or performed.


## November 3, 2026 (Denver) — owner live acceptance, issue closure

Release 13 published on 2026-10-30 (production `42eb45aab12d1a47fe96a3ebe8a1f36b3913b5f7`, Netlify `6ae421f5de038d292bd66407`). On 2026-11-03 (Denver), the owner confirmed in the live app that the guide and video are visible and the video plays. Current Netlify was independently READY/current on a later source `31c66832a28247e657a2bf89592ebc1e2f48dfc5` that retains the same guide/video assets. This is owner-observed live functional acceptance, not a claim of a signed-in first-shot completion, physical-device test, named screen-reader test, or instrumented HTTP byte-range test.

**Closure disposition:** Issue #37 is complete for the owner-approved beginner guide plus video deliverable. Source is already deployed; no new publication, account, test-user, hosting, payment, SQL or member-data action is implied by this documentation correction. Historical October 29 draft-only and READY-only sections above remain provenance, not current status.
