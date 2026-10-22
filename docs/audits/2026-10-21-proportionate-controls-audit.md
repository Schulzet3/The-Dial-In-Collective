# App-wide proportional controls audit

Date: October 21, 2026 MDT (October 22 UTC). Tracking: [Issue #70](https://github.com/Schulzet3/The-Dial-In-Collective/issues/70).

## Executive finding

The strongest simplifications are fewer blocking interactions, less repeated synchronization and testing, and a smaller, generated release record. Removing authentication, revision checks, replay protection, backups, or safe outbound fetching would not solve the main friction found. Several requested improvements already exist in development but are not in the published frontend. The app's direct dependency footprint is small; its operational process is more elaborate than its runtime dependency stack.

This report contains **52 control-level dispositions**, not 52 new approval gates. They include removals, modifications, retained controls, existing improvements and conditional investigations. Recommendations are not claims of implementation, deployment or owner acceptance. The owner's general proportionality instruction is approved; exact product changes and superseded requirements must still be recorded accurately when implemented. This audit does not grant a production release or spending permission.

## Evidence and boundaries

Application source inspected: `21a0a7552e406da3c383f96d53c2323891c6f363`, tree `67cd68c80aacc9c5ec715da0d1f72d5e7d59769c`. Final pre-report development head: `15cfe636cf6c8c1b9d7214ee077fbcdea5f8aaf8`. Independent comparison shows only four documentation paths changed after the application audit pin: active journal, approval matrix, status and ledger. Concurrent PR #71 work/handoff is preserved; this audit neither repairs nor merges it.

Operations source inspected separately: `main` at `69b0c266b06c8feec719474188ec0a2c1a05910f`. Production was independently read from Netlify: current/READY deployment `6ad968689f42fbe8e871e151`, source `eee687dd4d7fc19493139bc106e63c16849ac91d`, branch `release/production`. Development source is not the live frontend.

Recovery included AGENTS, active journal, CURRENT_STATUS, relevant canonical specification/ledger/approval register sections, PR #68 and recent CI. A complete recursive Git tree inventory was obtained without provider truncation. Detailed review covered cloud/admin UI, client, outbox, model, recommendation engine, extractor entrypoint/URL guard, build/service worker, CI, release controller and backup workflows. Read-only database catalog queries examined admission, mutation, personal-state, Community, preview quota and statistical-review routines. This is subsystem-wide control analysis, not a claim that every historical file, SQL branch, transitive dependency or browser interaction was executed or read character by character.

No new unit/browser/SQL suite, penetration test, latency benchmark, exact-archive decryption or disaster recovery drill was executed in this audit. Existing exact-source GitHub checks were inspected: approval, validate, cloud-tests, mobile-browser-qa and sql all succeeded for the pinned application source. Source tests and synthetic screenshots are not actual signed-in owner/device acceptance. All predicted performance benefits remain unmeasured until implementation and comparison.

### Live-provider observations

| Surface | Independently observed | Limits |
| --- | --- | --- |
| GitHub | Private repository; development protection disabled; app/ops refs and existing check results | Checks are advisory. No guarantee against direct writers. |
| Netlify | Current published source above; one coffee-url-preview function; no scheduled functions in that deploy; plugin_state none; forms disabled; team SSO applies to non-production | Not an exhaustive team-extension inventory; credit balance, all build hooks and all dashboard settings unavailable. |
| Supabase | ACTIVE_HEALTHY; 35 applied migrations; verify Edge v5 and preview Edge v3, both JWT-verified; catalog metadata reports 22 shots, 22 notes, 2 Community observations, 5 beta members | No business-record payloads read. Two staged Admin migrations absent from applied list. No simulated checks described as live acceptance. |
| Backups | Latest scheduled main run 39617682729 succeeded; artifact 12354200800 is nonexpired, 1,183,798 bytes; matching private Drive file exists with equal size | Drive connector omitted requested checksum fields; byte equality, decryption and restoration not verified here. |
| Apps Script / Resend / Cloudflare | Existing dated repository source/configuration and owner-acceptance records reviewed | Live script execution/trigger state, email-provider dashboard and DNS/provider settings inaccessible. Targeted connector searches found no matching Cloudflare/Resend tool. |
| ChatGPT monitoring | Existing independent backup watcher is enabled | No new watcher or notification settings were changed; actual future alert delivery is not proven by task metadata. |

PR #68 remained open/unmerged at final inspection, head `22c92f9eb7e56bc6c13e169c799ce852ea2a9ede`; latest provider snapshot reported mergeable true. Its policy is durably recorded but not yet integrated. Do not interpret a provisional merge-commit field as a completed merge.

Priority definitions: **P1** high-value first implementation bundle; **P2** worthwhile next; **P3** conditional on demonstrated need. **Retain** means no removal recommended. These are audit recommendations, not newly Locked release requirements.

## A. User interactions and product requirements

### 01. Finish the already-approved direct-save work — P1, integrate/deploy later
Location: `site/admin/main.js`, cloud forms, two staged Admin migrations, current status. Ordinary Admin coffee/shot/note changes and selected existing Merge/Hold resolutions already have low-friction source changes. Avoid redesigning them again. Reconcile the source/SQL bundle and include it in the next separately authorized release. Benefit: users receive approved improvements rather than more process around them. Validate one intentional Save/action, server revisions and genuine identity collisions on the actual deployed bundle.

### 02. Remove the global outlier-review interruption — P1, modify
Location: cloud main Community review dialog and `dic_my_community_outliers`/confirmation routines. A nondismissible review can interrupt ordinary app work. Save and retain the personal shot immediately; show an inline review card or inbox item that can be deferred. Keep an uncertain observation out of Community recommendation learning until reviewed. Benefit: Log Shot -> Rate -> Recommendation remains usable. Validate dismissal, later confirmation, corrected measurements and stale revisions without dropping records or admitting unreviewed data.

### 03. Make dose warnings contextual, not repetitive — P1, modify narrowly
Location: new/edit shot submit handlers. The owner recently explicitly selected warning plus Confirm when dose differs by more than 1 g from the relevant basket. Retain that rule, but recommend one clear inline confirmation and no repeat when a notes-only edit leaves an already acknowledged dose unchanged. Re-check if dose or relevant basket context changes. Benefit: fewer redundant clicks without reversing a recent decision. Validate new shots, original edit snapshots, threshold boundaries and changed measurements.

### 04. Keep deliberate taste ratings and ordinary numeric validation — Retain
Location: constants/model and shot form. Five intentionally selected taste ratings supply the recommendation signal; defaulting them to green would invent evidence. Dialed In is already taste-based rather than a fixed-time veto. Keep finite numbers, required fields and unit consistency; do not use typical recipe windows to reject unusual but valid shots. Benefit: reliable recommendations without new prompts. Validate unusual styles and valid out-of-window shots separately from malformed/NaN inputs.

### 05. Narrow the global pending-change block — P1, modify
Location: cloud `onlineOnly` and pending-event checks. Some online operations are blocked merely because any local event is pending. Block only operations that depend on the affected record or unavailable authorization. Allow unrelated browsing, editing and logging where dependencies permit. Benefit: one conflict no longer disables unrelated app work. Validate unsynced new coffee/setup dependencies and never allow a foreign-account event or dependent operation to race ahead incorrectly.

### 06. Replace the sign-out dead end — P1, modify
Location: cloud sign-out handler/outbox. Current pending events can prevent sign-out indefinitely. Offer one explicit explanation that unsynced records remain on this device, then permit sign-out while preserving an owner-scoped queue. Require that same owner to authenticate before replay. Do not add automatic discard or treat export as deletion permission. Benefit: users can leave an account without losing work or being trapped by a rejected event. Validate shared-device account switching and interrupted sign-out.

### 07. Simplify password composition, not account identity — P2, review provider alignment
Location: client password validation and hosted Auth configuration. Replace uppercase/symbol puzzles with a clear passphrase-friendly length policy, password-manager support and matching client/provider rules. Current hosted password settings were not independently read in this audit. NIST's current reference rejects composition rules and uses 15 characters for single-factor passwords; removing composition requirements while keeping an eight-character minimum would not be NIST-equivalent. No enterprise MFA rollout or forced user password reset is recommended by this audit.

### 08. Align sharing terminology with the actual data contract — P2, modify
Location: Settings/help copy, Community payloads, canonical requirements. Explain which coffee facts, measurements and ratings are intentionally shared; reserve restricted terminology for account operations, credentials and fields not actually shared. Remove stale help mentioning the withdrawn Hide Shot option. Benefit: less misleading privacy language and less unnecessary process. A blanket statement that all infrastructure data is public is not a field-level consent contract. Validate displayed claims against actual payloads, not assumptions about members' consent.

## B. Synchronization, offline use and rendering

### 09. Quarantine failed queue items instead of freezing everything — P1, modify
Location: `site/cloud/outbox.js`. Sequential flushing stops on the first rejected/conflicting event. Preserve that event, show a repair action and continue independent records; retain ordering for dependent operations. An authentication/admission failure should still pause the owner's queue globally. Benefit: later valid shots synchronize despite an older error. Validate same-record ordering, new-coffee dependencies, repeated retries and unchanged mutation IDs. Do not replace this with concurrent blind retries or silent dropping of rejected Hide events.

### 10. Decouple trusted local offline work from token expiry — P2, product choice
Location: client cached identity and startup. Offline workspace access currently depends on a sufficiently unexpired local session. Consider an explicit trusted-device local mode permitting cached access and new drafts/logs after expiry, while all server writes wait for renewed admission. Benefit: a usable offline coffee journal. Residual risk: an offline device cannot instantly learn revocation, and shared-device exposure must be defined. Validate expiry, revoked membership on reconnect and account switching; do not accept expired tokens server-side.

### 11. Reduce fixed full-state polling — P1, modify
Location: cloud foreground 30-second sync. Each normal cycle performs a personal-state read plus Community-review read. Prefer refresh after a successful mutation, on focus/reconnect, and a slower idle/backoff fallback; coordinate tabs where useful. Benefit: fewer requests, less rendering and battery use. Arithmetic upper pattern is two calls per 30 seconds, or 240/hour per continuously eligible idle tab, not measured traffic. Validate another device's updates, revoked admission, connection loss and freshness expectations.

### 12. Load Admin panels only when needed — P1, modify
Location: `site/admin/main.js`. A refresh can request theme, dashboard, access and six record datasets even while sections are collapsed, then repeat after edits. Load summaries first, fetch expanded sections on demand, and invalidate only affected data. Benefit: fewer requests and quicker Admin interactions. Preserve server role checks on every mutation; collapsed UI is not authorization. Validate first-open states, refreshed counts, pending/approved transitions and stale-edit conflicts.

### 13. Evolve full-state reads without sacrificing history — P2, conditional optimization
Location: `private.read_personal_state`, cache/mapping. The current consistent SQL snapshot returns 17 datasets and all relevant history. At the observed small dataset this is not proven slow. Add revision-based conditional reads or incremental transfer only after instrumentation shows value; preserve consistent snapshot/version semantics and server history. Benefit: growth without repeatedly downloading everything. Validate reconnect gaps, edits to old shots and complete recovery. Do not impose a history cap as a performance shortcut.

### 14. Index local queues and bound operational receipts — P2, modify carefully
Location: IndexedDB store reads and acknowledgement receipts. Owner-filtered indexed queries can replace full-store scans. Define retention for redundant local acknowledgement/debug payloads independently from original shots, pending events and indispensable replay evidence. Benefit: less local storage and startup work over time. Actual storage pressure is not measured. Validate interrupted acknowledgements, migration from old stores and owner separation; never prune unsynced events or historical coffee records under a generic cleanup rule.

### 15. Avoid recomputing and repainting unchanged cards — P2, measure then modify
Location: cloud render and recommendation calls. Full renders recompute recipe information for many coffees. Cache calculations by the actual data/preferences/setup revision and update affected cards rather than replacing the whole screen unnecessarily. Benefit: less work and fewer focus/scroll disruptions. Do not introduce a framework rewrite merely for this. Validate immediate advice after logging/editing, setup switches, preference changes and absence of stale cached recommendations; benchmark meaningful larger fixtures first.

### 16. Move Community search and paging to the server — P2, modify
Location: cloud Community UI and `dic_browse_community_shots`. Current server inputs are limit/offset, and filtering already-loaded rows can miss other records; offset is capped at 2000. Use server-side search/filtering and stable cursor pagination, and compute repeated contributor/count aggregates once. Benefit: complete search and predictable growth. Only two Community observations were observed, so this is not a claimed present bottleneck. Validate stable ordering, search beyond the first page and the intended shared fields.

## C. Extraction and external requests

### 17. Combine three preview preflight calls — P1, modify
Location: Netlify `coffee-url-preview.mjs`. Before fetching a page the handler sequentially validates identity, session/admission and quota through three Supabase calls. Combine the server-validated admission and atomic quota decision into one appropriately designed RPC, eliminating redundant round trips without trusting client claims. The 15-second retrieval budget starts after these checks; define an end-to-end handler budget too. Benefit: lower avoidable latency. Validate invalid tokens, revoked users, concurrent quota claims and bounded timeouts.

### 18. Replace stacked restrictive throttles with one coherent policy — P1, tune
Location: Netlify IP 12/minute and database 12 previews/rolling 24 hours plus 30-second cooldown. A claimed request counts before external retrieval; source failures consume capacity. Allow a measured per-member burst and limited retries of transient failures, retain a broader IP/backend abuse cap, and distinguish failures from successful extraction. Benefit: quicker legitimate adding/retrying and less shared-network interference. Proposed limits require usage evidence; do not remove all limits or refund unlimited malicious requests.

### 19. Cache exact public extraction results — P2, modify
Location: preview handler and extractor versioning. Cache public product facts by normalized exact source URL, parser version and bounded age; reuse in-flight identical lookups. Never cache authenticated responses or overwrite user edits with stale data. Benefit: fewer repeated roaster fetches and faster common lookups. Distinct lots/releases must not collapse into one key. Validate stale refresh, changed parser versions, redirects, failure caching and a clear refresh action that remains rate-bounded.

### 20. Retain safe outbound fetching — Retain
Location: `coffee-url-guard.mjs`. HTTPS, connection-time public-address DNS pinning, rechecked redirects, bounded body/decompression sizes and deadlines prevent infrastructure abuse. These are not banking-data restrictions and normally require no extra user click. Keep them. Benefit: reliable extraction without exposing internal services or exhausting runtime. Preserve regression cases for private/loopback addresses, changed DNS targets, redirect chains and compressed bombs. Permit documented format exceptions rather than replacing the guard with unrestricted fetch.

### 21. Broaden compatibility only where evidence justifies it — P3, investigate
Location: safe URL/product-shape rules, IPv4-only resolver and MIME handling. Legitimate IPv6-only sites or unusual product URLs can fail despite being valid coffee pages. Add narrowly tested support when a real supported roaster demonstrates the gap; keep address validation for every address family. Existing 900 KB default and bounded 2 MB product retry already address some large pages. Benefit: fewer false negatives without unbounded downloads. No current failure rate or need for universal size increases was established.

### 22. Consolidate preview paths and parser ownership — P2, caller/log audit first
Location: Netlify preview, deployed `dic-preview-coffee` v3, verification Edge v5 and shared parser modules. Current client uses Netlify preview, while an older preview Edge remains deployed. Determine all callers and recent use before retiring it. Share parser contracts/fixtures rather than maintaining inconsistent implementations. Benefit: fewer moving parts and divergent outputs. Keep verification separate where it has a different trust/write purpose. Validate old clients and rollback compatibility before any provider deletion.

### 23. Keep deterministic facts separate from approval and estimates — Retain/improve wording
Location: extraction, Add Coffee, canonical verification and engine. Current preview is deterministic and explicitly unverified; personal Pending coffee remains useful. Do not reintroduce paid AI, mandatory complete metadata or approval of every missing optional field merely to make forms look finished. Keep clear provenance for extracted facts, estimated roast/style recommendations and administrator decisions. Benefit: fast usable records without invented facts. Validate blank optional fields, manual overrides and isolation between personal style preference and shared coffee identity.

## D. Test execution and evidence quality

### 24. Eliminate identical execution across CI workflows — P1, remove duplication
Location: cloud-beta-ci, cloud-regression and visual-review workflows. Full Node tests overlap the cloud/fast subsets; lint/build repeat. `cloud_owner_qa.py` and `admin_invitation_qa.py` run in both cloud-regression and visual-review. Execute unique coverage once and reuse results/artifacts tied to exact inputs. Keep unique PWA/offline, SQL, signed-HTTP and visual checks. Benefit: less runner work and quicker feedback without deleting scenarios. Verify coverage mapping and failure propagation; no end-to-end speedup has been measured.

### 25. Make checks sensitive to the changed surface — P1, modify
Location: workflow triggers and release readiness. Several push triggers filter paths while pull-request triggers run for all changes. Documentation-only work should not routinely rebuild and exercise every SQL/browser path. Use an always-reported readiness result that verifies the necessary suites for the changed dependency graph. Missing or failed required evidence must not become success. Benefit: faster small changes. GitHub skipped checks can remain Pending, so update the release controller with the conditional-job policy rather than blindly adding path filters.

### 26. Cancel superseded development runs consistently — P2, modify
Location: CI concurrency. Cancel obsolete runs for the same development PR/branch so newer changes do not wait behind irrelevant work. Do not cancel an in-progress production claim, migration or backup. The two release entrypoints already share a serialized concurrency group; preserve that. Benefit: shorter queues, fewer redundant downloads. Validate that final required checks refer to the candidate, not a cancelled predecessor, and that release/backup cancellation behavior remains separate.

### 27. Replace brittle source-text proofs with behavior — P1, modify
Location: approval-coverage audit, literal source checks and source-regex tests. Exact strings, expression order and test titles can fail during behavior-preserving changes and can pass without proving a feature works. Test public interfaces, rendered actions, state transitions and SQL outcomes; retain a small set of intentional artifact/secret/forbidden-UI boundary checks. Benefit: fewer false failures and stronger evidence. Validate both a legitimate refactor that passes and an actual behavioral regression that fails; do not simply delete failing assertions.

### 28. Test the built app, not only reconstructed source — P1, rebalance
Location: browser `cloud_owner_qa.py` and build output. The inspected test bundles source with regex transformations and a mocked client/store. That is useful component coverage, but not the actual deployed module graph, SDK, configuration or service worker. Keep focused mocks and replace redundant executions with a small built-dist integration smoke using controlled fixtures. Benefit: fewer tests that miss packaging failures. Validate actual entrypoints, offline shell and role boundaries; synthetic integration remains distinct from owner/device acceptance.

### 29. Pin and cache test tooling — P2, modify
Location: package scripts, browser/visual workflows. Prefer locked development dependencies over repeated ad hoc tool downloads; cache supported Playwright browser binaries and fixture assets. Pin font assets instead of downloading moving main/master versions during visual tests. Benefit: more reproducible results and less network/setup time. Confirm the actual Netlify ignore-hook runtime before deleting the Node 18 compatibility test; the main app's Node 22 setting alone does not prove that test is obsolete.

### 30. Remove the second full unit suite from publication — P1, conditional on evidence binding
Location: `netlify.toml`, `build_cloud.mjs`. Production currently repeats `npm test` after source CI. Once the release controller reliably binds the tested application inputs, dependencies and build recipe, publish with a production-configured build plus focused artifact/configuration checks. CI's fake Supabase coordinates mean its artifact cannot simply be shipped unchanged. Benefit: shorter release execution. This does not remove Netlify's per-production-deploy charge. Validate production config, static boundaries and tested-source/build-content correspondence.

### 31. Reuse genuine acceptance evidence — P1, process simplification
Location: acceptance register and owner-test instructions. Re-test an owner scenario when its code, configuration, environment or relevant dependency changes, or a regression appears, not merely because another chat starts. Preserve source, automated, hosted and owner-device evidence as different categories. Benefit: less repeated owner work without inventing acceptance. Validate traceability to the affected change. Previously completed signup, redirect, support-email and alert receipt checks should not be reopened from an older dated paragraph alone.

### 32. Keep opt-in live roaster probing and meaningful SQL tests — Retain
Location: roaster-source-probe and isolated-sql-regression. Live public-page probes already require explicit markers/manual invocation; they are not a compulsory every-PR crawl. Isolated SQL tests exercise migrations, actual JWT/PostgREST authorization and concurrent snapshot behavior, unlike duplicated UI source checks. Retain this distinct coverage, schedule it according to risk and use stable fixtures for ordinary development. Benefit: real signal without needless external traffic. Do not count test totals or green badges as the quality objective.

## E. Release requirements and operations

### 33. Bind approval to an immutable candidate, not a moving branch — P1, modify
Location: operations `chat-release-request.mjs` and runner. Current expected-development-head equality can invalidate a prepared release after unrelated documentation advances. Freeze the approved tested application candidate and its dependency/build inputs; still compare-and-swap the current release branch and reject unapproved content. Benefit: parallel documentation no longer restarts readiness. Validate harmless documentation changes, material source changes and concurrent release attempts separately. A candidate approval must not silently include newer features.

### 34. Generate one release manifest and its views — P1, simplify
Location: release authorization, request, consumption, credit and coverage records. Keep one canonical structured release transaction containing scope, approval, source/build inputs, tests, backend versions, recovery basis and outcome; generate human-readable summaries instead of manually retyping facts across documents. Preserve historical receipts. Benefit: fewer contradictions and hand edits. Validate schema and provenance once per transaction. Do not turn source-only metadata validation into a claim of actual provider verification.

### 35. Apply backup freshness by change risk — P1, modify policy
Location: request validation's two-hour request/backup-verification constraints and latest-write coverage. A styling or copy release should not demand a fresh database snapshot merely because someone logged coffee since the last backup. Use the agreed recovery window and verified backup health for low-risk frontend changes; require a current covering snapshot and appropriate rollback/restore plan for data-transforming changes. Benefit: removes irrelevant release work. Recovery-point tolerance is an explicit policy choice, not an invented guarantee or permission to lose history.

### 36. Reconcile credit rules in one place — P1, modify
Location: exact 15-credit grant check, 24-hour credit evidence and ignore-build owner-managed exception. The current 15-credit production deployment figure matches Netlify's published credit-based documentation; the problem is duplicated, differently enforced policy and inaccessible balance, not evidence that 15 is wrong. Centralize the limit and owner-managed evidence handling. Benefit: fewer contradictory holds. Do not invent account balance, enable auto-recharge or purchase credits. Shorter tests do not eliminate the deployment charge; fewer publications can.

### 37. Keep one release approval, not repeated component approvals — Retain existing simplification
Location: AGENTS universal deployment authorization and canonical decision. A direct owner deploy instruction already covers necessary pending frontend/backend/SQL/Edge/provider steps in the scoped bundle. Generate one clear release summary and execute only that approved scope. Benefit: no repetitive permission loop for every named migration. A different future release, unrelated destructive change or purchase is not included. Validate exact source/scope and mark the one-use approval consumed only through the controlled path.

### 38. Add an explicit safe rollback transaction — P1, modify
Location: `one-use-claim.mjs`. Normal publication rejects a source SHA already published under another grant, which is unsuitable as the only rollback route. Add a distinct fresh, bounded owner-authorized rollback operation targeting a known-good artifact with backend/schema compatibility verification. Prefer restoring a retained provider deployment when appropriate rather than fabricating a code change. Benefit: faster recovery. Netlify documents no deployment-credit charge for restoring a previous production deploy; account/provider operation must still be verified and authorized.

### 39. Automate actual deployment readback — P1, modify
Location: controlled release runner and both release workflows. The runner stops after the Git claim; it does not itself establish Netlify current/READY publication. Add one postflight that resolves the actual published commit/artifact and hosted migration/function versions, performs focused smoke checks and records success or partial failure. Benefit: fewer manual follow-up loops and clearer failures. Release metadata changes the final Git commit, so record both tested application identity and release-wrapper SHA. Do not call Git push success deployment success.

### 40. Separate small releases from complete-beta acceptance — P2, process clarification
Location: readiness docs and backlog. Keep missing recipe-family/recommendation/experiment work visible, but do not automatically block an independent correction on every unrelated feature or unavailable full-provider disaster drill. Define the promised milestone and applicable blockers. Benefit: useful incremental delivery without claiming the complete product is finished. Validate the changed surface and retained limitations; do not delete unfinished requirements or call synthetic checks authentic acceptance just to clear a gate.

## F. Backup and provider reliability

### 41. Fix the stale app-source backup pin — P1, confirmed mismatch
Location: operations `nightly-backup.yml`. Its application checkout is pinned to `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`, while independently observed published source is `eee687dd4d7fc19493139bc106e63c16849ac91d`. Capture verified published application and actual hosted schema/function versions automatically in the recovery manifest. Benefit: a coherent recovery package without hand-updating a hidden SHA. This is source-version drift, not evidence that the database dump omitted shots. Validate a restored package against its recorded versions.

### 42. Retain encrypted offsite backups; simplify routine proof — Retain/modify
Location: nightly dump, age encryption, private Drive courier and weekly isolated restore. Keep automated backups and usable recovery keys outside the runner. Verify routine artifact integrity automatically; periodically test the exact encrypted offsite chain and recheck after backup/key/schema changes. Do not demand repeated owner decryption demonstrations for every UI release. Benefit: real recovery with less ceremony. A successful fresh-snapshot SQL restore, offsite file presence and exact-archive restoration are different evidence; report them separately.

### 43. Keep independent monitoring, deduplicate notifications — P2, conditional
Location: historical Apps Script courier source and existing backup watchdog. A courier cannot report that its own trigger has stopped; an independent watcher is therefore not redundant. Keep actionable failure/staleness checks, deduplicate ordinary repeated failure notices, and maintain artifact pagination/idempotency as volume grows. Benefit: fewer noisy alerts without silent backup failure. Live Apps Script execution/settings were not accessible, so these are source-informed recommendations. Do not create a second watcher or repeat already accepted test emails by default.

### 44. Maintain a compact provider recovery inventory — P2, modify
Location: Cloudflare/Resend/Auth/Netlify recovery records. Preserve nonsecret DNS, mail, redirect and configuration references and update them when those settings change, rather than recollecting every screenshot for ordinary frontend releases. Benefit: simpler recovery and fewer owner interruptions. Historical evidence supports previously working sending/forwarding; this audit did not verify current dashboards. Do not enable unused mail receiving or other services merely to turn a provider badge green, and never store credentials in the report.

## G. Governance, old code and database controls

### 45. Generate a small effective requirements view — P1, simplify
Location: Master Specification, Decision Ledger, coverage matrix and dated addenda. Preserve original decisions and provenance, but generate one current effective-policy view with explicit supersession links. Derive owner-decision inventories instead of manually maintaining a second sorted key list. Separate documentation consistency failures from ordinary app compilation while retaining release traceability. Benefit: less drift and less re-reading of historical contradictions. Validate that no Locked requirement disappears and old texts remain available as history, not competing instructions.

### 46. Replace the shared journal hotspot with scoped append-only records — P1, modify
Location: fixed dated active journal and checkpoint verifier. Preserve contemporaneous same-commit evidence, but allow a small per-workstream journal entry and generate a compact current checkpoint. Do not require every parallel change to prepend into one growing file. Benefit: fewer merge conflicts and smaller recovery context. Validate that every code/test/CI commit still has a linked contemporaneous entry; archive history in place or with preserved links. This proposal does not waive present journal requirements before implementation.

### 47. Coordinate overlapping work instead of repeated replacement PRs — P1, process
Location: shared cloud main, canonical docs and concurrent work branches. Use one integration owner/queue for overlapping files and deliver coherent small batches with a same-commit record. Independent modules can proceed separately. Benefit: less repeated rebasing, duplicate CI and accidental resurrection of withdrawn features. Validate reviewed ancestry and integrated behavior with non-force Git operations. Preserve work and record superseded PR links; do not use blanket force pushes or disable review to get around collisions.

### 48. Separate retired prototype behavior from the shipped engine — P2, dependency audit
Location: `site/lib/engine.js`, build copy list, Settings wording and dormant private mutation code. The shipped engine file still exports local Hide Shot and older prototype outlier/mutation helpers; current cloud routes and live public API reject Hide. Remove unused exports/imports or separate a tested legacy/prototype module only after caller analysis. Benefit: smaller code and less ambiguity about authoritative behavior. Keep historical hidden fields, records and migration history. Dormant privileged code is not proof of an authenticated bypass.

### 49. Triage database adviser findings, not every warning as a blocker — P2, retain justified controls
Location: RLS, SECURITY DEFINER RPCs, foreign keys and indexes. Provider advisers reported 12 unindexed-FK and 11 unused-index INFO findings, plus intended private no-policy tables and privileged-function warnings. Inspected routines use fixed search paths and admission/owner checks. Investigate grants and actual query plans; do not blindly add/drop indexes or switch every function to invoker. Benefit: less busywork and appropriate optimization. At 22 shots, usage counters alone do not establish safe index removal or an urgent performance issue.

### 50. Keep silent integrity boundaries while sharing intended coffee data — Retain
Location: server ownership/admin checks, revisions, mutation IDs, SQL constraints, audit and snapshot history. These prevent wrong-account writes, lost edits, duplicate retries and corrupted recommendations; they do not need extra user confirmation on routine saves. Broader authorized read-sharing can be separated from permission to edit other members' records. Benefit: simple UI with durable trustworthy data. Validate cross-account writes, stale revisions, retry idempotency and historical reconstruction. Do not remove these controls solely because coffee facts are not confidential.

## H. Plugins and deployment environments

### 51. Avoid unnecessary platform or plugin changes — Retain lean stack
Location: package manifest, Netlify deploy metadata and provider architecture. One direct application dependency, Supabase JS, was found in the manifest; Netlify's inspected deploy reports no build-plugin state. These facts do not establish that every transitive package or account extension is absent or vulnerability-free. GitHub/Netlify/Supabase/Drive ChatGPT connectors are operator tools, not scripts automatically shipped to users. Benefit: focus effort on actual app costs instead of uninstalling unrelated plugins. No framework migration, database replacement, paid GitHub tier or new AI service is recommended.

### 52. Reconsider preview restrictions selectively — P3, optional configuration proposal
Location: Netlify ignore gate and non-production access control. A controlled preview of the production-configured build could reduce repeated manual uncertainty, but automatic previews for every tiny commit are unnecessary. Current Netlify credit-based documentation lists zero deployment credits for previews/branch deploys; functions, requests and bandwidth can still be metered. Benefit: test real artifacts before publication. Use isolated/synthetic data, preserve appropriate preview access, verify actual plan/configuration, and obtain explicit provider/cost authorization before enabling anything. This audit enables none.

## Recommended implementation sequence

1. **Unblock real user work:** reconcile policy PR #68; preserve and finish already-approved direct saves; implement nonblocking outlier review, contextual dose confirmation, dependency-aware queue repair and safe sign-out. These are coordinated UX/sync changes, not independent permission questionnaires.
2. **Remove repeated work:** consolidate CI coverage, add the built-artifact smoke in place of duplicate browser runs, lazy-load Admin, reduce full polling, and combine extractor preflight/quota policy. Measure request count and time-to-feedback before and after.
3. **Simplify delivery and recovery:** one generated release record, immutable candidate, scoped backup freshness, unified credit policy, actual provider postflight and explicit rollback. Correct the stale backup source pin. Keep private GitHub Free residual risks visible.
4. **Clean structure as justified:** effective-policy generation, scoped journals, caller-proven legacy retirement, server Community search and targeted database improvements. Broader offline trust and sharing-policy changes require their exact scope to be recorded, not inferred from implementation convenience.

One implementation plan can cover these workstreams. This register should not become another requirement for 52 separate approvals, 52 PRs or 52 repeated full audits. New source may be developed under properly scoped existing approval; deployment and paid/provider/data actions retain their explicit boundaries.

## Measurement and acceptance

Measure only a few useful outcomes: clicks to log/edit/review; successful queue progress after one failure; actual request count for idle use/Admin/Autofill; p50/p95 observed save/preview latency; CI runner time and wall time separately; owner interventions per release; unintended publications; and restoration to the recorded app/schema versions. Preserve shot counts, ownership and history invariants in relevant isolated tests. No percentage saving or zero-defect guarantee is asserted here. A prior optimization measured a 56.6% reduction in one secondary test stage, not an end-to-end deployment improvement.

## Explicit unverified items

Current Cloudflare/Resend dashboards, live Apps Script source/triggers/logs, Netlify remaining credits and all account-level hooks/extensions, current hosted password settings, exact offsite archive hash equality/decryption/restore, real iOS/Android owner flows, all transitive dependency advisories, full repository caller/dead-code analysis, actual load/latency/query plans, and all historical or concurrent branch implementations were not fully verified. These gaps are not disguised as passed tests. No new full test run, production error injection, restore or live account mutation occurred.

## Evidence index

Repository paths below refer to application pin `21a0a7552e406da3c383f96d53c2323891c6f363`, unless stated otherwise. Each recommendation names its owning file/function above.

- [Application tree](https://github.com/Schulzet3/The-Dial-In-Collective/tree/21a0a7552e406da3c383f96d53c2323891c6f363): `site/cloud/{main,client,outbox,cache,mapping,community}.js`, `site/admin/main.js`, `site/lib/{constants,model,engine}.js`, `build_cloud.mjs`, `scripts/pwa/service-worker.template.txt`, `package.json`.
- [Extractor entrypoint](https://github.com/Schulzet3/The-Dial-In-Collective/blob/21a0a7552e406da3c383f96d53c2323891c6f363/netlify/functions/coffee-url-preview.mjs) and [URL guard](https://github.com/Schulzet3/The-Dial-In-Collective/blob/21a0a7552e406da3c383f96d53c2323891c6f363/src/server/coffee-url-guard.mjs).
- CI: `.github/workflows/{cloud-beta-ci,cloud-regression,visual-review,approval-continuity,isolated-sql-regression,roaster-source-probe}.yml`; `tests/browser/cloud_owner_qa.py`; `scripts/audit/{approval-coverage,verify-commit-checkpoint}.mjs`; `docs/OPTIMIZED_DEVELOPMENT_AND_RELEASE_WORKFLOW_2026-10-21.md`.
- [Operations source](https://github.com/Schulzet3/The-Dial-In-Collective/tree/69b0c266b06c8feec719474188ec0a2c1a05910f): `scripts/release/{controlled-release-runner,chat-release-request,one-use-claim}.mjs`, both `dic-*-release.yml` workflows, `nightly-backup.yml`, `database-recovery-drill.yml`, `scripts/backups/create-nightly-encrypted-dump.sh`.
- Provider and catalog receipts: [Issue70 milestone1](https://github.com/Schulzet3/The-Dial-In-Collective/issues/70#issuecomment-6332663778), [milestone2](https://github.com/Schulzet3/The-Dial-In-Collective/issues/70#issuecomment-6332784511); [scheduled backup run](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39617682729). Private data and credentials are intentionally omitted.
- [Latest Hide Shot residual-status evidence](https://github.com/Schulzet3/The-Dial-In-Collective/blob/79a7e99d49112bf09a108ee131e97d5b2fcef898/docs/CURRENT_STATUS.md), [policy PR68](https://github.com/Schulzet3/The-Dial-In-Collective/pull/68), dated backup-courier and hosted-provider recovery inventory documents.
- External primary references checked October21 MDT: [GitHub skipped workflow checks](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs); [Netlify credit accounting](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/); [Netlify credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/); [NIST SP800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html); [Supabase functions](https://supabase.com/docs/guides/database/functions); [OWASP SSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

## Contemporaneous audit journal / handoff

Owner audit scope was recorded immediately in Issue70. Milestone1 recorded inventory/provider/CI duplication; milestone2 recorded runtime, database catalog, release and backup findings. Both were read back. Final inspection preserved concurrent Hide retirement and PR71 handoff; comparison from the audit pin to `15cfe636` confirmed documentation-only development changes. This commit adds only this report, preserving all source, tests, canonical decisions and existing journals. It is not a new product-decision implementation or production release.

Next action: use this register to create a consolidated implementation plan and exact narrow supersessions where needed; begin the highest-value approved source work without repeating already completed owner acceptance. Before any future publication, independently recover current source/provider state and the actual release authorization. Audit recommendations remain unimplemented unless separately evidenced. Record report commit readback and publication status in Issue70.
