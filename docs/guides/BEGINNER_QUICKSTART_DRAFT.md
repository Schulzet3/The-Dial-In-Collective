# The Dial In Collective — First Shot Quickstart (DRAFT)

**Status:** Private, unpublished beginner-guide candidate for Issue #37. **Evidence baseline:** released application source `release/production` SHA `05cf9eb156f63110cd434034ec3914a1e92b76d3`, Netlify READY/current deploy `6ae27f32bfae09ad8745e19b` (October 28, 2026). Source checked against `site/cloud/main.js`, `site/lib/constants.js`, `site/lib/ui.js`, and `site/cloud/shot_card.js` at that release. Do not present development-only features as available.

## First shot: the short path

1. **Sign in to the private beta.** Use **Sign In** with your verified email and existing password. If you see **Your Invitation**, enter the invitation code supplied for *your* account. Do not share invitations or passwords.
2. **Set up your equipment.** If this is a new workspace, choose **Set Up My Workspace**, add your machine and grinder, and save the setup. Grinder numbers use *your grinder's actual scale*; they are not universal. Where supported, choose the feed mode that matches how you grind.
3. **Add a coffee.** From **Coffees**, tap **Add Coffee**. Optionally paste the official product URL into **Roaster Page URL** and choose **Autofill From URL**. Review every suggested detail, especially roast, origin, process and tasting notes, before pressing **Add Coffee**. You can enter the coffee name and roaster manually if source information is missing. If an exact identity cannot be confirmed, your coffee can remain **Pending** and your own shots remain usable; it is not automatically shared as a verified coffee.
4. **Choose a starting shot.** Open the coffee card. A new coffee may show a suggested **Starting Shot Style** and **Log First Shot**. Otherwise review **Starting Recommendation** and tap **Log A Shot**. **Change Style** is optional. The available starting styles are Traditional, Turbo, Fast-Flow, Ristretto and Lungo; they are starting approaches, not pass/fail standards.
5. **Measure and rate the shot.** Fill **Dose (g)**, **Yield (g)**, **Time (s)** and **Grind Setting** using the measurements you actually observed. Optional temperature and Slow Feed appear only when supported by the saved setup. Rate all five scales under **How did it taste?**: **Extraction**, **Body**, **Clarity**, **Sweetness**, and **Astringency / Dryness**. For dryness, less is better. Add a private note if useful.
6. **Get the next adjustment.** Tap **Save Shot & Get Suggestion**. Reopen the coffee for **Next Shot Recommendation** or **Shot Feedback**. The suggestion may recommend changing one controllable variable while keeping the others constant. Think of dose, yield, time and taste as observations and starting guidance, not strict ideals. Log the next shot to learn what actually tastes best to you.

## After the first shot

- **Review or correct history.** Open the coffee card's **Shot History**, expand a saved shot, and use the available edit action. Historical shots remain attributed to their original setup/version and shot style. When eligible, **Make Current Recipe** selects a prior successful shot without rewriting its measurements.
- **Switch equipment.** Select the workspace name at the top of **Coffees** to use another setup. Recipe context depends on the chosen setup and coffee/style.
- **Community is different from private history.** **Community Shots** shows qualifying shared observations when online; it is not a feed of members' private notes. Coffee facts can be source-backed and member-reviewed. Personal tasting notes are private from other members, with the approved narrow administrator records exception.
- **Understand sync.** **Synced** means saved server state is up to date; **Offline** or **Pending** means some work may live on this device until reconnection. **Cloud Sync Details** shows pending changes. When you reconnect, check that your pending shot has synced before editing existing records or switching online-only controls. Do not erase browser storage while you have pending shots.
- **When the source is uncertain.** Inspect **Coffee Details**. Missing or contradictory coffee information should be left blank or corrected by you, not guessed from a roaster's unrelated coffee. **Retry Official Source Check** or **Check For A Verified Match** may be available for Pending entries while online.

## Accessibility and support notes

Every taste rating is a separately selectable control; complete all five before saving. The application supports keyboard operation and labels, but this draft **does not claim native VoiceOver or physical-phone certification**. Avoid relying on color alone to interpret feedback. If access is denied, sign in again with an admitted beta account rather than retrying someone else's invitation.

## Publication and maintenance checklist (not yet passed)

- [ ] The owner selects written, video, or combined final format and launch window. This written candidate is **not** an inferred final decision.
- [ ] Capture and review screenshots of the **actual authenticated production UI** on mobile and desktop, with synthetic/no-member-private data; verify every label and current layout against the live release. No prototype, unshipped screens, invitation tokens or member data.
- [ ] Complete real mobile readability and accessibility review, including screen-reader checks; if a video is chosen, prepare captions and transcript.
- [ ] Verify the complete first-shot walkthrough with a safely admitted test member or approved production-like test environment, including account/notes privacy, pending/offline cases and button labels. Existing synthetic Chromium/isolated tests alone do not satisfy this.
- [ ] Obtain separate explicit release approval before linking this guide from the app, publishing it on a domain, or producing any paid video. After each release, compare the guide's source SHA and UI labels, update screenshots and re-run the walkthrough.

**Maintainer:** Issue #37. **Next check:** current deployed interface + owner-chosen format and final accessibility; retain this revision as a draft until then. This document neither changes product behavior nor publishes content.
