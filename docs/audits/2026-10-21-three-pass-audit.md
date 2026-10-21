# Three-pass project audit and repair record

**Project:** The Dial In Collective  
**Date:** October 21, 2026 UTC  
**Status:** Three review passes completed. Integrated application source is in PR #48; core, SQL and signed HTTP CI passed, and the administrator browser harness repair is awaiting exact rerun. Operations PR #49 passed its own CI but its merge is held by automatic approval review. Source changes are not a production release.

## What this audit covers

The audit reconstructs the available project record, checks the implementation against that record, reproduces concrete failure cases, repairs confirmed defects, and independently reviews the combined result. It preserves accepted work, original decisions, past failures and concurrent changes. It does not claim that inaccessible conversations were retrieved or that every possible future failure can be eliminated.

The recovered baseline includes 318 tracked files, all 117 baseline documents, 915 reachable development commit metadata records, 79 original Locked requirements, 20 original Open decisions, 55 amendments, 35 current-owner decision records, 38 issues, 8 pull requests and 190 retrieved discussion/review records. Commit metadata coverage is distinct from manually reading every historical diff. Both supplied ZIPs passed integrity and all 24 recorded member checksums; all 15 pages of the supplied research PDF were inspected. Nine referenced original research bodies, full unavailable transcripts and the failed JSX transfer remain explicit access gaps in issue #30.

Concurrent administrator work through `5ab369e6755d26e0e2e2c22724722a14ed8535d6` was recovered and reviewed separately. It adds issue #47, one owner decision and a development-only administrator permission exception. Current approval coverage therefore has 36 owner decisions and 11 UI contracts. The original inventory totals remain dated evidence rather than silently changing to suggest a larger initial review.

## The three passes

| Pass | Work performed | Result |
| --- | --- | --- |
| 1. Recover and reconcile | Read available source, instructions, canonical requirements, current and historical journals, issue/PR discussions, supplied archives and provider receipts. Compare development, operations and published release states. Locate duplicates, stale instructions and unfinished requirements. | Complete traceability register; preserved acceptance and historical evidence; current source and production distinguished; missing material and feature gaps recorded. |
| 2. Reproduce and repair | Exercise authorization denial, offline queues, account changes, numeric precision, pending revisions, source identity, SQL roles/admission, release expiry/concurrency, backup chronology and workflow dispatch. Add behavioral regressions for confirmed defects. | Narrow application, SQL, release, continuity and recovery repairs with reproducible positive and negative cases. No live member data, applied migration or historical release grant changed. |
| 3. Independently reread and integrate | Cross-review changed application/SQL/operations paths; check actual test dispatch; execute disposable Git and PostgreSQL scenarios; inspect concurrent admin changes; reconcile merges, links, source hashes and final artifacts. | Additional outbox, contextual-year, revision-race, snapshot-consistency, partial-edit, family-refresh, navigation, pagination and audit-history defects found and repaired. Final integrated CI remains an explicit gate. |

Separate reports preserve the evidence and failure history for [application behavior](2026-10-21-application-audit.md), [history and requirements](2026-10-21-history-audit.md), [release and workflow controls](2026-10-21-release-audit.md), [independent SQL review](2026-10-21-independent-sql-review.md), and [recovery snapshot consistency](2026-10-21-recovery-snapshot-review.md).

## Confirmed repairs

### Authorization, offline recovery and saved data

Explicit server authorization denials now clear private views and the current owner's cached snapshot instead of being treated as an ordinary network outage. Pending events and acknowledgment receipts remain intact. Account/epoch checks prevent delayed responses from one account affecting another. Outbox denial information survives error handling and retained rejection; a restored member can reopen the preserved queue after fresh server admission. Admin denial clears private records and one-time codes, and refresh errors no longer permanently disable the retry control.

Coffee corrections use current canonical facts and revision unless an actual pending correction exists. Notes-only and rating-only shot edits retain the exact stored temperature instead of converting a rounded display back into a different measurement. Applying single-variable advice retains the actual unchanged dose, yield, grind and temperature, while initial recipes retain their basket baseline. Existing Locked captions and product choices remain unchanged.

### Coffee source evidence and trusted SQL

Conflicting same-product metadata remains available for contradiction checks rather than being discarded as a duplicate. Espresso evidence handles spelled-out units and rejects nonfinite results. Explicit roast-graphic contradictions withhold the disputed roast value. Release/lot evidence must identify the requested release; an unrelated year or weaker metadata cannot overrule stronger conflicting evidence.

The verifier checks current beta admission before privileged work. Catalog approval and a racing prior approval do not falsely become official source verification. The proposed SQL migration supports modern JSON JWT claims with the legacy fallback, checks the actual SQL role for official-worker mode, rechecks current admission, binds the fetched evidence to the exact locked Pending revision, and resets the fetch budget correctly at the exact 24-hour boundary. These SQL and Edge changes remain unapplied.

### Concurrent administrator editor

The incoming creator/notes/editor request is governed by its recorded development-only exception. Existing member-to-member isolation and canonical identity/provenance protections remain.

Partial administrator edits preserve omitted measurements and descriptive fields. Explicit allowed clears remain possible. Correcting a shot invokes the existing personal-family classifier and returns the final revision. The editor respects the existing 16,000-character notes contract. URL-only canonical corrections retain original source rows and record the exact source change in the before/after audit. Invalid listing kinds are rejected.

URL preview respects readonly/disabled inputs and ignores a response if the source URL or live draft changed. Each metric link reaches exactly one section. Empty pages show truthful totals; unavailable account paging falls back explicitly without a looping Next button. Successful list totals drive the corresponding dashboard cards, including zero, so hidden shots, removed admitted accounts and merged canonical exclusions are counted consistently. Incoming review-action disclosures, browser adapters and historical failure receipts are preserved.

### Release, CI and recovery workflow

Release diagnostics retain bounded, sanitized Git porcelain stdout and stderr. A prepared claim, an accepted ref and a provider publication remain separate states. The original native Git-push rejection cause is still unproven and issue #44 remains open; no consumed grant was retried to manufacture a successful result.

The release gate selects the newest exact-SHA Actions check, including queued or in-progress attempts, and rechecks branch leases, request freshness and grant expiry immediately before publication steps. Manual fallback now requires the same explicit backup/credit evidence as chat requests. Schema 2 requires the snapshot to start after the latest observed write; archive completion cannot substitute for snapshot coverage. Historical consumed schema-1 receipts remain intact.

Continuity checks cover SQL, shared source, local Actions, lint configuration and merge-resolution changes. The real concurrent Git test creates two distinct contenders. The Netlify ignore adapter permits a build only for the exact allow marker and expected exit status; interpreter failures skip safely. Node 18 ignore-runtime checks are separate from Node 22 application checks. Every SQL suite is dispatched, including the historical suites at their intended schema boundary.

Recovery capture uses one exported read-only repeatable-read snapshot for both pg_dump and all expected counts, schema totals and payload fingerprints. It rejects child/SQL failures, missing completion markers and empty or mismatched inventory without printing private payloads. The restore remains disconnected and cleanup removes named source/restore containers before private output. Existing encrypted archives are preserved.

## Verification receipts and limits

| Gate | Recorded result |
| --- | --- |
| Application review baseline | 47 test files, 474 cases passed; 47 syntax checks. Initial fixture failures retained in the evidence. |
| Operations review | 74 named tests passed across 12 modules, including real disposable Git races and executable ignore-gate failures. |
| Recovery behavioral regression | PostgreSQL 17.11 passed six scenario groups: concurrent writes, unchanged-count payload corruption, omitted-snapshot mutation control, pg_dump exit 37, inventory SQL failure and empty inventory. TCP disabled; cleanup checked. |
| Combined local Node suite | 571 passed, zero skipped, before the final two card-total regressions. Final card-total file: 9/9 passed. Hosted combined results will supersede this bounded checkpoint. |
| Local pinned lint and cloud build | Passed. Local Node 24.19; hosted Node 18/22 gates are separate. |
| Complete local SQL sequence | PASS: all 34 migrations and 17 suites on PostgreSQL 17.11, exit 0. Two earlier synthetic calibration fixture failures were retained and corrected without weakening real provenance constraints. The admin candidate then received a CLI-generated filename without changing SQL bytes. |
| Hosted integrated application CI | Commit `7efd96f...`: approval run [39689178354](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39689178354) passed; validate run [39689178330](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39689178330) passed 573/573 Node 22 tests, lint/build and Node 18 ignore-stage checks; SQL run [39689178365](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39689178365) passed 34 migrations, 17 SQL suites, 32 signed HTTP assertions and six snapshot scenarios. |
| Browser follow-up | Runs 39689178570 and 39689178310 stopped at the same missing actual denial classifier in their administrator harness. Cloud-owner 50-case checks and actual service-worker offline reopening passed. Both harnesses now load the real module, with every acceptance assertion preserved; exact repaired Chromium execution remains required. |
| Sparse operations PR CI | PR #49 at `fcfb3d1...`: run [39689422083](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39689422083) passed 38/38 Node 22 tests and six network-isolated PostgreSQL snapshot scenarios. Main integration remains held as explained below. |
| Live production and device acceptance | No deployment or new owner/device acceptance performed by this audit. Existing scoped acceptance is preserved. |

The final source manifest and completion receipt identify the delivered hashes, exact checks, branch updates and any remaining gates. A passing synthetic test is not a real account/device observation.

## Duplicate work and unfinished requests

Historical navigation repairs restore 235 references without deleting their original evidence. Current instructions no longer send work back through already completed release routing, Project-settings setup or accepted #11/#34/#41 cases. Original Locked wording and embedded source material remain intact. The exact duplicate Agtron helper is intentionally retained for the separate Node and Deno runtimes.

The [requirement and issue traceability register](2026-10-21-requirement-traceability.md) is the complete disposition list. The recommendation hierarchy and provenance (#12), family/experiment lifecycle (#10/#13), Custom targets (#14), bag lifecycle (#15), equipment lifecycle (#16), Add Coffee style selection (#19) and Hide Shot UI (#20) remain unfinished product work. Existing support functions do not count as delivered interfaces. Grinder scale/direction semantics (#17) and the Fast-Flow proposal (#31) still need their recorded product decisions. Deterministic-only extraction remains the current rule; deferred screenshot/BYOK work (#18) is not restored during cleanup.

Distinct real multi-device, keyboard/VoiceOver, invitation redemption/concurrency and new administrator acceptance remain in their existing issues. Current backup courier/alert delivery, unavailable provider settings, current credit balance and the native release transport cause require their own evidence. GitHub Free/private checks remain advisory; the audit does not turn them into enforced branch protection.

One known storage-failure boundary remains: if cache deletion fails and the application is then fully reloaded offline, the in-memory denial marker does not survive. A denied-screen export would expose private queued content, and no new access policy was invented to claim that dilemma resolved. This boundary remains explicit in #21/#22.

## Production boundary

The independently observed production release is `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`, Netlify READY/current deploy `6ad92fd1d706315f29032892`, using tested application `c6976b1fc86ed5e6b38c0c38831950fca017b3a4`. Supabase has 32 applied migrations. The original `DIC-20261021-BETA-COFFEE-01` grant is consumed. The [sanitized provider receipt](2026-10-21-provider-readback.json) records counts, RLS/grant checks and the source-to-provider migration aliases.

The audit changes development source and reviewed workflow definitions. It does not approve a new frontend publication, hosted SQL/Edge/Auth change, member-data mutation, provider-setting change or purchase. Those actions require their existing concrete approval and verification process.

## Operations integration hold and next application gate

[Application PR #48](https://github.com/Schulzet3/The-Dial-In-Collective/pull/48) contains the combined audit and preserved concurrent administrator work. Its first 97 changed files were read back exactly. The browser follow-up loads the actual `isAccessDenied` classifier instead of leaving a stripped import unresolved. The [focused harness receipt](2026-10-21-browser-harness-validation.json) distinguishes its 12 synthetic execution groups from actual Chromium acceptance. The [local SQL report](local_project_sql_verification.md), [receipt](local_project_sql_receipt.json), [executed input hashes](local_project_sql_20261021_attempt3_files.json) and [successful transcript](local_project_sql_20261021_attempt3.log) preserve the earlier independent runtime evidence. Failed synthetic fixture attempts are retained alongside them; they did not weaken provenance checks.

[Operations PR #49](https://github.com/Schulzet3/The-Dial-In-Collective/pull/49) is fully prepared, has all 27 changed files read back, and passed its exact isolated CI. Automatic approval review rejected the attempted merge because existing main push filters would export the live database read-only into a new encrypted artifact in this private GitHub repository and run the isolated recovery workflow. The merge did not occur; main remains `f8726e330648c4a3e82de88d75b6978ffee37d44`. No live export or recovery smoke result is claimed. The concrete merge and its effects need explicit owner approval. Do not bypass that hold by changing triggers, direct ref writes or equivalent dispatches. The Drive courier ignores push runs, so a later successful GitHub smoke backup would still not establish a new offsite-copy receipt.
