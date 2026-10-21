# Historical requirements, continuity and duplicate-work audit — October 21, 2026

Canonical sources: [Master Specification](../MASTER_SPECIFICATION.md), [Decision Ledger](../DECISION_LEDGER.json), [Current Status](../CURRENT_STATUS.md). [Audit overview](2026-10-21-history-audit.md).

## Result and scope

Three distinct review passes are complete over the accessible historical record and recovered documentation. The principal recurring problem at the recovered checkpoint was **execution-status drift**: the latest release receipt and newer issue comments were accurate, while active instructions, current-owner ledger fields, approval flags and issue leads described earlier incomplete work. That discrepancy can cause a future assistant to ask for approval again, repeat accepted device tests, rebuild already delivered work, or attempt a consumed release.

The audit also found and repaired broken historical navigation. There were **235 broken relative Markdown link occurrences, representing 161 distinct document/target pairs**. Of these, 228 resulted from moving snapshots into `docs/archive` without rebasing their links. The other seven pointed to renamed migrations or an incorrectly prefixed journal link. The history reviewer changed **234 link destinations in ten historical documents**, preserving all labels and historical prose; the integrating reviewer completed the remaining journal correction. All 235 original broken occurrences are repaired in the assembled source. Two inaccurate “retained literally” labels in `MASTER_SPECIFICATION.md` were corrected because those integrated source sections contain explicitly approved amendments. The exact original source files remain intact.

This is a documentation and requirement audit, with source-level corroboration where cited. It is not a claim that all unfinished features have been implemented, that every earlier chat is available, that every historical Git diff was reread, or that no future failure is possible. Production observations below use the integrating reviewer's separately verified provider receipts. This history review made source/documentation changes only. The authorized GitHub integration is recorded separately; no Netlify, Supabase, member-record, billing, credential or production-configuration mutation is implied by this report.

### Reviewed inventory

| Corpus | Coverage | Meaning and boundary |
|---|---:|---|
| Recovered application repository | 318 files | Full tree recovered at `c9829d157ef4f430d24af7056ab32661ba8629f5`; application/runtime review is owned by the application auditor. |
| Documentation | All 117 recovered files inventoried | Paths, hashes, headings, current/historical status indicators, relative links and source provenance checked. All 26 recovered JSON documents parse; no duplicate JSON object keys were found. A later working-tree check also included the newly added release-request example. |
| Original baseline | 79 Locked requirements and 20 original Open questions | Every item appears in the companion traceability register with exact original wording and a reconciled disposition. The 20 are historical Open entries, not a claim that 20 decisions remain unresolved. |
| Later decisions | 55 amendment records and 35 `current_owner_*` keys | All are included, preserving the original record and its source. These overlap with the baseline and each other; 189 provenance entries are not 189 unique features. |
| GitHub tracker | 38 issues and 8 PRs | All bodies included in the recovered inventory. At that inventory: 31 open issues and 7 closed. Every issue has a disposition, residual scope and related-issue mapping. |
| GitHub conversations | 31 timelines, 190 comment/review records | Retrieved read-only for every comment-bearing issue and the eight PRs, then reconciled with body state. Original comments are retained as history. |
| Git history | 915 unique reachable development commit metadata records | From inventory head `0a9646a5348de58fba4f8bf13a31ff8fa52ab8bd` to repository root `297c39ec770467c46c5cb33b81187b8a49390411`. Titles and continuity metadata were searched. This is not independent review of all 915 diffs. |
| Supplied archives | 2 ZIPs, 26 total member entries | ZIP integrity passed; all 24 listed member checksums passed. One ZIP includes the earlier handoff again, an intentional duplicate. |
| Supplied PDF | All 15 pages | Research synthesis read in full, including pages 11–15 recovered with `pypdf`. External research citations were not freshly revalidated in this documentation audit. |
| Main operations documents | `main` AGENTS and controller installation record | Reviewed separately from active application docs. Release/source changes are owned by the release auditor/root. |

Canonical scope authority is the root's recorded audit commit `f2432bf08a803ba370ff1940d3121305bbce2459`. Initial branch distinctions: active application `development/backend-foundation`; operations/backup `main` at `f8726e330648c4a3e82de88d75b6978ffee37d44`; production release `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`. These are audit checkpoints, not permanent resume instructions. A later session must read the actual branch refs.

## The three passes

### Pass 1 — requirement and evidence reconstruction

Read the active work journal, current status, canonical specification, complete decision ledger and all original/amendment sources. Built a complete baseline/open/amendment/current-owner inventory. Reconciled all issue bodies against their actual GitHub state and latest available comments. Separated owner approvals, proposed ideas, historical implementation statements, independently observed provider state, synthetic tests and real owner/device reports.

This pass established that several “pending” statements were obsolete. Nested Community, release-context SQL, permanent admission/admin invitation controls, the approved next-shot arrow/info layout, full-width Autofill and internal single-visible-family selection have release evidence. Real cross-account role acceptance in #41 and held Confirm failure/retry in #34 were closed within their recorded scopes. The complete-beta milestone remains distinct from the limited technical pilot.

**Output:** `2026-10-21-requirement-traceability.json` and `.md`, with all 38 issue dispositions and every recovered decision record.

### Pass 2 — chronology, duplication and missing-work review

Cross-checked later owner supersessions against the original Open questions and current issue scopes. Reviewed all retrieved issue/PR timelines, the two archive manifests and their partial chat excerpts, the PDF, and the original/addendum preservation chain. Compared overlapping issue work so an umbrella ticket does not cause duplicate implementation or erase a narrower unfinished task.

Important resolved distinctions include: permanent accounts versus single-use invite codes; reversible Remove Access versus hard account deletion; catalog approval versus independent official-source verification; internal successful families versus a visible alternate-recipe list; deterministic current extraction versus future optional Claude/screenshots; and controlled SQL/Netlify execution versus genuine device acceptance. None of those decisions should be reopened because old wording remains in an archived checkpoint.

This pass identified two deferred requests without a dedicated located issue: B007's Mac double-click launcher/Documents updater for the next applicable local distribution, and the future apex homepage under `DOMAIN-20261014-01`. They remain explicitly retained in the register. They are not current release blockers and must not disappear simply because the hosted app has a different delivery path.

### Pass 3 — adversarial consistency and preservation check

Repeated the reconciliation from the latest verified release and closed-issue receipts backward into every active status surface. Compared the original baseline JSON against its embedded ledger copy; compared all ten decision-source JSONs and all three implementation/recovery-source JSONs against their embedded content. All 13 source JSONs and the original baseline matched. Checked the integrated specification against original archived/source files: substantive changes align with identified owner amendments, but two provenance labels incorrectly promised literal retention. Those labels are now corrected.

Expanded the link check from the primary entry points to the complete recovered document tree, which exposed the 235 broken link occurrences missed by the smaller check. Corrected the authorized destinations and checked all repaired links again. The integrating reviewer subsequently corrected the remaining journal target; all 235 originally identified occurrences are now repaired in the assembled source. Checked duplicate JSON keys and exact duplicate document bodies; none were found. The embedded source copies and repeated dated checkpoints are intentional provenance, not candidates for deletion.

The root additionally reports live SQL-body parity for 76 of 77 functions after accounting for two documented `DO`-block rewrites; the remaining RLS guard corresponds to reconstruction-script formatting/case. That is cross-audit evidence, recorded here with its attribution, not a separate database certification by this child.

## Findings at the recovered checkpoint and assigned disposition

| ID | Priority | Finding and evidence | Action / status |
|---|---|---|---|
| HIST-01 | High | Active `AGENTS.md` says the controller has no approved grant, is inert, #41 is open, #9/#34 still await the held lifecycle, and current production is `e7e16e5`. Those statements conflict with current provider/acceptance receipts. | Root owns active replacement. Use the exact current-state paragraphs below and the separate source-status record; preserve general privacy/approval constraints. |
| HIST-02 | High | `APPROVAL_COVERAGE_MATRIX.json` correctly names the current deployment but still labels the internal family and duplicate-first features development/unapplied, release cutover blocked, Project settings unsaved, and Community cross-account checks unverified. | Root owns metadata reconciliation. Exact contract/gap field changes are in `2026-10-21-status-reconciliation-proposals.json`. Assertions and Locked rules remain unchanged. |
| HIST-03 | High | Many `current_owner_*` execution fields in `DECISION_LEDGER.json` retain stale delivery/acceptance status, including paid GitHub prerequisites that were explicitly superseded. | Root owns 29 proposed current execution-field replacements. Preserve every original baseline/amendment and dated evidence record; do not change requirement text or treat a historical release approval as reusable. |
| HIST-04 | High | Issue #5/#43 bodies still lead with “not published,” and #44's original body refers to open PR/setup work that is now complete, even though their later comments contain the current receipt. | Root should put a concise current-state block at the top, keeping the original body below as dated history. Exact leads for #5/#43/#44 are supplied. No issue should be closed merely because its top-level status was corrected. |
| HIST-05 | Medium | 235 relative Markdown link occurrences are broken; 228 came from relocated archived snapshots, six from reconciled migration filenames, one from a journal-relative path error. | **235 repaired in assembled source**: 234 by the history reviewer and one journal replacement by the integrating reviewer. Repaired targets resolve. Link labels, quoted paths and historical prose preserved. |
| HIST-06 | Medium | Master Source 1 and Source 2 claimed literal preservation while containing explicitly approved inserted/replaced text. Original files and ledger provenance remain preserved. | **Two provenance-label corrections applied locally**. Diff inspection found the removed/replaced substantive passages correspond to recorded scoped family/UX/approval amendments. |
| HIST-07 | High | `GITHUB_FREE_PRIVATE_CONTINUITY_AND_RELEASE_PLAN`, `FAST_BETA_RELEASE_PROTOCOL`, `WORK_BROWSER_RELEASE_EXECUTION`, and main controller install docs remain active-looking instructions to perform completed setup or consume the old release. | Root/release auditor should mark those specific execution sections historical and link a single current receipt. Keep operational policy and future-release rules. Do not reactivate the consumed grant to make a checklist green. |
| HIST-08 | Medium | Issue clusters and old checklists overlap enough to reintroduce completed work: #9/#34/#41, #5/#23/#33/#43, #21/#22/#26/#36 and #24/#36/#41. | Keep one authoritative task for each remaining behavior, link accepted evidence, and keep the distinct scopes in the matrix. No automatic duplicate closure. |
| HIST-09 | Medium | Cloud recommendation-origin metadata is required but is absent from the hosted payload/hydration path, despite local `usedRecommendation` support. This is a specific unfinished requirement, not a display-only nit. | Confirmed by application auditor and inspected in [site/cloud/main.js](../../site/cloud/main.js), [site/cloud/mapping.js](../../site/cloud/mapping.js), [site/lib/engine.js](../../site/lib/engine.js). Retained as baseline L041 follow-up; schema/RPC design must preserve origin across offline replay and hydration. No new live SQL implied. |
| HIST-10 | Evidence gap | Nine original research report bodies, complete old transcripts, failed JSX attachment and five formerly referenced conversation PDF exports are not all available in this turn. | Keep #30 open and list each limitation. The PDF and manifest pointers do not reconstruct missing source bodies. |

### Exact current-state replacement for active AGENTS paragraphs

Replace the stale status bullets, not the whole policy document, with the following current operational text. The root's final source-status file may supply the receipt link used below.

> GitHub remains private on Free. Its unprotected branch CI is advisory and cannot prevent all direct-writer or provider-administrator bypasses. The chat-trigger release controller is installed on `main`; its request validation and single-use non-force claim were exercised. The native Actions final push failed in run `39679465858`; the same original immutable claim was safely completed through verified GitHub connector recovery. Keep #44 open for that transport/reliability gap and #38 open for the distinct Free/private bypass risks.
>
> At the October 21 provider receipt, production is Netlify READY/current deployment `6ad92fd1d706315f29032892` at release commit `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`, containing tested application `c6976b1fc86ed5e6b38c0c38831950fca017b3a4`. Grant `DIC-20261021-BETA-COFFEE-01` is consumed. Resume from actual branch/provider readbacks and the current receipt; do not treat this dated SHA as an enduring branch head or reuse the grant.
>
> Owner-run member/admin/removed/never-admitted role acceptance is completed within the documented scope of closed #41. Held Confirm transport-failure/retry was accepted in closed #34, and the Correct Shot positive path is recorded under #9. Preserve the original report boundaries. #9 retains only its distinct wrong-member, stale-revision and hide/detach acceptance work. Do not repeat accepted owner-device cases without a changed implementation, regression or distinct remaining scenario.
>
> `development/backend-foundation` remains the application and canonical-document branch; `main` is the backup/operations and chat-trigger controller branch; `release/production` supplies controlled production releases. General audit/fix authorization covers reversible source/documentation work. Every future live release and any newly scoped production SQL/Edge/Auth/member-data operation remains subject to the owner's existing specific authorization rules. Completed setup and consumed approvals must not generate another approval loop.

The owner already reported saving the ChatGPT Project instructions. Change “User must save” into a source-limited receipt (“owner-reported saved; no direct settings readback available”), and leave the pasteable file available for future intentional changes. Do not claim that this audit silently updated the owner's Project settings.

### Current release facts to use consistently

| Fact | Verified receipt / correct wording |
|---|---|
| Actual frontend | Netlify `6ad92fd1d706315f29032892`, READY/current, release `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`, published 2026-10-21 21:34:34.367Z. |
| Tested application | `c6976b1fc86ed5e6b38c0c38831950fca017b3a4`; release source parity excludes the four documented claim/ledger blobs. |
| Admin-review migration | Source candidate `20261021053500_dic_admin_coffee_review.sql`; actual provider-assigned version **`20261021165214`**. |
| Duplicate-first migration | Source candidate `20261021062000_dic_duplicate_first_auto_approval.sql`; actual provider-assigned version **`20261021165302`**. |
| Grant | `DIC-20261021-BETA-COFFEE-01`, consumed; no ongoing release authority. |
| Device acceptance | Current admin/nonadmin duplicate-first flow is not independently accepted merely because SQL and frontend are deployed. Keep #5/#43 open. |
| Credits | Current balance and actual debit remain unknown. Older 940/790 observations must retain their dates and evidence source. |
| Production data | Root's fresh read: 22 shots/22 notes, four coffees, seven submissions, two Community projections, five beta members; all are point-in-time observations. |
| Security advisory policy | Leaked-password protection remains intentionally optional for the private beta under explicit owner policy. Five signed-definer warnings and four private-table no-policy notices require context; warnings are not automatic proof of exploitation or authorization to alter grants. |

The actual migration versions matter. A future assistant must not mistake the source filenames for unexecuted migrations and apply them a second time. Retain the existing source-to-provider mapping and immutable applied-body evidence.

## Duplication and unfinished-work reconciliation

### Overlapping issues that should remain separate

| Cluster | Reuse completed work | Distinct remaining scope |
|---|---|---|
| #9 / #34 / #41 / #20 | #41 real role/access acceptance; #34 held Confirm blocked-fetch retry; #9 Correct Shot positive path and approved QA cleanup. | #9 wrong-member/stale/hide-detach cases; #20 user-exposed safe Hide Shot workflow. Backend/outbox primitives do not constitute the missing control. |
| #5 / #23 / #25 / #33 / #43 | Published extraction, specific accepted roaster cases, deployed admin-review SQL/UI and duplicate-first identity flow. | #5 real nonadmin Add Coffee/Retry and provenance; #43 real admin/member acceptance; #23 broader canonical conflict review and pagination past initial 50; #25 exact graphic/source field coverage; #33 unsupported source/platform cases. |
| #10 / #12 / #13 / #17 | Published personal internal family chooser and one visible recommendation; owner-superseded visible alternate list. | #10 remaining family lifecycle/significance, #12 full contributor-balanced exact/related/similar Community evidence, #13 experiment workflow and consequential open semantics, #17 grinder direction/step/multi-turn model. |
| #21 / #22 / #26 / #36 | Real iPhone offline queue/reconnect delivery and scoped PWA acceptance already recorded. | True two-device concurrent/stale/account-switch acceptance, actual accessibility/VoiceOver, and only the remaining linked pilot checks. Do not request the same basic offline shot again. |
| #24 / #36 / #41 | Admin Generate/Revoke; scoped real Remove/Restore and role-denial acceptance. | Distinct first redemption, already-used/expired historical code and simultaneous redemption behavior; pilot umbrella links those tasks without copying them into separate builds. |
| #38 / #44 | One-use claim, current release cutover and supervised same-claim completion. | #44 native Actions push transport; #38 unprotected private Free/direct-provider bypass residuals. A fix for one does not prove the other complete. |
| #39 / #40 / #26 | Approved New Setup help and arrow/info; full-width Autofill button; owner's general appearance report. | Identify the exact missing-icon route only when needed. Do not introduce an existing-settings grinder editor or revive rejected form/graphic designs without a new scoped product choice. |

Closed issues at the recovered inventory are **#8, #11, #29, #32, #34, #35 and #41**. Older unchecked checklist items inside their dated evidence do not automatically reopen them. They also do not certify all broader issues. #42's single unlinked test-created contributor placeholder remains a nonblocking, specifically tracked production-cleanup item; this audit does not authorize deleting it.

### Approved work that is not yet the complete product

The traceability register retains the full source of each task. The most consequential unfinished areas are full Community evidence tiers/provenance (#12); experimental candidate/confirmation/promotion lifecycle (#13); durable hosted Custom targets (#14); optional Roast Date/Frozen/new-bag lifecycle (#15); version-safe equipment and basket management (#16); editable recommended style in Add Coffee (#19); and safe user-exposed Hide Shot (#20). Local helpers, table columns or one partial UI do not count as end-to-end delivery.

The application auditor reconfirmed that cloud coffee hydration builds `bags: []` with `activeBagId: null`; no hosted Custom controls or full equipment-version workflow were found. For Hide Shot, `hide_shot` is present as an outbox/cache primitive and the local engine has a helper, but there is no corresponding user click/submit control in the hosted main/shot-card flow. These remain implementation tasks, not new owner questions.

Recommendation-origin metadata is another precise gap. The local engine records `usedRecommendation`, while hosted `use-grind` / `use-temp` copy the recommended values without establishing equivalent durable provenance; `shotPayload` and `hydrate` do not transfer that metadata. The audit must not certify baseline L041 solely because a Use Recommendation button exists. The next implementation should preserve whether a value was copied, its source context and subsequent user overrides, without treating a suggestion as an actual measurement. The backend/RPC scope must be examined before deciding whether a production migration is necessary.

Remaining product choices should be asked only when they affect imminent implementation: grinder direction/step/multi-turn semantics; experiment comparison baseline and declined-green effects; and the proposed Fast-Flow/SEY preset versus sixth selectable style. The five current styles remain Locked. Optional screenshot/Claude BYOK remains future work under #18, governed by the later deterministic-only current runtime decision. The beginner guide (#37) is a genuine later deliverable and should describe actual stabilized behavior.

## Source preservation and unavailable material

### Integrity checks

- The archived v1.0 decision ledger exactly equals `DECISION_LEDGER.json` → `baseline.content`. Archived SHA-256: `a0464e6a6e60bbc5447b085b99852901c7f246f950f8072776fd3e03b859903e`.
- All ten embedded `decision_sources` equal their standalone source JSON content; all three `implementation_and_recovery_sources` equal their source JSON content.
- Original specification and backend addendum are present. The canonical integrated sections contain approved amendments, so the new labels describe integration rather than literal embedding. Both badge addenda are retained as exact source text in the integrated master.
- All 79 Locked requirements, 20 original Open questions, 55 amendment records, 35 current-owner keys and 38 issue IDs are represented in the register. No tracker reference points to a nonexistent project issue. An `/issues/14748` reference belongs to an external repository and was not falsely classified as a missing project issue.
- No exact duplicate document bodies or duplicate JSON object keys were found. Intentional embedded sources and historical snapshots were retained.

### Supplied archive/PDF results

| Supplied item | Integrity / content | Limit |
|---|---|---|
| `02-Espresso_Recommendation_Engine_Handoff.zip` | 4,487 bytes; SHA-256 `2e25aba03d35bbf27a9ea4e8c811fc6e24bcc1671893cba8bd7f2726ea9b5f99`; five members; ZIP check and four listed checksums pass. | Research instructions and a manifest naming nine source files; README explicitly states original bytes are absent. |
| `03-Espresso_Recommendation_Engine_Available_Archive_2026-08-21.zip` | 28,769 bytes; SHA-256 `91f275c1dcc7c18f3f2b1f70d992ea6757754fb06acd24ff5cd6c5ba4573b62c`; 21 members; ZIP check and 20 listed checksums pass. | Twelve partial project-chat user excerpts, reference JSONs rather than nine report bodies, explicit limitations, and an intentional duplicate of the earlier handoff. |
| `04-Espresso-Extraction-Windows-by-Roast-Level-and-Shot-Style.pdf` | 161,894 bytes; SHA-256 `d4d9cc5b41e3ac25fc6840b65e11cc8df9e3f32759a5831c992c448723bcabb6`; all 15 pages read. | Secondary synthesis with 20 roast/style cells, confidence/source labels and explicitly inferred time bands. It is not the nine originals and does not supersede the later seven-roast labels or existing Locked numeric defaults. |

The failed `dial-in-collective.jsx` transfer was not inspected. The prior five conversation PDF exports named in GitHub are not local attachments in this turn. The available archive explicitly does not contain full chat transcripts. The correct completion statement is that all **accessible recorded requirements and metadata** were reconciled, with these gaps retained; no tool can truthfully recover text it cannot access or certify unseen messages.

## Workflow improvements to prevent recurrence

1. **One compact current execution record.** Keep branch roles, tested application SHA, actual production SHA, provider migration versions, consumed grant, acceptance state and next action in one machine-readable current record. Current Status and AGENTS should link it rather than independently repeating stale versions. The historical journal remains append-only evidence.
2. **Keep requirement status separate from delivery status.** “Locked” means owner policy, not shipped. Track approved, implemented, tested, deployed and accepted independently, with exact source/receipt references. Do not place “NOT deployed” inside a timeless requirement sentence without a checkpoint date.
3. **Reconcile at a milestone in the same change.** When a release/acceptance is verified, update the current execution record, affected approval flags and current issue leads together. An accurate comment buried below a stale body is insufficient for reliable continuation.
4. **Reuse evidence by exact relevant source and scenario.** Preserve owner device receipts and historical failures. Repeat a check only if code/data relevant to that check changed, the earlier evidence does not cover the needed scenario, or an observed regression demands it. Netlify READY cannot replace device acceptance; missing new acceptance cannot invalidate unrelated previously passed cases.
5. **Use one root writer and explicit ownership.** Concurrent auditors can read/test isolated tasks, while the root serializes canonical status and remote writes. Check the expected branch head before committing, then verify the actual remote parent/tree/changed files. A later handoff must state partial failures, not merely success labels.
6. **Keep source/provider migration mapping explicit.** Record source filename, exact SQL body and actual provider-assigned version together. Existing mappings prevent duplicate application. Never infer pending SQL from a filename timestamp alone.
7. **Check durable links when archiving.** Moving a dated file changes its relative-link base. Rebase destinations while preserving labels/prose, and verify those targets once. Do not add replacement copies of the same source merely to make a broken link work.
8. **State the real finish line early.** An audit can finish with fixed confirmed defects and a truthful residual backlog; a specification-complete app still requires its unfinished implementations and distinct live acceptance. Do not promise an error-free future or infer unlimited production authority from a request for perfection.

These changes reduce duplicate instructions and repeat work without deleting historical context or relaxing owner controls. Advisory CI can detect consistency regressions for cooperating contributors; it still cannot prevent every direct Git/provider administrator action on this private Free setup.

## Preserved audit artifacts

- [Requirement register](2026-10-21-requirement-traceability.md) and [complete source-record JSON](2026-10-21-requirement-traceability.json).
- [Exact status-reconciliation proposals](2026-10-21-status-reconciliation-proposals.json): 29 ledger execution fields, three approval contracts, four coverage flags and scoped issue lead changes. These preserve the proposed old/new values at the review checkpoint; the current canonical records show the integrated result.
- [Original link destination mappings](2026-10-21-link-replacements.json) and [history reviewer's applied-document repair hashes](2026-10-21-applied-document-repairs.json). The hash manifest covers the 234 reviewer-owned link repairs and two provenance-label corrections; the active journal's separate correction is in its own commit history.
- [Recovered document inventory](2026-10-21-document-inventory.json), [original structural findings](2026-10-21-original-structural-findings.json) and [supplied attachment manifest](2026-10-21-supplied-attachments-manifest.json). The original structural findings are pre-repair evidence. Attachment paths identify supplied source filenames, not repository files.
- [Integrated original-specification comparison](2026-10-21-integrated-original-specification.diff) and [integrated backend-addendum comparison](2026-10-21-integrated-backend-addendum.diff). These comparisons explain why literal-preservation labels were inaccurate; they do not authorize new requirement changes.
- [Independent SQL review](2026-10-21-independent-sql-review.md) and [independent application review](2026-10-21-independent-application-review.md), including the additional defects found during the third-pass cross-review.

### Integration boundary

This is a dated audit and source-repair record. Resume from [Current Status](../CURRENT_STATUS.md), the [active work journal](../ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md) and actual branch/provider readbacks. The findings table preserves what was stale when recovered, together with its assigned disposition; it is not a fresh instruction to repeat those repairs or reuse a release grant. Final integration, CI and GitHub-write receipts belong to the current work journal. No new production release, SQL migration, member-data write or paid action is necessary to publish this documentation audit.

## Concurrent delta reviewed after the initial three-pass inventory

A separate chat advanced development to `3e8806ddff5247a4042e970309b6ea5a10195f91` (parent `0a9646a5348de58fba4f8bf13a31ff8fa52ab8bd`) while this audit ran. The root recovered incoming files without overwriting them. The complete body of newly opened [issue #47](https://github.com/Schulzet3/The-Dial-In-Collective/issues/47) was then reviewed in full and retained in the companion traceability JSON; it had zero comments at fetch. The initial 38-issue/915-commit inventory remains explicitly date-scoped, with this additional request recorded separately in the traceability register.

Issue #47 records predeployment-only admin dashboard ordering, complete drill-down listings, creator attribution, coffee/member-shot editing and optional source enrichment. It also records the owner's asserted consent for non-password data access, while the issue itself requires a narrow canonical reconciliation of existing private-member data rules. The partially staged admin explorer is not a complete authorized live implementation: audited RPC, pagination, revision/permission contracts and the precise privacy supersession remain to be established. Link its overlap with #23/#43 rather than building duplicate review controls, preserve incoming source and the current private-data boundary, and do not consume the old release again.
