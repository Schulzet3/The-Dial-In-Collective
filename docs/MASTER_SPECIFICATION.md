# The Dial In Collective — Master Specification

## Locked owner-scoped test acceptance — Issues #5 and #10 (2026-10-23 MDT)

**TEST-ACCEPTANCE-ISOLATED-JWT-ISSUES-5-10-20261023 — ACCEPTED, scope limited to test evidence.** Exact owner approval: “Yes I formally accept these isolated, signed-JWT integration tests as a substitute for the real-member acceptance requirements in Issues #5 and #10.”

For GitHub Issues #5 and #10 only, the owner's explicitly accepted isolated PostgreSQL 17.11/PostgREST 12.2 cryptographically signed JWT acceptance (PR #107, 50/50 HTTP assertions, pre-merge and exact merged-source CI) replaces the prior requirement to obtain the corresponding real-member production-session testing evidence. The previously verified published production readbacks and public anonymous/invalid-JWT smoke remain distinct evidence. These synthetic signed tokens are not Supabase GoTrue member sessions and do not establish an actual official-roaster live fetch.

**Not waived:** Preserve the full product behavior, authentication/admission, member data, provenance, privacy, source-identity, recipe-family decisions, publication authorization, and all untested system claims. This acceptance does NOT publish staged migration 20261024034800_dic_pending_retry_http_conflict.sql or waive the requirement to deploy a known fix before marking Issue #5 complete. It does NOT waive remaining Community source/contributor-balanced integration in Issue #12 expressly referenced by Issue #10, or independently owned experimental lifecycle Issue #13. It does not transfer this acceptance to unrelated issues or create permissions for future releases.

**Closure requirements still outstanding at approval:** Issue #5's separately READY, unpublished retry HTTP conflict migration remains to be released with an independent owner publish command; Issue #10's original explicit Community contributor/source evidence tier integration tracked in #12 remains unfinished. The #13 post-rating experiments retain separate open requirements. Thus **neither original GitHub issue is automatically closed by this test-evidence supersession**. No additional site/Edge/SQL release, member-data writes, or changes to other Locked decisions are authorized.

**Specific verified acceptance evidence:** PR #107 merged `d9607f9b505f26f66c607d431b82e19d5450473b`; isolated PostgreSQL 17.11 and PostgREST 12.2 **50/50** signed JWT HTTP assertions PASS; exact merged SHA CI approval 40059878206, Node/build 40059878199, isolated SQL/signed HTTP 40059878227, cloud/mobile 40059878239 all SUCCESS; premerge visual 40059738743 SUCCESS. Published site's public safety smoke 40058958473 was 6/6 PASS, **not a substitute claim for real-account authenticated hosted behavior**. See scope-specific issue journals and release queue for required publication receipts.

---

**Scoped same-commit journals — owner-approved Issue #80 (2026-10-22):** Preserve same-commit GitHub development continuity while allowing an indexed `docs/workstreams/issue-<N>.md`, `ops-<slug>.md` or `release-<YYYYMMDD>.md` work journal instead of requiring all concurrent branches to update one giant file. The central work checkpoint remains the recovery entrypoint; reconcile CURRENT_STATUS, issue history and the release queue at integration/READY. No relaxation of privacy, owner approval, release consent, tests or readback. This narrowly supersedes only the single-file checkpoint requirement.

## Owner-approved narrow UX refinements (2026-10-22, Issue #80)
**UX-OWNER-REFINEMENTS-20261022.** Mandatory immediate outlier Confirm Measurement or Correct Shot remains Locked, and optional deferral is expressly rejected. The basket-dose warning alone changes from >1 g mandatory confirmation to a **dismissible, nonblocking advisory only when a new shot differs by strictly greater than 2 g** from its relevant basket reference. Never rewarn when editing the shot. Preserve historical basket snapshots, revision checks and unusual-shot validation.
User retains current password rules: minimum 8 characters, at least one number and one special character. Preserve previously accepted offline and revoked-access behavior; do not enable post-expiry access or weaken server admission without a new decision. Keep all existing extractor quotas, 30-second cooldown and IP throttles; allow only non-chargeable transient failures and safe exact URL/coffee cache reuse after validation. All other approved development tasks (sync independence, safe signout, Admin/Community search and load optimization, measured rendering, tests, requirement/journal cleanup, safe unused-code cleanup and database adviser triage) are recorded in Issue #80. Do not overwrite other October 22 work or publish without a distinct owner instruction.


## Owner-Locked operational supersession (2026-10-22): credits are owner-managed without a release gate
**OPS-NETLIFY-CREDITS-OWNER-ONLY-NO-GATES-20261022**. The owner alone monitors Netlify credits. Remove requirements for ChatGPT, GitHub Actions/release controller, Netlify ignore-build or approval coverage to check available credits, owner billing screenshots, snapshot age, minimum balance, grant expiry or a per-release credit cap. Such evidence must not block an otherwise authorized one-time publication. Preserve historically accurate billing receipts without using them as controls. Netlify may independently refuse service for quota; report actual provider response without buying, upgrading or recharging. Retain exact SHA, source tests, distinct publish command, one-use non-force claim, encrypted backups, permissions and postflight. No production release authorized by this change.

**OPS-PROACTIVE-PROJECT-INSTRUCTIONS-RECOMMENDATIONS-20261022**. Proactively recommend concise replacement Project Instructions text whenever a material standing workflow, release policy, tool, branch, test/backup schedule or communication rule changes, while updating the canonical GitHub copy. ChatGPT Project Settings remain user-managed. Avoid redundant reminders on ordinary feature edits.


## Owner-Locked single-command authorization clarification — 2026-10-22
**OPS-SINGLE-INSTRUCTION-DEVELOPMENT-AND-PUBLICATION-20261022.** An owner request to **build / update / fix / change / implement** is approval to finish the stated *development* scope, run and repair all applicable predeployment tests, safely integrate source and mark the exact verified item READY in the GitHub release queue without another "continue?", "test?", "merge?", or "queue it?" prompt. Stop only on a genuine missing product decision, dangerous out-of-scope operation or hard failed verification; log BLOCKED/TESTING rather than pretending 100% verified.

An owner instruction to **publish / deploy / release the queue** (or to publish/deploy **one named READY feature**) **IS the one explicit owner production release approval at the time it is given**; no second "Yes, proceed" is required after producing a manifest/readiness report or because frontend, backend, named migrations, Edge/Auth, required provider steps or routine backup actions are involved. Automatically record the unique one-use grant bound to the actual combined tested source SHA, scope and credit limit, carry out preflight/tests and required scoped production steps, publish at most once, and independently verify provider READY/current SHA and data invariants. A request for one feature does not silently authorize unrelated queued features: construct a safe isolated release candidate when possible or report the genuine isolation blocker. Any unready/untracked code, failed CI, missing safeguards, unclear scope or unsafe provider evidence is a **blocker to execution**, not a request for redundant consent. Never treat a build request, status inquiry or brainstorming as a deployment authorization.

**Narrow supersession:** replaces any instruction implying a *second* owner confirmation after an explicit publish/deploy command, including an "obtain approval" step after readiness reporting, and any routine per-component approval loop for the exact authorized release. **Preserves** distinct consent for each future release; unapproved unrelated irreversible deletion, arbitrary private member-data modification, paid purchases/top-ups, plan or visibility changes; historical records; authentication/RLS; backup and credit checks; non-force serialized single-use claim; source-vs-production truth. The user approved this operational clarification in Owner clarification 2026-10-22; Issue #70 comment 6347990316. It does **not** authorize a release now. Owner-device testing is optional, not a deployment completion gate.


## Owner-Locked default: automatically complete, test, merge and queue every approved change (2026-10-22 MDT)
**OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022.** Whenever the owner asks to build, change, fix, optimize, or implement The Dial In Collective, the assistant MUST proceed through all feasible approved scope: record in GitHub immediately; implement fully (not merely plan or prototype); run and repair relevant Node, lint, build, mobile/browser, visual, offline, isolated SQL, privacy and integration tests according to affected paths; non-force merge to `development/backend-foundation` after verification; read back the exact merged SHA and CI; automatically add/update that deliverable in `docs/RELEASE_QUEUE.json` as **READY** only if all required source development/predeployment checks passed, with specific issue, code paths, evidence, source SHA and no known blockers. Record **IN_PROGRESS**, **TESTING** or **BLOCKED** with reason and next action until truly ready. Do not stop to ask whether to do the approved implementation/tests/queue work. A draft, green lint, unmerged PR, failed/queued CI or missing source evidence is NOT ready.
**Batches by default:** Keep ready changes in the GitHub queue across chats, do not publish when added. At owner's next explicit publish instruction, assemble **all selected READY changes** as one source candidate, ensure no unready/untracked deployable source is included, run final *combined* risk-based exact-SHA CI and compatibility tests, assess migration risk (extra encrypted backup automatically for potentially destructive DB work, otherwise scheduled backups), credits, approved scoped migrations/Edge and release controller. One distinct owner approval authorizes one source-bound, single-use publication; independently verify actual Netlify/backend postflight and record deployed entries. Owner-device signoff is not a completion gate.
**Scope of supersession:** replaces any expectation to stop at a proposed/partly tested change and ask separately to continue implementation/testing or to maintain readiness only in scattered issues; adds one durable queue and automatic release-prep completion. It DOES NOT imply production permission or changing other Locked product requirements, privacy, accounts, shots, offline data, recovery, paid purchases/provider settings or GitHub Free/private advisory checks. '100% ready' is verified **prepublication** readiness, not a claim that unavailable hosted/postdeploy observations have occurred. When a task cannot be completed or tested, keep a truthful blocked queue entry rather than assert ready. The owner may report defects voluntarily after release.
Authority: Owner direct 2026-10-22 request, recorded [Issue #70 comment 6347498805](https://github.com/Schulzet3/The-Dial-In-Collective/issues/70#issuecomment-6347498805). Prior `OPS-STREAMLINED-RELEASE-20261022` remains in force.


## Locked owner release simplification — 2026-10-22
OPS-STREAMLINED-RELEASE-20261022: Five-stage automated flow: source-ready with risk-based validation; single release-specific owner approval; automated concise readiness report and preflight; approved migrations then single-use publication; targeted postflight and immutable receipt. No separate owner-device signoff/acceptance for previously verified or future deployments; historical actual device evidence stays unchanged and NOT TESTED is never PASSED. Daily encrypted backups at 08:00 UTC (01:00 fixed MST), not automatically fresh for every harmless update. Automatic additional encrypted snapshot is required only before potentially destructive database changes, within approved release scope without extra prompt. Comprehensive weekly Sunday regression also at 08:00 UTC; changed-feature test selection otherwise. These requirements narrowly supersede blanket per-release backup, unnecessarily duplicated regression, and owner-device deployment gate. Preserve core source CI, rollback/recovery, RLS/identity, actual live readback, one-use owner release consent, private GitHub Free advisory status and credit checks. **This is approval of process, not authorization for a new publication, paid action or arbitrary data mutation.** Implementation must be verified separately; existing fail-closed release controller must not be loosened before adequate replacement tests. Source: Issue #44 comment 6346939887. In daylight time, 08:00 UTC is 02:00 MDT; choice is fixed MST.


## VERIFIED PRODUCTION RELEASE — 2026-10-22 16:35 UTC (historical owner scope unchanged)
The owner-authorized, one-use `DIC-20261022-FASTFLOW-ADMIN-03` was claimed exactly once, published GitHub `release/production` SHA `fe2eee66717b13b9c9d203d1728bfc863961732e`, Netlify READY/current deploy `6ada3b5018ccdd080d3b4584` at 2026-10-22T16:35:49.325Z. Exact tested source `c272d778768728bbf75f829477d6331b33b7322a`, six GitHub source CI jobs PASS; four only-approved database migrations applied in order under hosted versions 20261022162910, 20261022162954, 20261022163029, 20261022163126. Existing 22 shots, 22 notes, 2 Community shots and 44 mutation receipts remain. All other Locked product decisions and data preserved. This is **Deployed**, not actual signed-in owner-device **Accepted**. Real device, current actual credits, exact backup restore and GitHub Free/private advisory-control residual risks remain separately open. See `docs/PRODUCTION_RELEASE_2026-10-22_FASTFLOW_ADMIN_VERIFIED.json` and Issue #44.

## Approved single-use production release (October 22, 2026 MDT)
**OPS-RELEASE-FASTFLOW-ADMIN-20261022.** The owner explicitly said “Yes proceed” after approving the seven-item release manifest in GitHub Issue #44. This is one scope-bound, source-tested, 15-credit-maximum release authorization ID `DIC-20261022-FASTFLOW-ADMIN-03` for tested app source `c272d778768728bbf75f829477d6331b33b7322a`, including four forward-only migrations `20261022023000`, `20261022024000`, `20261022053000`, `20261022090000` in that order and the corresponding frontend release. Preserve all other existing Locked decisions, previous shot/note/Community/offline records and read-only extraction Edge services. Explicitly exclude dormant private Hide Shot removal PR #72, deferred/extractor/new roadmap work, unrelated deletion or provider changes. One-use GitHub grant and current backup, credit, owner/source CI, per-release controlled publication and postflight safeguards remain mandatory. **Approved, not deployed or accepted at grant creation.**

## Owner-Locked sixth Fast-Flow style and hybrid learning — October 22, 2026 MDT
**UX-FAST-FLOW-HYBRID-20261022.** Owner explicitly approved Option 3: add **Fast-Flow** as a sixth independently selectable espresso style (SEY-inspired fast-flow, coarse-grind method; not SOUP or Sprover). **Narrow supersession:** the prior five-style maximum is changed only by adding Fast-Flow. The original five styles, their priors, historical labels, Custom behavior, offline/personal/Community data and all prior Locked badge styles remain unchanged. Fast-Flow retains its own selection, saved shot labels, and recipe families; never automatically relabel prior Turbo shots.
**Selective fallback:** first prefer direct, compatible Fast-Flow success. When direct Fast-Flow recipe and same-style personal similar evidence are absent, eligible green, unhidden Turbo shots may only provide a capped *unproven ratio adjustment* if they match exact coffee, setup-version, basket, feed and a fast-flow-compatible timing/ratio window. Never copy Turbo time, grind, temperature, recipe family, user success status or observation count; never pool unlike families or pretend the hybrid is measured SEY extraction. Preserve one visible recommendation and the Log Shot → Rate → Recommendation path without extra mandatory steps.
**Evidence boundary:** illustrative initial 1:2.35 and 10–16 seconds are a cautious starting prior from secondary reporting, not transcript-verified, scientifically universal, roast-specific or a hard pass/fail rule. Adapt to basket/equipment, successful personal data and tasting results. No pressure, paper or other new mandatory fields.
**Implementation/release:** PR #77 merged to development at `12a03b65ed4093d610ece063a1d5a8dae8ef4895`, matching exact tested source `c272d778768728bbf75f829477d6331b33b7322a` tree `2160c95d99474590bd7b32d20c9fed19466884de`. Five GitHub workflows / six source jobs PASS including isolated PG17.11, browser and visual; no hosted SQL/Edge/Netlify/member-data changes. Status **APPROVED → IMPLEMENTED (DEVELOPMENT) → TESTED (SOURCE) → NOT DEPLOYED → NOT ACCEPTED**; staged migration remains unapplied; deployment requires a *new* explicit owner authorization and exact-source safety/credits gates. Evidence: [GitHub Issue #31](https://github.com/Schulzet3/The-Dial-In-Collective/issues/31#issuecomment-6334319727).


## Owner-Locked deferral of remaining private Hide Shot code removal (October 21, 2026 MDT; reconciled October 22)
**UX-DEFER-PRIVATE-HIDE-SHOT-RETIREMENT-20261021.** The owner explicitly elected to close PR #72 without merging and defer physical removal of the dormant `private.mutate` allowlist/handler. Authority: [PR #72 comment 6333843360](https://github.com/Schulzet3/The-Dial-In-Collective/pull/72#issuecomment-6333843360), recorded 2026-10-22 05:55 UTC. This narrowly supersedes any earlier next action requiring completion of the internal-code removal under `UX-RETIRE-HIDE-SHOT-BACKEND-20261021`; it does not undo the applied public API rejection or restore the withdrawn user control.
**Current disposition:** public guard migration `20261022041530` remains applied; private handler remains; direct authenticated EXECUTE remains denied in the October 22 read-only catalog check. These facts do not establish impossibility of every privileged access route. Candidate migration `20261022043331_dic_remove_private_hide_shot_branch.sql` remains historical on the closed, unmerged PR branch and is not an approved pending application migration. Future retirement requires renewed scoped review/authorization. Preserve all shots, notes, Community contributions, receipts, historical fields, candidate source and prior evidence. No source retirement, migration replay, provider change or publication is authorized by this deferral.

## Owner-Locked proportional safeguards and release-readiness policy — October 21, 2026 MDT
**OPS-PROPORTIONATE-COFFEE-APP-CONTROLS-20261021.** The owner expressly permits loosening, modifying or eliminating disproportionate protections and production release readiness requirements when doing so improves actual app efficiency or effectiveness. The app handles community espresso information, not banking records, and enrolled users intentionally share their coffee contributions. Prior blanket process and redundant interaction restrictions may be reconsidered; choose the least cumbersome controls that remain sufficient for safe and accurate operation.
**Supersession scope:** supersedes any earlier blanket assumption that every historical security/process safeguard and release checklist step must remain unchanged solely because it was previously Locked. This is authorization for *evaluating and making narrowly justified simplifications*, not an indiscriminate waiver of named Locked product/data behavior. Preserve authenticated identity and administrative permissions, secrets and credentials, basic account separation, integrity of community contributions, historical/offline records, reasonable backup/recovery and truthful deployed-source/readback evidence. Sharing coffee data does not authorize sharing login credentials, invites, email addresses or private account infrastructure. Don't eliminate checks necessary to prevent accidental data loss, privilege escalation, unaudited destructive actions or publishing untested work. For each concrete change, document removed/retained safeguard, benefit and residual risk and update affected decisions. User's prior approval to loosen release criteria does not by itself instruct a new production publish, purchase, destructive live migration or provider setting change. Future explicit deploy instruction invokes the separately Locked universal single-release deployment authorization, without repeated component-by-component owner confirmations.
**Status:** policy Approved; particular safeguard removals remain individually to be evaluated/implemented/tested; no production deployment granted by this message.

## Owner-Locked recommended starting style only on first coffee expansion (October 21, 2026 MDT)
**UX-FIRST-EXPANSION-STYLE-20261021 — owner-approved for SOURCE/TEST/RELEASE READINESS, not publication.** Owner says the style recommendation does not belong on Add Coffee; show it only the first time a member intentionally expands that newly added coffee to log a first shot. Save/Add Coffee without style UI or auto-expanding the new card, preserving visibility but not moving Current. At the first explicit expansion with no previous shot, show a subtle **Recommended for you** style with an honest one-line roast/taste-preference reason and an editable supported starting style, then **Log First Shot**. The chosen style informs the actual first-shot recipe/draft, owner revision-checked selection when online, and the eventual shot, never shared canonical coffee identity. Consume this guidance only once per authenticated owner/private library entry across reloads/devices using an atomic server-side claim; support owner-keyed offline local first view. Do not repeat after collapse/reopen or after any shot. Existing preferences, Custom editor deferral, historical shots, Community protections, offline queue, setup isolation, pinned Current semantics, and all other Locked decisions remain. **Narrow supersession:** original §27.3 and corresponding baseline Locked recommendation-location entry, and outdated Issue #19 PR #63/#67 Add Coffee UI placement. Source SQL change remains UNAPPLIED until a separately authorized exact-source deployment; “100% ready” is not permission to publish, buy services, or mutate production.


## Owner-Locked complete functional retirement of Hide Shot — October 21, 2026 MDT
**UX-RETIRE-HIDE-SHOT-BACKEND-20261021.** Owner requested full retirement and explicitly authorized production backend application separately from site publication, which remains on hold. Supersedes the residual *new hide mutation permitted* compatibility described in `UX-REMOVE-HIDE-SHOT-CONTROL-20261021`, not historical original-data retention. New app outbox enqueue must reject `hide_shot`; existing already-queued event remains accessible as a rejected/exportable record, not silently deleted. Backend rejects any `hide_shot` before the replay/receipt path, including old request IDs. Do NOT change or purge original shots, notes, community contributions, audit/mutation receipts, `hidden_at` columns or classification semantics. Historic records must remain restorable, and unrelated client mutations unchanged. New controlled backend SQL/production permission is scoped to this action only; **NO Netlify release or other SQL/provider actions** are authorized by this decision. Any later database column cleanup requires independent proof and approval.


## Owner-Locked removal of the Hide Shot user control (October 21, 2026 MDT)
**UX-REMOVE-HIDE-SHOT-CONTROL-20261021 — explicitly owner approved for DEVELOPMENT/TEST, NOT deployment.** Owner requested “I don't want that option. Please remove it completely.” The application must **not render a Hide Shot button, action, menu entry or client click route** in personal Shot History or elsewhere. The requested UI option is withdrawn, with Edit and Make Current retained, no change to saved shot records or existing Community contributions. This narrow decision expressly supersedes the earlier baseline §20/§21 suggestion of a user-facing personal hide/delete control and the implementation scope of Issue #20 / PR #58, **not** the historic rule that previously qualified anonymous Community contributions remain durable when privacy-preserving removal occurs. Existing hidden records, guarded backend `hide_shot` mutation and historical pending/outbox compatibility must be preserved for safety; do not expose them as a user option or silently migrate, purge or unhide prior records. Owner's September 7–8 Option B selection concerned personal-versus-Community data retention, **not** explicit authorization for the separate Hide Shot UI; subsequent October 21 broad backlog permission was also not separate UI approval. Record exact supersession and actual source/deployment state. Retiring a hosted RPC/storage mechanism or deleting private shots would require separate technical review and authorization. No production SQL, Edge/Auth, Netlify or account-data mutation authorized.


## Owner-Locked Admin single-action conflict resolution and measured-dose confirmation (October 21, 2026)
**UX-ADMIN-ONE-CLICK-RESOLUTION-AND-DOSE-WARNING-20261021 — approved for source development/test, not production.** Resolving an existing duplicate through an explicitly selected compatible verified coffee and marking a submitted coffee on Hold each require one intentional administrator click, without a mandatory explanation or redundant browser confirmation. Private server-generated action-specific audit provenance, authorized role, revision and safe identity checks remain mandatory. Editing a different coffee to create a *new* collision must still raise a genuine identity conflict. For a shot whose dose differs from its relevant basket's recorded reference by **more than 1 g**, Save Shot (new or edit) must show a warning and require affirmative confirmation before proceeding. An ordinary shot inside tolerance still saves with one click. A deviation is advisory, not a rejected measurement. On edit, use the original shot basket snapshot; new shots use the selected basket. Invitation revocation and member-access removal retain their existing warning-and-confirm affordances; member shot history is preserved. Historical import remains removed from beta Settings, while protected operator recovery source and the locked server gate remain. **Narrow supersession:** replaces only the manual reason/second browser confirmation for the already-reviewed Merge/Hold case in previous admin review requirements and the no-dose-confirmation exception within `UX-SITEWIDE-DIRECT-SAVE-20261021`. All other Locked authorization, audit, history, identity, offline, and release controls remain in force. No hosted SQL/Edge/Netlify work authorized.


## Owner-Locked sitewide direct-save / no mandatory correction explanations (October 21, 2026)
**UX-SITEWIDE-DIRECT-SAVE-20261021 — approved DEVELOPMENT/TEST only.** Owner instructs: “Yes. I'd like to eliminate the mandatory correction reason and confirmation site wide. Where else does it exist? Agreed it should give warning only if the edit creates a genuine identity conflict.” For **routine coffee, shot, private-note, and other editable record changes** throughout member and administrator app: one deliberate **Save** action, with no required human-written correction reason and no redundant browser confirmation. Existing member coffee editing/setup/preferences already save directly. Admin Pending/Approved Coffee and shot/notes correction must do likewise, and server must use an accurate, neutral **system-generated audit description** when the caller does not supply one, preserving original and updated values, actor, owner, record/revision and other provenance. Canonical name, roaster and release editing stays admin-authorized with server-owned duplicate/identity collision checks; only genuine actual errors, stale revisions, ambiguity or identity conflicts surface a warning/resolution rather than silent merge. The basket-dose ±1 g guidance is advisory: no extra browser confirm solely to log/edit a shot outside that recommendation, while all numeric/field validation remains.

**Precise supersession:** This replaces the previously required 8–1000-character *human-authored* Admin Record Correction reason and follow-up “Save this administrator correction?” browser confirm for routine Pending/Approved Coffee and shot/note edits; also removes the extra “Log anyway?” browser confirm when dose differs from advisory Basket Dose range. Supersedes only the preservation clause on mandatory *separately audited Edit* reasons within `UX-ADMIN-LOW-FRICTION-REVIEW-20261021`; provenance and immutable before/after audit remain Locked. It does **not** waive role, admission, RLS, revisions, uniqueness, validation, safe coffee merge/verification/Community gates, outlier confirmation needed for Community data, account-access changes, revocation, bulk historical import recovery acknowledgement, password/email verification, or required audit reason and explicit selection for truly ambiguous **Resolve Duplicate / Hold** decisions. Those operations are not ordinary record saves and must be separately reconsidered before removing their controls. No implicit privilege escalation or member-data exposure. Source-only change; a fresh deployment authorization remains required before hosted SQL, Edge or Netlify changes.


## Owner-Locked Admin low-friction review and canonical correction scope (2026-10-21 20:03 MDT)
**Decision UX-ADMIN-LOW-FRICTION-REVIEW-20261021 — explicitly owner approved for SOURCE IMPLEMENTATION AND TESTING, not for a new production release.** The Pending Coffees list must display all available proposal details directly within each pending record card once its overall Pending section is expanded, rather than hiding facts inside a second disclosure or Editor. Administrator must be able to edit *all* approved coffee factual fields, including canonical name, roaster and release label; preserve stable canonical UUIDs, linked member history and a before/after audit record. Editing canonical identity is distinct from merging coffees: a server-detected collision/ambiguous match must be refused with a clear error and must never silently merge or rewrite other members' relationships.
**Fast normal approval:** Clicking **Approve Distinct Coffee** is an intentional single-click approval with no extra user-written reason and no browser confirmation on the normal distinct case. The server must still validate current admitted/admin role, submission revision, identity and safe-duplicate conflict; preserve provenance and write a standard audit reason automatically for the explicit administrator click. A genuine near-match/stale revision/role failure is surfaced as actionable conflict/error, not auto-bypassed. Human-authored reasons remain available for *Hold*, *Merge* and separately audited content correction operations until expressly superseded. No new friction without owner approval.
**Exact narrow supersessions:** Supersedes the October 21 Admin Portal restriction that approved canonical `name`, `roaster` and `release_label` are read-only in the administrator editor (but NOT member editor restrictions), and the blanket manual **Approve Distinct** required 8–1000 character human-entered reason + browser confirmation. Preserve historic requirements and all earlier approvals elsewhere: canonical identity must remain unique and auditable; creator/member account authorization, RLS, passwords, session privacy and immutable shot history remain protected. The owner's statement that beta members consented to share data with the admin is recorded as an **owner assertion**, not independently authenticated consent or permission to expose data publicly. Automatic server-only guards need no additional user click. No SQL/Edge/Netlify/member-data mutation until a future explicit deployment instruction and exact tested-SHA grant.


## Owner-Locked universal deployment authorization interpretation — October 21, 2026 (latest explicit owner instruction)

**Decision OPS-UNIVERSAL-DEPLOYMENT-CONSENT-20261021 (LOCKED).** Owner explicitly states: “You have approval to publish ALL pending changes including the backend changes. In the future, when I approve a deployment, you need to treat it as a universal approval unless I specifically say otherwise. Please remember and document that.” A positive owner instruction to **deploy/publish the pending release** authorizes the **complete bounded, known, tested release package**, including the necessary production frontend, named compatible database migrations and server functions/Edge services, Auth/provider configurations directly necessary for that release, and existing included approved product updates, **unless the owner expressly excludes a component**. No repeated request for a separate SQL, Edge, or Netlify approval is required for those in-scope deployment components. This exact owner instruction is explicit approval for the *current* pending `20261021221455_dic_source_worker_auth_and_admission.sql` then `20261021224447_dic_admin_content_review.sql` and revised `dic-verify-coffee` Edge function, together with the remaining development application release. Record the exact contents, owner source and tested SHA before execution.

**Exact narrow supersession:** Supersedes prior operational process language that demanded *another owner signoff merely because an already-approved all-pending release includes SQL, Edge, Auth, or directly necessary provider changes*. It also supersedes any October 21 preflight hold based **solely** on missing separately named backend publication consent. It does **not** supersede product-design Locked decisions; member privacy and RLS; preflight/test/backup/production-SHA verification; non-force single-use GitHub release transaction; distinct consent for irreversible deletion or arbitrary live member-data modification, paid purchases/top-ups, GitHub plan/visibility changes, new unrelated features or unbounded operational spend. A release approval is specific to the pending release package at the time, not perpetual authorization for future deployments; each later release still needs a fresh explicit deployment instruction, a unique source-SHA-bound grant, budget/preflight and one publication. No extra production deploy or data mutation may occur outside the approved release package. Resolve ambiguity only when the owner explicitly limits scope or a material new high-risk/destructive action was not included.

**Current approved release:** one bounded publication of all currently pending development changes including the two named SQL migrations and the `dic-verify-coffee` Edge update. Provider mutations remain contingent on passing exact staging/safety checks and recent recovery/credit evidence. GitHub private Free remains locked; `main` is operations only, `release/production` is Netlify production. Existing Netlify 15-credit per-release planning ceiling and no purchases remain unless the owner explicitly changes them. A user approving *deployment* does not instruct bypassing a failed preflight. Pending application tests, exact new SHA grant, and production readbacks are distinct states, not implicitly passed.


**Canonical consolidated requirements, 2026-10-17 UTC / 2026-10-16 America/Denver.** This document collects the original v1.0 baseline and all three available GitHub specification addenda in full, without rewriting their decisions. Pair it with [DECISION_LEDGER.json](DECISION_LEDGER.json). For completion, current production, next action and acceptance scope read [CURRENT_STATUS](CURRENT_STATUS.md).

## Owner-authorized expedited two-migration production release (October 21, 2026, 10:44 MDT)

**Decision OPS-EXPEDITED-BETA-RELEASE-20261021 — explicit owner production instruction.** The owner states that repeated accepted release approvals have not produced a live app and directs significant, order-of-magnitude workflow simplification for frequent live beta updates, explicitly requests applying **both** tested SQL migrations, and reiterates that this coordinated update must be published to the live Netlify app now. The named authorized production SQL scope is strictly (1) `supabase/migrations/20261021053500_dic_admin_coffee_review.sql`, then (2) `supabase/migrations/20261021062000_dic_duplicate_first_auto_approval.sql`, using exactly the tested content from application SHA `c6976b1fc86ed5e6b38c0c38831950fca017b3a4`. This is approval to perform the actual two live schema changes after verified recovery and security preflight, not merely build them.

**Exact narrow supersession:** Replaces the old `Wuri authenticated live verification must finish BEFORE applying the first admin coffee migration` sequence. Under this owner escalation, Wuri genuine authenticated member acceptance occurs **after** these approved backend migrations and the single separately approved frontend publication. Do not count a public source parser as that member acceptance. This also supplies the previously missing second named live SQL migration authorization. Do not change coffee/source/duplicate policy or automatically promote historical Pending records as a release step; Mango Tree Blend remains Pending for manual owner administrator review and Decaf/Wuri remain preserved until genuine authorized owner actions.

**Expedited reusable release expectation, without waiver:** Prevalidate code/SQL/CI and capture a recent owner-private encrypted backup with readback BEFORE inviting a one-time publish decision. At approval, reuse unchanged passing checks rather than repeating UI tests; perform one named SQL deployment sequence and single app publish, followed by narrowly scoped live checks and durable receipts. If a requisite release-path capability, provider setting permission, encryption recovery or unique one-use claim is absent, document it promptly and repair it via explicit approved provider scope rather than misreporting publication, bypassing the build gate, faking GitHub Free private protections or spending for duplicate builds. Historical locked privacy, data preservation, one-time tested-SHA Netlify publication, credit policy, non-force Git operations, original recovery and no upgrades/public repo remain unchanged. A general time urgency is not blanket authorization for arbitrary future data changes, recurring future releases or deleting records.

**Owner-directed assistant-only release routing and provider work (later October 21):** The owner was just told Netlify's production-branch selector and GitHub Actions readiness variables were the remaining exact deployment steps. They explicitly responded: “I don’t want to have to do anything manually in @Netlify or @GitHub ... You caused this and I need you to take responsibility and fix it please ... I will perform a work session as requested only if it’s absolutely impossible for you to fix it on your end.” This authorizes assistant-side execution of **only** the already-identified one-time Netlify production-Git-branch setting to `release/production` and GitHub Actions release readiness variables/one serialized dispatch needed for the previously approved single publication, subject to provider readback and retained safety/credit checks. A logged-in Work session is permitted where the connected APIs do not expose these settings; the owner is **not** volunteering to manipulate those provider settings personally. No fake branch protection, uncontrolled build hook/CLI publish, new production SQL, deleted member history, extra spend, new future release grants or GitHub Free/public/plan change is implied.

## Owner-required hands-free future deployment from ordinary chat — October 21, 2026

**Decision OPS-HANDS-FREE-APPROVED-RELEASE-20261021 — explicit operational requirement:** The owner asks whether, after ONE initial authenticated Work setup, the assistant can perform every routine stage of subsequent updates (development, debugging, testing, implementation, builds, release preflight, backup, approved production publish, validation and GitHub receipts) **without the owner manually interacting with Netlify/GitHub/Supabase**. Owner rejects repeating prior manual GitHub dispatch or browser steps. The previously written Work plan is insufficient because the actual `.github/workflows/dic-single-use-release.yml` on main uses **only `workflow_dispatch`**, inaccessible to ordinary connected chat tools. Work must implement and verify an **assistant-triggerable, source-verified and explicitly approved release request**, for example one authorized write of a versioned request file to ops `main` that invokes the existing serialized GitHub Actions release controller. A bare source push alone MUST NOT publish.

**Required proof before declaring the one-time setup complete:** Perform read-only setup inventory; create an inert/safely testable chat-trigger mechanism; show rejected missing/expired/unapproved/duplicate/stale requests in inert tests; independently validate GitHub Free/private advisory-CI protections and Netlify routing; use the CURRENT already-approved single release exactly once to demonstrate an assistant-initiated real push-to-READY on app.dialincollective.com; verify exact underlying tested source SHA, release ID, one consumed claim, credits, real data preservation and GitHub readbacks. Demonstrate a subsequent request can be prepared and fail closed without triggering a second paid production build. Measure approval-to-live latency. If any of these are unverified, report **not fully hands-free**, not a successful setup.

**Scope boundary:** This is approval to design, test and configure *the ongoing release mechanism* and the specific already-authorized Netlify/GitHub routing, not unlimited future publishing. Preserve one explicit owner approval per future production release, source-SHA binding, new production SQL/Edge/Auth/member-data and purchase-specific consents, encrypted recovery, privacy/Locked decisions, GitHub private Free, 15-credit release ceiling, no fake enforced branch protection, no automatic build hooks or unreviewed publish. The owner may still need to give approval **in chat** or authenticate when external sessions expire, but should not need to navigate provider settings or manually dispatch workflows for ordinary updates. Never promise third-party access/availability or perfect zero-intervention under every future outage.

## How to apply this specification

The latest explicit owner decision governs. Preserve every unchanged Locked requirement. The scoped map below reconciles documented amendments; it does not create a new approval, unlock an old gate, adopt a proposal or turn historical implementation status into requirements. Within the retained source bodies, old "not deployed", "0 credits", "next" and "SSO all" statements describe their date, not current operations. Later source position alone does not override another topic.

Current product copy uses **The Dial In Collective** and **dial in**, without hyphens. Historical source headings, filenames and quotations retain their original wording. The product remains sleek, simple and optimized for **Log Shot → Rate → Recommendation**.

## Owner-Locked GitHub Free/private operating constraint — later October 20, 2026

**Latest explicit owner instruction:** “I'm not going to upgrade Github so do whatever you can without pro and without making the repository public.” **Keep this repository PRIVATE on GitHub Free. No GitHub Pro, paid upgrade, or public visibility recommendation/purchase is authorized.** This is a narrow supersession of the **prior plan to require a GitHub Pro account as the next action** and any statement that such a purchase is required to continue work. It does **not** waive requirements for accurate work records, original Locked product decisions, privacy, one-time release permission, tested exact release source, deployment verification or backup integrity.

**Verified limitation and accepted compensating operating model:** `development/backend-foundation` and `main` were both reported `protected:false`; private rulesets returned 403 requiring an upgrade or public visibility. Do not mislabel advisory GitHub Actions CI as mandatory repository branch protection. Private GitHub Free cannot give us a verified no-bypass branch rule in the current account. Preserve existing working protections: GitHub-first work logging, same-commit journal, per-push CI, test and visual check review, explicit `[skip netlify]` for non-release pushes, grant/consumption ledger and serial non-force release-controller code. Require a human check of test results and production provider receipts before any separately approved release. None of these individually guarantees protection from direct Git writes or manual/CLI/provider release bypass.

**Fail closed, without Pro:** Development and documentation can proceed without a subscription. Keep the current production app unchanged and default-main manual release controller inert until the owner separately approves an operational alternative for this Free/private environment and the Netlify production source/other provider controls are verified. Never set readiness flags solely to bypass a disabled protection; #38 remains OPEN with honest limitations. Do not create release markers, switch Netlify branches, touch customer data, or spend credits in a continuity-only request.

**Updated ChatGPT Project instructions** are preserved at [CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md](CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md); the owner must paste/save them in ChatGPT Project Settings because connected tools cannot edit that UI.

## Protected source, verified continuity and atomic release — owner Locked October 20, 2026

**Owner approval:** Every material owner instruction, test, decision, code/provider action and interruption checkpoint must be durably recorded/read back in GitHub before further mutation. All sessions begin by reconciling the latest verified development SHA, CI, decisions and provider deployment. Missing/unavailable records remain UNVERIFIED, not invented. Code/test/CI commits must include the GitHub journal in the SAME commit.

**Mandatory private GitHub protection:** Require approval/continuity, Node/lint/build, mobile browser, private visual and applicable security checks on protected `development/backend-foundation`; disallow deletion, force pushes, silent bypass and unreviewed updates. Keep repository PRIVATE. `main` remains backup operations.

**One-use release authority:** Publishing to Netlify must use a separate protected `release/production` branch, changed only by a serialized authorized workflow. Each owner grant has one immutable unique release ID bound to the exact tested source SHA; a non-force remote Git push of a descendant commit with a consumed-ID ledger is the atomic claim. Two competing claims must produce at most one accepted ref update. A re-run for an already consumed release ID may not push or trigger another production build. CI must test the race and deny stale/unapproved source and altered release scope. Any failed production build retry requires separately reviewed owner permission. Static `[dic-publish]` markers on ongoing development are prohibited after controlled cutover.

**Separate operational gates:** Required GitHub branch protection and Netlify production-branch selection must be independently configured and verified. The existing account has a private unprotected branch; GitHub rulesets API returns 403 requiring GitHub Pro or a public repository, and GitHub app integration cannot administer branch protection. Do not buy Pro, make the repo public, change Netlify settings, publish, or write SQL/member data on this request without explicit further authorization. Until settings and race/actual provider tests pass, mark #38 OPEN / release protection not complete.

**ChatGPT Project settings:** Canonical ready-to-paste [Project instructions](CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md) are approved, but saving this file does NOT update Project UI settings. The owner must paste/save or grant a supported settings editor in another execution environment.

## Owner-Locked recipe UI supersession — ONE visible recipe, internal successful families (October 20, 2026)

**Explicit owner instruction:** “I definitely prefer option two that you recommended especially if you can identify which approach most closely matches the users preferences for taste and equipment. Let's go with that. Build and test it.”

**Active decision:** The coffee card must show **one** best-matching recommended/preferred recipe window, not a standalone or collapsed “Alternate Dialed-In Recipes” list. Internally retain distinct successful coffee/release + style ratio families and all historical successful shots. Never merge materially different proven approaches into an invented median. Keep Shot History and its existing revision-checked **Make Current Recipe** action: a successful current-setup shot explicitly selected by the user picks its durable **family/window**, retaining the chosen shot as a favorite example, and outranks automatic rankings. First-success auto-seeding of `current_family_id` without a saved favorite shot **does not imply a manual choice**.

**Automatic selection when there is no valid explicit favorite:** Prioritize successful shots on the active setup, basket, feed condition and calibration; next consider repeated compatible evidence (a candidate one-shot success remains valid but cannot displace comparably equipped repeated success on an unverified flavor guess); then use the user's stated clarity/body preference as a **low-confidence ratio-direction tie-breaker** among otherwise comparable successful families. A longer ratio can cautiously suggest clarity and a shorter ratio body, but identical all-green sensory ratings do **not** prove that either family tastes fruitier, sweeter, fuller or clearer. Explain such heuristic influence briefly and never declare an unmeasured sensory profile confirmed. When no preference is expressed or evidence is inadequate, use stronger compatible personal evidence and existing preference state. For other setups, recipe ratio may be a cautiously labeled reference, **not a measured local time, grind or temperature**. Preserve offline behavior, style separation, taste success definition, member privacy, family clustering and community qualification.

**Boundaries:** This replaces ONLY the earlier explicit alternate-family disclosure/UI and its optional family-name workshop idea as a near-term implementation requirement. Do not add required family naming, new preference questions, extra routine screens or a UI list. The existing ratio-led server clustering threshold (0.25) is an implementation heuristic, **not an owner-approved universal definition of significance**; classifying same-ratio different time/temperature approaches remains unresolved. Shared community family learning and provenance tiers remain open [#12](https://github.com/Schulzet3/The-Dial-In-Collective/issues/12); experiment candidate/confirmed lifecycle remains open [#13](https://github.com/Schulzet3/The-Dial-In-Collective/issues/13). Personal client-family selection alone does **not** implement cross-user preference matching or close either issue. No production deploy, database change, external subscription, billing or new invitations authorized by “Build and test it.”

**Implementation evidence (development only):** [source commit `413ca0e`](https://github.com/Schulzet3/The-Dial-In-Collective/commit/413ca0e5b31330cc00a6c7972bc44178129c26bd), [439/439 Node/lint/build](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39498670329), [390px owner browser and account checks](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39498670205), and [private visual and offline PWA review](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39498670046) all PASS. Synthetic data, not live multi-family accounts. See [Decision Ledger](DECISION_LEDGER.json) and [Current Status](CURRENT_STATUS.md).

## Owner-Locked operating rule: GitHub as the live project record (2026-10-17)

For **every** The Dial In Collective work session, record substantive actions, investigations, attempted changes, outcomes, tests, sources, decisions, errors, blockers and next steps in the private GitHub repository **as close to real time as possible**, not just at the end. GitHub is the canonical working log and seamless cross-chat/session handoff: a later work session must be able to resume by reading the branch's AGENTS, Current Status, Master Specification, Decision Ledger and relevant issues/commits, without asking for a separate handoff. Report incomplete or unverified work as such; never claim an unobserved test passed. Keep canonical documentation and issue states accurate after every meaningful milestone, commit and verify the actual result, and preserve all prior Locked product decisions and dated evidence. **GitHub write permission does not authorize production deployment, Supabase data mutation or spending.** Use the existing one-release approval and Netlify skip-marker controls. Never commit secrets, keys or private exports.

## Mandatory review and editable records (owner-Locked 2026-10-18)

The owner explicitly requested **remove the Later option** from a flagged Community shot review: if a synced, online, admitted member has an unresolved anomalous Dialed-In shot, offer exactly **Confirm Measurement** and **Correct Shot**; prevent postponing or navigating around a known hold until addressed. Saving the correction must use the existing owner/revision-checked editing process. If the value is genuinely unconventional, member confirmation qualifies it after the normal verified-coffee/data-integrity gates. This *narrowly supersedes* the staged optional Later/nonblocking behavior only **for a flagged, known hold**; ordinary, unflagged Log Shot → Rate → Recommendation remains uninterrupted. Offline sessions are recoverable and pending offline changes are preserved; never permanently lock a member out because a remote service is unavailable. Prompt only after actual server evaluation; user choice must be bound to shot and revision.

**Existing shots remain editable** by their owner from Shot History. Historical origin, equipment, style and timestamp cannot be silently rewritten; revision checks and downstream recomputation remain mandatory. **Coffee details must be editable** in a manner consistent with the single-source verified catalog: members can change their own still-Pending coffee submissions with concurrency checks, while attempted changes to globally verified canonical facts become owner-scoped, reviewable correction requests with source/audit evidence. Do not silently alter the shared canonical record, merge coffee releases, or rewrite historical shots as a side effect of a member's Edit Coffee action.

Owner has approved **one coordinated release** of these tested changes and the staged contextual outlier/Community UI; that specific release approval is consumed upon successful publication. Keep provider credits, backup, Netlify release marker, authentication, RLS and no-mass-historical-promotion safeguards. **There is no authorization to auto-promote the existing legacy Pending Yirgacheffe projection.**

## Owner-Locked limited invitation-only technical pilot milestone (PILOT-INVITE-ONLY-TECHNICAL-20261018-01; October 18, 2026)

**Exact owner approval:** “I approve proceeding toward a limited invitation-only technical pilot, while preserving all locked decisions and requiring my separate approval before publishing or applying production migrations.”

**Approved scope:** Prepare for a **small, trusted, invitation-only technical/early-access pilot** of the functioning cloud/PWA app so actual testers can provide usability, workflow and reliability feedback while outstanding full-beta implementation continues. Label invitations and tester expectations **“Limited Technical Pilot”**, **not** “complete beta”, “finished recommendation engine”, “public launch” or a waiver of the required functionality. The previously suggested **3–5 testers / one week** is an optional operator proposal, **not** an owner-selected headcount or timeline.

**Scope boundary:** This is a new, expressly owner-approved pre-beta *milestone*, not a replacement of §3, §4, §16–19, §22, §25, §41 or any of the 79 original Locked decisions. The §41 twenty-item core-beta acceptance gate is **unchanged**. P0 [#10 internal successful recipe families](https://github.com/Schulzet3/The-Dial-In-Collective/issues/10), [#12 complete evidence/provenance-weighted recommendations](https://github.com/Schulzet3/The-Dial-In-Collective/issues/12), and [#13 post-rating Experiment lifecycle](https://github.com/Schulzet3/The-Dial-In-Collective/issues/13) stay required for the specification-complete beta and cannot be represented as done in pilot communications.

**Authorized now:** Source/documentation and release-runbook preparation, read-only provider/security/privacy/recovery checks, already-permitted development-only tests, issue triage, one-at-a-time owner planning questions, and preparing honest tester instructions. Preserve fastest Log Shot → Rate → Recommendation, existing admin/member isolation, historical data/shot notes, and the existing closed historical import gate.

**Not authorized by this approval:** Applying **either** production migration, executing live SQL writes, issuing/redeeming a new real invite, adding/removing a real account or member, changing production Auth/SMTP/DNS/Netlify settings, uploading a production frontend, enabling public registration, consuming Netlify deployment credits, buying/upgrading services, sending invitations, or weakening private-beta/Recovery/CI safeguards. A **new, specific owner authorization** is mandatory for production migrations and publication; the prior releases' consent is exhausted. Do not conflate agreement on a pilot milestone with production authorization.

**Admission/privacy requirements remain:** Supabase verified email + member admission + admin/server RLS and anonymous sanitized Community data. Every **new** admin-issued invite admits exactly **one verified account**, is non-calendar-expiring until redeemed and is revocable while unused. Already-admitted members do not need another invite. Owner may use administrator-only **Remove Access / Restore Access** without hard deletion or loss of shots. Keep the owner-accepted Free-plan leaked-password-protection limitation accurately disclosed, never describe it as “fixed”. Perform actual signed-in account negative tests before sending new pilot codes.

**Release readiness and safety:** Both staged migrations are source/isolated-CI complete but **unapplied**, and the current live Netlify deploy remains the previous published PWA. A fresh encrypted offsite backup covering the most recently saved offline shot, actual credit availability, production SQL/source parity, user privacy checks, and separate owner release approval are prerequisites. Execute and verify exact migrations *in order* and perform **one** credit-aware deployment only after that distinct authorization; stop on drift or loss of membership/privacy integrity. [Pilot plan](INVITE_ONLY_TECHNICAL_PILOT_LAUNCH_PLAN_2026-10-18.md) and [pilot pre-release gate](TECHNICAL_PILOT_RELEASE_GATE_2026-10-18.md) carry the living checklist.

## Current scoped supersessions

| Topic | Governing record | Exact scope |
| --- | --- | --- |
| Limited technical pilot milestone | PILOT-INVITE-ONLY-TECHNICAL-20261018-01 (owner-approved October 18) | Add a **limited trusted invite-only early-access testing phase** without waiving §41 full-beta acceptance or any prior Locked requirement; this preparation approval does not authorize SQL migrations, real invitations/accounts, production publication, credit consumption or provider settings changes. |
| Product name | The Dial In Collective; dial in, dialed in and dialing in without hyphens. | Current product wording only. Historical filenames and quotations are preserved. |
| Production access | ACCESS-20261016-PRODUCTION-SSO | Production's extra Netlify login only; nonproduction SSO, Supabase Auth, verified email, admission, RLS and admin checks remain. |
| Owner-managed Netlify credits | OPS-CREDIT-OWNER-MONITORING-20261017-01 | Owner monitors the remaining Personal plan balance and will alert when low; no recurring credit screenshot requests. Owner observed 940/1000 Personal credits on Oct 17, 2026 (expires Nov 14); operational credits are not deployable. Known insufficient funds or expired grant still block; no unauthorized plan change or purchase. The former assistant-managed seven-day refresh requirement is narrowly superseded. |
| Owner approval of each release | OPS-PER-RELEASE-OWNER-APPROVAL-20261017-01 | **Never publish without new, explicit owner approval for that specific release.** A previous credit/spend approval never authorizes a later publication. The release marker, tested build, privacy controls, access gates and recovery checks remain mandatory. |
| Daily backup watch, periodic restoration | OPS-BACKUP-WATCH-CADENCE-20261017-01 | Daily exception-only backup-health watch remains; redundant six-hour watch disabled. Prior verified full hosted restore is accepted. No daily full disaster-recovery rebuild; consider selective restore testing periodically and full restore after significant recovery changes. User's Tasks Push/Email preferences are already enabled in account Settings. |
| Publication cadence | OPS-20261014-02 | Batch deliberate tested releases with verified credits. Ordinary source/docs pushes do not publish; prior 0-credit observations are historical. |
| Release holds | OPS-20261016-CONSOLIDATED-RELEASE and the later recorded universal-URL release | Consumed one-release approvals, not perpetual publication authorization. Earlier read-only audit prohibited deployment and writes; the later owner-approved seven-tier change still requires its separate verified release/credit and scoped production-data safeguards. |
| Routine recovery UI | VISUAL-20261015-01 | Remove routine Recovery Options UI only. Preserve historical import code, closed server save gate, password reset, emergency unsynced export and operator recovery. |
| Badge lettering and shape | VISUAL-BADGES-ORIGINAL-REFERENCE-06 | Exact original dark-JSX fills in both themes; white for Traditional/Ristretto, black for other mapped badges; flat pills; no shadows. Non-badge boundaries stay defined. |
| Text effects | VISUAL-NO-TEXT-SHADOWS-04 | No text shadows, halos, glyph strokes or glow anywhere, including admin. Preserve existing contrast caveat. |
| Mandatory flagged-shot resolution and editable coffee details | UX-OUTLIER-MANDATORY-20261018-01 | The latest owner removes optional Later on flagged shots; require confirm or original-shot edit when server flag is known, without interrupting unflagged shot logging or discarding offline data. Owner-editable Pending coffee proposals and reviewable source-backed Verified coffee corrections; never silently modify canonical facts. |
| Shot history controls | UX-HISTORY-CONTROLS-04 | Grind capitalized; phone date left; compact expanded-only Edit left / Make Current Recipe right; immutable hardware context and literal notes preserved. |
| Recipe captions | VISUAL-TEMP-CAPTION-20261016 | Keep Basket-based under Dose, remove Recommendation under Temperature; retain calculated target and meaningful evidence. |
| Coffee approval | COFFEE-20261014-01 | Owning admin exception and trusted release-specific automated verification only; unresolved member entries stay private Pending and usable. |
| URL extraction breadth | Universal roaster URL preview section of docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md | Safe authenticated extraction from any public HTTPS roaster; trusted official-source Verified promotion remains separate. Do not weaken SSRF/bounds or infer screenshot/OCR implementation. |
| One-click New Coffee URL Autofill | NEW-COFFEE-URL-AUTOFILL-20261017-01 | One Autofill From URL click populates available blank fields. Member reviews/edits and explicitly chooses Add Coffee. No separate Apply Suggested Details step, automatic save, overwrites or verification bypass. Narrowly supersedes only the older Apply confirmation click. |
| URL preview cooldown | COFFEE-URL-20261016-01 | Shared account-wide >=30 seconds on known and unknown roaster previews. Manual entry/logging remain available; current 60/rolling-day budget is engineering tuning, not Locked. Old 25/day is not silently reinstated. |
| Agtron and coffee-narrative evidence | COFFEE-ROAST-AGTRON-20261017-01; COFFEE-PRODUCT-NARRATIVE-20261017-02 | When an explicitly sourced Agtron number is present, use manufacturer ground-coffee Gourmet/Commercial anchor midpoints to suggest a seven-tier roast level. Unknown scale/sample gives a **provisional Gourmet-ground assumption**, not a verified measurement; don't map Whole Bean with ground chart or replace an explicit conflicting label. Read this product's corroborated Estate/Farm and anaerobic fermentation story, keep original shorthand visible, and never borrow related-product text. Existing manually entered fields and Verified/Pending roles remain protected. |
| Roast taxonomy and named-coffee choices | ROAST-TAXONOMY-20261016-01; COFFEE-ROAST-20261016-02 | Exactly seven Title Case levels, Ultra Light / Very Light / Light / Medium-Light / Medium / Medium-Dark / Dark. Preserve the previous five levels' meanings and proven recipe priors; only Medium-Light is a new display spelling for old Light-Medium. Owner-approved five-coffee classifications are limited to the named records, including private Pending Wuri; no other coffee, shot, history or membership changes authorized. |
| Daily URL preview budget | COFFEE-URL-DAILY-20261016-02 | Owner-approved starting cap of 12 allowed URL preview quota claims per admitted member account per 24-hour budget window, shared by known and unknown roaster preview paths; may be raised after actual member feedback only by a later explicit owner decision. Supersedes the adjustable 60/day engineering setting, not the Locked >=30-second account-wide cooldown. |
| Owner historical import | OWNER-IMPORT-20261014 | One-use, expiring owner-only exception, now closed. Does not authorize repeat imports or new data writes; later successful hosted recovery is acceptance evidence, not a blanket import unlock. |

## Owner-approved daily URL budget (Locked, October 16, 2026 local)

The owner explicitly chose **12 URL preview quota claims per admitted member account per 24-hour budget window** as the starting limit, instead of the earlier 60/day adjustable engineering setting or proposed 25/10. Known-roaster and unknown-roaster preview paths must share the same account limit; a successful quota claim counts even when external webpage extraction subsequently fails. When this limit affects the owner or members during real use, review actual feedback and **consider** raising it with a subsequent explicit decision; do not silently or automatically raise it.

**Unchanged:** the separate owner-Locked minimum **30 seconds between URL preview requests across all paths**, private Pending and trusted Verified handling, network/SSRF protections, and access to manual Add Coffee and Log Shot during cooldown or daily limits. This additive decision does not imply approval to deploy or alter production data without the established release process.

**Implementation precision:** the current stored counter window resets 24 hours after the first allowed claim within that window. This is a 24-hour per-account budget window, not an independently verified strict trailing-24-hour event history. The approved number change should not silently rewrite the accounting algorithm; any strict sliding-window enhancement should be separately assessed.

Authority: [COFFEE-URL-DAILY-20261016-02](DECISION_LEDGER_2026_10_16_DAILY_BUDGET.json). Older preserved source paragraphs describing 25/day or 60/day remain historical and are superseded **only for this daily budget setting**.

## Owner-managed credits and per-release approval (Locked, October 17, 2026 local)

The owner supplied an updated Netlify Usage & Billing screenshot showing **940 / 1,000 Personal credits remaining**, with grant expiry **November 14, 2026**. Separate operational credits are **28.8 / 30** and explicitly cannot fund production deploys; auto recharge is **disabled**. This is a point-in-time reading, not an API live count. The Netlify management plugin cannot read remaining credits. The owner **assumes responsibility to monitor credits and proactively tell us if low**; do not keep requesting balance screenshots or treat routine snapshot aging as a reason to interrupt development or an otherwise explicitly approved release during this still-valid grant.

**No publication without explicit per-release owner approval.** Ask the owner before any Netlify production publication, coordinated Supabase Edge deployment, or live coffee-data rollout; any earlier credits permission does not stand in for new release approval. Keep the deliberate `Release DIC: ... [dic-publish]` marker, passing CI, single fully tested release bundle, known minimum **15 deployable Personal credits**, no automatic branch/preview deploy, nonproduction SSO, login/member protection, recovery pin and restrictions on upgrades/top-ups. If known credit evidence proves insufficient, tampered or the grant has expired, the release guard must still fail closed; the owner may then confirm the new grant/plan as needed. **The earlier assistant-managed fresh-screenshot/7-day recency gate is narrowly superseded** by this owner-managed policy, not a blanket waiver of all release protections.

**Backup monitoring:** The owner verified a full encrypted/hosted restore and a newly arriving Google Drive backup. Maintain one **daily** failure/staleness watch (rather than redundant six-hourly checks). A successful past restore does not establish the next backup's presence; cheap daily schedule/delivery checks remain useful, but there is **no requirement to rebuild the entire system daily**. Periodically exercise recovery in isolation, risk-based (e.g., quarterly or after material infrastructure changes), without touching production or exposing decryption keys. The owner screenshot proves **ChatGPT Settings → Notifications → Tasks = Push, Email**; do not repeatedly instruct the owner to enable settings already on. Scheduler-specific booleans may report separately and do not prove a failed notification delivery.

Authority: [owner monitoring and publication preferences](DECISION_LEDGER_2026_10_17_RELEASE_AND_BACKUP_PREFS.json) and [point-in-time Netlify credit ledger](NETLIFY_CREDIT_LEDGER.json). The original historical approval/screenshot paragraphs remain unchanged for provenance. **No production release is authorized by this policy edit.**


### New Coffee Autofill button prominence — Locked (October 19/20, 2026)

**Decision `NEW-COFFEE-AUTOFILL-BUTTON-ONLY-20261019`:** On the current New Coffee screen, enlarge the existing **Autofill From URL** button so it is prominent and full-width in the URL section. Leave the rest of New Coffee's URL field, helper, order, all coffee detail fields, Save/Add actions and behavior unchanged. Explicitly reject the other proposed screen #2 modifications (including hiding optional fields). The owner requested **no changes** to UI concept screens **#1 Coffee Library, #3 Grinder Setup, #4 Shot Recommendation, or #5 Settings**. The prior Locked grinder help and arrow/info guidance remain. Implement/test in development; publish separately only with owner authorization. All other possible new i-icons and beginner UX suggestions remain proposals, not implemented.

## One-click Roaster Page URL Autofill (Locked, October 17, 2026 local)

Explicit owner approval: **Paste Roaster Page URL → Autofill From URL (one click) → review, correct or complete the coffee details → Add Coffee**. When safe source data is returned, Autofill immediately fills available **blank fields only**, preserving all user-entered values. A separate `Apply Suggested Details` button is not part of the approved flow. Autofill alone never saves or verifies a coffee, merges canonical identities, skips any release/duplicate confirmation, or overwrites fields the member already edited. Manual entry and Log Shot remain available if URLs fail, exceed limits or provide ambiguous data. The account-wide 12-claim/24-hour quota, minimum 30-second cooldown, HTTPS/SSRF/bounded-fetch requirements and Pending/member privacy remain unchanged.

This **narrowly supersedes only** the separate Apply Suggested Details confirmation step in the preserved original `NEW-COFFEE-URL-AUTOFILL-20261015` Locked wording. All other provisions of that historical decision are still in force. Governing amendment: [NEW-COFFEE-URL-AUTOFILL-20261017-01](DECISION_LEDGER_2026_10_17_ONE_CLICK_URL_AUTOFILL.json). The published app already behaves this way; the unreachable Apply handler/UI implementation is removed in staged development only, subject to CI and later release authorization.

## Agtron source measurements and product-specific processing (Locked, October 17, 2026 local)

The owner requested measurable roast information to influence **new URL Autofill suggestions** and correction of missing producer/fermentation data. [Manufacturer Agtron ground-coffee Gourmet/Commercial correlations](https://www.agtroninc.com/wp-content/uploads/m-basic-operating-system.pdf) are used as documented seven-tier **starting estimates** only. On *ground Gourmet*, the named center scores are 95 Ultra Light, 85 Very Light, 75 Light, 65 Medium-Light, 55 Medium, 45 Medium-Dark, 35 Dark; the algorithm uses the midpoints between these categories. The manufacturer also publishes a **different Commercial scale**; never apply Gourmet numerical bands to a score explicitly marked Commercial. Whole-bean measurements do not support direct classification with this ground-coffee chart, and underdeveloped/extreme measurements must not be forced into a seven-tier label.

When a roaster publishes an Agtron value **without its scale and whole-bean/ground context**, the app may populate an available blank roast selection as a **provisional Gourmet-ground estimate**, accompanied by the exact Agtron score and prominent review caveat. Such an estimate is *not* a verified manufacturer or roaster categorical classification and does not override a member-entered value, an explicit contradictory roaster roast label, or existing coffee records. PERC's published **78.4 Agtron** suggests **Light** under that assumption (78.4 lies closer to 75 than 85); the product webpage does not identify its scale/sample. All seven prior roast-label meanings, owner-assigned coffees and espresso recipe priors remain unchanged.

Read the selected coffee's actual product-scoped narrative, not only short UI field labels. A named **Estate/Farm** in that coffee's heading can supply a Producer suggestion **only when the same product's story corroborates it**. Specific fermentation treatment matters: PERC Kenya Mara Estate shows **Adv Natural** as a short process label, yet the product text explicitly identifies anaerobic natural fermented in sealed tanks for **96 hours**. Accordingly suggest **Anaerobic** in the existing single-select Process field and expose the original Natural shorthand and 96-hour process detail in source extras. Never infer Anaerobic from "Adv" alone, a generic mention of fermentation, unrelated navigation, another coffee, or blend components. Do not fabricate new stored attributes or silently edit historical coffee/shot data; preview remains review-before-Add Coffee.

This is a **narrow explicit supersession** of older acceptance notes that disallowed every Agtron-based roast estimate. Earlier research/report text remains historical. The source-value, safety, idempotency, privacy, account-wide 12/day and minimum 30-second preview cooldown, no-auto-save, and every-publication-requires-owner-approval decisions remain fully Locked. [Decision amendment](DECISION_LEDGER_2026_10_17_AGTRON_PROCESS_AND_PRODUCER.json); [research, exact PERC source and staged tests](AGTRON_AND_PERC_NARRATIVE_EXTRACTION_2026-10-17.md). These changes are currently **development-only**, not approved for Netlify or Supabase Edge publication.

## Owner-approved seven roast tiers (Locked, October 16, 2026 local)

**Seven categories, lightest to darkest, using the owner's capitalization and spelling:** **Ultra Light → Very Light → Light → Medium-Light → Medium → Medium-Dark → Dark**.

The prior five category meanings are preserved. The former **Light-Medium** is equivalent to current **Medium-Light**, not a new roast intensity. Previous Light, Medium, Medium-Dark and Dark retain their meaning. The two newly introduced labels **Ultra Light** and **Very Light** are lighter than Light; they do not silently move any previously stored Light coffee. Roaster source descriptions and original submission evidence are retained verbatim. To avoid false precision, the two new categories initially share the old Light starting recipe priors until adequate taste/shot data supports evidence-based differentiation; the existing five categories retain their exact baseline ratios, time bands, temperatures and treatment. The seven labels are guides, not laboratory Agtron intervals, quality grades or rigid success/failure conditions.

**Exact owner-authorized records:** Sweet Bloom **Hambela: Light**; Orinoco Coffee & Tea **Yirgacheffe: Medium-Light**; Proud Mary **Bavyeyi IV: Very Light**; Queen City Collective Coffee **David Armijos: Very Light**; Sweet Bloom private **Pending Wuri: Very Light**. The owner expressly provided those choices, not the roasters. Preserve existing globally Verified identities, library/shot IDs, taste/notes, family histories, private source records, contributor relationships, owner/member boundaries and Wuri's private Pending status. If updating Wuri's user-submitted current proposal, capture the previous manual Light choice and reason in an access-controlled audit, not by rewriting public or official source claims. No new verified coffee publication or automatic merge.

**Compatibility and rollout:** Read old Light-Medium as Medium-Light; never replace unknown roast facts with an inference based solely on the roaster. New Coffee picker, URL extraction, verified-source promotion, immutable historic imports, server CHECK constraints, recommendation arrays, UI and tests must be coordinated. A production data reclassification **must not occur before the published app supports all seven labels**, because the current published five-value engine otherwise falls back to Medium priors for novel values. Preserve the previously Locked release/credit and multi-account privacy controls. A staged code change is not a deployed feature.

Authority: [dated seven-tier Decision Ledger amendment](DECISION_LEDGER_2026_10_16_SEVEN_ROAST_TIERS.json). [Research and owner-confirmation history](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8#issuecomment-6230107778).

## Open product questions, not adopted requirements

The seven-tier taxonomy and all five named coffee classifications are now **Locked** by explicit owner approval. No pending roast-tier vote remains. Future changes to category meanings, starting priors, individual member records or user-facing release status require the ordinary separate approval and testing controls. Other independent backlog items are not resolved by this decision.

## Source provenance and limits

- Original specification: Library file `libfile_01913095f0dc8191b8c0139203720b16`, version `1`, 1,929 text lines, 69,795 bytes including final LF. Both read windows were retrieved completely. [Preserved baseline text](archive/requirements/The_Dial-In_Collective_Master_Specification_v1.0.md).
- Original ledger: Library file `libfile_37624da12f148191aae99aefdb03ac23`, version `1`, 22,815 bytes including final LF, 79 baseline Locked + 20 baseline Open entries and approved owner-import amendment. [Preserved baseline ledger](archive/requirements/The_Dial-In_Collective_Decision_Ledger_v1.0.json).
- GitHub source layers below are pinned to `6f37e6647e8ab90afd1965112e90ef4f82bbef8a` on `development/backend-foundation`. Their complete text is retained. Existing addendum files stay at their paths for auditability.
- These are text-preservation imports through complete Library reads with restored final newlines and matching declared sizes; no independent download-byte digest of the original Library files was obtained.
- Historic reports reference a separate v0.2.0 prototype workshop addendum that was not located as a standalone source. Do not invent it or claim exhaustive recovery of unseen material. Existing decisions recorded in the retrieved baseline/addenda remain authoritative.
- The August available archive contains pointers/manifests for nine research reports, not those report bodies. No independent research revalidation is claimed.

## Maintenance

Update this document and the consolidated ledger together for explicit product decisions. Preserve old source text and record what changed, approval provenance and narrow supersession. Operational progress belongs in CURRENT_STATUS and dated evidence. Future amendments should be included here in full and in the ledger with stable source references; historical snapshots remain evidence.

---

## Source 1 — original v1.0 specification (including approved Appendix A)

The following section integrates the original baseline with explicitly identified later owner-approved amendments and supersessions. The exact original v1.0 text remains in [the archived specification](archive/requirements/The_Dial-In_Collective_Master_Specification_v1.0.md). Its original open questions and build sequence must be read with those later amendments and current status.

# The Dial-In Collective
## Master Product & Build Specification

**Version:** 1.0  
**Date:** September 8, 2026  
**Status:** Canonical pre-build requirements baseline  
**Primary purpose:** Preserve product decisions in enough detail to design, implement, migrate, test, and later evolve The Dial-In Collective without losing the intent established during the requirements workshop.

---

# 1. Source-of-truth rules

This specification is the canonical requirements baseline for the rebuild.

When implementation sources conflict, use this precedence:

1. The latest explicit product decision made by the product owner.
2. This Master Product & Build Specification and its Decision Ledger.
3. The latest current application source, `dial-in-collective(2).jsx`, for behavior that has not been explicitly superseded.
4. The supplied screenshots for visual hierarchy, interaction patterns, and current UX behavior that has not been superseded.
5. The supplied export/backup data (`Pasted text.txt`) as a migration fixture and a real-world example of shot history behavior.
6. Earlier espresso research modules and evidence reviews, once placed in the same project/workspace, as the evidence base for recommendation rules.

A newer explicit decision always overrides an older implementation detail. The rebuild should not preserve a current-code behavior merely because it exists if the product decision has changed.

Future decisions should update both this specification and the decision ledger. Important behavior must not live only in chat history.

---

# 2. Product vision

The Dial-In Collective is a mobile-first espresso dial-in journal and recommendation system that becomes more useful as the user and community log successful shots.

The core experience must remain extremely simple:

**Open the app -> current coffee is ready -> Log a Shot -> rate taste -> get the next recommendation -> walk away.**

The app may contain sophisticated recommendation, community, equipment, identity, and validation logic underneath, but the user should not feel as though they are maintaining a database.

## 2.1 Product principles

- **Simple on the surface, sophisticated underneath.** Advanced modeling must not create routine data-entry burden.
- **Experimentation is a first-class behavior.** Espresso is not a fixed target. Recommendations are reference points, not rules.
- **Personal taste matters.** Two successful recipe families may both be valid; the best recommendation can differ by user preference.
- **Observed success beats generic theory.** A user's own successful shots on the same coffee/setup are highly valuable.
- **Community learning must be robust.** More shots improve confidence, but one heavy user must not dominate the Collective.
- **Raw data is preserved.** Derived recommendations and aggregates must be reproducible from underlying shot records.
- **Coffee identity must be reliable.** Similar names must not cause accidental merging or duplicate community records.
- **Facts and opinions are separated.** Coffee facts have one validated canonical record; user taste, notes, bags, and shots are user-level.
- **Progressive disclosure.** Community detail, bag detail, advanced equipment, and diagnostics are available without crowding the main workflow.
- **No false precision.** Once repeated successful shots exist, a useful recipe is often a successful window plus a centerpoint rather than one magical number.

---

# 3. Release scope and audience

## 3.1 Initial release

- Private beta to a small group selected by the product owner.
- Mobile-friendly web app / PWA is sufficient for V1.
- Native iOS/App Store distribution is not required initially.
- The app should be installable and feel app-like on mobile.

## 3.2 Long-term direction

- Potential broader sharing in espresso communities, including Reddit.
- Potential paid product later.
- Architecture should not prevent public scale, subscriptions, app-funded AI, or richer community features later.

## 3.3 Non-goals for initial beta

- Native mobile apps.
- Mandatory AI usage.
- Complex coffee-library filtering.
- Heavy social-network features.
- Required detailed bag-aging maintenance.
- Automatic AI coaching on every shot.
- Admin review of ordinary shots or ordinary fuzzy matches.

---

# 4. Private beta access and authentication

## 4.1 Beta access

- Beta signup is available through a private signup URL/link controlled by the product owner.
- The beta link can be revoked and replaced without affecting existing accounts.
- Public signup can replace the private beta gate later.

## 4.2 Accounts

- Username/login identifier: **email address**.
- Email is required.
- Primary authentication is password-based.
- Passwordless may be added later, but is not the primary V1 path.
- Use an internal immutable User ID that is never used as the public identity.
- Sessions should persist securely for as long as practical, using rolling/refresh-session behavior, until manual logout or security invalidation.

## 4.3 Public identity

- Community-facing shot displays do not expose email or a persistent visible anonymous contributor handle.
- Public UI should normally say **Community Shot**, not identify the contributor.
- Internally, the system may retain a privacy-preserving contributor relationship for weighting, abuse prevention, and analytics.

---

## 4.4 Breached-password protection for the invite-only beta (BETA-AUTH-BREACHCHECK-20261018-01 — Owner Locked, 2026-10-18)

The owner explicitly elected to **continue on the existing Supabase Free plan without requiring leaked-password/breach-list protection for this private beta**. Do not make Supabase Pro+ or the leaked-password-protection advisor warning a gate to proceeding with currently approved private beta development, testing, or invitations. This is a conscious **limited-beta risk acceptance**, not a claim that breach checks are operational or that accounts and notes contain no private information. Do not silently upgrade Supabase, buy a subscription, disable existing protection or add a substitute authentication provider.

**Every prior Locked authentication and privacy rule remains in force**: the password-based sign-in and recovery flows, email confirmation, minimum eight-character/new-password uppercase/supported-symbol rule (without imposing extra required digit/lowercase), Supabase secure token handling, invitation-only member admission, role/RLS protection, prevention of unauthorized account access, and keeping private shots, notes, email and equipment out of Community outputs. Existing admitted account credentials and sessions must not be invalidated. The independent real-account permission/privacy tests, verified backups, revocable invitations and all other applicable core beta acceptance requirements **are not waived**.

Supabase's advisor will continue to report **`auth_leaked_password_protection` WARN** on Free. This is **acknowledged but not technically resolved**; revisit if there is an approved paid-tier decision, broader public launch, a higher-risk data model, or an actual compromise. This decision does **not** authorize the pending Community SQL migration or Netlify production deployment; both retain separate, explicit per-release approval requirements.

## 4.5 Permanent administrator, durable member accounts and owner-generated beta invitations (ACCESS-PERMANENT-20261018-01 — Owner Locked scope)

**Owner request:** “Can you Build the self-service admin invitation controls now so I can generate invite codes as needed for this initial beta? ... my admin account will never require an invite code and will never expire? ... all accounts/invite codes to be permanent (with the option to remove them from the admin portal). Is that a good plan?”

**Locked account-lifetime rule:** Existing administrator has a permanent **app administrator role and admitted membership**, not a time-limited invitation, and **must never be asked to redeem another invite for routine sign-in**. Administrators and admitted regular members **have no automatic account/admission expiration**; once a valid invitation is redeemed, the person keeps access unless the owner explicitly revokes it. Sign-in tokens/session credentials can independently require renewal or reauthentication; "permanent account" does **not** mean an immortal login session or immunity from owner/hosted-provider account disablement, security incident or owner-approved deletion.

**Owner-control rule:** Provide a **self-service, administrator-only** invitation dashboard: securely generate codes on demand, copy the newly generated code, see each code's usage/status, **revoke** codes, view admitted member accounts, and **remove/restore non-administrator access**. Every administrator is **protected from removal through the portal and server-side admin-access mutation endpoint**, not just hidden in UI. “Remove Access” immediately changes server-side admission used by RLS and member RPCs while **preserving** the user's personal shot/notes history, existing durable anonymous Community contributions and immutable account identity. Restoration requires administrator authorization; full permanent Auth-account/data erasure is a separate privacy-sensitive product decision and is **not** implicitly performed.

**Locked invite-duration AND redemption rule (2026-10-18 clarification `ACCESS-SINGLE-USE-CODES-20261018-01`):** Every **new portal-generated code admits exactly ONE verified email account, once only**, with **no automatic calendar expiry before redemption**. After one successful new-account redemption it is *used*, never reusable for another account, even if that account is later disabled. The unused code remains valid until first redemption or explicit administrator revocation. The generation interface must **NOT** offer 5-use or unlimited-use codes, and the **server** must also enforce `max_uses=1` (not trust an edited browser field). This narrowly supersedes only the provisional multi-use invitation choices in the prior October 18 §4.5 wording; it does not alter the permanent member/admin role decision. The existing database has nullable `expires_at`/`max_uses` for **historic** codes; never silently modify preexisting issued/redeemed rows or weaken past explicit revocations. Revoking an invite must **never revoke a successfully admitted account**. Secure plaintext code generated server-side via 2 independent PostgreSQL cryptographic v4 UUIDs (~244-bit unpredictability), prefixed `dic-`, SHA-256 hash stored privately, shown only once to administrator; never list or store raw codes in GitHub, browser storage or logs. Administrator-only management functions must enforce admission/admin on the **server**, deny anon/nonadmin, maintain non-secret audit receipts and bound active issuance.

**Resolved owner decision:** The owner explicitly confirmed “each code should only be usable for one email/account creation.” **Single-use is mandatory**, not merely a default. Do not ask again whether 5-use or unlimited code reuse is desired, and do not conflate permanently admitted accounts with reusable invite codes. **Account management** means administrator-only *Remove Access* / *Restore Access* for nonadministrators, retaining account, history and member identity. Permanent erasure of an account or its data is a separate destructive, presently **unapproved** decision. All current §4.1 revocable private beta admission rules remain.

**Latest owner scope clarification (2026-10-18, ACCESS-REVERSIBLE-REMOVE-ONLY-20261018-01, Locked):** Owner explicitly decided: “I don’t think we need an actual account deletion, remove Access would be sufficient, don’t you?” The product's **entire beta member-removal workflow is administrator-only Remove Access / Restore Access**. This is a reversible admission change (`private.beta_members.enabled=false/true`), **not deletion** of a Supabase Auth user, membership/identity row, private setup, shot, shot rating, personal note, recipe or durable anonymized Community contribution. When removed, members cannot use member-gated application endpoints; existing Supabase sign-in tokens may persist until ordinary expiry, so every protected read/write must check current server admission and RLS. Restoring admission makes the same user's saved data available again. The server must deny attempts to remove *any* administrator, including the owner. **Do not build, expose, or use a member-account hard-delete endpoint or cascading Auth deletion as an admin portal feature**. The current database's foreign keys include `ON DELETE CASCADE` to `auth.users` for personal shots and related tables, so out-of-band hard deletion is **not proven safe** for shot retention and must not be presented as such. If independent user-initiated legal erasure is needed in the future, design a separate consent/privacy-preserving retention and anonymization workflow, with explicit new owner review, security/legal requirements, and actual tests; it is **not part of this initial beta**. This clarification narrows the earlier potential deletion requirement; it does not override any earlier Locked retention, privacy, role, beta, invitation, or no-automatic-expiration requirements.

**Delivery status:** Implemented/tested in private `development/backend-foundation` only, with official CLI-generated migration `20261018235549_dic_admin_beta_invitation_controls.sql` immediately after the already staged Community release-context migration. **No production invitation/admin UI or schema changes, no new tester codes/accounts and no Netlify publish** are approved by the build request. Historical data/79 baseline Locked decisions/20 baseline Open entries remain preserved.

# 5. Core information architecture and screen model

The rebuild should reduce the current "everything expands inside everything" feeling while preserving the inline comparison interactions that are genuinely useful.

## 5.1 Main coffee screen

The home screen is primarily the user's coffee library and current dial-in workspace.

The current coffee is the most important object on app open.

The main screen should contain:

- Header/branding and theme/settings access.
- Add Coffee action.
- Current coffee pinned at the top when not searching.
- Other coffees below in Recent or A-Z order.
- Expandable coffee cards.
- Search/sort controls tucked into a caret/dropdown menu.

## 5.2 Dedicated focused screens/sheets

Use focused screens or sheets for tasks that benefit from reduced clutter:

- Settings.
- Add Coffee.
- Log a Shot.
- Potential future account/admin tasks.

## 5.3 Inline interactions that must remain

- Coffee cards expand inline on the main page.
- Shot-history rows expand inline on the current page.
- Multiple shot-history entries may be expanded at the same time to compare shots, including radar graphs.
- Do not force Shot Details into a separate modal if doing so prevents quick multi-shot comparison.

---

# 6. Current coffee, ordering, and library behavior

## 6.1 Current coffee semantics

**Viewing a coffee is not the same as using that coffee.**

- Tapping/expanding an older coffee does **not** make it current.
- A user may inspect an old or similar coffee purely for reference.
- **Logging a shot for a coffee is the action that makes that coffee current.**
- No separate "Select Coffee" button is needed in V1; it adds a redundant step.

## 6.2 App-open behavior

On normal app open:

- The current/most recently used coffee is pinned at the top.
- Its card is already expanded.
- Its current/preferred recipe or active dial-in state is immediately visible.
- **Log a Shot** is immediately available.
- The last-used equipment setup is already selected.
- If an Experiment is active for that coffee/setup, the Experiment panel is visible and the main Log a Shot action continues that experiment.

## 6.3 Changing current coffee

When a shot is successfully logged for another coffee:

- That coffee becomes current.
- It moves to the top.
- It is expanded.
- The previous current coffee automatically collapses.
- The previous current coffee becomes second in Recent order unless another coffee was used more recently.

## 6.4 Ordering

Default order below the pinned current coffee: **Most Recently Used**, determined by actual shot logging, not by viewing.

Available sort modes:

- **Recent** - default.
- **A-Z**.

Even when A-Z is selected, the current coffee remains pinned at the top outside search mode.

## 6.5 Search

- Search and sort are always tucked away under a caret/dropdown menu, regardless of library size.
- There are no filter builders or advanced filtering controls in V1.
- One simple search box searches all useful coffee-card metadata:
  - coffee name
  - roaster
  - origin
  - producer
  - roast level
  - elevation
  - process
  - variety
  - tasting notes
- During an active search, show only matches.
- If the current coffee does not match, it temporarily disappears from the search result list.
- Clearing search restores the current coffee pinned at the top.
- Searching never changes which coffee is current.

---

# 7. Coffee card behavior and visual hierarchy

## 7.1 Collapsed card

Preserve the compact current design language. A collapsed coffee card should communicate the essentials without turning into a dashboard.

Expected information:

- Coffee name.
- Shot-style badge/icon.
- Dialed In badge when applicable.
- Roaster.
- Origin.
- Roast level/status where known.
- Expand/collapse affordance.

Bag detail should **not** appear on the collapsed card.

## 7.2 Expanded card - primary content

The expanded card should prioritize:

1. Current/preferred recipe or current dial-in state.
2. Log a Shot.
3. If not dialed in: previous-shot feedback and next recommendation.
4. If an experiment is active: Experiment panel.
5. Shot History.
6. Shot History retains other successful approaches; no separate Alternate Recipes control.
7. Coffee facts and source/roaster details.
8. Community detail behind progressive disclosure.
9. Optional Bag Details behind progressive disclosure.

## 7.3 Existing visual language to preserve

The product owner likes the current overall design language and wants refinement rather than a visual reset.

Preserve or closely echo:

- Fraunces-style editorial serif for primary display headings.
- Inter-style sans serif for UI/body.
- Monospaced numerical treatment for recipe metrics where useful.
- Warm cream / espresso / copper palette.
- Muted blues for shot-style badges.
- Green-to-red sensory ramp.
- Light and dark themes.
- Compact rounded cards.
- Subtle borders rather than heavy separators.
- Progressive disclosure rather than permanent secondary statistics.

The rebuild may improve spacing, responsiveness, hierarchy, accessibility, and navigation while maintaining this visual identity.

---

# 8. Canonical coffee identity

The rebuild must replace the current shared-key/bucket identity system with a true canonical coffee model.

## 8.1 Canonical Coffee ID

Every distinct coffee release/lot has a stable canonical Coffee ID.

Identity must not depend on mutable text fields such as display name, roaster spelling, URL query parameters, or user-edited metadata.

## 8.2 Release-level identity

- Same coffee name in a different harvest, lot, or release is a **separate canonical coffee**.
- Related releases are linked in a relationship/group so the recommendation engine can use them as weaker fallback evidence.
- Historical/unavailable releases remain searchable indefinitely.
- Availability is a status, not identity.

Recommendation fallback order should generally be:

**Exact release -> related release(s) -> highly similar coffees -> broader roast/style/equipment evidence.**

Each step down should reduce confidence.

## 8.3 URLs and aliases

Maintain normalized/canonical URLs and aliases separately from identity.

- Tracking parameters should not create a new coffee.
- Multiple URLs may point to the same canonical release.
- A changed URL does not change the Coffee ID.

---

# 9. Add Coffee workflow

URL and/or screenshot remain the primary new-coffee inputs because they improve identity matching and data quality.

## 9.1 Primary flow

1. User opens Add Coffee.
2. User may paste a roaster product URL, add screenshot(s), or both.
3. System checks the canonical coffee database before spending AI/API usage.
4. Exact canonical/URL match:
   - add the existing canonical coffee to the user's library immediately;
   - no AI call is required.
5. Very likely fuzzy match:
   - show the likely existing coffee;
   - require **user confirmation** before merging/using it.
6. User says it is different:
   - continue as a new-coffee verification flow.
7. Only genuine identity conflicts or ambiguous canonical duplicates should reach admin review.

## 9.2 Duplicate policy

- Normal fuzzy-match confirmation is a user action, not an admin bottleneck.
- The system must prioritize avoiding accidental merges while keeping Add Coffee fast.

## 9.3 Required vs optional fields

Preserve the current principle that only a small number of fields are required.

Current user-facing baseline:

- Name / Bag Label: required.
- Roaster: required.
- Origin: optional.
- Elevation: optional.
- Roast level: optional.
- Process: optional.
- Variety: optional.
- Producer: optional.
- Tasting notes: optional.
- Roaster URL: optional.
- Shot style: has a recommended/default selection and can be changed.

The backend canonical model can be more structured, but the user should not be forced to complete missing facts manually.

## 9.4 Missing information

Secondary sources may fill a missing field only when the source can be confidently verified as referring to the **exact same coffee/release** and, where relevant, the same roaster.

If the match cannot be verified, the field remains blank.

Do not invent values merely to complete the record.

---

# 10. Canonical coffee facts, verification, and audit history

## 10.1 One validated factual record

The following are canonical coffee/release facts rather than user-specific alternate truths:

- Coffee/lot/release name.
- Roaster.
- Product/source URL(s).
- Origin.
- Elevation.
- Variety.
- Process.
- Producer.
- Roast level.
- Roaster tasting notes.
- Roaster-published espresso recipe.
- Availability status.
- Related-release relationships.

## 10.2 User corrections

- Users can propose corrections or additions.
- Users should not create private conflicting factual versions of the same canonical coffee.

## 10.3 Source hierarchy

Preferred evidence order:

1. Exact roaster product page / official roaster source.
2. Other reliable sources verified to the exact same coffee/release.
3. Derived estimates only where explicitly allowed and labeled as estimates.

## 10.4 Hybrid verification

- Strong, source-backed, non-conflicting update: may auto-apply.
- Actual conflict between credible sources: admin review.
- Preserve a change/audit history with prior value, new value, source, and date.

---

# 11. Pending coffees when AI is unavailable

The app must remain usable without a Claude API key.

If a user enters a genuinely new coffee and the app cannot complete automated extraction/verification:

- Create a **Pending Coffee**.
- The user can log shots immediately.
- Pending-coffee shots remain private/non-community until the coffee is approved.
- Pending coffee goes to the admin verification queue.
- On approval, previously qualifying dialed-in shots automatically become community-eligible.
- If the pending coffee is rejected because it is a duplicate, reassign the library entry and shots to the existing canonical coffee without data loss.

---

# 12. AI and API strategy

## 12.1 Provider

- V1 AI provider: **Claude only**.
- Keep the provider layer modular so another provider, including OpenAI, can be added later without redesigning the app.

## 12.2 AI purpose

Primary V1 AI use:

- Extract and structure coffee data from roaster URLs and screenshots.
- Assist in exact-release identification/normalization when useful.

AI is **not** required on every shot.

Shot recommendations remain deterministic/data-driven by default.

## 12.3 BYOK

- Users provide their own Claude API key if they want automated extraction.
- The key is stored **on the device only**.
- Do not write the key to the central Dial-In Collective database.
- App remains functional without a key.
- The natural consequence is that a user using multiple devices may need to enter their key on each device.

## 12.4 Future AI Coach

A future optional, user-triggered AI Coach / Ask AI feature is desirable.

- It should be explicitly invoked by the user.
- It should not silently consume API credits on ordinary shot logging.
- If the app later becomes paid, app-funded AI can be reconsidered if pricing covers usage.

## 12.5 Screenshot retention

- User-uploaded screenshots used for extraction are discarded after successful extraction/processing.
- Preserve structured extracted data, source references, and an official roaster image/thumbnail when appropriate.
- Do not accumulate user screenshots as long-term storage by default.

---

# 13. Equipment model

## 13.1 Beginner-first setup

The default experience should behave like one equipment setup.

An advanced user may create additional setups such as:

- Home.
- Office.
- Travel.
- Same machine with a different grinder/burr set.

Additional setups should live behind an Advanced Equipment / Additional Setups affordance.

## 13.2 Setup fields

Current V1 baseline fields to preserve:

- Usual Dose.
- Grinder espresso range.
- Track brew temperature toggle.
- Temperature unit (F/C) when tracking temperature.
- Tasting Preferences / Notes.
- Claude API key - local/device-only and not part of central equipment data.

Expanded optional equipment details supported by the new schema:

- Espresso machine model.
- Grinder model.
- Burr set.
- Basket size/type.
- Pressure/flow capability.
- Other equipment attributes needed by future recommendation logic.

These details should remain optional unless required for a specific feature.

## 13.3 Setup selection

- Remember the default/last-used setup automatically.
- Keep the setup switcher small and secondary.
- The user should not repeatedly select equipment for every shot.

## 13.4 Historical integrity

Every shot must permanently record the setup used.

Every shot should also preserve an immutable equipment snapshot/version as it existed at shot time.

Editing a setup later affects future shots only; it must not rewrite historical shot context.

## 13.5 Grind-range concept

The current app defines an espresso range for the grinder and normalizes community grind position against that range. This concept should be preserved, but public-scale implementation must support arbitrary grinder scales reliably.

A final product decision is still needed on grinder direction and discrete/stepless handling. See the Open Questions register.


## 13.6 Grinder range help — approved October 19, 2026

**UX-GRINDER-RANGE-INFO-20261019 — Locked.** On **New Setup**, group the existing two required numeric fields (**Finest Espresso Setting** and **Coarsest Espresso Setting**) under the heading **Grinder Espresso Range**. Place a small, lowercase **i** information control directly beside that heading. The description is collapsed by default and opens when the icon is clicked/tapped:

> Enter the range of grind settings you would normally use for espresso, not the grinder's entire adjustment range.

The icon must be accessible to touch, keyboard, and assistive technology; showing the text must not submit the form, replace field values, or introduce constant onboarding clutter. The owner favors this unobtrusive information pattern elsewhere when a concise explanation is useful, but has not authorized a blanket rewrite of other screens.

**Preserved behavior:** Keep both required field names, their stored meanings and validations, the existing lower-number=finer / higher-number=coarser orientation, calibrated history, snapshots and engine computations unchanged. The owner's observation that larger numbers correspond to coarser settings is consistent with the current app's convention, but does **not** establish manufacturer universality; the unresolved wider grinder-scale compatibility issue (#17, §37.1E) remains Open. No higher-is-finer toggle, new database field, or historical reinterpretation is authorized by this copy decision.

**Separate open product question:** Visual presentation of “one intentional variable at a time” within next-shot feedback remains proposed in issue #39; do not change recommendation logic or copy as part of this setup-only approval.


---

# 14. Shot logging - core UX

The Log Shot experience should be a focused screen/sheet, not a large inline form embedded inside the coffee card.

## 14.1 Open behavior

From the current coffee card, the user should be able to tap **Log a Shot** immediately.

The form should be optimized for speed and minimal typing.

## 14.2 Required fields

Required for a new shot:

- Dose.
- Yield.
- Time.
- Grind Setting.
- All five sensory scales.

Optional:

- Temperature, when temperature tracking is enabled.
- Notes.

## 14.3 Dose prefill

Priority:

1. Previous **actual** dose for this coffee + active equipment setup, if available.
2. Otherwise the equipment setup's **Usual Dose**.

Dose remains editable on every shot.

## 14.4 Yield

- Required.
- Always blank when opening a new shot form.
- Never silently prefilled from a recommendation or previous shot.

## 14.5 Time

- Required.
- Always blank when opening a new shot form.
- Never silently prefilled from a recommendation or previous shot.

## 14.6 Grind

- Required in the rebuild.
- Prefill is specific to **coffee + equipment setup + shot style**.
- If a previous actual grind exists for that exact combination, prefill it.
- If there is no previous actual grind for that style, leave the actual log field blank.
- Show a separate **Suggested Grind** recommendation when available.
- Never silently insert a derived recommendation into the field as though it were measured/actual.
- Provide **Use Recommendation** to copy the suggested value into the actual field.
- Record internally that the entered value originated from the recommendation when the button is used.
- The user is always free to enter any other valid value without warning or judgment.

## 14.7 Temperature

- Optional because many machines cannot control brew temperature.
- Controlled by a Settings toggle.
- If tracking is off, hide temperature from shot logging and recipe display.

When tracking is on, prefill priority:

1. Previous actual temperature for exact coffee + setup + style.
2. If none for the style, most recent actual temperature for the same coffee + setup from another style; label context subtly, e.g. "Last used on Traditional."
3. If no prior actual temperature exists for that coffee/setup, leave the actual field blank.

Separately:

- Show the recommended temperature.
- Provide **Use Recommendation** to copy it into the actual field.
- Record recommendation-origin metadata when used.
- Do not flag or criticize a user who chooses another temperature.

## 14.8 Recommendations stay visible

Recommended grind/temperature should remain visible even when they match the current value. They are confirmation/reference, not compliance rules.

Do **not** show deviation labels such as "2 F cooler than recommended" merely because the user chooses differently.

## 14.9 Save/return behavior

After the user rates and saves a shot:

- Close the Log Shot screen/sheet automatically.
- Return to the expanded coffee card.
- Immediately show the new shot result and relevant recommendation in the appropriate workspace.

---

# 15. Sensory system

Preserve the five existing 1-5 sensory scales and their conceptual meanings.

## 15.1 Scales

1. **Extraction** - Sour <-> Bitter, balanced in the center.
2. **Body** - Thin <-> Heavy, balanced in the center.
3. **Clarity** - Muddled -> Distinct.
4. **Sweetness** - None -> Exceptional.
5. **Astringency / Dryness** - Severe -> None in the displayed direction; less is better.

## 15.2 Required input

- Nothing is preselected.
- All five scales must be actively rated before saving a shot.

## 15.3 Current pure-green values

The current visual ramp treats these as pure green:

- Extraction = 3 (Balanced).
- Body = 3 (Balanced).
- Clarity = 5 (Distinct).
- Sweetness = 5 (Exceptional).
- Astringency = 1 (None).

## 15.4 Radar graph and tasting chips

Preserve the existing concept:

- Tasting chips/bubbles summarize the five axes.
- The radar/extraction compass visualizes the same scale values.
- The same color logic should be shared between input, chips, and radar so they cannot visually contradict each other.

---

# 16. Definition of Dialed In

This is an explicit change from the current application.

**Dialed In = all required sensory markers are pure green.**

Style time/ratio guidelines do **not** veto an all-green plausible shot.

A shot can be outside a typical style range and still be Dialed In if the user rates all required sensory markers green.

## 16.1 Community eligibility

- All shots stay in personal history.
- Only Dialed-In shots are eligible for community learning.
- Only Dialed-In shots appear in Community Shots browsing.
- A non-dialed shot remains private/non-community.

## 16.2 Established coffee state

Once a coffee has been dialed in, it remains marked Dialed In even when later experimental or ordinary shots are not green.

A bad later shot does not erase successful history.

---

# 17. Recipe concepts - do not collapse them into one number

The rebuild must distinguish several concepts that the current application partly merges together.

## 17.1 Starting Recommendation

The system's best pre-shot suggestion based on:

- exact coffee data if available;
- user's own history;
- exact/related community data;
- equipment/setup;
- roast/style baseline;
- roaster recipe where relevant;
- taste preferences;
- deterministic espresso logic.

## 17.2 Successful / Dialed-In Window

Once multiple successful shots exist for a recipe family, show a range rather than pretending one value is universally exact.

Example using the supplied Bavyeyi IV data:

- Dose: 18.0 g.
- Yield successful range: **49.7-51.2 g**.
- Time successful range: **18.5-22.0 s**.
- Grind: 0.2.
- Temperature: 193 F.
- Centerpoint: approximately **50.5 g and 20.8 s**.

For a small number of successful shots, observed min/max can be useful.

With many successful shots, use a **robust successful range** rather than raw lifetime min/max so one unusual but legitimate green shot does not permanently stretch the recommendation window.

The centerpoint should also use robust statistics when the dataset becomes large.

## 17.3 Current / Preferred Recipe

A user can mark a successful recipe as their current/preferred recipe.

This is a preference state, not a deletion of other successful recipes.

## 17.4 Internal successful families — one visible recipe (owner supersession October 20)

- Preserve all other successful families and raw shots **internally** whenever a new recipe becomes preferred.
- Show **one** recommended/preferred successful family/window in the expanded coffee card, with normal Shot History below.
- **Do not render** the previously proposed collapsed Alternate Dialed-In Recipes UI.
- Users can select another visible, successful shot in Shot History with **Make Current Recipe**; that explicitly chooses its family/window and outranks automatic taste/equipment heuristics.
- No mandatory recipe naming or new post-success interaction. Previous alternate-list proposal remains in Git history and the scoped supersession record.

## 17.5 Recipe families

Do not average materially different successful approaches into one giant range.

Cluster them as separate **recipe families**.

Examples might include:

- a higher-clarity, longer-ratio Turbo family;
- a higher-body, shorter-ratio family;
- a different-temperature family;
- a different style.

Community recommendation logic may choose among families based on the user's preferences and equipment context.

---

# 18. Experiment system

Experimentation should feel intentional and positive, not like the user has violated a rule.

## 18.1 Meaningful-change detection

A meaningful change is a possible signal of intentional experimentation.

Initial trigger thresholds:

- Dose: **0.5 g** or more.
- Yield: **5 g** or more.
- Time: **5 s** or more.
- Temperature: **2 C / approximately 4 F** or more.
- Grind: adaptive to the grinder's configured espresso range; for the product owner's 0.0-5.0 grinder range, **0.1** is meaningful.
- Shot style: any explicit style change is meaningful.

Crossing **any one** threshold is enough to trigger possible-experiment logic.

These are not warnings, errors, or hard bounds.

Time should not infer experimentation for small natural shot-to-shot variation; approximately 5 seconds is the starting threshold.

## 18.2 Prompt timing

Do not interrupt the user while filling out the shot form.

After the user finishes rating/saving a meaningfully changed shot, prompt with a lightweight question such as:

**Trying something different?**  
This shot changed meaningfully from your current recipe.  
**Start an Experiment** | **No, just log it**

## 18.3 Experiment workspace

If the user confirms:

- Coffee remains Dialed In based on the established recipe.
- Existing preferred recipe remains intact.
- Show a distinct, lightly separated **Experiment** panel with a small badge.
- The Experiment panel contains:
  - latest experimental shot;
  - radar graph;
  - tasting bubbles;
  - what changed;
  - next-shot recommendation;
  - experiment-specific history/progress as appropriate.
- Main Log a Shot action automatically continues the active experiment.
- User does not reconfirm "experiment" for every subsequent shot.

## 18.4 End Experiment

- User can choose **End Experiment**.
- If the new approach is not preferred, ending the experiment returns the interface to the original preferred recipe.
- Failed/non-green experimental shots remain in private personal history.

## 18.5 Candidate and confirmation lifecycle

- First materially different **all-green** experimental shot -> **Candidate Recipe Family**.
- Second successful repeat -> **Confirmed internal successful recipe family** (not a separate routine UI card).
- User may choose **Make Current Recipe** immediately after the first successful candidate if they love it.
- Candidate/confirmed status and current/preferred status are separate concepts.

## 18.6 Successful experiment that is not preferred

If an experiment produces an all-green result but the user decides the old recipe is still better:

- The successful experimental shot remains valid.
- It remains community-eligible.
- It may remain a candidate or another valid internal recipe family.
- Ending the experiment only changes the user's active preference/workspace; it does not invalidate the successful shot.

---

# 19. Non-experiment dial-in display behavior

## 19.1 Coffee not yet dialed in

The current app behavior is valuable and should be preserved.

For a coffee that is **not yet Dialed In**, prominently show:

- Previous/latest shot radar graph.
- Tasting bubbles.
- Shot result context.
- Clear recommendation for what to change on the next shot.

This is the active dial-in workspace.

## 19.2 Coffee already dialed in

- Current/preferred recipe/window is primary.
- Shot History remains available for inspection.
- A later non-green shot does not automatically replace the main recipe with a large dial-in panel.
- The large Experiment workspace should appear only after the user confirms that the meaningful change is an experiment.

A remaining UX detail is open regarding how much brief feedback to show for a non-green shot on an already dialed-in coffee when the user chooses "No, just log it." See Open Questions.

## 19.3 Next-shot recommendation: one deliberate adjustment (Locked and implemented in development; unpublished)

**RECOMMENDATION-SINGLE-INTENTIONAL-CHANGE-20261019 — Locked.** Specific next-shot advice should recommend only **one intentional adjustable setting/attribute** change at a time while stating what otherwise stays constant, so the next comparison more clearly isolates the likely effect. Show an actionable exact adjustment when supported by evidence (e.g. an illustrative finer grind 2.5 → 2.4); otherwise do not invent false precision. This is an approach to better identifying cause and effect, **not a guarantee of controlled scientific causation**. Shot time may change naturally as an *outcome* and should be observed/logged rather than portrayed as an independently fixed setting.

- A starting recipe or established recipe window may still show several target measurements simultaneously; that is not an instruction to change several variables on the next shot.
- No new rule blocks user-directed experimentation, changes the meaning of a measured result or silently edits previously recorded shots.
- **Copy constraint — Locked:** Do **not** display the proposed badge/text **“One adjustment at a time”**. It was rejected as visible UI clutter, not as an algorithmic concept. The initial side-by-side Change/Keep metric-card graphic was also too busy.
- **Layout choice — Locked as `RECOMMENDATION-OPTION-A-ARROW-INFO-20261019` (October 2026 owner clarification):** Use **Option A's uncluttered previous → next arrow** with the same **small lowercase i icon** beside **Next Shot Recommendation**. Show a specific previous **actual shot** → suggested next value for exactly one controllable variable, plus one muted sentence naming the other unchanged controllable settings. No separate Change/Keep metric cards, colored badges, or extra boxes. The i reveals a concise cause/effect explanation and mentions that measured shot time may change naturally. Keep the existing tasting bubbles and radar. If no single reliable measurable change exists (including distribution-only technique and successful shots), retain specific original textual feedback rather than inventing an arrow. The immediately previous **Option B text-only layout is explicitly superseded and never reached runtime**; keep its decision history while removing obsolete draft UI suggestions from the active design.
- **Accessibility and data:** Reuse the New Setup lowercase i control styling and 36 px tap target, accessible label and live `aria-expanded` state; use a unique explanation ID per coffee. Derive arrows from recorded shot measurements and the next suggested action, never an estimated starting recipe or measured time outcome. Format values using existing units. Preserve evidence notes when a recommended grind step was sized from comparable shots. Preparation advice should focus on distribution alone instead of asking for a simultaneous tamp change.
- Keep the recommendation panel fast to scan and compatible with the approved Log Shot → Rate → Recommendation flow and all existing Locked evidence, history and experiment rules.

Source: owner conversation on the next-shot recommendation, recorded in [issue #39](https://github.com/Schulzet3/The-Dial-In-Collective/issues/39) on 2026-10-19/20. The initial decision approved the one-variable principle and removed visible badge copy. The owner's subsequent explicit correction Locked the arrow-and-info presentation, now implemented and tested in development but not published or accepted on a live device.


---

# 20. Shot History

## 20.1 Compact rows

Shot History should be scannable in compact form, showing useful metrics such as:

- dose -> yield;
- ratio;
- time;
- grind;
- temperature when tracked;
- date;
- style;
- Dialed In badge when applicable;
- concise sensory chips.

## 20.2 Expand inline

Tapping a shot expands it **inside the current page**, not in a separate full-screen detail view.

Expanded shot detail should include:

- full radar graph;
- all five sensory markers/chips;
- dose;
- yield;
- ratio;
- time;
- grind;
- temperature if tracked;
- style;
- equipment/setup snapshot/reference;
- notes;
- Dialed In status;
- Experiment/recipe-family status where relevant;
- Edit action;
- personal delete/hide action subject to community durability rules.

Multiple shots may remain expanded simultaneously for comparison.

---

# 21. Shot editing and deletion

## 21.1 Personal editing

Users can edit their own shot records.

The current app correctly treats edits as potentially affecting downstream recipe logic. The rebuild should preserve historical integrity and recompute relevant personal derived state where needed.

## 21.2 Personal deletion/hiding

Users can remove a shot from their personal history.

If the shot has already contributed a qualifying anonymous community contribution:

- personal visibility/association can be removed;
- the qualifying anonymous community contribution is retained.

The product owner does not want legitimate community data deleted except for corruption, invalid data, or abuse.

## 21.3 Account deletion

On account deletion:

- delete account/auth/email/settings and direct personal associations as required;
- previously qualifying community contributions remain as anonymous durable community data;
- preserve contributor-balancing capability using a privacy-preserving detached identifier if technically required.

The privacy disclosure must state this clearly.

---

# 22. Community data model

## 22.1 Raw shots are the source of truth

The new architecture stores every individual shot record centrally where appropriate, rather than only sum/count aggregates.

Also maintain precomputed aggregates/caches for speed.

Reasons:

- future re-analysis;
- robust aggregation;
- new variables;
- recipe-family clustering;
- recommendation evaluation;
- equipment behavior analysis;
- anomaly detection;
- optional AI Coach later.

## 22.2 Community eligibility

Only qualifying Dialed-In shots from approved canonical coffees contribute to community learning.

Pending-coffee shots remain private until approval.

## 22.3 Community Shots browsing

Users may browse individual qualifying anonymous Community Shots, including useful data such as:

- dose;
- yield;
- ratio;
- time;
- sensory ratings;
- style;
- relevant equipment context;
- notes where allowed;
- other useful shot variables.

Display them as **Community Shot**, without a visible persistent contributor ID.

### 22.3A Community coffee-first nested shots (UX-COMMUNITY-GROUPING-20261018-01 — Owner Locked)

The owner explicitly selected **Option B** for Community, distinct from the personal Coffee workspace:

- Render **one collapsed coffee card per verified coffee** in Community, visually aligned with the personal Coffee card. Tapping the card reveals **all currently loaded, filter-matching qualifying Community shots as compact rows** under that coffee.
- Individual Community shot rows remain collapsed until tapped; tapping a row expands its ratings and community evidence **inline**, independently of other shot rows. More than one shot can be expanded for comparison. Never automatically expand full shot details simply because the parent coffee was opened.
- Personal Coffee screen semantics are **unchanged**: pinned current coffee, its existing Shot History disclosure and individual shot-detail collapse/expansion behavior retain the original Locked workflow.
- Preserve admitted-member-only, server-filtered/quality-eligible anonymous Community DTOs, protected private notes, setup names and member identities. Keep existing Style and Coffee filters and Load More Shots pagination. Use the number of **loaded, filter-matching rows** for a coffee-card count; indicate **loaded** when server paging is incomplete. Continue showing backend per-coffee+style shot and distinct-contributor evidence only inside shot details, without double-counting contributor totals across styles.
- Implementation caveat: the current read-only sanitized RPC does **not** return a canonical verified coffee ID or release label. The frontend therefore groups by the exact **public roaster/name pair** (not ambiguous concatenated labels). Two different verified release IDs with identical public names/roasters cannot be disambiguated by this DTO. A distinct release-safe public group key would require a separately reviewed, owner-approved backend scope; do not add contributor identity or loosen privacy to solve it.
- Implementation is private development until one new owner-approved publish; this decision is **not** a deploy/SQL/user-data authorization.

### 22.3B Community canonical release distinction under one coffee (UX-COMMUNITY-RELEASE-CONTEXT-20261018-01 — Owner Locked)

**Owner's later explicit decision:** “A. Use other verified release details when dates are unavailable. Proceed with the release grouping in development, preserve separate canonical release identities, and do not publish yet.”

**Specific supersession of §22.3A:** its *provisional UI-only inability to distinguish same-name releases* is superseded by a new, narrow **member-admitted-only, verified canonical release-key projection**. All earlier coffee-first, individual compact-shot disclosure, filter, evidence, privacy, and personal-Coffee default behavior stays Locked and unchanged.

- Exactly **one parent Community coffee card** per public roaster/name pair. Tapping opens all **currently loaded qualifying shot summaries** in one step. A second tap on an individual shot expands its ratings/evidence; no automatically expanded full ratings and no mandatory intermediate release tap.
- When **two or more distinct verified canonical release IDs** have eligible shots under that public coffee, split the compact rows into clearly headed **release sections** within the open coffee. Release sections are labels/groupings, not another collapsed disclosure. Never merge distinct exact-release statistics, contributor counts or underlying shot identities.
- Use the *real stable canonical release UUID internally* to derive a deterministic, opaque public **release_key** for Community grouping. Server projects `sha256(coffee.id::text)` (hex) **only for an admitted member**, no raw canonical UUID or personal/contributor/source-shot IDs. Change of name, release label, lot or metadata must not change the release key. Verified-only origin, process, producer, variety, roast level and existing release_label are the only new display facts.
- Prefer a verified `release_label` (e.g., **2025 Harvest** when actually source-backed). If absent, show available verified origin/process/producer/variety/roast-level facts. If none exist, say **“Release details unavailable.”** A neutral **Release 1, Release 2** UI ordinal distinguishes otherwise identical descriptions and **is not a chronological claim**. **Neither the `observed_on` shot date nor canonical row `created_at` is a release/harvest date.** Current schema has no genuine `release_date` field; do not invent one.
- **Only one loaded release:** no extra release section, so opening the coffee immediately reveals compact shots. Pagination can reveal a second release later, at which point headings appear without changing stored identities or resetting parent/shot disclosure state. Loaded counts remain clearly labeled when total pages are incomplete, and filters keep both canonical IDs and evidence separate.
- Legacy browse results without a verified `release_key` must not be presented as proof of a single canonical release. Mixed known/unknown IDs get an explicit **“Release identity unavailable”** section; older unkeyed data retains compact individual shot presentation and per-row evidence with no invented release grouping.
- The backend proposal is an **additive allowlist extension** of the existing admitted-member, quality-eligible, read-only `dic_browse_community_shots` result. Preserve `private.require_member()`, no anonymous EXECUTE grant, original exact-coffee/style counts, no new direct table SELECT, no member email/private notes/source-shot IDs/equipment/details. Account-specific personal rows and community durable anonymous contributions remain unchanged.
- **Deployment gate (2026-10-18 prep update, NO product decision superseded):** owner authorizes **development/preparation only**. The official Supabase CLI generated `supabase/migrations/20261018221843_dic_community_release_context.sql`; the source-only draft has been removed, and the formal migration plus UI passed isolated SQL/Node/mobile/visual regressions. The migration is **not applied to hosted Supabase**. Prior migration-history drift [#35](https://github.com/Schulzet3/The-Dial-In-Collective/issues/35) prevents naive bulk CLI `db push`; follow the [scoped deployment runbook](COMMUNITY_RELEASE_GROUPING_PRODUCTION_READINESS_2026-10-18.md). Before any live change obtain separate explicit owner approval for **one tracked function migration and one Netlify release**, confirm backup, member/JWT security, and postflight. No production SQL, credits or member-data writes authorized by prep.

## 22.4 Counts to surface

Where confidence/sample context is shown, distinguish:

- qualifying shot count;
- unique contributor count.

Example:

**42 dialed-in shots - 18 contributors**

---

# 23. Community aggregation and contributor balance

The current sum/count aggregation is insufficient for the rebuild.

## 23.1 Robust statistics

Use robust techniques such as:

- medians;
- trimmed/weighted means;
- quantiles or robust ranges;
- sample-size confidence;
- outlier-resistant estimators.

Exact implementation can be tuned, but raw data must remain available.

## 23.2 Diminishing contributor weight

Personal recommendations may use all of a user's shots fully.

Community recommendations should use diminishing returns so one high-volume user does not dominate.

Initial configurable effective contributor weights:

| Qualifying shots from one user for coffee + style/family | Effective weight |
|---|---:|
| 1 | 1.0x |
| 2 | ~1.2x |
| 3-4 | ~1.4x |
| 5-7 | ~1.6x |
| 8-12 | ~1.8x |
| 13+ | maximum ~2.0x |

Treat these as tunable configuration, not permanent constants.

Extra shots still matter for:

- repeatability;
- variance;
- personalized learning;
- equipment behavior;
- anomaly detection;
- recipe-family confidence.

## 23.3 Confidence labels

Subtle labels are acceptable when useful:

- **Early Data**.
- **Moderate Confidence**.
- **Strong Confidence**.

Do not clutter every recipe card with confidence text. Use progressive disclosure.

---

# 24. Validation and anomaly handling

The admin queue should stay very clean.

## 24.1 Hard validation

Use required-field and plausibility validation to catch obvious errors/typos.

## 24.2 Outlier comparison priority

When evaluating an extreme shot, compare in this order where possible:

1. Same user's prior shots on same coffee/style/setup.
2. Other users on exact coffee/style/family.
3. Related release if exact data is sparse.
4. Broader context as needed.

## 24.3 Extreme outlier flow

- Temporarily withhold an extreme outlier from aggregate calculation.
- Ask the user to confirm/correct it.
- If it was a typo, fix it.
- If the user confirms the unusual value is real and plausible, normally accept it.
- Only obvious abuse/impossible data should go to admin.

Legitimate unconventional espresso should not be deleted merely for being unusual.

### Current implementation note: reviewed outlier heuristics (2026-10-18)

The owner requested a research-backed replacement of an **unvalidated** 4× median-time / 3× ratio *code heuristic*. Per NIST, scaled median absolute deviation (MAD) and a modified Z-score threshold can label a **potential anomaly**, not prove a measurement false. Long blooming profiles can be legitimate. Staged development code compares comparable same-coffee/style/setup user history first, then distinct contributors on the exact approved coffee/style, with minimum cohorts and practical floors to prevent false alarms. It **withholds only for member confirmation or correction**, never automatically rejects unusual Dialed-In shots because of extraction-style guidelines. The exact thresholds and sample minimums are **provisional tunable implementation parameters, not new Locked extraction targets or scientific standards**; no new product decision replaces §§16/22–24. See [Research](COMMUNITY_OUTLIER_RESEARCH_2026-10-18.md). The next production migration and new Community UI still require fresh owner publication approval.


---

# 25. Recommendation engine - governing principles

## 25.1 Recommendations are suggestions, not rules

- Always allow users to change dose, yield, time, grind, temperature, and style within plausible input constraints.
- Do not score a user negatively for deviating from a recommendation.
- Do not add visual warning copy merely because the user experiments.

## 25.2 Data hierarchy

For a user's recommendation, stronger context should generally outrank weaker context:

1. User's successful shots on exact coffee + setup + style/family.
2. User's successful shots on exact coffee + setup across related family/style where appropriate.
3. Exact coffee community family data.
4. Related releases.
5. User's own similar coffees on the same setup.
6. Similar coffee community data.
7. Roast/style/equipment baseline.
8. Generic baseline.

Exact ordering may differ by variable. For example, grind should strongly favor the user's own grinder history.

## 25.3 Roaster recipe

A roaster-published espresso recipe is a strong prior, particularly for Traditional-style starting points, but real successful data should eventually outweigh it.

## 25.4 Taste preferences

The current app's taste-preference nudging is liked and should be preserved/evolved.

- Preferences should tune rather than overpower evidence.
- The app should explain when a recommendation was influenced by the user's preferences.
- Example: "Recommended because this is a light, fruit-forward coffee and you prefer clarity."
- Keep explanation short by default.

## 25.5 Preference-aware family selection

When multiple successful families exist, the engine selects **one visible window** using first an explicitly chosen favorite from the active setup, then compatible equipment and repeatable all-green history, then a cautiously labeled clarity/body ratio-direction tie-breaker when evidence is otherwise comparable. The user always retains final choice through Shot History's existing **Make Current Recipe**.

Preferences such as clarity, fruit-forward expression, body or richness/texture remain useful **user-provided preferences**, but the five all-green quality ratings do not measure whether any family actually tastes brighter, fruitier or fuller. Until family-specific sensory preference data exists, never attribute those tastes as confirmed or use unsupported flavor classification. Full cross-user/Community family evidence selection remains a separate #12 integration milestone.

## 25.6 Mechanical vs sensory feedback

The deterministic engine can still use shot time and other mechanics to help explain a non-green shot, but style/time ranges are guidelines and no longer veto a green result.

---

# 26. Research governance for recommendation rules

The recommendation engine should not be built by treating every coffee attribute as equally causal.

Preserve the project's earlier evidence discipline.

## 26.1 Variable hierarchy

Direct brewing controls include:

- dose;
- beverage yield;
- brew ratio;
- grind setting/distribution;
- time;
- temperature;
- pressure;
- flow;
- preinfusion;
- shot profile;
- puck preparation;
- basket.

Coffee characteristics such as origin, elevation, variety, process, roast, density, and tasting notes can influence likely starting points but should not be treated as direct causal controls without evidence.

## 26.2 Research modules already defined

The project established seven major research areas:

1. Extraction fundamentals.
2. Coffee characteristics.
3. Grinder/burr interactions.
4. Machine/basket interactions.
5. Shot-profile families.
6. Sensory diagnosis.
7. Community validation.

## 26.3 Evidence confidence labels

Use the established meanings:

| Confidence | Meaning |
|---|---|
| High | Controlled research or multiple strong independent sources |
| Moderate | Consistent expert evidence with plausible mechanism |
| Preliminary | Limited testing or one credible expert source |
| Anecdotal | Community or individual experience |
| Inferred | Logical synthesis not directly tested |
| Conflicted | Credible sources materially disagree |

## 26.4 Claim audit discipline

Before turning research into production rules, verify important claims for:

- whether the citation actually supports the claim;
- scope and coffee/equipment conditions;
- observed result vs inferred mechanism;
- extraction vs flavor preference;
- preserved disagreement;
- shot-profile applicability;
- expert preference vs universal rule.

Community popularity should validate or challenge the foundation, not replace scientific/mechanical foundations.

---

# 27. Shot styles - V1 guidelines, not hard definitions

Current V1 style set:

- Traditional.
- Turbo.
- Ristretto.
- Lungo.
- Custom.

The style selected by the user remains the shot's style. Remove the current rigid automatic reclassification logic.

## 27.1 Baseline ratio and time guidance

Use the current tables as initial recommendation priors, not hard gates.

| Style | Light | Light-Medium | Medium | Medium-Dark | Dark | Typical target time |
|---|---:|---:|---:|---:|---:|---|
| Traditional | 1:2.5 | 1:2.35 | 1:2.0 | 1:1.9 | 1:1.8 | 25-32s; darker 22-28s |
| Turbo | 1:3.0 | 1:2.8 | 1:2.6 | 1:2.4 | 1:2.2 | 12-18s |
| Ristretto | 1:1.5 | 1:1.4 | 1:1.3 | 1:1.2 | 1:1.1 | 20-25s; darker 18-23s |
| Lungo | 1:3.2 | 1:3.0 | 1:2.8 | 1:2.6 | 1:2.5 | 30-40s; darker 28-36s |

Temperature baseline by roast may initially retain the current model:

- Light: 95 C.
- Light-Medium: 94 C.
- Medium: 93 C.
- Medium-Dark: 91.5 C.
- Dark: 90 C.

These are starting priors that can be overridden by successful personal/community data.

## 27.2 Updated user-facing style descriptions

**Traditional**  
Balanced, conventional espresso. Starting targets vary by roast level - roughly 1:1.8-1:2.5 and 22-32 seconds - then adapt based on the coffee, your equipment, successful shots, and taste preferences.

**Turbo**  
Fast, high-flow espresso using a relatively long ratio and coarser grind. Typical starting territory is about 1:2.2-1:3.0 in 12-18 seconds, often favoring clarity, juiciness, and fruit over body. Targets adapt from there.

**Ristretto**  
Shorter, more concentrated espresso. Typical starting territory is about 1:1.1-1:1.5 in 18-25 seconds, often emphasizing body, texture, and intensity. Ratio matters more than hitting an exact time.

**Lungo**  
Longer-ratio espresso. Typical starting territory is about 1:2.5-1:3.2 in 28-40 seconds, often increasing openness and clarity while reducing concentration. Ratio matters more than hitting an exact time.

**Custom**  
Set your own targets with no style assumptions.

## 27.3 Style recommendation on Add Coffee

- The app should recommend a starting style based on coffee characteristics, successful evidence, and the user's taste preferences.
- Recommended style is preselected automatically.
- Label it subtly as **Recommended for you**.
- The user can choose any other style before saving.
- Show a one-line reason, e.g. "Recommended because this is a light, fruit-forward coffee and you prefer clarity."

---

# 28. Bag model - intentionally simple in V1

The product briefly explored richer bag-aging tracking and intentionally simplified it to avoid turning the app into work.

## 28.1 Coffee vs Bag

- Canonical Coffee represents the release.
- A user's Bag represents a specific purchase/roast instance of that coffee.
- Buying the same canonical coffee again can create a new bag rather than overwriting old bag data.
- Shots can be tied to the specific bag.
- Coffee-level recipe learning can still learn across bags.

## 28.2 V1 visible bag fields

Only:

- **Roast Date** - optional.
- **Frozen** - optional boolean/status.

Defer richer room-temperature/refrigerated/opened/thawed lifecycle UI.

## 28.3 UI placement

- Bag details are hidden inside the expanded coffee view.
- Do not show bag age/status on the collapsed card.
- Do not ask bag questions during ordinary shot logging.
- Do not issue maintenance reminders by default.

## 28.4 Frozen logic

- Frozen status effectively pauses age-related recommendation logic.
- Batch-frozen users can leave a bag marked Frozen while logging individually frozen doses.
- Do not assume a shot means the whole bag has thawed.

## 28.5 New bag behavior

- One bag may be marked active for a coffee.
- New shots attach to the active bag automatically.
- Creating a new bag archives the prior active bag by default.
- Archived bags remain viewable and can be reactivated.
- When starting a new bag of a previously used coffee, carry forward the prior coffee-level dialed-in recipe/window as the starting recommendation while building new bag-specific history.

---

# 29. Community visibility and progressive disclosure

Community information should exist without dominating the primary coffee workflow.

On the main coffee card, prioritize personal recipe/logging/history.

Put deeper community content behind an expandable section/tab, including:

- aggregate recipe families;
- qualifying shot count;
- contributor count;
- confidence;
- individual Community Shots.

Avoid permanent dashboard clutter.

---

# 30. Privacy and retention

## 30.1 Protected personal data

Treat these as private/protected account data:

- email;
- authentication/session data;
- account settings;
- device-local Claude key;
- any other directly identifying account data.

## 30.2 Community contribution durability

The product owner wants legitimate community data to remain useful even if the original user later removes it from personal history or deletes their account.

The privacy/terms copy must accurately disclose that qualifying anonymous community contributions may persist after account deletion.

The current app sentence claiming no personal information is recorded becomes inaccurate once accounts exist and must not be reused unchanged.

## 30.3 Free-text community notes

Individual Community Shots may display notes, but public launch will require a policy/technical approach for abuse and accidental personal information. This can be lighter in private beta but must be addressed before broad public release.

---

# 31. Offline behavior

Basic offline support is desired.

Offline-capable:

- view already-saved coffees;
- view cached recipes/history;
- log shots;
- queue writes locally;
- sync automatically when online returns.

Online-only or connectivity-dependent:

- canonical coffee lookup;
- community search/browse updates;
- Claude extraction;
- admin actions.

Offline should not complicate the routine user experience.

A formal conflict-resolution strategy is still required before implementation.

---

# 32. Admin dashboard

Initial beta admin should be minimal and high signal.

Primary admin needs:

- Pending Coffee verification.
- Genuine canonical coffee conflicts/duplicate identity cases.
- Beta signup link revoke/replace.
- Basic app health/activity.
- Only true abuse/impossible-data shot cases after automatic validation.

Ordinary fuzzy matches, normal source additions, and legitimate unusual shots should not create admin work.

---

# 33. Migration from the current app

Architecture first, migration second.

The current data is useful but should not constrain the new schema.

## 33.1 Migration approach

- Build the correct new data model first.
- Implement a one-time importer for the current JSON/export format.
- Preserve as much user coffee/shot/equipment history as practical.
- A small amount of migration loss is acceptable if preserving an obsolete field would damage the new architecture.
- Do not reproduce the old shared-key/bucket architecture.

## 33.2 Supplied migration fixture

The supplied export contains:

- equipment settings;
- coffee index;
- full coffee records;
- shot history;
- personal samples;
- community aggregate records;
- theme.

The Claude API key is intentionally excluded from export in current behavior and should remain device-local.

---

# 34. Real-world acceptance fixture - Bavyeyi IV

The supplied Bavyeyi IV data should be used as an acceptance test for the new recipe/window model.

Known successful Turbo shots:

| Dose | Yield | Time | Grind | Temp | Result |
|---:|---:|---:|---:|---:|---|
| 18.0 g | 50.8 g | 18.5 s | 0.2 | 193 F | Dialed In; note: "Best one yet! Perfectly balanced" |
| 18.0 g | 51.2 g | 22.0 s | 0.2 | 193 F | Dialed In |
| 18.0 g | 49.7 g | 20.8 s | 0.2 | 193 F | Dialed In |
| 18.0 g | 50.2 g | 22.0 s | 0.2 | 193 F | Dialed In |

The new model should interpret these as a repeatable successful recipe family rather than replacing the recipe with the latest single shot.

Expected personal display concept:

- Yield window: **49.7-51.2 g**.
- Time window: **18.5-22.0 s**.
- Robust/initial centerpoint: approximately **50.5 g / 20.8 s**.
- Dose: 18.0 g.
- Grind: 0.2.
- Temperature: 193 F.

The most recent 50.8 g / 18.5 s shot can still be marked by the user as preferred/current because they explicitly considered it the best shot yet.

Two older non-green Bavyeyi shots remain personal history and do not affect community learning.

---

# 35. Current application audit - behavior to preserve

The latest supplied source and screenshots confirm these current behaviors that align with the desired rebuild unless explicitly superseded:

- Mobile-first compact card UI.
- Light/dark theme.
- Multiple coffee cards can be expanded.
- Shot History supports detailed radar/sensory inspection.
- Five required sensory scales with nothing preselected.
- Yield and time start blank on each new shot.
- Current app moves a coffee to the top when a shot is logged.
- Shot style is stored on the shot so historical shots do not silently relabel when coffee style changes later.
- Coffee details include roaster/source information and editable metadata.
- Add Coffee supports roaster URL and screenshots.
- Add Coffee can extract roaster-published espresso recipes.
- Tasting Preferences influence recommendation logic and the UI explains the influence.
- Temperature tracking is optional.
- Backup/import exists and excludes the device-local API key.
- Past-shot editing replays downstream personal recipe logic.
- Grinder community normalization uses relative position within the user's configured espresso range.

---

# 36. Current application audit - explicitly superseded behavior

The rebuild must **not** preserve the following current behavior unchanged:

| Current behavior | New required behavior |
|---|---|
| Community identity based on mutable shared keys/buckets | True canonical Coffee ID / release model |
| Community stores mainly aggregates | Store raw qualifying shots plus derived aggregates |
| Dialed In also requires a broad style/time tolerance | Dialed In depends on all required sensory markers being green; style ranges are guidelines |
| Great shot may be automatically reclassified by numerical style thresholds | Remove rigid reclassification; preserve selected style |
| Latest dialed-in shot can become the single current recipe | Build successful windows, centerpoints, and distinct recipe families |
| Grind is not actually required by current save-readiness logic | Grind is required in the rebuild |
| Derived grind recommendation may be inserted into log field | Actual field remains blank without prior actual value; recommendation stays separate with Use Recommendation |
| Current temperature fallback may come from derived recipe target | Prefer prior actual by coffee/setup/style; recommendation remains separate |
| One equipment setup only | One simple default plus optional multiple setups, with immutable shot snapshots |
| Shared coffee details can be changed through user copies without canonical verification model | One validated canonical factual record with source/audit workflow |
| "We do not record any personal information" footer | Replace with accurate account/privacy disclosure |
| Single recipe aggregate can blend materially different successful approaches | Separate recipe families |

---

# 37. Gap and contradiction audit

The workshop resolved many important contradictions. The following still require explicit design decisions or technical confirmation.

## 37.1 Build-blocking or schema-sensitive open decisions

### A. Meaning of "Make Current Recipe"

The October 20 owner supersession establishes that a successful shot selects its family/window with that shot retained as an optional favorite example. Older families stay separate **internally**, without an Alternate Recipes display.

Still to define precisely:

- Does pressing **Make Current Recipe** make the exact individual shot values the primary next-shot target?
- Or does it make that shot's **recipe family/window** primary while continuing to display a robust centerpoint?

Recommendation for later review: family/window should remain the durable object, with the selected shot optionally marked as the user's favorite example. This avoids reverting to one-shot false precision.

### B. New coffee before its first shot

Current-coffee semantics say a coffee becomes current when a shot is logged, not merely viewed.

When a brand-new coffee is added but has no shot yet, decide:

- current coffee remains pinned and the new coffee opens below it; or
- Add Coffee creates a temporary "ready to dial" focus without changing the persisted current coffee.

Do not silently make a coffee current merely because it was added unless explicitly decided.

### C. "No, just log it" after a meaningful deviation

If the user declines Start an Experiment:

- the shot should still be logged;
- if non-green, it remains personal/private;
- if all-green, it is community-eligible by the global Dialed-In rule.

Still to define: should an all-green meaningful deviation that the user says was **not** an experiment affect the personal current family/window, form a hidden candidate family, or be retained as a successful outlier without changing personal recipe state?

### D. Experiment trigger reference point

Thresholds are defined, but the comparison baseline is not yet explicit.

Candidates include:

- current preferred family centerpoint;
- current preferred window boundary;
- previous actual shot;
- current displayed recommendation.

This matters especially for time and natural variability.

### E. Grinder scale semantics

Current app assumes lower numbers are finer.

Public V1 should decide how to handle grinders where:

- higher numbers may be finer;
- the scale wraps across rotations;
- the grinder is stepped vs stepless;
- the meaningful adjustment step is not one decimal place.

This affects normalization, experiment detection, and "Use Recommendation."

### F. Community correction after editing an already-contributed shot

The user can edit a shot and community contributions are durable.

Need to distinguish:

- legitimate correction of a typo/measurement, which should update the anonymous contribution;
- personal deletion/hiding, which should not delete a valid contribution;
- corruption/abuse, which can remove/replace the contribution.

The new backend needs an immutable contribution ID/versioning policy.

### G. Recipe-family scope across setups

Every shot is tied to an equipment setup.

Need to formalize whether preferred/current recipe family is keyed by:

- coffee + equipment setup + style; or
- coffee globally with setup-specific variants.

Recommendation: treat setup as a first-class recipe-family dimension so a recipe on one grinder/machine does not overwrite another setup's preferred recipe.

## 37.2 Important recommendation-model questions that can be solved during engine design

### H. Robust successful range algorithm

Need exact sample thresholds and estimator.

Suggested design direction:

- small N: observed successful range;
- larger N: robust quantile/MAD/trimmed window;
- center: median or trimmed mean rather than raw mean when outliers accumulate.

### I. Adaptive grind experiment threshold

The product owner confirmed 0.1 is meaningful on a 0.0-5.0 grinder.

A candidate general rule is approximately one real adjustment increment or a small percentage of configured espresso range, but this is not yet approved.

### J. Preference-aware recipe families vs strict green sensory targets

There is a conceptual tension worth resolving carefully:

- community family selection should support a user who prefers more clarity vs someone who prefers more body;
- current Dialed-In criteria require Body exactly at the green center and Clarity at the maximum green value.

Possible solutions include:

- infer family sensory tendency from recipe/style/equipment mechanics while green ratings only establish quality;
- add a lightweight optional preference/favorite signal after a successful shot;
- allow preference-specific interpretation of "ideal" without increasing routine input burden.

Do not change the five-scale UX until this is intentionally decided.

### K. Existing deterministic suggestion rules after style ranges become guidelines

Current engine prioritizes time correction before flavor in many cases.

The rebuild should preserve useful mechanical diagnosis but revise logic so:

- an all-green shot is not "corrected" merely for missing a time guideline;
- style range deviations inform, not veto;
- non-green shots can still use time to diagnose grind/flow issues.

This rule set should be re-audited against the prior research modules before production.

### L. Hard plausibility bounds vs experimentation freedom

Current user input bounds include approximately:

- dose 12-28 g;
- yield 12-100 g;
- time 5-60 s;
- temperature 85-99.9 C.

These are useful typo guards but may be too strict as hard blocks for unusual valid espresso.

Before production, decide which values should hard-block vs warn-and-confirm.

## 37.3 UX questions that can be decided after schema/architecture

### M. Feedback after a non-experiment bad shot on an already dialed-in coffee

The user does not want the Experiment panel unless they confirm an experiment.

Still decide whether the app shows:

- a brief temporary recommendation after save;
- only the shot in history;
- or a small non-persistent result card.

### N. Multiple expanded coffee cards when current coffee changes

The previous current coffee should collapse when another coffee becomes current.

Still decide whether unrelated reference coffees the user had expanded stay open or collapse too.

### O. Add Coffee canonical-search presentation

Canonical lookup behavior is defined, but exact screen choreography is not:

- whether exact matches appear automatically under URL entry;
- whether there is a separate "Find existing coffee" affordance;
- how to display likely fuzzy match confidence without clutter.

### P. Screen vs bottom-sheet choices

The user likes separate screens/sheets for Settings, Add Coffee, and Log Shot.

Exact breakpoint behavior and which are full-page vs bottom-sheet can be decided during responsive design.

## 37.4 Public-launch/deferred questions

### Q. Free-text Community Shot notes

Need moderation/reporting and accidental-PII handling before broad public release.

### R. Monetization/app-funded AI

Deferred until a paid model is defined.

### S. Additional shot-profile families

Earlier research covers blooming, declining-pressure, lever-style, low-flow, allonge, modern high-extraction, etc.

Current product UI supports Traditional, Turbo, Ristretto, Lungo, Custom.

Decide later whether advanced named profiles should become first-class styles or remain under Custom/advanced equipment modes.

### T. Native apps

Deferred; PWA first.

---

# 38. Contradictions already resolved

The following issues were explicitly reconciled and should not be reopened without a new reason:

- **Browsing vs current coffee:** browsing does not change current; logging a shot does.
- **Dialed-In persistence:** later bad shots do not remove Dialed-In status from a coffee with established successful history.
- **Community eligibility:** non-green shots never affect community aggregates; green shots do.
- **Recommendation deviation:** user may freely ignore a recommendation; no deviation warning is needed.
- **Style enforcement:** style ranges are guidelines; remove rigid numeric reclassification.
- **Recipe precision:** repeated success should create a window/centerpoint rather than overwrite with each latest shot.
- **Multiple successful approaches:** materially different successful approaches become separate recipe families, not one widened range.
- **Experiment confirmation:** possible experimentation is detected after rating; user confirms before Experiment workspace begins.
- **Experiment continuity:** once started, subsequent Log a Shot actions stay in the experiment until End Experiment or promotion.
- **Candidate lifecycle:** first successful experiment can become current immediately; second successful repeat confirms the family.
- **Successful but not preferred:** valid all-green experiment can remain a community/candidate recipe even if user returns to the old preferred recipe.
- **Bag scope:** V1 bag detail stays simple - optional Roast Date + Frozen only.
- **Search:** simple search + Recent/A-Z only; no filters.
- **Current coffee pinning:** current coffee remains pinned even in A-Z, except it can disappear temporarily when search does not match.
- **Shot detail:** expand inline to enable multi-shot comparison.

---

# 39. Recommended relational data model

This is a direction, not a final provider-specific schema.

## 39.1 Core entities

### User

- id
- email
- auth metadata
- account status
- created_at / deleted_at

### UserSettings

- user_id
- theme
- tasting_preferences
- default_equipment_setup_id
- other UX preferences

### BetaInviteLink

- id/token hash
- status
- created_at
- revoked_at
- optional usage metadata

### EquipmentSetup

- id
- user_id
- name
- active/default flags
- machine model
- grinder model
- burr set
- basket
- capabilities
- usual dose
- grinder range metadata
- temperature tracking/unit

### EquipmentSetupVersion / Snapshot

- immutable versioned equipment state used by historical shots

### CanonicalCoffeeRelease

- stable Coffee ID
- release/lot identity
- roaster
- canonical facts
- availability
- related-release group

### CoffeeAlias / CoffeeURL

- normalized URLs
- aliases
- prior names/URLs

### CoffeeSource / CoffeeRevision

- source URL/type
- extracted facts
- verification status
- change history

### UserCoffeeLibraryEntry

- user_id
- coffee_release_id
- library state
- added_at
- current/preferred context as appropriate

### Bag

- user_library_entry_id
- roast_date optional
- frozen optional
- active/archived

### Shot

- id
- user_id while account exists
- coffee_release_id
- bag_id optional
- equipment_setup_id
- equipment_snapshot/version id
- style
- dose
- yield
- ratio derived
- time
- grind actual
- temperature actual optional
- sensory values
- notes
- dialed_in
- experiment_id optional
- created_at
- edited_at
- recommendation-origin metadata

### Experiment

- id
- user/coffee/setup scope
- baseline family id
- status active/ended/promoted
- created_at/ended_at

### RecipeFamily

- id
- scope (personal/community)
- coffee release
- setup/style dimensions as applicable
- status candidate/confirmed
- robust parameter distributions/window
- centerpoint
- confidence/sample counts

### UserPreferredRecipe

- user + coffee + setup context
- preferred family id

### CommunityContribution

- durable anonymous contribution derived from qualifying shot
- detached contributor-group identity for weighting
- shot/contribution version semantics

### CommunityAggregate / RecipeFamilyAggregate

- cached robust aggregate metrics
- shot count
- contributor count
- confidence

### PendingCoffee

- temporary identity + source material/structured fields
- verification status

### AdminReview

- pending coffee conflict
- canonical fact conflict
- abuse/impossible shot

---

# 40. Technical architecture direction before provider selection

The current single-file/browser-storage artifact architecture should be replaced with:

- Mobile-first PWA frontend.
- Proper backend API/service layer.
- Relational database suited to canonical identity and shot relationships.
- Auth provider/service with secure persistent sessions.
- Local cache/offline shot queue.
- Modular AI extraction service.
- Derived community aggregate jobs/cache.
- Admin interface.

Provider/hosting choices remain open and should be selected after budget/operational preferences are known.

---

# 41. Acceptance criteria for the core beta loop

A beta build is not ready unless all of these are true:

1. Existing user opens the app and immediately sees current coffee expanded with Log a Shot ready.
2. Looking at another coffee does not silently change current coffee.
3. Logging a shot on another coffee makes it current and collapses the prior current coffee.
4. Yield and time open blank; dose/grind/temp follow the approved prefill rules.
5. Grind is required.
6. All five sensory ratings are required.
7. All-green sensory ratings mark the shot Dialed In regardless of style-time guideline.
8. Non-green shots do not contribute to community data.
9. Repeated green shots build a successful window and robust centerpoint.
10. Materially different green recipes can remain separate families.
11. Experiment prompts occur after rating and only start the Experiment workspace if the user confirms.
12. Candidate/confirmed **internal** successful recipe-family lifecycle works while the card shows one recommendation.
13. Old successful recipes are never destroyed merely because a new one becomes current.
14. Shot details expand inline and multiple shots can be compared.
15. Current coffee stays pinned outside search.
16. Search matches all defined coffee-card metadata and does not alter current coffee.
17. Community shot counts and contributor counts are distinct.
18. Account/private data is separate from durable anonymous community data.
19. Claude is optional; no key still permits Pending Coffee and shot logging.
20. Imported Bavyeyi data produces the expected successful window/family behavior.

**Distinct owner-approved technical pilot (2026-10-18):** A deliberately labeled *limited invitation-only technical pilot* may precede completion of this section, solely to test existing functionality with trusted users. It **does not meet, alter, defer or waive** this section’s complete-beta acceptance criteria; #10/#12/#13 and remaining safety/UX acceptance remain open. A separate specific owner approval is still required before any live migration, app publication, or real invitation.

---

# 42. Build-readiness status

The product definition is now mature enough to begin formal architecture and prototype planning, but implementation should not begin blindly.

Before coding the persistent backend/schema, resolve the **schema-sensitive open decisions** in Section 37.1 and choose the technical stack/hosting/auth approach.

Most other open questions can be answered one at a time during UX and engine design without blocking the overall architecture.

The recommended next sequence is:

1. Preserve all relevant chats/files in one ChatGPT Project/workspace.
2. Treat this specification and decision ledger as the canonical requirements record.
3. Import/move the prior espresso research conversations into that same project so the evidence reports are available during recommendation-engine implementation.
4. Resolve the schema-sensitive questions one at a time.
5. Choose hosting/backend/auth stack and budget.
6. Draft the database schema and API contracts.
7. Draft recommendation-engine modules and test fixtures.
8. Build the mobile-first beta shell and core logging flow.
9. Add canonical coffee ingestion/community systems.
10. Migrate current data and run acceptance tests.

---

# 43. Change-control rule going forward

For every future product decision:

- Ask one question at a time.
- Record the answer as **Locked**, **Open**, **Deferred**, or **Superseded**.
- Update the master specification before implementation if the decision changes behavior or data modeling.
- Preserve prior rationale when a decision is superseded so the team can understand why the design changed.
- Do not silently infer a new requirement from an implementation shortcut.

The goal is to keep the app simple for users while keeping the project record detailed enough that nothing important falls through the cracks.

---

# Appendix A. 2026-10-14 owner-only historical import exception (approved)

**Status: Approved, scope strictly limited.** On 2026-10-14, the owner explicitly approved importing previously reviewed personal espresso history into their **existing, authenticated, admitted, private cloud account before completing an end-to-end hosted Supabase service rebuild**. This is an explicit, narrow exception to the order of recovery verification for owner-only testing, not a claim that full disaster recovery has passed. The previously Locked privacy, account ownership, backups, and public-beta release requirements remain in force. The original v1.0 sections are preserved above.

## Scope and implementation safeguards

- Only the original existing admitted account may perform one atomic native import of its reviewed personal backup into an empty cloud workspace. Server authorization is restricted to that account, independent of browser UI state and untrusted file claims. No admission or public registration is enabled. Preserve Netlify visitor/team SSO.
- The owner retains the original untouched iPhone/Mac v0.2.0 application and personal data, the reviewed original JSON, and the separately downloaded import-recovery JSON. Do not place private exports, notes, credentials, or original history in GitHub or public test fixtures.
- Before enabling the exception, independently check sole admitted-account status, empty target workspace, unchanged import guard, privacy policies and current encrypted offsite backup. Existing verified evidence includes a source-inclusive ciphertext GitHub-to-Google-Drive delivery and an offline PostgreSQL recovery of 35 first-party tables, row counts, 37 RLS policies, 91 indexes, 19 app triggers, 29 functions and the first-party signup trigger. These checks **do not** verify restoring Supabase-managed configuration, authentication services, SMTP/JWT, Netlify access, or future Storage object bytes.
- The import guard is a one-time server-side owner-identity-scoped exception, with a finite expiration and immediate re-lock after successful commit. Do not falsely set `recovery_verified_at` to indicate hosted restoration. All other admitted users remain ineligible, even if invited later. If the eligible owner does not complete the import before expiry, re-check safety before any renewal.
- The owner must review the local counts and coffee names, run real server-side validation, keep the independent recovery download and acknowledge the source-device preservation before committing. Validation alone leaves cloud rows unchanged. Any successful import is all-or-nothing and idempotent; conflicting inputs must not silently overwrite history. Preserve missing grind as missing, recorded zero as zero, unknown historical feed as unknown, historical dates/notes/versions, and Current Coffee semantics. Never fabricate shot records for the added unlogged coffee.
- After the owner commits, verify actual per-owner row counts, family associations, personal notes, provenance, idempotent replay, app reload and the Log Shot -> Rate -> Recommendation flow. Independently create and check a fresh **encrypted source-inclusive, offsite** backup of the now-nonempty source; restore those populated rows into an isolated instance and compare counts before treating the milestone as recovered.

## Requirements that are NOT waived

Full hosted Supabase restoration and recreation/verification of provider Auth and settings, email SMTP and redirects, JWT/API signing and secrets, Netlify/GitHub/Drive operational access, real cross-account privacy, real-device tests, admin workflow and community qualification remain release blockers before **external beta**. This exception does not authorize public access, new user onboarding, paid services, DNS/domain purchase, any loosening of RLS, or deletion/replacement of original local history. Reassess and record any later change in both canonical specification and Decision Ledger before implementation.

---

## Source 2 — MASTER_SPECIFICATION_BACKEND_ADDENDUM.md

Original source blob: `abc4499bdf973ebcbb64086ba9c297b7a44183bb`. The following section integrates the [original backend addendum](MASTER_SPECIFICATION_BACKEND_ADDENDUM.md) with explicitly identified later owner-approved amendments. Apply the topic-specific supersessions above. Historical delivery/status paragraphs are not today's task list.

# The Dial In Collective
## Master Specification: cloud foundation addendum

This is a supplement, not a replacement for the Master Specification, Decision Ledger, and the approved prototype addendum shipped with v0.2.0. Preserve all unchanged Locked decisions. New numerical implementation choices are not silently promoted to product requirements. Product copy uses The Dial In Collective, dial in, dialed in, and dialing in without hyphens. The existing GitHub repository identifier is retained unchanged.

## Approved release direction

The next external beta must have real accounts, cloud syncing and shared community data before it is hosted for testers. The local-first prototype phase remains a completed/ongoing testing phase, not the final beta architecture. Its interface and behavior are the visual baseline. Community/admin previews must not be mistaken for real hosted functionality.

Development uses the existing Supabase Free organization/project. Do not create paid projects, paid branches, upgrade plans or buy a domain without approval. Source changes live in the private GitHub repository on development/backend-foundation. The local phone prototype is unchanged by database migrations.

Google Drive is the approved automatic backup destination. The agreed folder is The Dial In Collective Backups. A ChatGPT Drive connection is not authorization for an unattended job. Scheduled encrypted exports, authentication/storage/configuration coverage, failure alerts, retention, and a tested restore remain required before real beta data. A database status table alone does not implement backups.

## Identity and access

### Account password policy (owner-approved 2026-10-12)

New account passwords and password recovery must require at least **8 characters, one uppercase letter (A-Z), and one supported special character**. Do not additionally require a digit or lowercase letter. This explicitly replaces the unapproved 12-character client-side limit. Existing sign-ins are not subject to a new-password validation gate. Apply clear inline guidance and validate before submitting a new password. Ensure the Supabase Auth project settings do not reject passwords that meet this policy; final server-side settings and real email/signup/reset tests remain a separate verification step.


After submitting account registration, the app must show a dedicated, high-prominence **Check your email to confirm your address** screen, with the submitted address, clear confirmation instructions and an explicit route back to sign in. Do not reduce this critical step to a transient toast or paragraph. This approved refinement does not disable or bypass verification.

Keep email-based accounts, password recovery, persistent sessions, minimal personal fields, and a revocable/replaceable beta admission link. Credentials remain managed by Supabase Auth; never store them in application preference tables or GitHub. New accounts are pending until admitted. User-supplied metadata cannot grant membership or administration.

Raw personal shots, free-text notes, preferences, workspaces, setup names and identity mappings are owner-protected. Community views expose only qualifying structured shot information and optional equipment details. Admin review permissions do not give routine access to another user's private notes or raw history. Only verified canonical coffee information is visible to ordinary admitted users. Users submit proposals/evidence; they cannot overwrite canonical facts or approve their own proposals directly.

## Preserve the product model

- A coffee release has a stable identity independent of its display name or URL. The same URL can represent distinct releases; group related releases without merging their history.
- Every setup is a personal workspace with the full library, setup-specific recency and Current Coffee. Adding/browsing does not activate a coffee. Only a saved shot changes Current; restoration and major-hardware transitions are deliberate exceptions already approved in the workshop.
- Major grinder/burr/machine changes create immutable setup versions. Basket changes and grinder zero-point changes retain their distinct version/calibration semantics. Shots retain the equipment used at the time.
- Basket Dose is the dose anchor. The +/-1 g range is advisory and must not become a hard database block. Other prototype numeric limits are sanity guardrails, not espresso definitions.
- Dialed In is derived from all five green values: Extraction 3, Body 3, Clarity 5, Sweetness 5, Astringency 1. Style/time guidelines do not veto taste success. Keep the existing sensory model and interpret green as ideal for the user's shot/style.
- Recipe families primarily group successful coffee/style ratio approaches, not equipment, feed mode or time alone. Personal preferred families are setup-aware; all windows retain a centerpoint. Equipment calibration and family identity remain separate.
- Only qualifying all-green evidence may enter shared recommendations. Correcting a shot replaces its contribution; a non-green correction withdraws that contribution. Personal hiding alone does not remove legitimate shared evidence.
- Preserve contributor-balanced robust learning, two-contributor community confirmation, personal repeat confirmation, exact-style priorities, weak cross-style priors, and no direct cross-style time/grind copying. These workers are not implemented by creating family tables.
- Slow Feed remains a grinder condition. It does not itself create a recipe family or Experiment. Legacy unrecorded feed remains unknown; future explicitly disabled tracking follows the approved Standard Feed rule in the mutation API.
- Advanced features are hidden by default. Pressure/flow profiling remains tabled. Private note publication remains out of V1.

## This milestone: applied, not just drafted

Five migrations have been applied to the existing empty development Supabase project: identity/access, coffee catalog, equipment/workspaces, shots/recipes/community projections, and internal-function permission hardening. There are 31 application/internal tables, all with RLS. Migration source in GitHub was checked against stored Supabase migration SQL using matching Git blob hashes.

The database computes taste success, captures equipment snapshots from versioned records, rejects mismatched ownership/setup references, audits shot changes, and maintains one structured community projection per source shot. New or materially corrected projections stay pending quality validation until the future trusted validation worker accepts them. This fail-closed staging behavior is not a change to the intended automatic qualification workflow.

The internal automatic RLS event trigger remains enabled. Its function's browser-role execution grants were revoked to resolve the security advisor warnings; no security mechanism was disabled.

## Important implementation boundaries

This is a database foundation, not a usable cloud release. Except for limited preference edits and owned coffee submissions, direct browser writes are intentionally unavailable until controlled, revision-checked mutation APIs exist. Mutation receipts are scaffolding, not yet a working retry/idempotency service. Family statistics and confirmation labels remain server-managed records awaiting their calculation worker. Source verification and admin decisions still need real service workflows.

No real account, coffee, shot, secret, backup or prototype demo fixture was seeded. Temporary security-test fixtures were rolled back and post-test counts were checked. Browser authentication, email delivery/recovery, invitation redemption, session/offline behavior, multi-device conflicts, community aggregation, hosted frontend and Drive backup/restore have not been end-to-end tested.

## Delivery queue retained

1. Bring the tested v0.2.0 frontend/source into the repository without personal exports, secrets or mock data entering production storage.
2. Build authenticated setup/library/shot mutation APIs, idempotent retry handling and optimistic conflict checks. Add API-level positive/negative tests.
3. Implement admission and real signup/login/recovery; configure email delivery and allowed redirects before beta use.
4. Wire cloud sync without replacing local data until import mapping and recovery are verified.
5. Implement verification/admin workflows and contributor-balanced community learning; expose only validated results.
6. Configure unattended encrypted Drive backups and perform an actual restore drill, covering Auth and any stored files/configuration as well as application tables.
7. Test real devices and multi-account flows, then host the private beta.
8. Preserve the queued Mac double-click launcher and safer Documents-folder updater for local distributions; these were not part of the database milestone.

No new product question is required to complete this foundation. Infrastructure authorization/configuration steps will be requested individually when needed.


## Approved owner-only import exception, 2026-10-14

The owner explicitly approved a **one-time, existing admitted-account-only** historical-data import before full managed Supabase reconstruction, following live server validation and confirmed independent local recovery-copy download. This is a limited change to the *order* of owner-only testing, not a relaxation of other Locked requirements or external-beta recovery obligations. This approval is recorded in the updated canonical Master Specification v1.0 **Appendix A** and Decision Ledger approved amendment `OWNER-IMPORT-20261014` in the owner's ChatGPT Library. No other of the 79 baseline Locked decisions was modified.

Security implementation must keep `private.import_control.recovery_verified_at` **NULL** while managed-service restoration remains unverified. A server-side exception must be bound to the existing unique enabled member's UUID, be valid for no more than 24 hours, and re-lock automatically in the same transaction on first successful, atomic, idempotent owner import. It must refuse another owner even if admitted in the future. All existing owner checks, the reviewed file's hash, acknowledgement of recovery download, RLS policies, Netlify SSO, private original phone/Mac records and no-credit-card/no-domain constraints remain unchanged.

No real data was imported simply by granting approval. After authenticated UI commit, verify exact history and idempotence, then produce a **new** encrypted source-inclusive backup and confirm Drive delivery and offline restoration of nonzero imported rows. Full hosted Supabase configuration, SMTP, external multiuser signup/privacy, admins, and real beta device tests remain mandatory before external beta.

## Approved product refinements (2026-10-14)

- Every admitted user can rename their own equipment setups, without creating an equipment version or altering prior shot hardware provenance.
- Slow Feed is remembered per setup, from the most recent explicitly logged condition. Switching it OFF makes Standard Feed the next default. The active equipment version stores the preference. Cloud synchronization must guard against stale offline uploads, and historical Unknown must stay Unknown.
- Edit remains on the left and is the primary shot-history action. Make Current Recipe is separate on the right: a deliberate preferred-family/example choice, not a necessary step after each successful shot. Eligible Dialed In observations automatically inform their recipe-family windows.
- Place shot values and setup, Basket Dose, feed, style, date, and status within a compact header above the sensory ratings/radar. Make optimal use of phone width without crowding.
- Keep import/export under a collapsed Recovery options disclosure in Settings, not prominent routine controls. Cloud sync is normal; the development cache export is not a full user-data portability or restore service.

These are additive Locked decisions, leaving every unrelated Master Specification/Decision Ledger requirement intact. Preserve the historic import recovery gate, Netlify private beta protection, and community verification requirements.


## Approved automatic owner-release procedure (2026-10-14)

**Locked user instruction:** For all future requested and approved development updates, publish promptly to the existing, SSO-protected Netlify owner preview after required tests pass. Treat a task as incomplete until GitHub source, applied Supabase migrations (when needed), Netlify's actually published commit, and the Master Specification/Decision Ledger are checked and consistent. The approved publishing target is the existing Netlify project, and the development source branch remains `development/backend-foundation`; do not silently deploy from or merge into `main`.

Workflow: (1) update applicable Locked records and implementation in a reviewable Git commit; (2) validate schema/role security, required migrations, Node and mobile browser regressions, and the static build; (3) merge accepted code to the development branch; (4) publish on the existing Git-connected Netlify site with its build-time `npm test && npm run build:cloud` gate; (5) verify the deployed commit equals the accepted GitHub head and that Netlify SSO and import-save restrictions persist. A failed/pending build leaves the previously published site unchanged and must be reported. Stop rather than silently bypassing a test, access control, import gate or data migration safety condition.

The owner explicitly does **not** want to give a new per-change publishing approval each time the work and tests are done. This authorization does not launch the external beta, authorize public visitor access, enable historical import writes, or relax restoration, account, admin, community and privacy release requirements. If the Netlify integration prevents auto publishing, diagnose and request one minimal action; an unverified deployment is never described as live.

## Netlify credit conservation amendment — explicitly owner-approved 2026-10-14

This **revises only the publishing cadence** of the previous Locked automatic owner-release policy (OPS-20261014-01). The owner approved batching changes and tests in GitHub, then making **one finished, tested, deliberate Netlify production release per bundle**, instead of treating every intermediate GitHub push as a publish instruction. We must continue to ship completed work promptly **when Netlify credits are confirmed sufficient**. A skipped or credit-paused deploy is not live and must never be represented as live. Keep all other Locked release, security, recovery, identity and product decisions unchanged.

Netlify Free currently includes 300 credits per monthly billing cycle; each successful production deploy consumes 15. The owner's 2026-10-14 Netlify usage screenshot proves 22 production deployments (330 credits), web requests (0.1), bandwidth (0.1), total 330.2 consumed and zero remaining. Netlify blocked further production publishing for this billing cycle. This was deployment-frequency usage, not AI inference or compute. Netlify will need to resume paid-feature capability on the new cycle before publishing the queued UX changes. No upgrade or payment is authorized.

**Operational rule:** Work in reviewable GitHub feature branches, run CI and synthetic phone tests there, and merge only completed bundles to `development/backend-foundation`. Production builds are now guarded by `netlify.toml` and `scripts/netlify/should-ignore-build.mjs`; only `Release DIC: ... [dic-publish]` subjects with recently verified, sufficient credits may publish. All other Git commits remain source/spec updates only. A future build hook could bypass the ignore command and must not be used to circumvent the gate. Dev/PR/branch deploys are non-production preview contexts and are not charged as production publishes under the current Netlify schedule; GitHub Actions tests do not consume the site's Netlify production deploy allowance.

The authoritative **point-in-time** usage snapshots and release gate assumptions are tracked in `docs/NETLIFY_CREDIT_LEDGER.json`. The Netlify connector does not expose billing balance or cycle reset dates; never fabricate a live balance, silently reset the snapshot, or infer that a successful GitHub merge equals a published Netlify deploy. Before each intentional release, recheck the real provider balance and update the ledger. Following a successful Netlify publish, verify the SHA of the deployed version, SSO, and recovery gate, and update the recorded usage. No new Mac installation, subscription, domain or upgrade required for GitHub testing.


## Add Coffee alias recognition and verified identity matching (2026-10-14)

This is **implementation of existing Locked rules** in Master Specification sections 8.3, 9.1–9.4, 10, 11 and 32, not permission to equate a roaster with its individual coffees or unrelated harvests. Brand normalization removes case, spaces, punctuation/hyphens, accents, and terminal generic business descriptors such as "Coffee Roasters". It maps `Sweet Bloom`, `Sweetbloom`, `Sweet Bloom Coffee`, `Sweet Bloom Coffee Roasters` and `Sweet-Bloom` to the same **roaster identity**. The reviewed registry separately records trusted official branding and permits curated exceptional aliases; untrusted user entries cannot approve their own alias. The official example is grounded in `https://sweetbloomcoffee.com/pages/locations`.

The authenticated, admitted-only `dic_find_coffee_matches` RPC returns only verified canonical coffee candidates. Only a **unique** high-confidence match can be linked directly: exact roaster and coffee name together with either a compatible explicit release label or a recent, previously curated official product page with no conflicting origin/release. Normalized tracking parameters never equate meaningful product variants. Ambiguous names, fuzzy spellings and release conflicts require **user confirmation**; selecting "different coffee" preserves an independent Pending entry. No canonical records, personal shots, hidden data, or community contributions are rewritten. A recognized brand does **not** verify any new coffee automatically. New coffees lacking verified source evidence remain Pending and privately loggable.

As of this checkpoint Supabase has **0 canonical verified coffees and 4 Pending submissions**. Therefore deterministic identity matching is implemented, but no honest "most coffees auto-verified" coverage claim is possible yet. A subsequent curated/source-backed product-catalog ingestion and verification pipeline (exact roaster product pages, extract/release metadata with provenance, cross-check aliases and conflicts, preserve audit history) is required before a large share of new submissions can be verified automatically. Such a source acquisition stage must not make arbitrary HTTP/DNS fetches from untrusted user URLs or treat a model-generated guess as evidence. Preserve existing Admin-only access, all other Locked decisions, data integrity and the Netlify 0-credit publish gate.


## LOCKED amendment COFFEE-DUPLICATE-FIRST-20261021 — owner-approved simplified coffee approval (October 20 MDT / Oct 21 UTC)

The owner explicitly accepted the proposed simplified workflow and ordered implementation. **Supersession scope:** the October 14 rule that only an owner-admin's own coffees may be approved without external roaster verification, and Section 11's default Pending status for otherwise unique coffees when AI or URL evidence is unavailable. Preserve their historical text below; this later Locked decision governs conflicts.

- Every admitted member's genuinely distinct coffee with valid roaster and coffee name is **automatically catalog-approved** after backend duplicate/conflict checks, regardless of whether added by successful URL Autofill, manual entry or an unknown roaster. No manual review merely because a product source is unverified, missing, inaccessible or outside the trusted directory.
- An unequivocal unique match to an existing approved *same release/lot* reuses the original canonical coffee ID atomically and preserves earliest original submission name, aliases, personal library IDs, shots, recipes, offline history and audits. A same-name product URL reused in another harvest/lot must never merge silently. Exact roaster/name plus corroborating release/lot and compatible origin/process or verified release-compatible official URL are preferred evidence; ambiguous zero-release cases need confirmation.
- A plausible duplicate or contradictory origin/process/release creates (or retains) a usable **Pending** coffee, blocked from Community until resolved, with minimal friction. Offer normal safe fuzzy match candidates to member for confirmation and escalate only actual ambiguity to the admin queue; never silently force an incorrect merge or create a second approved canonical record merely to avoid review. Saving a Pending coffee never discards private history.
- The admin can approve a distinct candidate, choose a compatible existing verified canonical ID, or hold an ambiguous identity with a clear reason; enforce live server membership/admin role, revision checks, conservative matching and audit provenance. Member-initiated genuinely safe matching may auto-link when deterministic.
- **Catalog approval and independently verified official-source evidence are two distinct concepts.** Existing database verification_state = verified continues to mean *approved canonical catalog identity*, retaining existing section 22 approved-canonical Community eligibility for qualifying Dialed-In shots and other quality/privacy controls. Verified roaster_page proof may only originate from trusted service-side checks; merely supplied URL/Autofill/manual metadata remains labeled as unverified user source or label, not asserted official evidence. No browser-provided flag grants trust.
- Preserve existing SSRF/DNS/TLS/redirect/size checks, Auth/RLS/beta admission, private notes and Community anonymity, exact release separation, source provenance, historic shot records and 79 baseline Locked decisions. Never fabricate missing release, roast or producer facts or rewrite approved canonical metadata on an ordinary new submission.
- **Existing Pending submissions are not bulk-approved by migration.** Owner reserves Mango Tree Blend Pending for a later real manual Admin test; Wuri / Sweet Bloom is an existing nonadmin Pending member source-acceptance fixture. Mango manual approval does not prove nonadmin automatic approval. Existing Pending may be safely rechecked only with member ownership or a separately authorized review action.

**Production grant and gates:** Owner has authorized one coordinated @Netlify production publication of these changes and already-approved pending work after tests, backup and exact tested source SHA are verified. This is a *single-use source/SHA-bound deployment permission*, not ongoing release authority. It does not authorize a paid purchase, unreviewed provider settings, arbitrary SQL/Edge/Auth writes or bulk historic record mutations. The previously named administrator-review migration remains separately conditionally authorized; new SQL for this amendment needs its own specific production approval under project rules. Never publish an interface expecting unavailable backend capabilities.

## Locked amendment: automatic coffee approval with canonical-first identity (2026-10-14)

**Explicit new owner decision:** Only the owner-administrator's **own** coffee entries are automatically approved on submit, after conservative match/conflict checks. This is the administrator exception to the older global Pending rule. It does not permit unauthenticated, non-admitted, or other-member users to grant themselves approvals.

Other admitted users may enter and privately log new coffees immediately. Source-backed, uniquely identified releases are automatically verified by trusted, JWT-protected roaster product checks; a user-confirmed legitimate alias uses the earliest existing canonical coffee ID and primary name. Potential duplicates must first be offered to the user for confirmation; uncertain product identity, different harvests, conflicting origins or URLs, broken source pages and unknown roaster domains remain Pending, without routine admin workload until escalation is truly needed. Ambiguous self-confirmations that would lose data remain blocked.

The first **original database submission**, not merely the first approval timestamp, controls the primary coffee name globally. Later variants such as Hambella vs Hambela or Sweet Bloom Coffee vs Sweet-Bloom become aliases where confirmed. The original personal library ID, every shot and recommendation family must remain referentially stable. Automatic canonical identity re-association is transactionally audited and idempotent; no bulk data rewrites, silent cross-roaster merges or untrusted user-published source proof.

The original four owner submissions (David Armijos, Yirgacheffe, Bavyeyi IV and Hambela) are verified as canonical coffees, retaining 14 historical shots. The official product links for the latter three were checked; David Armijos's submitted direct page was not reliably reachable and is marked as administrator approved with only original source-label evidence. The protected source-check worker is deterministic and rate-limited, with curated hostnames only. No Netlify publication or public beta status change.

See [coffee automation checkpoint](COFFEE_VERIFICATION_CHECKPOINT_2026-10-14.md). These revised Locked rules do not waive the requirement to preserve source provenance, compare release-specific facts, log changes, maintain RLS, keep private pending shots out of community, or satisfy other release gates.

## Approved domain structure and user onboarding resource (2026-10-14)

**Domain structure — Locked by the owner.** The app's permanent user-facing hostname will be `https://app.dialincollective.com`, using the **existing** Git-linked, SSO-protected Netlify project. The root `https://dialincollective.com` is reserved for a later public/marketing homepage; until then it may redirect to the app after HTTPS, authentication callbacks, and access controls work. No new Netlify project, hosting subscription, or production release is authorized by this domain choice. Retain the existing `*.netlify.app` host during migration for safe owner acceptance, and keep beta admission and SSO restrictions unchanged until their existing launch gates pass.

Cloudflare manages DNS and free inbound support-address routing; the owner confirmed a working delivery test for `support@dialincollective.com`. The owner also confirmed a working Supabase password-reset email using Resend Free, with sender `no-reply@auth.dialincollective.com` and verified sending SPF/DKIM. The distinct `auth` subdomain must not be overwritten by web/app DNS or apex routing changes. These owner-observed tests do **not** prove real outside-user signup or invite delivery. After the new app hostname is established, configure exact allowed Supabase Auth redirects and production Site URL, verify TLS, and test genuine authentication and password reset before shifting owner traffic. Do not loosen the private Netlify SSO, RLS, beta gate, or historical-import guard. Any root redirect should avoid intercepting email or app authentication hostnames.

**Future onboarding material — owner-approved deliverable, format and timing to be finalized.** Publish beginner-friendly written instructions and/or a short video walkthrough of the *then-current* app's available functions. Prioritize the shortest Log Shot → Rate → Recommendation path, and explain adding and verifying coffees, ratings and recommendations, equipment setups/Slow Feed, history and editing, available recovery settings, and relevant member versus administrator features. Match the actually shipped features; do not claim unfinished prototype parity is already live. Keep guides concise, mobile-friendly, and easy to update as functionality changes. No tutorial production, media subscription, new frontend screen, or Netlify deployment is implied now.


## Locked visual refinement and review hold - 2026-10-15

The owner approved one coordinated visual refinement: vibrant filled badges with distinct borders in both themes; a consistent warm coffee-inspired palette; defined cards, dividers and secondary buttons; a conspicuous Search & Sort button; cleaner display ligatures; Title Case for standalone interface labels while preserving sentences, acronyms, units and personal names; grouped Settings with Add Another Setup directly below Active Setup, Cloud Sync near the bottom and icon-labelled Sign Out last. Admin follows the app's saved Light/Dark/System appearance, not a separate theme setting. Preserve the fastest Log Shot -> Rate -> Recommendation flow, calculation semantics and historical data.

**Explicit amendment to UX-20261014-05:** Remove the routine Recovery Options section and manual import/export entry points from the beta Settings UI. The earlier proposal to unlock general-purpose imports is withdrawn. Preserve historical import source, the closed server-side import gate, encrypted backups and operator recovery procedures. Keep password recovery and the emergency download for unsynced pending changes; sync is not a backup and full hosted recovery is not newly certified.

**Release hold:** Stage on work/visual-refresh-20261015 for screenshots and approval. Do not publish to Netlify (production or preview), change Netlify SSO, admit accounts, or apply database migrations in this visual work. The approved design direction is not permission to release. Actual screenshots must render the implementation using labelled synthetic fixtures without production writes.

## Consolidated owner-preview release authorization — 2026-10-16

The owner approved publishing the current consolidated work, followed by genuine beta-account/integration verification and complete hosted recovery work. This authorization supersedes the earlier screenshot/review release hold **only for one tested consolidated owner-preview release** to the existing SSO-protected Netlify project and its coordinated Supabase migration and Edge Functions. Continue to use `development/backend-foundation`, the deliberate release marker, and a current credit snapshot. No automatic preview/branch publication, public beta opening, new billing purchase, admission change, import unlock, or claim of full hosted recovery is implied. Every unrelated Locked requirement remains unchanged.

Before release, execute the staged URL-first SQL in isolated PostgreSQL; static Node source assertions are insufficient. Record the published Git SHA and deployed function versions. Real Auth-issued nonadmin session, email/redirect, account isolation and admin-denial acceptance remain outstanding until observed. Use owner-held keys locally for encrypted-archive restore; never request the private recovery key in chat.



## Owner-approved production Netlify SSO removal — 2026-10-16

**Locked amendment, production only:** After the owner verified a genuine second confirmed nonadministrator account using a one-use, expiring beta invitation, the owner explicitly requested removing Netlify's additional team-login gate. The existing production site at `https://app.dialincollective.com` now uses the application's Supabase Auth sign-in, confirmed-email check, beta invitation/admission process, per-account RLS isolation, and administrator authorization as its access controls. Publicly reachable sign-in/signup frontend assets do **not** grant admitted membership, administrator access, private shots, or canonical write privileges. New accounts remain pending until an invite is redeemed. All previous protected-account and historical-import requirements remain Locked.

Netlify visitor protection was updated in place to require **SSO for non-production deployments only**, with no site password, thereby removing extra Netlify SSO from the production deploy. The October 16 published deployment and SHA remain unchanged, and no billable redeploy was needed. The earlier all-deploy SSO requirement is superseded only for production access; preview/branch deployments remain team-SSO-protected. The owner-reported successful real nonadmin signup/invitation workflow is evidence for admission; do not claim full cross-account browser/HTTP authorization, role-denial, or complete hosted disaster recovery without separately observing each test. Preserve limited beta enrollment, production server-side access controls, and the credit-aware release gate.

## Universal roaster URL preview cooldown (Locked, owner-approved 2026-10-16)

New Coffee must accept HTTPS product URLs from **any roaster**, with bounded, authenticated, safe extraction; no four-roaster user-facing restriction. The member may review/correct suggested source facts, fill gaps, and click Add Coffee to create/reuse their personal entry and begin logging shots. A member's Add Coffee confirmation is not sufficient by itself to establish a global Verified canonical coffee; previously Locked official source/release verification, Pending private status and alias/release safeguards continue to apply. This is existing Master Specification behavior, now implemented in development.

**Locked additive decision:** An admitted member account must wait **at least 30 seconds** between *any* roaster product URL preview requests, known or unknown roaster. A single shared account-level throttle must prevent alternating source routes to bypass this cooldown. A 60-previews-per-rolling-day anti-abuse budget is an adjustable engineering default, **not** a Locked product limit. Cooldown must not block manual coffee entry or shot logging. Reference [2026-10-16 additive Ledger](DECISION_LEDGER_2026_10_16_URL_PREVIEW.json). Do not silently weaken source-fetch SSRF defenses, expose user JWT/Claude BYOK secrets, or add required AI charges.

---

## Source 3 — MASTER_SPECIFICATION_BADGE_COLORS_ADDENDUM.md

Original source blob: `6cae0535aee9418aef1d032589d0a588aea25b21`. Retained literally; apply topic-specific supersessions above. Historical delivery/status paragraphs are not today's task list.

# Master Specification Addendum: Original Dark Badge Colors

## Owner-approved refinement of VISUAL-20261015-01

The project file `dial-in-collective.jsx`, specifically its dark `THEME_CSS` variables and `STYLE_BADGE` mapping, is the source of truth for badge fill and text colors. Apply those original dark colors identically in both Light and Dark modes. Do not substitute brighter approximations or reintroduce theme-dependent badge fills. Preserve the newer layouts, clear badge outlines, spacing, label capitalization and behavior.

Exact pairs and source-file fingerprint are in [BADGE_PALETTE_SOURCE.json](BADGE_PALETTE_SOURCE.json). The source's blue progression is Ristretto `#2C506D`, Traditional `#3E7098`, Custom `#588FBB`, Turbo `#92B6D3`, and Lungo `#BED3E4`. Dialed In uses `#6CBB58`. Traditional and Ristretto use white lettering; the remaining original badges use `#1A120D`. Reuse the original dark sensory ramp for taste chips in both modes; the shared rating/compass colors follow the same ramp without changing sensory interpretation.

Pending, Conflict and Pending Sync have no direct badge counterpart in the JSX. Map their existing amber treatment to the source's dark gold `#E5BC6B`, with `#1A120D` lettering. This is a documented mapping for newer statuses, not a claim that those badges existed in the original. Borders retain the newer, defined outline treatment and are not claimed to be legacy borders.

Only the badge/taste palette is refined. All other Locked product, recovery, admission, data and calculation requirements remain unchanged. Source review is not permission to publish: keep this work on `work/visual-refresh-20261015`; no Netlify production or preview deployment, SSO change, database migration or account creation. Refresh browser screenshots for owner review.

Decision record: [DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json](DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json).

---

## Source 4 — MASTER_SPECIFICATION_BADGE_LETTERING_ADDENDUM.md

Original source blob: `ad92b2df2785ed79757e6e7c8c5d0dd8eb5f2b9c`. Retained literally; apply topic-specific supersessions above. Historical delivery/status paragraphs are not today's task list.

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

## Approved badge and shot-history restoration (2026-10-15)
**VISUAL-BADGES-ORIGINAL-REFERENCE-06 (Locked):** The approved original JSX-style badges use original dark-JSX solid fill colors in BOTH themes and crisp, no-shadow typography. Ristretto and Traditional have white text; Dialed In, Turbo, Lungo, Custom and mapped gold status badges have black text. This explicitly supersedes only the earlier uniform-black badge lettering decision. Pills remain flat, without decorative outlines or shadows; stronger card/input boundaries remain unchanged.
**UX-HISTORY-ORIGINAL-REFERENCE-02 (Locked):** Historical shot rows follow the JSX screenshots: compact single-line measurements with date aligned at the right at desktop widths, shot-style and Dialed In badges beneath, a visible Edit action, and notes when recorded. Dates use numeric US month/day/year. At narrow mobile widths use a responsive second date line rather than cropping measured values. Equipment context (Setup, Basket Dose, Feed) remains part of each immutable shot record, but only appears at the **bottom of expanded detail** after sensory ratings. Each coffee's Shot History has one contextual Expand All / Collapse All control; toggling one coffee never changes another coffee's shots.
**UX-RECIPE-EXPLANATION-01 (Locked):** Remove the redundant statement "Based on your successful shots in this recipe family." from successfully dialed-in recipe cards. Preserve actionable and source-backed explanations when useful.
**ENGINE-HIERARCHY-VERIFICATION-01 (Locked, existing policy reiterated):** Retain the eight-tier Section 25.2 evidence hierarchy; an owned successful exact coffee/setup/style recipe outranks generic guidance. Grinder/burr/set-up history is especially important for grind. Do not claim that future community/exact-release/similar-coffee aggregations have been implemented merely because the design displays recommendation metrics. Finish evidence provenance, similarity weighting, and community aggregates in a separate verified engine tranche, without fabricating precision. Avoid unsupported narrative claims about bean density, origin, or fermentation and repetitive style/general guidance on the everyday coffee card. Preserve source evidence for audits.
The existing no-text-shadow, cloud privacy, recovery, and no-Netlify-deploy Locked decisions continue unchanged.

**ENGINE-PERSONAL-SIMILAR-02 (Implementation checkpoint, Section 25.2):** For an unproven coffee without higher-priority exact/related-style personal successful history, start ratio and time from the user's qualifying *successful* same-style, same-setup, same-feed-condition, same-roast shots on similar coffees, with closer origin/process/variety and basket favored. Use conservative shrinkage toward the documented roast/style baseline; do not claim proven Dialed In status or community counts. Keep exact-coffee family data and same-coffee cross-style evidence stronger than this fallback. Show actual contributing personal shot/coffee counts, not fabricated evidence. Never classify unknown historic feed as Standard. Community aggregation, related release linking and broader similarity tiers need verified server data and remain open implementation work.

## Review 10 refinements: History controls, legibility, and Grinder starts
**UX-HISTORY-CONTROLS-04 — Locked:** Standalone Shot History measurement label uses **Grind** (not “grind”). On phones, the numeric M/D/YYYY date sits on the left below the shot measurements. The expanded shot displays compact, approximately 34px-high buttons along its bottom edge: orange **Edit** on the left, outlined **Make Current Recipe** on the right if eligible. The collapsed row is for scanning and expansion only; no Edit link above sensory information. Setup/Basket Dose/Feed remain tucked into expanded history before the bottom buttons. User notes are preserved literally.

**VISUAL-TASTE-RADAR-04 — Locked:** Taste chips match the normal flat pill's font weight (500) rather than the heavier 650 used in the current review. Radar chart labels gain moderate emphasis (600). Never add shadows, text halos, strokes, or glow.

**ENGINE-UNPROVEN-GRIND-RANGE-04 — Locked:** Starting, unproven **Grind** guidance displays a narrow interval around the existing personal recommendation center rather than implying one exact grinder setting. For personal reference use one calibrated grind-adjustment step on each side; for uncalibrated heuristic use two steps on each side, bounded by the configured grinder range. Include one “Try [center]” hint. This is a practical **search band**, not a statistical confidence interval or a claim of a proven setting. Established, dialed-in Grind settings and specifically computed next-shot corrections remain precise single targets. Preserve actual grind entry/prefill behavior, user choice, and all Locked recommendation evidence precedence.

**NEW-COFFEE-URL-VERIFY-CURRENT — Implementation status, no product policy change:** New Coffee URL is passed to catalog matching; after a new coffee is submitted, a trusted official-source verification function may read bounded official product metadata and approve when authenticated owner, roaster host, matching release, and conflict checks pass. It does **not** automatically populate missing form fields or promise verification for every URL. Proposed future streamlined “Paste → Identify → Preview → Confirm” extraction is not yet approved as implemented functionality.

No Netlify publish, account access, database policy or backup alterations are part of this review.

**ENGINE-TASTE-RECOMMENDATION-SYNC-05 — Implementation correction:** Recompute deterministic next-shot advice when a newly logged shot has no cached derived suggestion yet (common immediately after offline logging). The recipe grid's Grind center now matches the post-shot feedback instead of incorrectly retaining an unproven starting band. Persisted source data, user tasting ratings and provenance are unchanged.

## Review 11: URL-first coffee lookup and URL-assisted New Coffee entry
**COFFEE-URL-FIRST-20261015 (Locked, supplements canonical Sections 8-12):** Fresh, verified, release-compatible official roaster URL evidence is the first coffee matching signal. Without a trusted or decisive URL, use the roaster + bag name, with process/origin/release checks as before. A URL is evidence, NOT the permanent Coffee UUID; a product URL may be reused for a different harvest. A verified URL with conflicting roaster/name/release is a possible match requiring confirmation, never a silent merge. Only unequivocal single-source non-conflicting matches may automatically reuse a canonical ID. Pending records and owner shot history remain protected.
**NEW-COFFEE-URL-AUTOFILL-20261015 (Locked):** Move optional Roaster Page URL to the top of New Coffee with an explicit Autofill From URL button. The optional preview reads supported structured Product metadata from a known official HTTPS roaster page, then shows the fields found and any catalog match. The user chooses Apply Suggested Details; only blank form fields are filled, never overwriting typed values. Name/Roaster remain required for submitting, missing facts remain blank, and manual entry/Pending Coffee remain available for unknown/unsupported pages. The six paired metadata fields and all shot controls remain unchanged. This non-AI extraction does not supersede the Claude-only optional BYOK/device-only AI decision.
**COFFEE-URL-SECURITY-20261015 (Locked):** Only authenticated admitted accounts may request source previews. Fetch happens server-side, with an exact directory-recognized official domain, strict HTTPS and URL shape, no redirects, bounded HTML size, and a per-user 12-second cool-down / 25-per-day quota. Service-role helpers cannot be executed by browser roles. Preview never writes canonical facts or merges records; formal verification after submission remains separate.
**VISUAL-STANDARDIZATION-20261015 (Locked):** Original badge colors and flat text, no shadows, Title Case standalone labels and normal-sentence prose. Shared control font/radius/height tokens in the review stylesheet replace obsolete overlapping selectors. Primary Log Shot/Save actions remain prominent; contextual actions remain compact. Preserve all sensory ratings and recommendation outputs. The captions Basket-based (Dose) and Recommendation (Temperature) are explicitly unchanged pending owner review. Add a lightweight Title Case regression test and preserve literal user-entered names/notes.
**Release hold:** Branch-only sources and synthetic screenshots. The new SQL migration and Edge preview code are NOT deployed and no Netlify publish or authorization changes occur until a consolidated owner-approved release.

**Release ambiguity safeguard:** Even when an official product URL matches a prior verified source, automatic canonical reuse requires a corroborating explicit release/harvest label and nonconflicting process/origin. Without that release evidence, the URL is still ranked first but requires confirmation; an old product URL may be recycled for a new harvest. This supersedes the older implementation shortcut allowing two blank release labels to auto-match.

**CLOUD-SYNC-ACCOUNT-RACE-20261016 (Implementation hardening):** A network request started under a previous account/identity epoch must not satisfy or prevent a subsequent account's pending sync; after the old request completes, the newly admitted account must perform its own durable cache hydration/read. Duplicate simultaneous syncs for the same owner and epoch remain coalesced, no pending outbox records deleted, and owner-id guards stay in place. Add regression tests for account switching under an in-flight request.

**OPS-PREVIEW-RELEASE-HOLD-20261016 — Implementation reinforcement:** Netlify preview and branch deploy hooks must fail closed during the owner-approved all-publication hold; do not treat no-cost preview builds as consent to publish. Keep production release marker and credit verification intact. Changes to this gate still cannot prevent manual UI-triggered deploys; verify Netlify settings and permissions before beta launch.
**VISUAL-TEMP-CAPTION-20261016 — Locked:** Keep **Basket-based** exactly capitalized beneath Dose, remove the redundant **Recommendation** subcaption beneath Temperature. Preserve the temperature target and all recommendation behavior; do not remove recipe explanations or source evidence.

## October 19, 2026 — Enhanced coffee URL extraction and optional Claude semantic review (owner-approved)

The owner explicitly requested to improve the **existing non-AI URL extractor as much as practically possible**, and then publish one thoroughly tested production update. Deterministic public-page parsing remains the default and first step for every URL. Parsing may read current-product narrative, structured facts, multi-stage fermentation, named farms and people, espresso recipes and multi-origin blend components; do not misrepresent a compound blend as a single origin/process or invent unprovided fields. Additional source-specific facts may be displayed in a review-only disclosure, not silently added to an unsupported canonical record.

The owner also approved the existing V1 **Claude-only**, optional, device-local BYOK semantic extraction requirement as a *fallback* to this deterministic layer. Each account's own browser can explicitly enable Claude using its own user-supplied API key; it is not written to Supabase, stored in app server settings or sent to The Dial In Collective backend, and user-supplied keys are sent only directly to Anthropic when the user opts in and a supported public product page still has missing extractable facts. Without opt-in/key, the same free deterministic preview and manual Add Coffee must work fully. Limit the source excerpt, requests and model output, require verbatim evidence quotes and strict reviewable field types, withhold conflicting/blended/unsupported values and never interpret AI suggestions as Verified official catalog facts. Optional AI is not a second required click, account admission bypass, screenshot OCR, background job or app-funded AI license.

Preserve the existing one-click Autofill → fill **only blank** fields → member review/correction → Add Coffee workflow, the 12/24h account preview budget, >=30s shared cooldown, authenticated safe pinned-HTTPS source retrieval, >900KB page refusal, real release identity and member privacy, seven Locked roast labels and deferred product features. The owner approved **one** credit-aware GitHub/Netlify production publication after full tests in this specific effort, not recurring permission or changes to hosted SQL, Auth, backup secrets, member data or a provider subscription. Confirmation of the actual live deploy and integrity must be recorded before treating this release as published. Details: [GitHub source and tests](UNIVERSAL_EXTRACTOR_AND_CLAUDE_BYOK_2026-10-19.md), [issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33).

## October 19, 2026 — Latest owner supersession: deterministic-only URL extractor (Locked)

**Later explicit owner decision, controlling over the same-day optional-Claude proposal above:** Do **not** add, publish or expose the new Claude/AI extraction runtime, settings, device-key interface, backend semantic-text response, Anthropic endpoint or model-based coffee suggestions in this release. The owner specifically directed **complete removal** of the newly introduced AI integration in favor of making the existing deterministic public-roaster source parser as reliable and capable as possible. The previous optional-Claude discussion and work history are preserved here as historical evidence, **not as authorization for implementation or publication now**. The original V1 Claude-only optional BYOK strategy remains a historical/future architectural constraint if AI extraction is ever explicitly reapproved; it creates no current runtime requirement.

For explicitly described multi-component coffees, represent **all distinct, source-confirmed origins and named producers** in their existing canonical text fields, deduplicated and in first-seen product order. Never infer a producer from a coffee component's unlabeled name. For a genuinely multi-process blend, use existing canonical dropdown value **Other/Unknown**, and show the exact process techniques and blend component composition as supplementary review-only evidence. Do not erase multi-origin evidence merely because more than one country is present, and do not assign a falsely specific single processing method. Maintain the Locked one-click blank-only Autofill → review → Add Coffee workflow, seven roast choices, 12/24h quota, minimum 30-second cooldown, bounded and SSRF-safe fetching, existing release/canonical privacy protections, unchanged historical data, and no paid AI use. The owner's earlier single guarded production-deployment consent **still applies** once the deterministic-only revision passes full release checks; no standing approval for further deployments or other changes.

Source of newer explicit instruction: [GitHub issue #33, October 19 20:24 UTC](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33). Implementation and acceptance: [deterministic extractor work record](UNIVERSAL_EXTRACTOR_AND_CLAUDE_BYOK_2026-10-19.md), [current status](CURRENT_STATUS.md). Do not imply the removed AI implementation remains available.

## Approved production implementation — adaptive public coffee extractor (October 20, 2026)

**Locked decision `EXTRACTOR-ADAPTIVE-RETRY-COMPRESSION-COMPACTION-20261020` (explicit owner production approval):** Implement and publish the confirmed three recommendations from the October 20 isolated benchmark in **one** deliberate tested Netlify release: (1) retain the **900,000-byte default** and allow exactly one bounded **2,000,000-byte maximum HTML-only retry** *only* for a real validated specific public coffee-product URL that returned `page_too_large`; (2) request gzip/Brotli via the existing pinned-HTTPS transport but enforce limits on **both received and decompressed** bytes and refuse malformed/unsupported encodings; (3) remove nonsemantic markup/scripts/styles/comments before parsing while preserving structured Product JSON-LD, inline product JSON, visible descriptions, and the existing source-vs-field rules. Unmodified default HTML/JSON caps, TLS identity checks, private/reserved-network denial, connection-time public IPv4 DNS pinning, redirect checks, 10–11 second network protections (plus aggregate retry deadline), preview admission/quotas, verified-vs-pending identity, one-click blank-only Autofill, and historical data are mandatory. A product-shaped URL is a necessary condition for retry, **not** evidence that the coffee exists; every result still requires validated selected-product evidence. No AI browser or paid extraction inference. A failed/ambiguous result stays manual and unverified. No new Supabase migration, data mutation or coffee verification promotion is authorized.

This **scoped exception** amends historical lines that said *every page* exceeding 900 KB must be refused. It does **not** delete/supersede the historical 900 KB limit or approve a blanket 2 MB policy, unrestricted redirects, arbitrary page crawling or changing accounts' 12-per-24h preview budget and shared >=30-second cooldown. The owner also authorized publication of the previously confirmed small, full-width **Autofill From URL** button, the Locked grinder-range/info and next-shot arrow/help UI, and the already tested deterministic public platform support on the active development branch. Declined screen mockups remain declined. Separate release evidence: [October 20 release receipt](RELEASE_2026_10_20_ADAPTIVE_COFFEE_EXTRACTOR.md), [benchmark](EXTRACTOR_SIZE_BENCHMARK_2026-10-20.md), [issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33).

## Owner-approved PWA update reliability and source-exact coffee enrichment (October 20, 2026)

Owner reports the New Coffee URL button still visually old after Netlify published prior release. Under a **single newly authorized production release**, fix the PWA public-shell freshness path: precache a complete revision and allow installation to activate; revalidate public HTML when online, retain offline cached reopening, and check for service-worker updates on app foreground. Do not clear saved data, signed-in accounts, queued shots, client draft forms or force immediate active-tab reloads. Existing browser sessions may require close/reopen after deployment. Increase **only** the existing full-width New Coffee `Autofill From URL` button to a conspicuous 56 px minimum/16 px bold control, with existing form, fields, and interactions otherwise unchanged. Preserve previously Locked grinder help and next-shot minimalist arrow/info and explicitly rejected proposed mockup redesigns. No new general UX change is authorized.

Improve the existing deterministic URL extractor only through bounded, source-corroborated techniques: product-specific public Shopify/Woo/Ecwid information, more precise yet noncontradictory geographic origins, approved localized Woo exact-product permalink matching, conditional genuine-HTML MIME recovery, explicit French product-story flavors, and literal lot identifiers. Keep missing/contradictory coffee data blank for user review. Preserve all existing Auth, quota, TLS/SSRF and size-limit gates, no paid model or browser execution, no auto-verified records or silent saves. Source acceptance: [2026-10-20 new release receipt](RELEASE_2026_10_20_PWA_REFRESH_AND_EXTRACTOR_COMPLETENESS.md) and new Ledger key `current_owner_pwa_freshness_extractor_reliability_release_20261020`. Latest owner confirms that added invitation codes/new members are real; no test-data deletion.

## Owner-approved narrow exception: purge two TEMP QA #9/#34 synthetic shots (October 20/21, 2026)

Explicit owner instruction: **“Fine remove the shots now please”**, following the exact two-shot destructive-cleanup authorization request. This is a **single-use, exceptionally narrow supersession of the general durable Community-contribution/history-retention rule** only for the two synthetic records labeled **TEMP QA #9/#34 BASELINE** and **TEMP QA #9/#34 OUTLIER**. Their authentic member-operated confirmation/correction acceptance evidence remains retained in redacted GitHub reports. Authorized action: revalidate both shot IDs and ownership; permanently delete only those two synthetic source shots, their two notes, two synthetic eligible Community projections, two contribution links and associated quality checks; sanitize only the eight corresponding audit before/after shot payloads and six matching mutation-receipt response payloads while preserving safe audit action/time/identity/replay metadata and explicit tombstones; adjust only any derived recency/feed pointer demonstrably tied to those shots. Retain all eighteen earlier original shots and notes, two real eligible Community projections, other members' data, unaffected private history, coffee/library/setup records, originals/backups and historical evidence. No blanket Community deletion, no removal of backups, no other Locked product-rule change, no release or provider settings authorization. Any mismatch fails closed before SQL. Actual deletion completion requires separately verified transaction and post-write count/identity readbacks. Issue #9 remains open for unverified negative edge cases; do not require further repetitive owner browser tests now.

## Admin record explorer, creation attribution and audited administrator corrections — Owner instruction 2026-10-21

**Scoped new decision `OPS-ADMIN-RECORDS-EDIT-20261021`, owner-approved for DEVELOPMENT, BUILD, and TEST ONLY, NOT LIVE PRODUCTION.** Five dashboard metrics and page sections order: Pending Coffees → Conflicts → Approved Coffees → Logged Shots → Accounts. Cards navigate to their named sections, each with complete paginated records. Current signed-in, admitted, server-approved operator can see record owner/creator labels, including emails and original private shot notes, and use server-validated revised audited corrections for shot measurements/notes, pending coffee details and approved canonical descriptive details. URL metadata extraction may preview existing HTTPS source content (one shared cooldown and SSRF restrictions), fill only blank draft fields, and never establish official verification by itself. Users' passwords, session tokens, recovery material and unpublished secrets are never included.

**Narrow override of earlier initial `read-only administrator dashboard` scope and sanitized admin dashboard DTO:** A **new, separate, administrator-only** record-list/correction RPC is allowed to project creator identifiers/emails, user personal shots and notes, but NO direct table read/write grants, broad RLS changes, public Community identity exposure or member-to-member record reads. The old read-only dashboard endpoint remains unchanged and safe. Existing admission/admin role checks, revision concurrency, immutable provenance, original note/shot history, admin audit, community projection and exact canonical release identity remain locked. Canonical identity (approved coffee name, roaster and release label) is NOT rewritten through descriptive editing; a separate identity review would be needed. Owner asserted member consent to admin access including notes; independent member-consent documentation was NOT inspected, so no claim of verified member-specific consent is made. Nothing in this decision waives external privacy law or password secrecy.

**Delivery boundary:** staged code/SQL only, no hosted SQL, Edge, Auth, membership, note/shot mutation, Netlify publish, provider setting/credit action, or new future release authorization. Require separate named production SQL and release approvals, isolated SQL security tests, actual admin/member negative checks, and owner-device acceptance before marking Live/Accepted. Issue #47 tracks incomplete work. Previous original Locked corpus and member RLS remain unchanged.


## October 23, 2026 — selected-product completeness implementation

The owner reported that Sweet Bloom Arbey Cordoba omitted the explicitly published
Bourbon Ají variety and requested comprehensive extractor improvements. This is
implementation work under the existing deterministic-only and autonomous
development/queue decisions. Read compound cultivar names without a narrow
cultivar whitelist; preserve accented and localized labels, multiline and reverse
metric layouts, explicit country/region and separate farm/grower facts. Accessible
image descriptions may supply literal, exact-name-matched profile facts; pixels,
image color and filenames remain insufficient evidence.

A fresh eligible product read may use the existing bounded exact-product endpoint
even when the core fields are full, to recover additional source facts and detect
contradictions. Prefer current warm source evidence over sparse catalog records;
retain the authorized free complete-catalog path and truthful cached fallback
without copying old catalog approval or facts into a new release. Equivalent
cultivar lists are compatible; contradictory source values stay withheld. Retain
roast cautions, mixed processing and compatible espresso measurements. Selectively
exclude recommendation components while retaining later selected-product sections;
parser resource limits fail closed.

The existing 900KB initial bound, eligible single2MB HTML retry, shared deadlines,
request/redirect bounds, DNS pinning, TLS, admission,12/member/24h,30s cooldown,
12/IP/min, blank-only autofill, explicit save and Pending/Verified semantics remain.
No AI/OCR/browser runtime, arbitrary crawl, paid service, data mutation or
publication is authorized by this implementation request. A universal100% source
coverage claim is not justified. Evidence: [Issue33 journal](workstreams/issue-33.md)
and [source acceptance record](audits/2026-10-23-extractor-completeness.json).


## Owner-Locked Admin coffee/shot review and deletion (2026-10-23, Issue #100)

The owner approved the screenshot-based Pending Coffee Review: show a submitted coffee beside the relevant existing candidate and field differences, with truthful reasons for review and no product photographs. Remove the redundant **Hold for Clarification** user-interface action: doing nothing leaves the submission Pending, without altering existing historic hold records. Preserve administrator-only **Approve Distinct Coffee** and **Resolve Duplicate**, existing exact-revision protections, and no unapproved automatic merging.

The owner also expressly authorized administrator deletion of a pending coffee submission, an approved canonical coffee, or an individual logged shot. After a Delete request, show a live, server-authoritative count of all associated records and require exactly one further confirmation click. Deleting a coffee or Pending submission must delete its associated personal shots and notes together with affected personal library and related records in one atomic transaction; do not leave dangling shot references. Deleting one shot clears its private note and safely updates dependent favorites, without accidentally deleting other shots. Refuse stale revisions, changed impact, unauthenticated/non-admin callers, and access from other accounts.

**Locked Community preservation remains intact unless expressly superseded:** valid anonymous Community contributions survive deletion of a source personal shot with the origin link detached. For a canonical coffee with Community observations, merged-coffee references or other non-reconcilable historical pointers, deletion is **blocked** with a clear dependency count rather than silently removing valid Community/history. Additional explicit approval and safe preservation design are needed to change that boundary. Retain limited private deletion receipts and pre-existing historical audit/mutation receipts; never republish or expose private member data as part of the preview.

**Release separation:** These features are under development on Issue #100 / PR #101. Only apply database changes or destructive live record actions during separately authorized publication/operation, with verified encrypted backup when a potentially destructive database operation is imminent. Application review UI, migration and tests must all pass and be merged before the complete item is READY. No website or hosted database publication is implied by this approval.
