# Audit Reconciliation and Prioritized GitHub Backlog

**Reconciled:** 2026-10-17 UTC / 2026-10-16 America/Denver.  
**Reviewed development head:** `f6f65f6d93b56703e006f8c6b96760646eaf929a`; 191 tree entries / 163 file blobs, complete recursive response.  
**Scope:** owner authorized correcting GitHub and converting the audit into scoped issues before moving to feature execution. No deployment, production data mutation, migration application, account action, provider change or spending in this reconciliation.

## Subsequent owner decision (after original audit)

Owner approved **12 URL preview claims per account per 24-hour budget window** (decision `COFFEE-URL-DAILY-20261016-02`). The canonical Master Specification and Decision Ledger are updated; isolated SQL/Node/UX CI passed, and production migration `dic_preview_daily_budget_12` version `20261017050220` was applied and read-back verified at 12 without a Netlify redeploy. The earlier “25 vs 10” lines below are **historic pre-decision audit text**. The separate roast-taxonomy question remains Open. [Current Status](CURRENT_STATUS.md) governs next actions.

## Outcome and accuracy boundary

The supplied audit accurately identifies substantial unfinished product work, but is a **dated source audit** rather than proof every capability is broken. Its snapshot predates the final Hambela purge and the approved issue backlog. It must not be used as a current deployment, account, shot-count or issue-count query.

**23 new scoped issues (#8–#30) were created; existing #5 was reconciled and retained.** At the issue read-back checkpoint there are **24 open issues**. Every created/updated title/body was fetched independently and checked. Priorities below are triage, not new Locked launch requirements. No assignees, paid milestones, permissions or release settings were changed.

Corrected current guidance:
- Exact Hambela shot `799509a3-a16d-4380-a439-8de2a5d880e2` was already permanently purged and documented. The [verified purge report](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md) records 15 stored/visible shots, 14 legacy, protected community data, cleared detailed audit payloads, replay-safe receipts and timestamp corrections. **No deletion or new production query repeated here.**
- Issue #5's “catalog empty” and “keep SSO for all deploys” statements were stale. Its active body now separates existing verifier/catalog implementation from remaining member/release acceptance, production-only SSO removal and Pending safety.
- Netlify source comments now match **production Supabase authorization plus nonproduction Netlify SSO**. Parsed executable TOML settings remain identical.
- The original 26-finding audit is preserved as historical evidence with a prominent reconciliation notice; its old “do not create issues” and “one open issue” text describe the audit checkpoint. The owner's subsequent explicit request authorized this backlog.
- Runtime feature gaps, Open product decisions, real acceptance and restricted-provider evidence are separately labelled. A safe Pending coffee is not automatically a bug.
- The [20-topic decision crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) distinguishes explicit later constraints/resolutions from implemented-only or unresolved semantics without rewriting original ledger records.

## Finding disposition

| Audit ID | Current disposition | Work tracking | Qualification |
| --- | --- | --- | --- |
| G01 | Confirmed hosted UI gap | [#11](https://github.com/Schulzet3/The-Dial-In-Collective/issues/11) | Community placeholder; helpers/schema are not an integrated experience. |
| G02 | Confirmed repository gap; live worker not re-audited | [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9) | Do not claim a missing deployed worker from source alone, or promote all rows merely to make them visible. |
| G03 | Partial implementation | [#12](https://github.com/Schulzet3/The-Dial-In-Collective/issues/12) | Personal evidence works; full exact/related/similar community tiers remain incomplete. |
| G04 | Confirmed hosted workflow gap | [#13](https://github.com/Schulzet3/The-Dial-In-Collective/issues/13) | Local experiment helpers exist; post-rating confirmation/continuation is not wired. |
| G05 | Partial implementation | [#10](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10) | One current recipe exists; alternate families and full preference/window acceptance remain. |
| G06 | Confirmed hosted UI/persistence gap | [#14](https://github.com/Schulzet3/The-Dial-In-Collective/issues/14) | Custom explicitly filtered; coherent targets/persistence needed before exposing it. |
| G07 | Confirmed cloud/UI gap | [#15](https://github.com/Schulzet3/The-Dial-In-Collective/issues/15) | Bag schema/model exists; cloud hydration and hosted lifecycle are incomplete. |
| G08 | Confirmed partial equipment UI | [#16](https://github.com/Schulzet3/The-Dial-In-Collective/issues/16) | Basic setup/rename is not complete version-safe basket/hardware management. |
| G09 | Open semantics, not an approved alternate-scale specification | [#17](https://github.com/Schulzet3/The-Dial-In-Collective/issues/17) | Do not silently reinterpret historical scale or choose a formula from code. |
| G10 | Confirmed optional extraction UI gap | [#18](https://github.com/Schulzet3/The-Dial-In-Collective/issues/18) | URL parser does not implement screenshots or device-only Claude BYOK. |
| G11 | Confirmed hosted suggestion gap | [#19](https://github.com/Schulzet3/The-Dial-In-Collective/issues/19) | suggestedStyle helper is not wired into Add Coffee. |
| G12 | Confirmed personal-hide UI gap; specific purge complete | [#20](https://github.com/Schulzet3/The-Dial-In-Collective/issues/20) | Hambela hard purge is closed. Do not recreate it or convert one-off authorization into routine purge UI. |
| G13 | Confirmed absent manifest/service-worker source | [#21](https://github.com/Schulzet3/The-Dial-In-Collective/issues/21) | Already-loaded offline queue is not an installable offline cold-open shell. |
| G14 | Source-level offline risk, not reproduced real-device failure | [#21](https://github.com/Schulzet3/The-Dial-In-Collective/issues/21) | Remote status currently precedes cache hydration; safe admission/cache design required. |
| G15 | Real acceptance incomplete | [#22](https://github.com/Schulzet3/The-Dial-In-Collective/issues/22) | Synthetic version/outbox tests exist; true multi-device results must be recorded separately. |
| G16 | Confirmed read-only admin scope | [#23](https://github.com/Schulzet3/The-Dial-In-Collective/issues/23) | Review decisions and invitation controls are split into separate issues. |
| G17 | Implemented foundation plus remaining acceptance | [#5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5) | Existing issue #5 updated rather than duplicated; private Pending is safe when evidence is insufficient. |
| G18 | Development tested; unpublished/real acceptance pending | [#25](https://github.com/Schulzet3/The-Dial-In-Collective/issues/25) | 226-test evidence is not a deployed parser revision or successful roast-graphic extraction. |
| G19 | Open owner decision | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) | Current 60/day tuning and shared >=30-second Locked cooldown retained. |
| G20 | Open owner decision | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) | Existing five roast values retained; no six-tier adoption or enum migration. |
| G21 | Accessibility/device acceptance incomplete | [#26](https://github.com/Schulzet3/The-Dial-In-Collective/issues/26) | Synthetic screenshots are not VoiceOver/iPhone acceptance. |
| G22 | Provider/monitoring evidence limits; not known broken | [#27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27) | Security/settings review and courier-health work are separately scoped. |
| G23 | Confirmed visual workflow trigger coverage gap | [#29](https://github.com/Schulzet3/The-Dial-In-Collective/issues/29) | Other active unit/UX/SQL CI exists; do not claim there is no CI. |
| G24 | Documentation/tracking correction completed in this reconciliation | This reconciliation commit | Issue #5 and stale Netlify comments corrected; historical snapshots retained and all gaps mapped. |
| G25 | Available-source limitation | [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30) | Manifests are not research bodies; do not invent missing research or workshop text. |
| G26 | 20-topic crosswalk delivered; unresolved semantics stay Open | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) | Baseline source objects remain intact; implementation alone does not resolve an owner question. |

G16 also maps to [#24](https://github.com/Schulzet3/The-Dial-In-Collective/issues/24) for invitation administration. G22 also maps to [#28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28) for courier/backup monitoring; access limits are not asserted failures.

## Execution order and dependencies

The numbered order gives an initial review sequence; independent work can proceed without waiting for unrelated product choices. **First resolve only the semantic questions needed by the next implementation.** The immediate current owner question remains daily URL budget (25 versus 10); roast taxonomy is separate. Neither blocks documentation or every independent feature.

Start the next technical tranche with secure offline/PWA design and/or community eligibility source/live-inventory reconciliation, then their dependent workflows. Full experiment/family behavior must follow the relevant semantic crosswalk. Do not treat all P0 items as authorization to change production or all P2 items as defects.

| Order | Issue | Priority | Bounded work | Prerequisites |
| --- | --- | --- | --- | --- |
| 1 | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) | P1 | Crosswalk historical Open decisions and resolve current owner choices | None identified beyond existing safeguards |
| 2 | [#21](https://github.com/Schulzet3/The-Dial-In-Collective/issues/21) | P0 | Implement secure offline reopen and an installable PWA shell | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) |
| 3 | [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9) | P0 | Complete server-owned community eligibility and correction rules | None identified beyond existing safeguards |
| 4 | [#5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5) | P1 | Complete member source-backed coffee verification and release acceptance | None identified beyond existing safeguards |
| 5 | [#10](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10) | P0 | Complete alternate recipe families and preferred-window selection | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) |
| 6 | [#13](https://github.com/Schulzet3/The-Dial-In-Collective/issues/13) | P0 | Expose post-rating experiment confirmation and lifecycle | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8), [#10](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10) |
| 7 | [#12](https://github.com/Schulzet3/The-Dial-In-Collective/issues/12) | P0 | Wire complete recommendation evidence tiers with provenance | [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9), [#10](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10) |
| 8 | [#11](https://github.com/Schulzet3/The-Dial-In-Collective/issues/11) | P0 | Build anonymous community browsing over eligible records | [#9](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9) |
| 9 | [#14](https://github.com/Schulzet3/The-Dial-In-Collective/issues/14) | P1 | Implement Custom shot style with durable custom targets | None identified beyond existing safeguards |
| 10 | [#15](https://github.com/Schulzet3/The-Dial-In-Collective/issues/15) | P1 | Expose optional bag date Frozen and new-bag lifecycle | None identified beyond existing safeguards |
| 11 | [#16](https://github.com/Schulzet3/The-Dial-In-Collective/issues/16) | P1 | Complete version-safe basket and equipment management | None identified beyond existing safeguards |
| 12 | [#17](https://github.com/Schulzet3/The-Dial-In-Collective/issues/17) | P1 | Resolve grinder direction and scale semantics before implementation | [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) |
| 13 | [#19](https://github.com/Schulzet3/The-Dial-In-Collective/issues/19) | P1 | Wire editable recommended style into Add Coffee | None identified beyond existing safeguards |
| 14 | [#20](https://github.com/Schulzet3/The-Dial-In-Collective/issues/20) | P1 | Expose safe personal Hide Shot controls | None identified beyond existing safeguards |
| 15 | [#18](https://github.com/Schulzet3/The-Dial-In-Collective/issues/18) | P1 | Add optional screenshot extraction with device-only Claude key custody | None identified beyond existing safeguards |
| 16 | [#23](https://github.com/Schulzet3/The-Dial-In-Collective/issues/23) | P1 | Implement high-signal admin review and safe canonical decisions | [#5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5) |
| 17 | [#24](https://github.com/Schulzet3/The-Dial-In-Collective/issues/24) | P1 | Add admin beta invitation issue revoke and replace controls | None identified beyond existing safeguards |
| 18 | [#25](https://github.com/Schulzet3/The-Dial-In-Collective/issues/25) | P1 | Accept the unpublished roast-graphic parser in a deliberate future release | [#5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5), [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8) |
| 19 | [#22](https://github.com/Schulzet3/The-Dial-In-Collective/issues/22) | P1 | Execute real multi-device offline and conflict acceptance | [#21](https://github.com/Schulzet3/The-Dial-In-Collective/issues/21) |
| 20 | [#26](https://github.com/Schulzet3/The-Dial-In-Collective/issues/26) | P1 | Complete real mobile and accessibility acceptance | None identified beyond existing safeguards |
| 21 | [#27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27) | P2 | Verify restricted provider security and release settings | None identified beyond existing safeguards |
| 22 | [#28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28) | P2 | Verify backup courier health and non-disruptive failure monitoring | None identified beyond existing safeguards |
| 23 | [#29](https://github.com/Schulzet3/The-Dial-In-Collective/issues/29) | P2 | Bring reviewed visual and integrity gates onto the active branch | None identified beyond existing safeguards |
| 24 | [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30) | P2 | Recover missing research and prototype source material without inventing evidence | None identified beyond existing safeguards |

Issue closure requires implementation evidence, meaningful tests, accurate development/published distinctions and any separately required real-user/provider acceptance. Creating this backlog does not close an implementation gap. G24 is the correction performed now; G26's mapping is delivered, while unresolved decisions remain in #8.

## Verification performed in this reconciliation

- Re-read actual branch refs, all 163 files at the pinned head, canonical specification/ledger/current status, source cited by all 26 audit findings, existing issue #5 and PR/workflow definitions.
- Rechecked the critical source facts: Community placeholder, Custom filter, empty bag hydration, missing screenshot/Claude UI, missing recommended-style wiring, read-only admin, five-style/roast constants, missing manifest/service worker, status-before-cache flow, partial hierarchy and legacy visual workflow trigger.
- Ran the existing **226 Node tests locally: 226 pass, 0 fail** on the reviewed runtime source. This is a fresh local Node result, not a new real-device or live SQL test.
- The existing 16 release/credit-guard tests also passed after the comment correction. No new live SQL or real-device test was run.
- Corrected only comments in netlify.toml and verified parsed executable settings exactly equal the prior reviewed configuration. Release-ignore command and all cost/access gates remain.
- Existing original Master Specification/Decision Ledger and their consolidated source objects retain their Git blobs; no product decision was changed by audit interpretation.
- Netlify project read-back still reports published deploy `6ad2c872ad7a8fa78dc410dc` ready and SSO scoped to nonproduction. No publish requested.
- No production database/Edge write, invitation action, backup deletion or provider configuration change.

## Unverified and inaccessible items

GitHub branch protection/rulesets, live Netlify billing/build-hook configuration, Cloudflare/registrar and Resend management, Apps Script properties/trigger state and fresh Supabase Auth settings remain limited as recorded in CURRENT_STATUS. **They are not certified current or known broken by this repository reconciliation.** The one real community contribution observed during the earlier purge does not prove eligible browsing/aggregation is implemented.

Missing research bodies/workshop material remain unavailable in the retrieved source; no citations, approvals or evidence were invented. The old original Open list is an audit trail, not a command to ask 20 questions again.

## Final handoff checkpoint

The reconciliation was committed as [c752cd0960e5672e1da6bb2492b30fa2ce8ebdf9](https://github.com/Schulzet3/The-Dial-In-Collective/commit/c752cd0960e5672e1da6bb2492b30fa2ce8ebdf9). Its parent/tree, seven-file diff, all changed content/blob hashes and expected development ref passed read-back. [CI run 39003676568](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39003676568) completed success for that exact SHA. All 24 open issue bodies were checked; #8's crosswalk criteria are marked complete while its unresolved choices remain open. No deployment occurred and production stayed on the same ready deploy.

The owner subsequently supplied these source attachments in this chat: `dial-in-collective.jsx`; `Espresso_Recommendation_Engine_Handoff.zip`; `Espresso_Recommendation_Engine_Available_Archive_2026-08-21.zip`; `Espresso Extraction Windows by Roast Level and Shot Style.pdf`; `Old 2.pdf`; `Old Chat.pdf`; `Recommend email domain hosting.pdf`; `Build Web App.pdf`; and `DIC Backup Watchdog.pdf`. This final handoff records attachment availability only: their contents and whether they recover the missing original research/workshop material were **not newly inspected or imported in this checkpoint**. Do not certify source recovery from filenames, publish raw private chat exports, or let older attachments override later Locked decisions. Continue source recovery under [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30); if these attachments are absent in another chat, obtain the named files before making content claims.

## Resuming

Read [CURRENT_STATUS](CURRENT_STATUS.md), this backlog and [decision crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md), then the actual issue and current source. Keep Log Shot → Rate → Recommendation fast. Preserve all Locked decisions and the exact purge evidence. Commit/ref/content read-back is required before reporting GitHub edits complete.
