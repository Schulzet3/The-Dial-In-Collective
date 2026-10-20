# Approval gap forensics and interruption-proof work controls — October 20, 2026

**Evidence standard:** A contemporaneous GitHub receipt, owner quotation, code fragment or independent provider readback is evidence. An assistant's former “complete” message is not acceptance by itself. This review does **not** claim literal access to every message ever sent or every app runtime branch; limits and next verification requirements remain explicit.

## Sources actually examined

1. Canonical branch `development/backend-foundation` GitHub **Master Specification**, original Decision Ledger (79 original Locked + 20 original Open), 29 present `current_owner_*` decision objects, scoped supersessions, Current Status, AGENTS, archive/index/active reconciliation, issues #5–40, new #41, relevant issue comments, tested source, Netlify release guard, CI logs and current development-vs-production diff.
2. **Five available exported conversation PDFs**, not an entire account export: `Old Chat.pdf` (194 pages; 10,829 extracted text lines; ~276 distinguishable user-message segments), `Old 2.pdf` (33 pages; ~1,619 lines; ~20 user segments), `Build Web App.pdf` (66 pages; ~3,274 lines; ~52 user segments), `DIC Backup Watchdog.pdf` (11 pages; ~524 lines; ~8 user segments), `Recommend email domain hosting.pdf` (16 pages; ~809 lines; ~17 user segments). Parsing is best-effort; repeated screenshots, truncated excerpts and PDF formatting make segment counts approximate. Espresso roast/windows research PDF additionally reviewed as project evidence but not treated as a conversation transcript. **These project documents end before today's changes**.
3. Historical archives `Espresso_Recommendation_Engine_Handoff.zip` and `Espresso_Recommendation_Engine_Available_Archive_2026-08-21.zip`. **Explicit limitation in latter archive:** it does NOT contain original bytes for nine espresso-research knowledge-base files or complete chat histories; project-chat index and selective excerpts are NOT a full transcript. Follow-up discovery tracked in [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30).
4. Supplied prior JSX/TXT prototype, read alongside current source and prior original visual/reconciliation reports, but historical prototypes do not override later owner Locked UX decisions.
5. Provider readback October 20: Netlify deployment `6ad7be20bf672d5c8936f19a` READY/source `e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60`; Supabase ACTIVE_HEALTHY 30 migrations, current protected records 4 coffees / 18 shots / 18 notes / 2 Community / 5 enabled members / 8 historical invite codes (2 usable) / 0 orphan notes.
6. No live authenticated owner phone-screen capture or installed-PWA local cache inspection was possible through available provider APIs. Cloudflare and Resend plugins were not discoverable, so provider admin settings not independently rechecked here. These are NOT silently marked complete.

## Exact grinder UI discrepancy (not a source-publish omission)

**Later owner approval `UX-GRINDER-RANGE-INFO-20261019` explicitly says `New Setup`, NOT a current-setup editor.** At exact **deployed** source `e7e16e5`, `site/cloud/main.js::showSetup()` includes:

- `Grinder Espresso Range` heading and a lowercase `i` information control (`data-action="grinder-range-info"`, accessible label/expanded state).
- Exact helper: **Enter the range of grind settings you would normally use for espresso, not the grinder's entire adjustment range.**
- Existing Finest/Coarsest Espresso Settings fields and validation. The info toggles text only, not machine/grinder math.
- CSS `site/visual.css` provides 36px hit target, focus and [hidden] styling.
- The New Setup form is accessible from **Set Up My Workspace** for new accounts and **Settings → Add Another Setup** for existing users.

**But `Settings → Your Setup` is a different screen** that renders Active Setup, Rename, Add Another Setup and Advanced Setup Options, **without** a grinder-range section or edit controls. This *may* be the screen the owner is referring to. Adding an editor for previously created grinder settings would be a NEW product/data decision (#16/#17 equipment versioning and calibration semantics); the earlier approved New Setup i is no authorization to implement it silently. Ask one screen-specific question before expanding scope.

**Regression gap repaired in development**: previous `tests/ux-refinements.test.mjs` merely searched source text; added a real isolated **390px Chromium** test opening Add Another Setup, visually confirming the lowercase i, toggling exact text and aria-expanded state, verifying all fields stay, closing without creating a setup. [Runs cloud/mobile 39502967215](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39502967215) and [visual 39502967269](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39502967269) PASS. The owner device's exact route is still **UNVERIFIED**. No publish performed.

## Older approval-versus-supersession traps discovered

- Legacy discussions proposed **general historical imports**, but later explicit owner amendment withdrew that proposal; the narrowly accepted one-off authenticated import exception is now closed. Do **NOT** reopen server import writes as an “overlooked approved feature” (Master Spec §38 later amendments).
- Original prototype BYOK Claude capability was a Locked concept, but later explicit owner choice reverted the universal roaster extractor to deterministic-only. Do **NOT** implement AI auto-extraction without a fresh scoped decision.
- Early Option B next-shot display was later explicitly corrected to uncluttered **Option A arrow + lowercase i**, no “One adjustment at a time” banner. This is present in deployed source, tested; rejection of old Option B must remain.
- Issue #40 owner **rejected** suggested broad redesigns of Coffees, Log Shot, Shot Feedback and Settings; only a larger Autofill From URL button was approved and later published. These cannot be treated as missed tasks.
- Earlier collapsed **Alternate Dialed-In Recipes** concept was superseded Oct20 by **one visible recommended family with multiple internal source-backed families**, tested in development only; no new deploy approval. User's earlier optional recipe-naming discussion does NOT justify displaying a new alternate-family UI.
- Community release-context grouping, nested cards and invitation controls were implemented and deployed, yet four old current-owner Decision Ledger status strings still said “not published”. **Fixed their status only**, preserving original words and provider evidence in `publication_state_reconciliation_20261020`; this was an actual handoff inconsistency.
- User first-hand confirmed a registered member's Community phone browse, so #11 closed explicitly; genuine two-account signed API private-data and admin denial remains #41. Distinguish UI acceptance from a security penetration test.
- #38 documents two separate GitHub release markers and two READY Netlify deploys for **one** earlier owner consent. A commit subject marker plus `[skip netlify]` is not an atomic cross-worker once-only lock.

## Root causes of repeated gaps (observed engineering/process weaknesses)

1. **Distributed authority**: owner decisions in multiple chat/PDF exports, dated GitHub issues and additive ledger records, with no enforced 1:1 acceptance mapping. Latest owner instruction may narrowly supersede an older requirement, but search-only audits see both.
2. **Implementation vs release confusion**: GitHub code, Netlify READY/current, service-worker client activation, and owner's actual device are distinct layers. Previous checks declared source present but not actual phone UI acceptance; stale PWA cache previously explained old Autofill button.
3. **Incomplete route acceptance**: the Grinder i test checked the New Setup template, not the existing Settings route or actual click/toggle on a narrow phone. Missing on an owner's screen might be a genuine route mismatch, not absent code.
4. **Human-only continuity process**: prior AGENTS requested real-time notes but nothing enforced them per commit. Docs-only commits were excluded from normal workflows; multiple commits could be bundled so an early undocumented change was hidden by a later summary.
5. **Release coordination race**: issue #38 proves concurrency across chats can create duplicate deployment markers. The Netlify ignore-build command is not inherently an atomic, consumed-once owner authorization.
6. **Partial historical inputs**: complete private conversation export and nine original research files are unavailable in current runtime. Neither 269 repository files nor 29 newly owner-keyed ledger entries constitute the complete universe of all original conversation messages. A promise of literally zero gaps would be unfalsifiable without exhaustive source access and independent acceptance.

## Defenses implemented NOW, without spending credits or changing user data

| Layer | Enforced source | Failure behavior |
| --- | --- | --- |
| Canonical and historical decision protection | `docs/APPROVAL_COVERAGE_MATRIX.json`, `scripts/audit/approval-coverage.mjs` | New/unaccounted `current_owner_*` key or changed original 79 Locked / 20 Open baseline hash fails CI/build |
| Approved UI presence and rejection checks | Eight critical contracts, New Setup/Next Shot/Autofill/PWA/Community/one-visible-recipe/source/citation | Missing exact agreed source copy, required browser test, wrong screen scope, or resurrected alternate UI fails |
| GitHub live journal per code change | `scripts/audit/verify-commit-checkpoint.mjs` plus work journal | Code/CI/test change without journal in SAME Git commit fails |
| Every pushed commit in a batch | Same script with old/new SHA event range and Git full history | An undocumented earlier commit cannot be hidden by a later docs-only commit; invalid history fails |
| Docs-only and source CI | `.github/workflows/approval-continuity.yml` runs on every app branch push, no path excludes | Fails if the ledger/manifest/source no longer align, including documentation-only decision updates |
| Netlify release preflight | `build_cloud.mjs` + `scripts/netlify/should-ignore-build.mjs` | Build fails before dist if source contracts drift; a marker alone cannot authorize a new publish; current new-approval field `NOT_GRANTED` |
| Provider/owner acceptance distinction | Work Journal and Current Status | Exact SHA/READY vs signed member/client/phone proof recorded separately; never mark missing proof PASS |

**Known enforcement limits:** GitHub repo branch protection/required-check settings and provider build-hook bypass permissions still need read/write admin verification; the GitHub connector lacks repository administration permission. Netlify one-time marker lock is conservative but **not** atomic across simultaneous workers; #38 remains OPEN. The eight contracted UI/operator behaviors are a HIGH-VALUE first layer, NOT all 79 original behaviors end-to-end. A build/CI pass cannot guarantee correct visual behavior on a device with a stale installed PWA or on a screen not actually exercised. ChatGPT can time out before any write; rule going forward must be **no new unjournaled changes**, halt when GitHub read/write cannot verify receipt, and resume from last observed durable commit.

## Operational hardening required to approach fail-safe release integrity

1. Enable **GitHub branch protection/ruleset** on application branch: require the approval/continuity check, Node/lint/build and UX/mobile + visual checks on PRs; disallow direct force-push/bypass and optionally require peer review. Verify actual settings as admin, not just assume a workflow exists. Since the current model's connector lacks admin permission, this is still a human/Work UI configuration gate.
2. Implement a **GitHub/Netlify single-use atomic production release lock** (#38), based on immutable tested-source SHA + release ID + compare-and-swap consumed-once claim, rather than duplicate allowed marker commits. Test with simulated concurrency and zero live Netlify builds.
3. Add feature-specific **actual 390px browser interactions plus explicit owner/device acceptance** to each visible Locked requirement; require a before/after screenshot for user-facing changes and distinguish New Setup from existing Settings.
4. Finish full **decision-by-decision mapping** across all 79 originally Locked and remaining Open topics; add more anchored tests; do not misstate eight contracts as complete coverage.
5. Obtain missing original nine research source bytes and complete ChatGPT/project export if literal historical completeness is required (#30). Never rewrite missing text from memory.
6. Keep GitHub work logs *within each atomic code commit*, with a last-known-head exact SHA, attempted write outcome, test run IDs, current provider state, open questions and next action; do not wait until end of chat.
7. Per-release owner authorization remains required even for already-approved feature implementation; preserve current live deployment while user clarifies current Settings vs New Setup, then do one tested, verified, separately authorized publish.

## Current next question

**When you noticed the missing grinder i, were you in Settings → Your Setup (your existing equipment), or in Settings → Add Another Setup → New Setup?**

Only this information distinguishes a mistaken screen expectation from a true New Setup on-device regression. No extra screen or data/migration may be fabricated in anticipation.
