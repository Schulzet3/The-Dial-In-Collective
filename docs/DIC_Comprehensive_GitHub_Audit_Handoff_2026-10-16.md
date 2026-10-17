# The Dial In Collective
## Comprehensive GitHub Gap Audit and Cross-Session Handoff

## Latest reconciliation and authorized tracking October 17 UTC

**Read [CURRENT_STATUS](CURRENT_STATUS.md) and the [reconciled backlog](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md) before this original snapshot.** The owner subsequently authorized issue creation: 23 scoped issues #8–#30 now exist alongside updated #5 (24 open at the read-back checkpoint). The original “NOT YET CREATED”, no-issues authorization and one-open-issue statements below refer to the earlier audit date, not today's tracking.

The exact Hambela shot was later permanently purged; [verified results](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md) supersede the hide-only/16-retained-row snapshot for that operation. Fifteen stored/visible shots remain, all 14 legacy shots and community contribution were preserved. Do not repeat that deletion or infer a general purge UI requirement.

All 26 findings have been reconciled against newer GitHub source and classified as implementation gaps, source-level risks, Open choices or acceptance/provider evidence limits. [Twenty original Open topics](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) are crosswalked without new approvals. G14 is not a reproduced iPhone failure; G22 is not proof provider settings are broken; safe Pending coffee does not itself indicate a failed verifier.

The following audit body is preserved as **historical evidence**, including its original pinned SHAs, issue counts and no-production-test qualification. Its missing-feature findings remain tracked; backlog creation and documentation/comment corrections do not implement them.

## Original audit snapshot retained


**Prepared:** October 16, 2026 (America/Denver; some repository commits are dated October 17 UTC)  
**Project:** The Dial In Collective  
**Repository:** [Schulzet3/The-Dial-In-Collective](https://github.com/Schulzet3/The-Dial-In-Collective) (private; requires an authorized GitHub connection)  
**Purpose:** Transfer the repository audit, confirmed gaps, acceptance limitations, remaining decisions, sources and suggested execution plan to a new ChatGPT chat or Work session without losing the project's Locked decisions or repeating completed work.  
**Audit method:** Read-only GitHub connector inspection, including complete recursive development tree, commit history, branches, current canonical documents, code, migrations, workflows, issue/PR records and Actions metadata, cross-referenced against the project's original requirements retrieved during the audit.  
**Change control:** This handoff is **not** an authorization to create GitHub issues, merge branches, deploy, migrate a database, change permissions, incur charges or edit production data.

> **Authority rule:** The canonical [Master Specification](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md) and [Decision Ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json), interpreted with the latest explicit product-owner approvals and narrowly scoped supersessions, outrank this audit. This handoff identifies gaps and recommends work; it does **not** silently create new requirements or supersede any Locked decision.

---

## 1. READ THIS FIRST: Exact Resume Instructions

1. **Reconnect to the private GitHub repository**, using the connected GitHub integration if possible. Read the **actual branch refs** before assuming these pinned SHAs are still heads.
2. Work on **`development/backend-foundation`** for current application code and documentation. The default **`main`** branch holds backup/recovery operations; it is **not** the current app source. **Do not merge the app into `main`.**
3. Read, in order: [`docs/CURRENT_STATUS.md`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/CURRENT_STATUS.md), [`docs/MASTER_SPECIFICATION.md`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md), [`docs/DECISION_LEDGER.json`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json), [`docs/README.md`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/README.md), then this document.
4. Distinguish **source code existing**, **automated tests passing**, **deployed in production**, **real-user acceptance passing** and **fully complete against the specification**. These are different statuses.
5. Preserve the already-passed hosted recovery, account-isolation, first Wuri private-save, SMTP, DNS and prior backup acceptance results. Do not repeat them unless there has been a change or a specifically different test case.
6. Ask product questions **one at a time**. The current checkpoint names the daily URL-preview cap (25 versus 10) first; the proposed roast-level taxonomy comes separately. Neither may be adopted without approval.
7. Before any write, deployment or paid operation, obtain clear scope/approval and preserve the deliberate release and Netlify credit gates. For any new product decision, update **both** canonical specification and ledger with a supersession trail.

### Pinned state at the time of the audit

| Component | Exact checkpoint / evidence | Meaning |
|---|---|---|
| Application + documentation branch | `development/backend-foundation` head `c1e8d3175be836b4a7fc92d731729583e7ebe55d` | Current audited tree; documentation consolidation only after the latest app changes |
| Backup/operations branch | `main` head `3a14382169f18f4553efbfac24f795c9e198978c` | Default-branch README/AGENTS point to active development docs; backup files intentionally separate |
| Development recursive tree | **189 entries**, `truncated=false` | Complete directory inventory was returned; this is not a claim that every possible runtime path was executed |
| Last tested extractor implementation | `3b98b086babeff2b47a4d218ecd4c1fee02887ff`; [Actions run 38994786401](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38994786401) | GitHub build/test run succeeded; prior project evidence records **226/226 Node tests passing**; extractor revision still **unpublished** |
| Recorded production frontend | Netlify deploy `6ad2c872ad7a8fa78dc410dc`; published source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8` | Previous provider read-back documented `READY`; **not independently rechecked against Netlify in this audit** |
| Current source of truth | Consolidated `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, `docs/CURRENT_STATUS.md` | Documentation-consolidation [commit c1e8d3175](https://github.com/Schulzet3/The-Dial-In-Collective/commit/c1e8d3175be836b4a7fc92d731729583e7ebe55d) |
| GitHub work tracking | **1 open issue** ([#5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5)); **0 open PRs**; six inspected PRs previously merged | Current issue coverage is inadequate for the known outstanding product work |
| GitHub backup pin | `main:.github/workflows/nightly-backup.yml` checks out published source SHA `f08dfda...` | Keep this pinned to the **verified production** release until the next authorized release |
| Application | [app.dialincollective.com](https://app.dialincollective.com) | Hosted application; do not assume latest development code is published |

**Freshness warning:** A subsequent session must reread live branch refs, PR/issue lists, workflow status and provider releases before treating this checkpoint as current. UTC October 17 commit dates are October 16 local project activity, not evidence of a future deployment.

---

## 2. Evidence and Confidence Labels

- **CODE-CONFIRMED:** Directly evident in the audited source/tree at immutable `c1e8d3175...` or the cited existing published code. A missing frontend path is not proof that no private operator procedure exists.
- **RECORDED PASS:** A historical acceptance, database check, provider read-back or owner's confirmation explicitly documented in the project's current-status/evidence files. Do not recast it as a new independent check by this audit.
- **PARTIAL / NOT ACCEPTED:** Some implementation or synthetic test evidence exists, but a distinct live-user, production, offline or adversarial test remains.
- **NOT VERIFIED:** Source or connected providers did not supply sufficient evidence. This does **not** mean the configuration is broken.
- **OPEN DECISION:** The owner has not approved a proposed change. Existing behavior and Locked constraints stay in place.
- **PROPOSED PRIORITY:** An audit recommendation for triage, not a new Locked deadline or launch requirement.

This audit read GitHub and project-supplied source material; it did **not** run local `npm test`, deploy anything, perform an intrusive security test or independently query current production Netlify/Supabase/Cloudflare/Resend/Apps Script settings. GitHub Actions run status was fetched directly; detailed test counts were corroborated by project evidence rather than replayed in this session.

---

## 3. Executive Summary

**The project is not being rebuilt and its foundational hosted beta works.** Email/password authentication, beta invitations, verified account separation, a working Log Shot -> Rate -> Recommendation sequence, backups and a full hosted recovery drill have passed their specifically documented scopes. A genuine non-admin member also previewed and privately saved a Sweet Bloom Wuri coffee; its identity appropriately remained Pending rather than being prematurely promoted to Verified.

**However, meaningful gaps remain between the Locked product requirements and the current shipped application.** The most significant are:

1. The community UI remains an explicit placeholder; the underlying community eligibility/aggregation pipeline and recommendation evidence hierarchy are incomplete.
2. The engine contains experiment/family functions, but the hosted shot-saving interface lacks the specified experiment confirmation/continuation lifecycle and alternate-recipe management.
3. `Custom` shot style is defined in the engine but filtered out of the hosted style picker.
4. Bag management, advanced basket workflow, recommended style at new-coffee entry, screenshot/optional Claude BYOK extraction and personal shot hide/delete controls are absent or unexposed in the reviewed hosted UI.
5. The current build does not ship a web app manifest or service worker. IndexedDB queueing exists, but an offline cold open can be blocked by the network-dependent admission request before cache hydration. Full PWA/offline behavior is **not accepted**.
6. Admin conflict review and invitation controls are only partially built: the dashboard is intentionally read-only.
7. The improved generic roaster/roast-graphic parser passed development tests, **but the new graphic-extraction revision is not deployed**. Genuine unknown-roaster, trusted Verified promotion and ambiguous-release cases still require acceptance.
8. Several operational/security settings cannot be certified through available provider access; the GitHub issue tracker does not reflect the actual outstanding work.
9. The newest canonical documentation consolidation fixes major earlier README/handoff inconsistencies, but some historical source comments and issue text still reflect superseded operational arrangements.

**Recommended approach:** Preserve the successful beta and recovery work; build a traceable backlog against the Locked specification; close missing core/learning workflows before promising a complete community-powered recommendation product. Avoid unnecessary production releases and do not invent community evidence or research sources.

---

## 4. Completed Work: Do Not Accidentally Reopen

These are **RECORDED PASS**, not newly rerun acceptance tests.

| Area | Completed, exact scope | Do not infer |
|---|---|---|
| Core owner use | Real owner tested Log Shot -> Rate -> Recommendation, persisted reload and fresh sign-in/out | Every recipe style, experiment, offline or community tier is complete |
| Beta account admission | Confirmed second email account, single-use invitation redemption, Supabase admitted membership | Every external-invite edge case or admin workflow is tested |
| Non-admin isolation | Owner saw empty second-member workspace, no first-account coffee/shot history, and `Admin Access Unavailable` at direct admin URL | Adversarial HTTP/API audit and every row policy were exercised in a browser |
| Netlify front-door login | Extra production Netlify login removed with owner approval; preview SSO remains | Application Supabase authorization was removed (it was **not**) |
| Wuri URL input | Real admitted non-admin successfully previewed and saved `https://sweetbloomcoffee.com/products/wuri` with sourced fields; roast manually chosen Light; private Pending | Roast graphic recognized correctly, coffee publicly Verified or new parser revision deployed |
| Canonical original coffee catalog | Historical status reports four owner Verified coffees | Every future coffee is automatically source-verified |
| Owner shot cleanup | Owner approved hiding **one** specific Hambela shot via audited canonical mutation; historical read-back: 15 visible/16 retained records | Hard deletion occurred, other shots may be hidden, or frontend Hide UI exists |
| Source and data safeguards | Historical import completed under a one-use owner-only exception; saving re-locked; source/backup provenance preserved | Historical import should be generally reopened |
| SMTP/domain | Owner received genuine account confirmation and password-reset mail; custom app domain, apex redirect and support email delivery tested | Provider settings freshly rechecked in this audit |
| Nightly encrypted backups | Prior scheduled GitHub artifact exports independently matched private Drive copies; 30-day GitHub artifact retention configured | Every future Drive delivery and authentic failure alert will automatically succeed |
| Exact archive restore | Selected encrypted backup decrypted and restored to fresh isolated PostgreSQL; first-party/Auth table streams and safeguards checked | Provider settings are captured by PostgreSQL dump alone |
| Managed hosted recovery | New temporary Supabase + protected Netlify recovery rebuilt with archived Auth/admin; owner signed in and saw archived data; temporary infrastructure later removed | DNS-provider cutover or every possible failure scenario was tested |
| DNS readiness | Prior 11-record zone export checked against recovery packet | Registrar/nameserver cutover was actually performed |
| Alerting | Test alert email received; daily read-only backup watchdog recorded enabled | Actual backup failure, Apps Script trigger death or notification delivery in all circumstances proven |

**Historical data snapshot:** Two confirmed/admitted accounts with one admin; the admin's four original coffees; 16 retained owner shot rows with 15 visible after the single hide; a separate non-admin Wuri Pending coffee. Counts are **historical** and must not be presented as a fresh live query.

Detailed source: [`docs/CURRENT_STATUS.md`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/docs/CURRENT_STATUS.md) and the reports indexed in [`docs/README.md`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/docs/README.md).

---

## 5. Detailed Gap Register

Below, **P0/P1/P2** are **suggested** triage priority levels only: P0 = core product correctness/value or beta-safety acceptance; P1 = Locked feature parity and important usability; P2 = operational hardening, documentation, future scale. They are not approval to work out of sequence or a claim all P0 items block the existing private beta.

### G01 | Community screen is a placeholder — P0 — CODE-CONFIRMED

- **Evidence:** [`site/cloud/main.js` lines 94-101 and 271](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L94-L101). Clicking Community opens text explicitly saying **"Community is not available in this private beta yet."**
- **Required outcome:** Per Locked spec Sections 22-23, admitted members should eventually browse anonymized qualifying Community Shots and appropriate coffee/style aggregates, with separate shot/contributor counts and carefully calibrated confidence descriptions.
- **Nuance:** Database tables and an in-memory `communitySummary()` function exist. Those do not make the community experience wired into the hosted frontend.
- **Acceptance:** Genuine two-account, source-verified coffee fixtures; green versus non-green eligibility, privacy, no public raw notes/identifiers; distinct contributors; display and confidence evidence; negative pending coffee checks.

### G02 | Community quality/eligibility promotion appears unfinished — P0 — CODE-CONFIRMED SOURCE GAP, LIVE PATH NOT CERTIFIED

- **Evidence:** [`20261012015600_dic_shots_recipes_community.sql` around lines 93-110, 155-157, 188-224](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/supabase/migrations/20261012015600_dic_shots_recipes_community.sql#L93-L110) creates projected records with `quality_state='pending_quality'`; member RLS permits **only** `eligible`. Reviewed migrations and the two identified Edge functions did not show a full validated `pending_quality` -> `eligible` quality/release/consent workflow.
- **Impact:** Even green successful shots can remain unavailable for community learning. Marking everything eligible would be unsafe and contradict privacy, outlier and identity decisions.
- **Acceptance:** Deterministic server-owned eligibility checks; only verified, correctly attributed coffees/releases; privacy-preserving contributor links; outlier quarantine/confirmation; edited shot re-projection; account deletion durability rules; audited and idempotent transitions; no private notes leak.
- **Verification qualification:** Inspect **current live migration/function/catalog** before concluding there is no separately deployed worker not reflected in GitHub. No such worker was identified by this source audit.

### G03 | Full recommendation evidence hierarchy is not wired — P0 — PARTIAL

- **Evidence:** [`site/lib/engine.js` lines 90-192](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/engine.js#L90-L192) uses personal exact-family data, weak same-coffee/cross-style adjustment, personal similar-coffee references and baseline priors. [`communitySummary()` lines 278-287](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/engine.js#L278-L287) exists but is not integrated into this recommendation path.
- **Locked spec:** Section 25.2 prioritizes personal exact-coffee/setup/style successes, same-coffee evidence, exact-coffee community, related releases, personal similar coffee/same setup, similar-coffee community, roast/style/equipment priors, and generic fallback, with measurement-specific caveats and roaster published recipes.
- **Missing or not proven:** Exact-coffee community aggregates; related-release evidence; similar-coffee community data; contributor-balanced weighting in recommendations; source-specific confidence/provenance; preference-aware choice among genuinely distinct successful families.
- **Acceptance:** Controlled data fixtures where each evidence tier wins only when appropriate; no fake community confidence; grinder calibration/same-hardware safeguards; empty or single-contributor fallbacks; explicit source/rationale displays; performance budget compatible with fast logging.

### G04 | Experiment initiation and lifecycle are not offered through hosted shot UI — P0 — CODE-CONFIRMED

- **Evidence:** [`site/lib/engine.js` lines 220-276](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/engine.js#L220-L276) includes detection and `startExperiment`/`endExperiment` locally; SQL has experiment tables. [`site/cloud/main.js` shot submission, lines 307-312](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L307-L312) simply saves, closes and displays confirmation. No post-rating experiment prompt/confirmation/active panel is wired in that hosted UI.
- **Locked behavior:** Meaningful threshold crossing offers an experiment **after rating**; user confirms; established recipe remains; successive shots stay within active experiment; candidate and confirmation lifecycle; End Experiment returns to existing preferred family; a successful alternate stays eligible even if not preferred.
- **Acceptance:** Real/synthetic multi-shot before/after; decline/no-experiment outcome; active experiment continuity across sync/reload; candidate/second success, promotion, return-to-old, privacy and concurrency. **Do not invent** previously Open threshold-baseline semantics without canonical reconciliation.

### G05 | Alternate recipe families and preferred recipe management incomplete in UI — P0/P1 — PARTIAL

- **Evidence:** [`site/cloud/main.js` lines 98-100](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L98-L100) displays one recipe grid; [`site/cloud/shot_card.js` lines 30-35](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/shot_card.js#L30-L35) exposes Make Current Recipe on eligible shots; no obvious collapsed alternate-family gallery or preference-aware family selection is presented.
- **Needed:** Confirm actual recipe-family keying/window accuracy across setup/version, style and successful approach; show current family versus alternate families without crowding everyday UI; explain Make Current Recipe semantics using latest Locked decisions and resolved amendments.
- **Acceptance:** Two materially distinct green recipe approaches stay separate, successful windows use robust centerpoints, alternate remains accessible, current stays clear and robust after editing or hiding shots.

### G06 | `Custom` shot style excluded from hosted selector — P1 — CODE-CONFIRMED

- **Evidence:** [`site/lib/constants.js` line 3](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/constants.js#L3) defines Traditional, Turbo, Ristretto, Lungo and Custom; [`site/cloud/main.js` line 269](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L269) explicitly calls `C.STYLES.filter(s=>s!=='Custom')`.
- **Acceptance:** Offer the Locked Custom style with coherent user-provided starting windows, persistence, validation and no automatic numeric reclassification. Preserve the fast default style flow.

### G07 | Bag lifecycle is not exposed — P1 — CODE-CONFIRMED

- **Evidence:** [`site/cloud/mapping.js` lines 24-29](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/mapping.js#L24-L29) hydrates coffees with `bags:[]` and `activeBagId:null`; `site/cloud/main.js` contains no Roast Date, Frozen/New Bag routine.
- **Locked behavior:** Optional roast date and Frozen inside expanded Bag Details; Frozen pauses age-related suggestions; New Bag archives previous active bag by default and carries forward the coffee-level recipe/window as a starting reference.
- **Acceptance:** Genuine bag creation, switching, frozen semantics, time/age logic, migration of archived shot associations, correct new-bag recipe continuity, no accidental fresh shot reassignment.

### G08 | Advanced basket/equipment workflow partial — P1 — CODE-CONFIRMED

- **Evidence:** [`site/cloud/main.js` lines 103-137, 185-188 and 307-310](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L103-L137) exposes basic Setup creation, rename, additional setup and some advanced switches; the shot out-of-basket-dose confirmation explicitly says changing the basket record is **"not connected in this development screen yet."**
- **Needed:** All previously agreed basket creation/correction/archive/selection and historical versions; separate real dose from Basket Dose; maintain immutable hardware snapshots and no retroactive changes to old shots.
- **Acceptance:** Multiple setup versions/baskets, edited Basket Dose history, archived basket behavior, correct recommendation/prefill per coffee and setup, SQL/RLS tests, real owner UI.

### G09 | Grinder direction/range assumptions require reconciliation — P1 — OPEN BASELINE SEMANTICS

- **Evidence:** [`site/lib/model.js` lines 21-37](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/model.js#L21-L37) assumes `Coarsest > Finest`; [`site/lib/engine.js` lines 201-216](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/engine.js#L201-L216) moves grind lower to go finer. The original ledger explicitly listed higher=finer, multi-turn/wraparound and step granularity as an Open question.
- **Impact:** Direction/scale errors can make a next-shot recommendation wrong for a nonstandard grinder.
- **Next step:** Confirm current later owner decision, if any, before specifying scale UX; build calibration and direction-aware tests. Do **not** silently replace the existing scale.

### G10 | Screenshot and device-local optional Claude extraction not present in hosted Add Coffee UI — P1 — CODE-CONFIRMED UI GAP

- **Evidence:** [`site/cloud/main.js` lines 139-153](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L139-L153) exposes public HTTPS roaster URL lookup plus manual fields. No screenshot upload/extraction or device-local Claude BYOK UI is wired there.
- **Locked scope:** URL and/or screenshots are primary coffee inputs; Claude is optional BYOK stored only on device; no AI key is required for logging or deterministic recommendations; preserve screenshot minimization/discard requirements.
- **Acceptance:** Owner-approved UX, permission/key management, secure local handling, extraction confidence/missing facts review, no hidden paid API or server-stored key, manual Pending fallback. **Do not claim OCR/Claude already exists.**

### G11 | Suggested shot style on Add Coffee does not appear integrated — P1 — CODE-CONFIRMED UI GAP

- **Evidence:** [`site/lib/engine.js` lines 13-20](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/lib/engine.js#L13-L20) has `suggestedStyle`; Add Coffee hosted form and submission routine in `site/cloud/main.js` do not display `Recommended for you` or a starting style explanation at entry.
- **Locked behavior:** Preselect a recommended style on new coffee with a one-line explanation while allowing choice; style ranges are guidelines rather than pass/fail rules.
- **Acceptance:** Cross-roast/preference fixtures and real Add Coffee flow, no style inference presented as a verified coffee fact.

### G12 | User-facing shot Hide/Delete controls are absent from history — P1 — CODE-CONFIRMED UI GAP

- **Evidence:** [`site/cloud/shot_card.js` lines 26-35](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/shot_card.js#L26-L35) offers Edit and Make Current Recipe, not Hide/Delete; [`site/cloud/outbox.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/outbox.js) already lists a `hide_shot` mutation, and a real one-shot owner hide was performed safely at the backend.
- **Needed:** Decide and faithfully implement current Locked personal hide/delete semantics and durable anonymized community contribution handling; preserve audits/revisions, accessible confirmations and undo if approved.
- **Acceptance:** Exactly one target shot changes state; other records remain; personal recommendations/windows recompute; community durability/withdraw rules follow the canonical decision and server enforcement; offline queued writes safe.

### G13 | No installable/offline application shell in reviewed release build — P0/P1 — CODE-CONFIRMED

- **Evidence:** [`build_cloud.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/build_cloud.mjs) builds a fixed file allowlist without `.webmanifest`, service worker or offline shell. [`site/cloud.html`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud.html) does not link a manifest or register a service worker. The complete recursive tree did not include a generated manifest/SW source.
- **Caveat:** A still-open, already-loaded tab may support queuing offline shots via IndexedDB; that does not prove installability or a fresh offline reopen. iOS home-screen capability can differ from standards-based install prompts.
- **Acceptance:** Approved mobile-first PWA install/shell design, exact cache and update strategy, stable authenticated offline reload, offline log/rate, later sync, no cache leakage between users and no stale-auth privilege extension. Real iPhone Safari/Home Screen testing required.

### G14 | Offline cold-open may fail before cached workspace is hydrated — P0/P1 — SOURCE-LEVEL RISK

- **Evidence:** [`site/cloud/main.js` lines 24-42](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L24-L42): `connect()` awaits a remote `client.status()` before loading local `readCache()`. On an offline status failure, it jumps to catch with `this.status` unset; the render path requires admitted `this.status`.
- **Status:** Code path strongly indicates offline re-opening and cached workspace display need design/fix. Not empirically reproduced here on a real offline iPhone.
- **Acceptance:** Previously admitted signed-in user, valid owner-scoped cache, app relaunched with all networking off; coffees/history available without treating stale cached admission as a server privilege proof; offline shot queued safely; user switching and revoked-membership behavior handled conservatively.

### G15 | Multi-device sync/conflict behavior lacks real acceptance — P0/P1 — PARTIAL

- **Evidence:** [`site/cloud/outbox.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/outbox.js) persists mutations with immutable IDs, recognizes conflict/rejected status and retains them; [`site/cloud/main.js` lines 43-74, 271-275](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/cloud/main.js#L43-L74) handles owner-scoped sync and shows Sync Details. Tests are mainly synthetic.
- **Unverified:** Genuine iPhone offline -> reconnect, simultaneous device edits, stale revisions, account switch while request in flight, logout with pending writes, conflict resolution/visibility and accessibility.
- **Acceptance:** Two real devices plus network interruption, no lost or cross-account writes, clear conflict handling without silent overwrite, correct recommendation after replay, owner can export pending changes if blocked.

### G16 | Admin dashboard is read-only; moderation and invites not operational — P0/P1 — CODE-CONFIRMED

- **Evidence:** [`site/admin/main.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/admin/main.js) only authenticates, calls `dic_admin_dashboard`, refreshes; [`site/admin/view.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/site/admin/view.js) explicitly states review-only, with no Approval/Merge/Invite rotation/abuse actions.
- **Nuance:** An admin-own-coffee approval RPC exists in SQL; that is distinct from a safe high-signal queue for genuine member submissions and management controls.
- **Acceptance:** Authenticated non-admin denial, safe admin queue decisions, audit log/provenance, conflicting releases cannot silently merge, invitation issuance/revocation with scoped permissions, paginated queue (UI currently says first 50), rollback/integrity tests.

### G17 | New-member coffee verification lifecycle incomplete; Issue #5 still open — P0/P1 — PARTIAL

- **Evidence:** [GitHub issue #5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5) remains OPEN. Previously merged [PR #4](https://github.com/Schulzet3/The-Dial-In-Collective/pull/4) handles roaster aliases; [PR #6](https://github.com/Schulzet3/The-Dial-In-Collective/pull/6) builds trusted verification foundation. The real Wuri member URL preview and private save succeeded but **remained Pending**.
- **Needed:** Reconcile issue #5's original acceptance criteria against already implemented verifier paths, then complete/measure actual new-release official-source verification, release conflicts, trusted host checks, idempotent re-association preserving shot IDs and user-resolvable ambiguity. Recheck actual live behavior before declaring automatic Verified success.
- **Stale issue caveat:** Issue #5 still contains historical release wording to keep Netlify SSO; the later approved decision removed extra SSO **only in production**. Do not reinstate it based on the old issue.

### G18 | Improved roast graphic extraction tested but not yet deployed/accepted — P1 — PARTIAL

- **Evidence:** [`src/server/roast-level-evidence.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/src/server/roast-level-evidence.mjs), current tests and [source/extraction report](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/docs/COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md). Development run 38994786401 passed; production remains on earlier `f08df...` SHA.
- **Scope:** Parser attempts explicit accessible ALT/ARIA/SVG states, product metadata and labeled sections; ambiguous graphics or mixed process labels must remain manual-review hints/blank, not fabricated classifications. It does not fetch arbitrary images or use Claude.
- **Acceptance:** After **separately authorized** deployment, real Wuri graphic test on the actual page DOM, unknown-roaster URL, reused URL with new harvest, non-admin admitted quota path, manual Pending fallback, and no weakening of existing security.

### G19 | Daily URL lookup cap is an owner decision, not a code defect — OPEN DECISION

- **Recorded current behavior:** Shared account-wide **at least 30 seconds** between known/unknown-roaster previews is **Locked**. The current daily implementation allows **60 previews per rolling 24 hours**.
- **Open owner decision:** **25 versus 10** daily previews. The prior implementation's 25/day was not silently reinstated; both 25 and 10 remain unapproved proposals.
- **Next step:** Ask this **one** question first if resuming product decisions. Once decided, update Master Specification + Decision Ledger, preserve supersession scope, implement/test through deliberate release process. Never weaken the 30-second cooldown without separate explicit approval.

### G20 | Proposed roast-level taxonomy is not adopted — OPEN DECISION

- **Current choices:** Light / Light-Medium / Medium / Medium-Dark / Dark.
- **Proposed, not Locked:** Ultra Light / Light / Medium Light / Medium / Medium Dark / Dark (six tiers). This affects validation, migrations, engine roast maps, saved coffee data and UI.
- **Next step:** Ask separately after resolving the daily preview cap. Do not coerce unknown or ambiguous source roast graphics into a false category.

### G21 | Accessibility, real iPhone and alternative-state UI not fully verified — P1/P2 — NOT ACCEPTED

- **Evidence:** Synthetic 390px Chromium mobile QA and visual-review scripts exist in [`tests/browser`](https://github.com/Schulzet3/The-Dial-In-Collective/tree/c1e8d3175be836b4a7fc92d731729583e7ebe55d/tests/browser), but are not a genuine iPhone/PWA/accessibility suite.
- **Acceptance:** VoiceOver focus/announcements, inline sheet and form errors, touch targets, reduced motion, orientation/safe areas, keyboard navigation, contrast under Locked badges and no-text-shadow design, live offline/sync states and one-handed fastest logging. Avoid unapproved aesthetic redesign.

### G22 | Security/provider/monitoring evidence gaps remain — P2 — NOT VERIFIED, NOT KNOWN BROKEN

- **GitHub:** Branch-protection GET was restricted (`403 Resource not accessible by integration` in prior consolidation); repository rulesets GET returned 403 plan/visibility restriction. Required status checks/reviews cannot be certified.
- **Netlify:** Readable source/build guard requires deliberate release-marker and fresh verified credit snapshot. Current live billing, manual build-hook permissions and provider-side Git build settings were not independently accessible. A manual deploy may bypass the source guard.
- **Supabase Auth:** Historical advisor showed leaked-password protection disabled; plan/settings need read-only review before any approved change. Previous RLS and account isolation checks passed their tested scopes.
- **Cloudflare/Resend:** Prior domain/SMTP functionality passed; current DNS, DNSSEC, mail configuration and recovery-only sending key revocation are not freshly inspectable (revocation owner-reported).
- **Apps Script courier:** Live trigger health, script properties/token expiry and authentic failure/staleness notification not inspected. Synthetic test mail received; the script cannot alert on its own total trigger failure.
- **Backup:** Prior scheduled GitHub->Drive byte match and hosted restore passed. Monitor retention, fresh backups and last successful courier receipt. Do not sabotage the real backup to induce a failure.
- **Optional domain hygiene:** Prior zone export lacked a visible `_dmarc` record. This is a security/deliverability follow-up, not proof of failed email.

### G23 | Visual-review CI is not continuously triggered on the active development branch — P2 — CODE-CONFIRMED

- **Evidence:** [`.github/workflows/visual-review.yml`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/.github/workflows/visual-review.yml) auto-triggers only for `work/visual-refresh-20261015` and manual dispatch. The separate cloud app build/UX checks do run on qualifying development changes.
- **Recommendation:** Add a cost-aware visual/integrity regression to the normal reviewed release gate after approval; distinguish existing synthetic QA from real-device acceptance. Don't enable unrestricted Netlify previews or publishing merely for screenshots.

### G24 | Task tracking and outdated operational comments — P2 — CODE-CONFIRMED

- **Current issue count:** One open issue, zero open PRs at audit time, despite these documented gaps. Six historical PRs were merged into development; remaining work/old branches are not automatically missing work.
- **New documentation:** [commit c1e8d3175](https://github.com/Schulzet3/The-Dial-In-Collective/commit/c1e8d3175be836b4a7fc92d731729583e7ebe55d) corrected older README/status conflicts; [`main` navigation commit 3a143821](https://github.com/Schulzet3/The-Dial-In-Collective/commit/3a14382169f18f4553efbfac24f795c9e198978c) now points readers to the active branch.
- **Still stale historical language:** [`netlify.toml`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/netlify.toml) comments say keep Netlify SSO required and do not invite beta users, despite subsequently approved production login removal and a verified second member. Issue #5 also has outdated SSO language. These comments are not current access policy.
- **Recommendation:** Owner-approved issue/backlog synchronization with links to canonical spec sections; clearly mark implemented, production-accepted, untested, Open or Deferred. Use documentation-only commits without release markers where allowed.

### G25 | Research/prototype source completeness is limited — P2 — NOT VERIFIED

- **Recorded limit:** Nine original recommendation-engine research report bodies referenced in August archives are **not present** in the available archive; manifests/pointers are not the research content. A historical v0.2.0 prototype workshop addendum was also not recovered as a standalone source.
- **Consequence:** Do not claim independent revalidation of their scientific conclusions, fill gaps with invented study references or silently recreate missing owner decisions. Existing preserved original Master Specification, its approved amendments and the project evidence remain authoritative.
- **Useful future work:** Obtain actual research bodies when possible; tag evidence quality, roast/style rationale and citation/provenance for recommendation design separately from speculative claims.

### G26 | Baseline Open questions and current scope need explicit crosswalk — P2 — PARTIAL

- **Evidence:** Original v1.0 Decision Ledger has 79 Locked and 20 Open entries. Consolidated [`docs/DECISION_LEDGER.json`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/c1e8d3175be836b4a7fc92d731729583e7ebe55d/docs/DECISION_LEDGER.json) preserves those source objects, later amendments, 13 scoped supersessions and two explicit **current owner questions** (URL cap and roast taxonomy).
- **Risk:** Treating all 20 original entries as still currently open ignores later approvals, while treating all as resolved merely because code exists also invents product decisions.
- **Acceptance:** Build a decision-to-implementation-to-test mapping for each historical topic; mark the exact later approval or evidence, and leave genuinely unresolved semantics as Open for one-at-a-time owner discussion.

---

## 6. Proposed GitHub Backlog (NOT YET CREATED)

**Do not create issues or alter their labels/milestones without owner authorization.** The following are candidate cards and dependencies, not claims that these are actual GitHub issues.

| Suggested issue | Proposed priority | Primary dependency / acceptance target |
|---|---|---|
| Wire quality-validated anonymous Community Shot eligibility and projection | P0 | Verified release, green status, outlier policy, contributor anonymity, edit/delete durability; SQL/RLS acceptance |
| Expose community browsing with privacy-safe filters and contributor counts | P0 | Eligibility pipeline; real multi-account browser verification |
| Implement complete hierarchical, contributor-balanced recommendations | P0 | Community aggregate data; exact/related/similar tiers, provenance/confidence tests |
| Deliver post-rating experiment confirm/decline and active experiment lifecycle | P0 | Preserve existing preferred recipe; server mutations, idempotence, offline-safe continuity |
| Add alternate recipe-family windows and explicit preferred selection | P0/P1 | Family scoping and robust estimator crosswalk; two different successful methods retained |
| Implement proper offline reopen, installable PWA shell and real-device sync | P0/P1 | Secure cached admission, service worker/manifest, no cross-owner cache leakage |
| Implement admin decisions, queue pagination and invitation controls | P0/P1 | Permission/RLS checks, audit, safe conflict review, abuse prevention |
| Complete source-backed new-coffee verification/release-conflict lifecycle | P0/P1 | Reconcile/close existing issue #5 only on proven criteria; preserve Pending safety |
| Publish and test approved roast-graphic extractor revision | P1 | Owner-approved daily cap/taxonomy decisions as relevant; deliberate Netlify credits/release |
| Enable all five Locked styles including Custom | P1 | Custom windows, validation, persistence and recipe test |
| Implement Bag Details, Frozen and New Bag workflows | P1 | Shot bag attribution, window carry-forward and history integrity |
| Complete baskets, versions and grinder direction/scale support | P1 | One-at-a-time unresolved baseline decisions; setup snapshots/real hardware testing |
| Add optional screenshot plus device-local Claude BYOK path | P1 | Locked privacy/key custody, no server AI key, secure user-approved extraction |
| Add recommended-style default in New Coffee | P1 | Preference/roast evidence with editable selection and one-line rationale |
| Add user Hide/Delete shot controls consistent with durable projections | P1 | Audit/revision/idempotence, confirmation and community contribution semantics |
| Expand true mobile accessibility and multi-device conflict test matrix | P1/P2 | Offline/reconnect, VoiceOver, 390px and actual iPhone/second browser |
| Add reviewed visual/integrity checks to release gate | P2 | Secret-free GitHub Actions, cost-aware, no automatic Netlify publication |
| Audit provider safeguards and backup courier health non-disruptively | P2 | Read-only provider connection or owner evidence; no key disclosure or induced production outage |
| Reconcile historical Open decisions with current amendments and code | P2 | Exact source reference for each status; only ask owner genuinely unresolved decisions |
| Fix stale comments and synchronize GitHub issue/status documentation | P2 | Keep already-approved Netlify SSO and recovery decisions; documentation-only change |

**Suggested grouping:** Create a small number of parent tracking issues (Community and Recommendations, Recipes and Experiments, Offline/PWA, New Coffee and Admin, Security/Operations, Documentation/Decisions) with clear child work. Avoid opening duplicate work for tests already passed. Each issue should cite one or more Locked spec sections, current file evidence, specific success criteria, and whether production deployment is required.

---

## 7. Acceptance Matrix for the Next Work Session

| Area | Source exists | Synthetic/CI support | Production or real-user acceptance | What is genuinely next |
|---|---|---|---|---|
| Core Log Shot -> Rate -> Recommendation | Yes | Yes | **RECORDED PASS** for owner baseline | Protect against regressions; test new edge cases only |
| Auth, invitation, non-admin isolation | Yes | SQL/synthetic + historical live | **RECORDED PASS** for first non-admin user | Additional attack/role paths only if scoped; no redoing signup |
| Hosted encrypted recovery | Yes | Isolated SQL/recovery jobs | **RECORDED PASS** for full core managed clone | Monitor freshness and only genuinely untested disaster paths |
| New URL coffee preview + private Pending | Yes | Yes | **RECORDED PASS** for Wuri member | New source identity/Verified, unknown roaster, ambiguity cases |
| Improved roast graphic parsing | Development only | Last app CI success, 226 tests recorded | **NO** for revised parser | Owner-approved release and real source-specific test |
| Admin review / invites | Read-only | Authorization tests | Only admin read/denial accepted | Write-capable safe operations |
| Community shots + stats | Schema/helpers | Partial | **NO** integrated community experience | Validated eligibility, aggregation, browse and privacy |
| Full recommendation tiers | Personal fallback + baseline | Partial | **NO** hierarchy acceptance | Genuine exact/related/similar community tiers |
| Experiment lifecycle | Engine/schema fragments | Partial | **NO** hosted full workflow | Confirm/decline, active experiment, alternates |
| Five styles including Custom | Core constants/engine | Partial | Custom **not exposed** | Accessible Custom UI and complete behavior |
| Bag lifecycle | Data model | Partial | **NO** hosted UI | Bag/date/frozen history acceptance |
| Advanced baskets/grind models | Data model + basic setup | Partial | **NO** full workflow | Complete controls and direction semantics |
| Device-local Claude/screenshot extraction | Locked requirement | No complete hosted path found | **NO** | Secure optional implementation |
| PWA install/offline cold open | IndexedDB queue | Storage resilience tests | **NO** fresh offline/device acceptance | Service worker/manifest/cache auth design and iPhone tests |
| Multi-device conflicts | Queue/revision checks | Synthetic | **NO** true multi-device acceptance | Real conflict/identity-switch scenarios |
| Backup alerts/trigger failure | Workflows + test alert | Historical test email | Real failure **NOT VERIFIED** | Non-disruptive health monitoring only |

---

## 8. Current Open Owner Decisions (Keep One at a Time)

**Only two new choices are explicitly highlighted in the current consolidated checkpoint.** Neither is adopted:

1. **Daily roaster URL preview cap:** 25 versus 10 lookups per rolling 24 hours. Existing cap is 60 and shared 30-second cooldown is Locked. Ask **this one question first** when resuming owner product questions.
2. **Roast taxonomy:** consider six displayed tiers (Ultra Light, Light, Medium Light, Medium, Medium Dark, Dark) versus the existing five. Do not implement migration or relabel coffee facts until approved.

**Original v1.0 baseline's 20 historically Open topics:** Make Current Recipe semantics; newly added coffee versus pinned current; all-green shot after experiment declined; experiment threshold comparison baseline; grinder direction/scale; edit after community contribution; family scope across setups; robust window estimator; adaptive grind threshold; sensory family labeling; time logic after guidelines; hard input bounds; non-experiment bad-shot feedback; expanded unrelated coffees after current switch; canonical match choreography; full screen versus sheet; community note moderation; advanced profile styles; hosting/provider stack; offline conflict resolution.

These 20 are **historical original Open entries**, **not** a declaration that all 20 still require owner answers. Later decisions and implemented behavior may resolve some; a successor should map each to explicit approval, remaining Open or Deferred status. Provider selection is evidently implemented but source implementation alone must not silently decide unrelated UX/algorithm questions.

---

## 9. Security, Data Integrity and Release Invariants

The next session must preserve all already-Locked constraints, especially:

- **Core UX:** open -> current coffee ready -> Log Shot -> rate all five scales -> specific next recommendation -> done. Keep routine UI clean and fast; advanced details progressively disclosed.
- **Coffee identity:** canonical stable UUID; release/lot/harvest compatibility checked; reused product URL not sufficient to merge; uncertain matches require confirmation; private Pending coffee can be logged immediately.
- **Community:** only validated all-green Dialed-In shots on an approved canonical identity; contributor anonymity and durable but controlled contributions; no private owner notes or identifiers exposed; diminishing weight, robust statistics and transparent confidence.
- **Experiments:** explicit post-rating confirmation; established recipe never destroyed; current and alternate successful families remain distinct; style times/ratios are guidelines, not a veto on green sensory ratings.
- **Measurements:** raw shot/immutable equipment snapshot retained; dose defaults to last **actual** same setup; yield and time blank on new shot; grind actual separate from suggested; temperature optional; no fabricated measurements.
- **Offline:** preserve `dic_cloud_owner_test_v1` IndexedDB identifier, queue IDs, pending receipts and owner-scoped data until any migration is deliberate/tested/lossless.
- **AI:** no paid API required; Claude optional device-only BYOK; no silent key sync; no need for AI per shot; public extraction may be deterministic with secure manual fallback.
- **Access:** production extra Netlify login removed **by approval**; non-production previews retain Netlify SSO; Supabase verified email, invitation/admission, RLS and admin checks remain mandatory.
- **Historical import:** one-use exception already consumed and saving disabled; do not reopen based on older migration instructions.
- **Recovery:** encrypted source/database backups, private recovery key custody, verified hosted recovery and original history preserved; never upload secret keys or raw private exports to GitHub/Netlify/public context.
- **Style:** user-facing name The Dial In Collective, unhyphenated dial in; no text shadows, halos or glows; owner-approved original badge palette and readable flat lettering; no unsolicited visual rework.
- **Release:** source changes do not equal deployment; owner-marked release only, fresh Netlify credit verification and CI/SQL gates; protect production data. Avoid unsanctioned paid APIs or subscriptions.

---

## 10. Repository Sources and Navigation

### Canonical and current checkpoint

- [Active development branch](https://github.com/Schulzet3/The-Dial-In-Collective/tree/development/backend-foundation)
- [Current Status](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/CURRENT_STATUS.md)
- [Master Specification](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/MASTER_SPECIFICATION.md)
- [Decision Ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/DECISION_LEDGER.json)
- [Documentation Index](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/README.md)
- [GitHub continuity report](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/GITHUB_CONTINUITY_2026-10-17.md)
- [Repository agent/handoff rules](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/AGENTS.md)

### Core code and test paths

- [`site/cloud/main.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/cloud/main.js): hosted screens, Add Coffee, Log Shot, Settings, limited Community and auth/sync orchestration.
- [`site/lib/engine.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/lib/engine.js): baseline, personal similar-coffee suggestions, families, experiments, community summary helpers.
- [`site/lib/model.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/lib/model.js): setup/basket/coffee/shot model and validation.
- [`site/cloud/mapping.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/cloud/mapping.js): cloud hydration, pending optimistic shots, client payload.
- [`site/cloud/outbox.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/cloud/outbox.js): IndexedDB, durable outbox, conflict handling.
- [`site/cloud/shot_card.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/cloud/shot_card.js): history card and user controls.
- [`site/admin/main.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/admin/main.js), [`site/admin/view.js`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/site/admin/view.js): read-only admin.
- [`src/server/coffee-page-metadata.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/src/server/coffee-page-metadata.mjs), [`src/server/roast-level-evidence.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/src/server/roast-level-evidence.mjs): URL metadata and graphics parsing.
- [`supabase/migrations/`](https://github.com/Schulzet3/The-Dial-In-Collective/tree/development/backend-foundation/supabase/migrations), [`supabase/tests/`](https://github.com/Schulzet3/The-Dial-In-Collective/tree/development/backend-foundation/supabase/tests): schema/authorization and isolated SQL regression.
- [`tests/`](https://github.com/Schulzet3/The-Dial-In-Collective/tree/development/backend-foundation/tests): Node/browser regression.
- [`build_cloud.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/build_cloud.mjs), [`scripts/audit/site-integrity.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/scripts/audit/site-integrity.mjs): explicit ship allowlist and integrity.

### Relevant operational/evidence documents

- [Universal URL implementation and Wuri acceptance](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/UNIVERSAL_COFFEE_URL_IMPLEMENTATION_ACCEPTANCE_2026-10-16.md)
- [Roast graphic extraction and one-shot cleanup](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md)
- [Hosted managed recovery drill](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md)
- [Encrypted archive restore](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md)
- [Backup delivery and alert audit](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md)
- [Release/recovery runbook](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/RELEASE_AND_RECOVERY_RUNBOOK.md)
- [Netlify credit ledger](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/docs/NETLIFY_CREDIT_LEDGER.json) (historical snapshots, **not** current balance)
- [Open issue #5](https://github.com/Schulzet3/The-Dial-In-Collective/issues/5)
- [Last verified app CI run 38994786401](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38994786401)

### GitHub Actions and branches

- Current `development/backend-foundation`: cloud app build, cloud UX regression, isolated SQL regression; dedicated visual-review workflow auto-triggers on an older work branch/manual dispatch.
- `main`: nightly source-inclusive encrypted backup and weekly isolated PostgreSQL recovery check. Last inspected backup workflow includes **09:23 UTC daily** schedule, **30-day** backup artifact retention; weekly drill runs **Sunday 10:43 UTC**.
- Older `work/...` branches and the original `claude/artifact-import...` branch remain historical/source review points. Do not delete or merge merely because they are old; inspect provenance and approvals first.
- Source release guard: [`scripts/netlify/should-ignore-build.mjs`](https://github.com/Schulzet3/The-Dial-In-Collective/blob/development/backend-foundation/scripts/netlify/should-ignore-build.mjs) requires owner-formatted release message and fresh ledger. It **cannot** independently prevent provider manual deploy hooks.

---

## 11. Recommended Safe Execution Sequence

**Phase 0 - Inventory / do not mutate:** Verify current dev/main refs, working tree and latest provider release. Read latest canonical spec/ledger/current status. Confirm exact outstanding gap list and avoid resurrecting historical checklists.

**Phase 1 - Owner decisions and work tracking:** Ask about 25 versus 10 URL previews **one question only**. Separately handle roast taxonomy. With owner approval, create a bounded GitHub issue backlog with spec/evidence/acceptance links; avoid duplicate #5 work and do not represent Open product questions as decisions.

**Phase 2 - Core missing capabilities in private development:** Sequence community eligibility/privacy, tiered recommendation engine and recipe/experiment workflows so each has real deterministic fixtures and no fabricated confidence. In parallel only where independent, implement PWA/offline recovery and test with a genuine second member; preserve existing owners' data.

**Phase 3 - Full product parity:** Admin decision queue and invites, Custom style, alternate families, bags and basket equipment flows, suggested new-coffee style, shot hiding, optional screenshot/device-only Claude extraction. For each, distinguish existing schema from missing UI and use migrations only where necessary and approved.

**Phase 4 - Pre-expansion acceptance:** Genuine external/member coffee release verification, ambiguous/reused URL safeguards; real iPhone Safari/offline/reconnect and multi-device conflict matrix; security/abuse/privacy checks, accessibility. Verify no regression to the simple Log Shot -> Rate -> Recommendation loop.

**Phase 5 - Controlled publication and operations:** Review Netlify credits and release guard, approve deliberate tested release(s), verify live deployed SHA, update `main` backup source pin **only after new publish is confirmed**, validate new offsite encrypted copy and monitor. Never claim published merely because dev CI passed.

**Exit criteria per issue:** (a) canonical requirement and owner approvals traced, (b) implementation evidence and migration safety identified, (c) unit/SQL/browser tests documented, (d) real-user/provider acceptance precisely scoped, (e) no secrets/owner data leaked, (f) CURRENT_STATUS updated, (g) release state and next action accurately recorded.

---

## 12. What Was Not Done in This Audit

- No repository issues were created, edited or closed. No new PRs or commits made on behalf of this audit.
- No application code, SQL migration, Netlify function, backup workflow, provider setting, account/invitation or production user record was modified.
- No Netlify production build or paid external service was triggered.
- No complete local checkout test suite, mobile device test, adversarial audit or newly executed hosted recovery was run.
- No current live Netlify credits, full Supabase Auth configuration, Cloudflare/Resend/Apps Script settings or GitHub branch protections were certified through provider tools.
- No missing nine research report bodies or standalone historic v0.2.0 addendum were invented.

The document was assembled as a **read-only handoff** from directly observed repository evidence plus carefully qualified historical project records. If a subsequent session detects a changed branch, current deployment or later owner decision, that newer evidence controls.

---

## 13. Paste This Instruction Into a New Chat or Work Session

> Continue **The Dial In Collective** using the attached comprehensive GitHub handoff. This is an existing live private-beta product, not a rebuild. First connect to my private GitHub repository `Schulzet3/The-Dial-In-Collective` and verify the latest refs. Application code and canonical docs are on `development/backend-foundation`; default `main` contains encrypted-backup/recovery operations. Read `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json` and `docs/README.md` before taking action. Preserve **all Locked decisions** and explicit later supersessions. Distinguish code, CI success, production publish and real acceptance; do not repeat previously completed recovery or beta-account tests. Use the handoff's gap register to reconcile remaining work with the actual current source and build a prioritized, evidence-linked plan. Ask product questions one at a time, starting with the currently Open URL-preview daily cap when appropriate. **Do not create issues, deploy, migrate, change settings, spend credits or alter production data without explicit approval.** Keep the app sleek and optimized for the shortest possible **Log Shot -> Rate -> Recommendation** flow. Report exactly what you verified and label anything you could not inspect.

---

**End of handoff.**