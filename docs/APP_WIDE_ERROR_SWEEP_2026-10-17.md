# App-wide error sweep and readiness

Date: 2026-10-17. Active branch: `development/backend-foundation`.

**Development fixes and local regression checks completed. No publication. Full beta readiness is not established.** Exact GitHub Actions/source evidence is recorded in the final checkpoint below after read-back. This report does not certify every possible input, device, provider setting or future website as error-free.

## Source, authority and scope

Baseline: `d788572438bae2e4c23f4264e783f798a733bbb7`, including the Queen City implementation `4486e58ff82d4a8de36a5a71bf1aa8650b65e8f9`. All 182 source blobs in the complete recursive GitHub tree were retrieved at that immutable revision and matched to their Git blob hashes before edits. Review covered application controllers, state/cache/outbox, recommendations, import/recovery paths, admin UI, extractors, authentication/admission interfaces, SQL migrations/tests, build/release controls, backup scripts, workflows, dependencies and current documentation. Static checks, adversarial regressions and browser fixtures supplement source inspection; this is not a proof that every execution path was exercised.

Authority: the owner's app-wide fix/document request, `AGENTS.md`, Current Status, the Queen City handoff, canonical specification/ledger and narrowly scoped later Locked amendments. No Locked record was rewritten, and no product feature was invented to close a tracking issue. Historical SQL, original requirements, imports, recovery tools and dated reports remain preserved. No blanket dead-code deletion was performed: an unbound feature helper or an old migration can still have a retained purpose.

## Confirmed problems fixed

| Finding | Confirmed behavior | Correction and evidence |
| --- | --- | --- |
| F01: account-transition races | A former account's pending read/cache write/match response could complete after an identity change and restore stale private UI state; an old sync could also change the new account's indicator. | Central owner/epoch checks, immediate clearing of rendered state and modal drafts, owner-labelled outbox notifications, guarded export/sync/match/verification paths and protection from late sign-out completion. Durable original-owner queued events remain intact. Eight account-transition regression cases. |
| F02: admin session invalidation | An already-rendered admin dashboard remained visible after a cross-tab sign-out/account change; a late dashboard response could restore it. | Observe auth changes before initial reads, clear private records synchronously, and discard invalidated reads/errors. No SDK calls inside that callback. Two admin-session regressions; existing server-side admin authorization remains required. |
| F03: contaminated/conflicting coffee evidence | Hidden/navigation/related-product labels could fill missing facts; conflicting structured/visible process evidence could retain the first value, including one component of a compound process. | Shared bounded product markup scope for visible parsers, recipe and roast graphics. Withhold conflicting process/roast/release fields; compound processes remain unsimplified. Add a short review notice. Four new regression groups plus existing Queen City, graphic, delimited and multi-roaster fixtures. |
| F04: unbounded incoming preview body read | The endpoint read the whole request before applying its small payload check. | Read at most 4,200 bytes from the stream, cancel excess, release the reader, and reject before auth/quota/outbound work. Oversized and valid streamed-request regressions. The outbound 900,000-byte/decompression/DNS safeguards remain unchanged. |
| F05: incomplete lint coverage and unused bindings | Existing lint omitted active server/Netlify/Edge entry paths and reported unused imports/bindings. | Extend coverage, remove confirmed unused bindings and a duplicate branch/import, pin ESLint 10.13.0 and require zero warnings. Ignore generated build/screenshots. Runtime dependency versions are unchanged. |
| F06: visual gate absent from active branch and stale harness | The visual workflow named only the old review branch. When actually run, its URL test still required a second Apply click, contrary to current shipped behavior. | Add scoped active-branch triggers, keep secret-free test coordinates, lint/build/import checks and light/dark screenshots. Update the harness to exercise current one-click autofill, preserve typed values and verify no save on preview. Retain the older optional Apply helper pending the wording reconciliation below. |
| F07: stale current documentation | Root README still said 226 tests, daily-cap/taxonomy decisions Open, and documentation-only task. | Update README, documentation index and the backlog's supersession notice; preserve dated original counts and audit findings. Current Status points here. |

The targeted failure cases were reproduced against baseline code before the initial fixes. New tests exercise async completions, data isolation and bounded stream behavior rather than only matching implementation text. A brittle sign-out source assertion was replaced by behavioral pending-change preservation coverage.

## Local verification

| Check | Result and boundary |
| --- | --- |
| Dependency installation and audit | Exact runtime lockfile installed; npm audit reported zero known vulnerabilities in the nine-package dependency tree. This is a registry advisory result, not proof of no vulnerabilities. |
| Node regressions | 290 tests pass, 0 fail, 0 skipped; 274 baseline tests plus 16 new cases. Local runtime Node 24.19.0; Actions exercises Node 22. |
| Lint | ESLint 10.13.0: zero lint errors/warnings across configured browser, server, Edge and audit modules. Environment-level npm proxy notices are not source lint findings. |
| Build/import integrity | Allowlisted cloud build with a nonfunctional public test key; 26 shipped assets and every transitive import reachable. No docs, SQL, tests, backup scripts or privileged material shipped. |
| Syntax | Tracked JavaScript, new test modules via execution/lint, both browser Python scripts and backup/isolated-regression shell syntax checked. |
| Mobile browser harness | 30 checks pass at 390px, including logging/rating/editing, pending-change sign-out protection and reconnect behavior. Mock auth/backend and in-memory storage. |
| Visual/browser review | 117 checks pass, 36 screenshots across light/dark and mobile/desktop views. Selected rendered New Coffee and Admin screenshots inspected. Mock accounts; no production writes or live authentication. |
| Public source reads from local runtime | All direct pinned-DNS fetches returned `source_fetch_failed` in this environment. No safeguards were weakened or proxy bypass added. This local attempt is not successful current-source acceptance; use the controlled GitHub job below. |
| SQL | No SQL/schema changes in this sweep. Existing isolated SQL acceptance remains dated prior evidence; it was not rerun against production. |

## Fresh read-only service evidence

**Supabase** (`azviqqejypsefzilgonr`): ACTIVE_HEALTHY, PostgreSQL 17.11. Migration inventory contains 25 applied migrations through seven-tier compatibility; the owner coffee-data correction remains staged. Existing `dic-verify-coffee` v4 and `dic-preview-coffee` v1 are active with JWT verification enabled; no deployment here.

Independent read-only counts: **15 shots, all 15 visible; four Verified coffees; one community shot and one contribution link; zero rows for the already-purged test-shot UUID**. Verified coffee roast values remain three Light and one legacy Light-Medium; the queued reclassification has not been applied. Zero Storage buckets/objects. No ordinary public/private application table was found without RLS. No row mutation, invitation action or repeated purge occurred.

Security review: app SECURITY DEFINER functions use explicit safe search paths; anonymous execution was not granted to them. The public universal-preview claim's definer grant is deliberate, with authenticated role/UID, admission and confirmed-email checks. The shared private quota uses a serialized per-owner counter, 12 claims and at least 30 seconds between claims in the 24-hour budget window. Four private-table no-policy advisor notices describe internal-only tables; adding permissive policies would weaken that design. **Leaked-password protection is still reported disabled** and remains an unresolved settings/plan review. Six unindexed-FK and fourteen unused-index performance notices were observed; none justified destructive index removal or production DDL without workload evidence.

The last-24-hour log review contained seven management inspection-query errors, five PostgREST permission-denied entries and one Auth `/token` refresh lookup timeout (`context canceled`). Management queries include prior audit mistakes, not evidence of lost member data. Permission denials alone do not prove an authorization bug or establish that each was an intended test. The single refresh timeout's root cause remains unconfirmed; there is no evidence here for a specific application fix. No recurring incident is claimed from this small window.

**Netlify**: published deploy remains `6ad2c872ad7a8fa78dc410dc`, READY, source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`. Production extra SSO is off and nonproduction SSO remains on. New frontend/server fixes and seven-tier UI are staged, not live. Billing/credit balance and build-hook configuration are not exposed by the available read tools. No release marker, deployment, setting or plan change was made.

**GitHub/backup**: `main` remains backup operations. Its workflow still pins the published source SHA above and retains encrypted artifacts 30 days. Successful scheduled run [39034890506](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39034890506) produced artifact `12101976786` at 2026-10-17T13:02:23Z, 537,072 bytes, provider digest `sha256:c3b0f9b2e54d3aafe6dbd1415bbe30d5bfa630caf405bcf257bf226516ce86a5`, expiry November 16. This is current provider metadata, not a fresh decryption/restore. Main and its backup pin were untouched. Ruleset lookup returned 403 with a private-repository plan restriction; branch-protection administration was not available through this connection.

**Google Drive / Apps Script**: the October 16 ciphertext's exact known Drive ID still resolves to the previously recorded 380,078-byte ZIP. Folder/search results did not reliably enumerate even that known accessible file, so empty search results do not prove no new delivery. Today's ciphertext delivery/hash, current live Apps Script source/properties, installed trigger/execution state and 30-day cleanup remain unverified. The prior two exact-byte deliveries, owner-confirmed test alert and isolated recovery remain dated evidence; no duplicate alert or destructive drill was run. Independent encrypted coverage of development documents remains tracked in #28.

**Cloudflare / registrar / Resend**: repository recovery/security documentation was reviewed. No connected management capability exposed the private DNS/registrar/Resend settings; an attempted browser fallback did not produce usable state. Current DNSSEC, email policy/key settings and account controls cannot be certified from earlier screenshots or public site availability. No credentials were requested or copied and no account configuration changed. These limits remain #27.

## Unresolved scope and preservation decisions

- **Full beta remains incomplete.** #9–#13 and #21 retain core community, recipe-family/experiment, evidence-tier and offline/PWA implementation work. #14–#20, #23–#24 and other linked issues retain missing workflows; passing tests do not implement them. #22/#26 retain real cross-device, IndexedDB, iPhone/Safari and accessibility acceptance.
- **Autofill decision wording needs reconciliation (#8).** The preserved Locked `NEW-COFFEE-URL-AUTOFILL-20261015` text names Apply Suggested Details; the later universal-preview acceptance and published implementation use immediate blank-field autofill followed by Add Coffee. This sweep changes neither product behavior nor Locked wording. The old optional Apply helper was retained rather than declared safely removable on that ambiguous authority. Obtain a narrow owner decision if no later explicit approval resolves the wording; then record its scope in both canonical records.
- **Extractor limits remain (#5/#25).** Arbitrary malformed/dynamic pages and future layout changes are not completely solved. Source conflicts intentionally leave fields blank. The Picky Chemist's known oversized page remains blocked; the 900,000-byte cap must not be increased silently. Official Edge parser coordination and authenticated post-release acceptance remain in the rollout.
- **Provider/backup limitations remain (#27/#28).** Disabled leaked-password protection, restricted settings, Auth timeout cause, current Drive delivery, trigger health, retention execution and overlapping watches are not marked solved. No production performance claim follows from a tiny dataset or unused-index counters.
- **Missing sources remain (#30).** The supplied ZIP contents were inspected: nine original research entries are pointers, not their full report bodies. The separate 15-page Extraction Windows PDF is available but is a different report. The attached older JSX/chat/backup records remain historical sources, not replacements for current Locked decisions. No personal transcripts, exports or secrets were republished.

## Readiness and exact next action

The confirmed fixes are staged for the next coordinated release review. **Do not publish under this sweep.** Before any later release, reconcile any needed product wording, complete the applicable outstanding acceptance, obtain the current Netlify credit screenshot required by the existing gate, and follow [the ordered seven-tier rollout](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md). Verify the compatible frontend live before applying the exact approved coffee-data correction; preserve private Pending Wuri, all IDs, shots and community history. Refresh main's published-source backup pin only after that release is verified.

## Final GitHub checkpoint

Implementation commit and actual Actions results are pending the commit/read-back stage of this sweep. Local pass counts above must not be described as GitHub Actions or production acceptance. Current Status will record the final source SHA and run links when those checks complete.
