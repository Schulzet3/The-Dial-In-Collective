## Issue96 repairs READY, NOT DEPLOYED (2026-10-23T06:20:55.390833+00:00)

PR97 and follow-up PR98 are merged. Final source 5b1bc56c8d2d111ab70f14f1bd1bf58de4f9146d has tree 9843b383d38aea0d413381eeab4eb3aaaac5e82d, identical to tested PR source b3599c235b6b1bff148272c5d3556b678219da66 and its tested merge ref. All seven final PR checks and all four applicable merged-source checks PASS. SQL/visual/security evidence is reused from the identical passing PR tree; no skipped check is called passed. Six findings repaired: approved password composition, bounded request parsing, truthful catalog-cache provenance, long-note preservation, privacy wording and pathological HTML processing, including repeated quoted attributes. Local673 Node cases pass; final browser/mobile/visual/offline/built-app and isolated SQL/signedHTTP/snapshot suites pass. Current locked production dependencies have zero known advisories. Final tested inventory470 files/72863 text lines/3 binaries; all13 follow-up file hashes and earlier39 repair hashes independently matched CI artifacts.

Queue preserves #93 READY and now includes #96 READY. Production remains READY6adabcecd4a2a68e94cdc09a/sourcef97b8f30. No website publication or hosted SQL/Edge/Auth/member/permission changes. A later release must publish Netlify/app and both Edge functions with shared helpers; no new SQL migration. Live public/anonymous probes32/32 passed on unchanged production; saved counts remain22 shots/22 notes/5 accounts/2 Community/48 receipts.

Coverage limits remain explicit: automated screening is not manual interpretation of every archived line; live signed-member/admin sessions, hosted Auth configuration, genuine preview SSO, physical-device/VoiceOver and inaccessible provider-admin controls were not verified. No blanket security certification or historical note recovery is claimed. No new Project Settings rule is needed for these approved implementation fixes. [Final evidence](audits/2026-10-23-security-ready-receipt.json).

---

# Issue 96 - source, Supabase and Netlify security inspection

## Authority and exact scope
Owner asked for repository-wide inspection, penetration testing, equivalent provider tests and completion of unfinished repairs. This authorizes source development, isolated attack simulations and bounded read-only public probes, not publication or production account/data/schema changes. GitHub private/Free, all Locked decisions and the existing #93 READY item remain intact.

Starting application: `459d2418ec75a71aaa908e3982965c2b5d7aa97b`; operations: `1678391d18d96d72f207a42b5edf6da506e8b7b1`; published release: `f97b8f30c25f6d4ef30c5d79d12daf4fb0670e2f`. Audit branch before repairs: `471f2666799b8b04ad873f7e4f39684c4f215776`. Current source SHA and final outcomes belong in the completion receipt, not an assumed future SHA.

## File coverage and method
Private source artifact run39900425092/artifact12478796499 SHA256 `71a95a1c22182254c174535cba6b7eb020315f40f35f5c3f35b0618acb5d7f5c` was independently checked. Application456 files/72,237 lines, operations52/3,239, published442/71,520. Across39 refs:897 unique blobs/243,322 text lines/3 binary assets. All text was pattern-screened; original historical/decision evidence was retained.

The reproducible `scripts/audit/security-inventory.mjs` reads every tracked byte and records each exact path, SHA256, line count and coverage classification. It reports redacted credential-signature candidates only. This is NOT a claim that every archived line was manually interpreted or every old commit/history object was checked. Targeted semantic review concentrates on authentication, member/admin routing, outbox/cache owner boundaries, rendering/escaping, URL/DNS/redirect/decompression boundaries, parser complexity, request handling, note serialization, privileged SQL/policies and release/recovery guards. Historical material and binaries are inventoried, not relabelled executable tests.

## Confirmed findings and repairs
| ID | Finding | Source repair | Verification |
|---|---|---|---|
|96-1|New-password composition contradicted approved8+ digit+symbol policy|Only creation/reset validator and hint corrected; existing sign-in unchanged|Password cases and full Node regression; hosted Auth settings are not changed or certified|
|96-2|Edge JSON unbounded; Netlify body read lacked deadline|Shared4200-byte UTF8 budget,5-second absolute deadline, abort, nonblocking cancel, object-only JSON and explicit failures before SDK/service access|Real handler VM negative cases plus stalled/slow/malformed/lying-length/Unicode stream fixtures|
|96-3|Approved catalog cache labelled independent source verification|Return approved_catalog/catalog_approved=true/source_verified=false/verification=unverified; same exact-URL, quota and cooldown behavior|Cache/provenance/no-outbound-charge regressions|
|96-4|New notes silently truncated to10,000 characters|Preserve up to existing16,000 Unicode-codepoint DB limit; reject longer text before enqueue/save without shortening drafts|10,001/16,000/16,001 and supplementary Unicode tests; edit/revision preservation|
|96-5|Settings copy referenced retired Hide/delete and hid admin exception|Explain eligible anonymous Community, private notes exclusion, authorized administrator access, reversible Remove Access|Source regression and browser suites; no permission alteration|
|96-6|Malformed HTML caused excessive synchronous regex CPU|Monotonic raw-block/comment scanning, nonnested tag classes, bounded attribute-name matching; original Unicode offsets preserved|Killed-child reproductions before repair exceeded2 seconds; expanded adversarial corpus after repair completes roughly1-100ms locally; CI child ceiling8 seconds, not a live DoS/load test|

Metatag-only repeated invalid attributes were additionally reproduced at >2.5seconds and repaired with boundary-anchored bounded attribute names. All supported extractor fixtures remain required; no larger source budgets, invented roast fields, relaxed host restrictions or AI calls were introduced.

## Supabase live read-only evidence
Current catalog:46 app tables/all RLS,43 policies,90 functions; zero direct client table-write grants, zero anonymous executable public dic functions, zero definer functions missing fixed search_path, no user_metadata authorization references, no client CREATE privilege on public/private, no application views and no Storage buckets/objects. All43 policy definitions were examined: personal reads require membership+ownership, catalog/Community reads are gated, private direct access is false/no-policy, administrator reads require admin. No missing-policy INFO was blindly 'fixed' by granting access.

Counts remain22 shots,22 notes,5 accounts,2 Community records,48 receipts. Both deployed Edge functions were retrieved: verifierv5 and previewv3 ACTIVE/JWT enabled; they still serve the previous code. Their shared modules must be included when the owner later publishes these repairs. Internal Hide retirement stays explicitly owner-deferred. No extra backup/export, live write, new identity or permission change.

The new isolated `security_surface_inventory.sql` asserts whole-schema security invariants against the final migration set on disposable dic_ci only. Existing signed-HMAC HTTP tests exercise real PostgREST against generated local keys/fixtures, not real production members or GoTrue sessions. Production Auth configuration not exposed through the available tools remains unverified; client validation is not a substitute for server policy.

## Netlify and live HTTP evidence
Netlify production remains current READY deploy `6adabcecd4a2a68e94cdc09a` / sourcef97b8f30. Nonproduction SSO is configured according to provider metadata, but genuine nonproduction challenge behavior has not been tested against a verified nonproduction deploy. The release-production alias is a production URL, not an SSO defect.

Run39905265823 on471f2666:32 public/anonymous nonmutating HTTP checks PASS, artifact12480940595 SHA256 `9cdb5ae3981fab7ee1fc478dcf63f0956709f353a8a45aae35517eedf49a2f25`. Tested private-file denial, anonymous REST/Edge/RPC denial, invalid/unsigned JWT rejection, preview method/origin/content-type handling and production alias identity. Headers recorded; no private response bodies/credentials recorded. The earlier failed run39901320648 is retained as an audit classification error, not relabelled green.

## WSTG-oriented coverage, not certification
| Area | Evidence | Boundary |
|---|---|---|
|Configuration / deployment|File/build allowlist, private-path HTTP negatives, current deploy, release/backup source checks|Provider admin/build-hook/SSO runtime controls not all inspectable|
|Identity / authentication|Live missing/invalid/unsignedJWT rejection; current membership guards; isolated signedHTTP admin/member/disabled/never-admitted tests|No production credential guessing, account creation, or signed live sessions|
|Authorization / IDOR|Entire RLS/grant/function catalog; isolated cross-owner/private-note/admin/search tests|SQL/CI fixture evidence is not a new real-member device receipt|
|Session / offline isolation|Outbox/cache owner, stale revision, expired-session and account-race regressions; Chromium PWA suite|Physical WebKit/storage eviction and live recovery are not certified|
|Injection / XSS / input validation|Escaping, search parameterization, source URL/DNS/redirect/decompression tests, bounded bodies and malformedHTML|No live exploit payloads written to member records|
|Business logic|One-use replay/race, invitation and outlier lifecycle, source/canonical distinctions, note preservation|Deferred feature requirements and device-only gaps remain their focused issues|
|Client / transport / dependencies|Packaged browser/build integrity; recorded HTTPS headers; exact locked npm advisory check|No exhaustive TLS cipher scan, third-party platform pentest or all historical-secret clearance|
|Resource exhaustion|Disconnected child-process parser probes and stalled stream simulations|No production DoS, bulk load or rate-limit saturation|

## Verification and delivery
Local baseline650/650; repaired suite672/672 at this checkpoint. Earlier failures from old password/cache expectations and VM imports were corrected without deleting security assertions; expanded metatag fuzz and Unicode offset cases added. One read-only SQL query had a syntax error; corrected read-only queries succeeded and no mutation occurred.

Exact-source GitHub Node/lint/build, SQL/signedHTTP/snapshot, cloud/mobile, visual/built/offline, continuity and dependency/security-inventory results must be recorded before READY. Existing valid provider evidence may be reused because production remains unchanged. No source-only result means publication. Remaining unavailable provider settings, true signed production sessions and physical-device coverage must remain explicitly UNVERIFIED, not PASS.


## Final repeated-attribute correction
Expanded isolated tests found a single tag with15000 repeated quoted class attributes exceeded2.5s; related metadata variants took1.4-1.7s. Twelve parsers now bound ambiguous tag/attribute-value scans, with an additional four-case child-process regression. Equivalent cases run21-24ms locally and the complete673-test suite plus final CI pass. Earlier650/672 and456-file counts are dated checkpoints; final tested source inventory is470files/72863lines. All known findings from this audit are repaired in queued source, not deployed. Remaining limits listed above are not relabelled PASS.
