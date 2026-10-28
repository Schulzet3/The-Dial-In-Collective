# The Dial In Collective — Issue #33 owner coffee-review and extractor development handoff

**Prepared:** October 27, 2026 MDT / October 28 UTC
**Repository:** private GitHub `Schulzet3/The-Dial-In-Collective`
**Primary tracker:** [Issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33) — still OPEN
**Development permission:** owner authorized implementation, testing, debugging, non-force integration and queue preparation; **NO PRODUCTION DEPLOYMENT AUTHORIZED**.

## 1. Immediate recovery (verify these again before any write)

At this handoff checkpoint:

- `development/backend-foundation`: `88c544f6e24da7aa00d6a731b53c0a3f58af0fb4` **before this documentation handoff commit**. On opening the next chat, re-fetch its actual head; this handoff commit will advance it.
- `main`: `115f129b9bbab3b7522c4a95ebdc34995d27e759` (operations/backups only).
- `release/production`: `f5f29a02f98304dd9d1bd4d2c840c490c85097e6` (do not move without publish instruction).
- Netlify site ID `153277f2-e19e-4862-b9a6-f2e18ccde271`, actual current/published READY deploy `6ae0fc16178b2f1241e441f8`; do not claim that new extractor development has been deployed.
- GitHub Issue #33 is OPEN. At this snapshot **zero open pull requests**. PR #179 (Ketch/source hierarchy) and PR #183 (Kona-specific notes) are MERGED. Other independent READY queue rows remain untouched.

**Mandatory recovery:** Read `AGENTS.md`, `docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md`, `docs/workstreams/README.md`, `docs/workstreams/issue-33.md`, `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, `docs/APPROVAL_COVERAGE_MATRIX.json`, `docs/RELEASE_QUEUE.json`, this handoff, latest Issue #33 discussions, relevant merged PR files, current CI and Netlify published SHA. Do not rely on this checkpoint if GitHub or providers moved. Preserve all concurrent changes.

## 2. Just-approved Cortez decision — IMPORTANT, not yet implemented

The owner approved the prior Cortez assessment and explicitly said:

> **“Yes that looks correct for Cortez. I would ignore the older copy. Good job.”**

**Locked meaning:** For a reused roaster product URL, the **actual live current product title and directly labelled specifications** govern identity and data. A reused URL slug, previously indexed title, archived/SEO copy, or stale old-coffee prose on the same page must not contribute identity, origin, processing, producer, roast, tasting notes or confusing false conflict warnings. Treat SEO/archives as a last resort **only for a genuinely missing current field**. If mutually contradictory direct CURRENT selected-coffee details really exist, show both, with source, and require the member to resolve. Preserve raw historical evidence and original immutable corpus; do not rewrite old member records.

**Cortez URL:** `https://cortezcoffee.com/products/el-salvador-santa-ana-copy`. Original audit indexes **49 and 50** and evidence live in `docs/audits/extractor-issue33-live-fringe-review-20261027.json`. Original reference was El Salvador Santa Ana; an older indexed page has Papua New Guinea Highlands; a newer indexed search result has Ethiopia Guji Benti Neka, with apparent leftover Eastern Highlands/Lahamenegu copy. These are **different indexed snapshots, NOT proof of today's live coffee**. One prior indexed Ethiopian listing gave Wolisho, Ethiopia; Medium; 1,600 m; Kurmue/Dago/Wolisho; Washed; honey, lemon/lime, pear and tea-like notes. Treat every one of these **as candidates until exact live product fetch**, not verified current facts. Owner approved ignoring older copy, not automatically choosing Ethiopia based only on index.

**Implementation next:** Audit the actual extractor paths `src/server/coffee-page-metadata.mjs`, `src/server/coffee-identity-evidence.mjs`, `src/server/coffee-shopify-ajax.mjs` and any selected product/identity helpers. Add minimum scope-backed logic to reject stale legacy-coffee narrative even where it appears on the current reused product page. Add targeted positive/negative fixtures for reused old slug, old indexed HTML, current product identity, stale geography/mill, independent current direct-product conflicts, fallback only on missing fields, and original current details never overwritten. Keep the user-facing review free of false conflicts and photos. Inspect the live URL if currently reachable and report actual source/fetch limitations. **Do not change the frozen original603 archive, oracle, scoring, or member history.**

**Source of approval:** `EXTRACTOR-CORTEZ-REUSED-URL-CURRENT-PRODUCT-20261027` in both canonical files. Approval coverage currently intentionally says OWNER_APPROVED_NOT_IMPLEMENTED. Do not call this change READY/merged/passed until it actually is.

## 3. Previous owner decisions in this review sequence

1. **Current product vs SEO/archives:** NEVER inspect SEO where the exact current selected product has the field. No false conflict from SEO-only disagreements. Only equally direct current selected-product contradictory data requires a member choice. Archived facts are auditable but not current fields.
2. **Specificity:** Explicit selected-product labelled specifications beat broad descriptions/guides; coffee-specific elevation beats general farm geography. Unitless explicitly labelled coffee elevation is assumed meters above sea level.
3. **Explicit rotating origin:** Require confirmation only when this exact product explicitly says its origin rotates, not blanket per-coffee prompts.
4. **Ketch Legacy Farms Honduras Natural:** one coffee, Light and Medium-Dark selectable roast profiles; shared Cerro Bueno, Honduras, Lempira, Natural, 1450–1520 MASL, Williams family producer. Light floral/blackberry, suggested 203–205°F, 1:3 and published 18g/54g example; Medium-Dark blackberry/caramelized sugar, 200–202°F and 1:2 with unspecified dose/time. No Parainema from SEO and no review photos. Owner approved and approved interactive HTML preview, incorporated in PR179.
5. **Aldea Gracias A Dios:** direct selected product Medium-Dark beats generic lower-priority Chemex guide “Medium”; no artificial conflict. Owner explicitly affirmed correct.
6. **Single Speed:** specific product elevation 1800–2000m beats broader surrounding farm 1800–2200m. Owner-approved rule: favor more specific coffee details; do not report a false conflict between differently scoped descriptions.
7. **Kona Earth 100% Kona Classic:** actual roast purchase variants Medium, Medium Dark (Full City), Dark; each **printed roast-specific tasting list** outranks generic flavor prose. Medium notes almond/brown sugar/cream/cocoa/apple/jasmine/milk chocolate/orange; Medium Dark notes roasted nuts/caramelized sugar/tobacco/bittersweet chocolate/lime; Dark molasses/bittersweet chocolate. Green Unroasted is not a fourth roasted flavor profile. No guessed missing process/elevation/espresso numbers, no photos. Owner explicitly approved, implemented in PR183.
8. **Cortez:** new approval as in section 2; **code not yet implemented**. Source candidate identity must be independently verified.

Previously accepted processing/background rules (Brewpoint, Gnosis, Black River and other cases) live in Master Specification and Decision Ledger. Read rather than re-deciding them. Do not reinterpret Locked matters without explicit owner supersession.

## 4. Completed source work, tests and release-queue truth

**PR #179** `https://github.com/Schulzet3/The-Dial-In-Collective/pull/179`: exact product hierarchy, explicit rotating-origin review, Ketch two-roast UI/source behavior, stale SEO result suppression. Final reviewed head `598622a56415fa3abc51aa4aed191a86acaf9cff`; non-force merge `4331031e96b5e594a6e640dd91f6c59ae5969a97`, source tree `36347734afa66b15d5e74622c13c7c28a78e7d9e`. PR-head checks success: approval `40616568565`, security `40616568381`, SQL `40616568410`, app `40616568413`, cloud `40616568388`, visual `40616568360`; post-merge app `40616781803`, cloud `40616782266`, visual `40616782318`, approval `40616782109` success. Early failures were repaired/retested. **Queue item `DIC-Q-33-owner-source-precedence-rotating-origin`: TESTING, NOT READY.**

**PR #183** `https://github.com/Schulzet3/The-Dial-In-Collective/pull/183`: specifically labelled Kona per-roast tasting notes override broad copy. Final reviewed head `6d8f28117864a1a3aa95d116ca34eeaf87dd8eaf`; non-force merge `a7f77cb70e510d51580e2d076d7484281c020be9`, tree `369a375343024ec04e71fbc2729efb49c78e756e`. PR-head successful: approval `40622879825`, security `40622879856`, SQL `40622879955`, app `40622879832`, cloud UX `40622879835`, visual `40622879861`; merged-source app `40623117571`, cloud `40623117565`, approval `40623117630` success. Initial approval queue validation failed because a test file was in deployable paths; repaired and retested. **Queue item `DIC-Q-33-kona-specific-purchased-roast-notes`: TESTING, NOT READY.**

**Original immutable 603 corpus gate:** original captured **603 coffees / 201 US roasters**, 1,197 frozen captures, original source archive SHA256 `696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52`. A previously independently reviewed run `40074270907` did run the 603 but on *older code*, baseline 3046 exact /132 missing /824 review. Subsequent archived benchmarks have different source heads. **Do not imply any is a pass for PR179/PR183 or new Cortez changes.** Both new PR frozen603 workflows `40616568385` and `40622879836` were SKIPPED because the workflow is gated to an old dedicated audit branch and receives private source captures through a restricted ephemeral channel. The original audit data, scorer and expected values must remain immutable. Recover approved private inputs, run actual-handler exact-source replay/strict scoring/retention independently if feasible, or document a genuine blocker and keep TESTING. Do not silently soften gates or copy tests into the original corpus.

**Current relevant release queue:** `DIC-Q-33-residual-source-accuracy` = IN_PROGRESS; `DIC-Q-33-owner-source-precedence-rotating-origin` = TESTING; `DIC-Q-33-kona-specific-purchased-roast-notes` = TESTING. Other unrelated READY entries (e.g. `DIC-Q-33-current-source-and-four-roasters`, `DIC-Q-33-original603-six-missing-facts`, `DIC-Q-180-decaf-only-method`) must retain their states and scoped source evidence. Do not deploy any or close Issue33 solely because these example coffees have been reviewed.

## 5. Recommended immediate execution order for next chat

1. Verify fresh GitHub branch SHAs, open PRs, CI and provider production readback. Read all source-of-truth files including latest Issue33 journal, this handoff and the audit JSON. Check for concurrent writes (previous workstreams remain in parallel).
2. Apply approved Cortez reused-product identity and old-copy quarantine as narrowly as possible. Avoid guesses from crawler indexing and maintain source evidence. If live current product cannot be independently fetched, build fixture-based guards and state exactly what remains unverified; do not ask owner to manually perform routine developer work.
3. Add focused Node/source/UI tests for Cortez and assert existing Ketch, Kona, Brewpoint/Black River and source-hierarchy behavior does not regress. Validate privacy, offline, approval checks, cloud, mobile/visual and build as appropriate. Do not call unperformed tests passed.
4. Address original603 exact-source acceptance using authenticated existing private capture procedure without incurred costs or modifying original data. Reuse valid immutable evidence, resolve legitimate tool/workflow restrictions safely; no fabricated score.
5. Create tracked non-force PR, integrate after exact-source green checks, verify merge SHA and postmerge checks, update **in the same commit as code** `docs/workstreams/issue-33.md`, then reconcile Master, Ledger, coverage, `docs/CURRENT_STATUS.md`, `docs/RELEASE_QUEUE.json` and Issue33. READY only with completed evidence/no scoped blockers; otherwise TESTING/BLOCKED with exact reason.
6. Continue sequential case-by-case owner review only for truly unresolved product-policy questions; do not re-ask already answered questions. The next potential special case in original fringe audit is **Stage Line Brazil Capricornio Dulce Signature**, a documented 50% Natural Yellow Catuai and 50% Honey Mondo Novo blend; distinguish component methods, but check whether current approved Other/Unknown handling already resolves it before proposing change.

## 6. Safety and communication

- **Do not publish/deploy**, touch `release/production`, run destructive production SQL, change production member records, charge paid services, alter plans, or request another blanket development approval. Only a later explicit owner publish instruction authorizes one selected READY batch.
- Keep repo private on GitHub Free. Protect member privacy, permissions, auth, historical shots/notes, community, offline records, original603 input hashes, exact-source CI and backups.
- The highest priority product path is Log Shot → Rate → Recommendation; never trade correctness/privacy for convenience.
- Communicate briefly: completed, verified, exact READY state, blockers, deployed versus not deployed. Investigate/fix CI failures and retest; do not hand routine failures back to owner.
- The current task was **handoff creation and approval recording only**; do not describe Cortez runtime improvements as completed.

**Ready-to-paste continuation instruction:**

> Continue Issue #33 in private `Schulzet3/The-Dial-In-Collective` from `docs/handoffs/ISSUE33_OWNER_COFFEE_REVIEW_HANDOFF_2026-10-27.md`. Recover latest GitHub/provider truth first. Implement the now-Locked Cortez reused-product URL rule: use the *live current exact-product title/specifications*, quarantine legacy page prose/old SEO/indexed copies, retain audit history, and avoid false conflicts. Preserve Ketch/Kona implemented behavior and concurrent work. Test source correctness, exact-source CI and original immutable603 acceptance wherever feasible; repair failures, non-force merge, reconcile issue/journal/spec/ledger/coverage/queue. No direct paid cost and no publishing/deployment. Bring verified independent work to READY only when all acceptance evidence is genuine, and continue with the next unresolved coffee review.
