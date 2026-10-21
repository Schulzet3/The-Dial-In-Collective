# Release, CI, backup and operational audit

Prepared 2026-10-21 UTC by the release/operations audit worker. This is a local
evidence report for the root reviewer, who owns GitHub/provider writes and the
canonical journal. The source changes below have not themselves been described
as deployed. The separately verified original release remains the current app.

## Scope and immutable evidence

- Application baseline: `c9829d157ef4f430d24af7056ab32661ba8629f5`;
  audit scope recorded by root at `f2432bf08a803ba370ff1940d3121305bbce2459`.
- Main operations baseline: `f8726e330648c4a3e82de88d75b6978ffee37d44`.
- Current release ref: `1e79c4585c49ab517abb912887ee05ed7f4c4c4d`;
  underlying tested application source:
  `c6976b1fc86ed5e6b38c0c38831950fca017b3a4`.
- Root independently confirmed Netlify deploy `6ad92fd1d706315f29032892`
  READY/current, branch `release/production`, published
  `2026-10-21T21:34:34.367Z`. This audit did not create that publication.
- Native controller run `39679465858`, job `119497843520`, failed its final
  Git push. The same prepared commit was subsequently finalized by root's
  supervised non-force GitHub connector ref operation. Grant
  `DIC-20261021-BETA-COFFEE-01` is consumed; it was not retried here.
- Source inventory, 46 issue/PR records and recent CI are in
  `github_inventory.json`; main operations source and journal copies are in
  `main_ops/`; the relevant failed-push log excerpt is in
  `release_failure_excerpt.txt`.
- `release_audit_changed_files.json` gives exact byte counts and Git blob hashes
  for all 25 owned changes, compared with the recovered application baseline.
  Root owns concurrent application, SQL, provider and canonical-doc changes.

## Three complete passes through the assigned area

### Pass 1 — reconstruct source, history and actual execution

Read the operational instructions and journal, all assigned release, backup,
Netlify and audit scripts, all application workflow definitions, their matching
tests, the main-only operations tree, release/request/consumption contracts, and
the related issue history. Compared the development definitions with the actual
main operations versions. Retrieved the failed native job's logs rather than
inferring success from the subsequent connector recovery.

Reconstructed distinct states: source approved; source checks passed; candidate
commit prepared; native push rejected; original claim recovered; provider
publication observed. A successful deployment after a fallback does not establish
that the native controller's transport works. Rechecked which SQL suites were
actually invoked rather than counting checked-in test files as executed.

### Pass 2 — adversarial validation and narrow repairs

Examined missing/stale/forged evidence, replay and duplicate publication,
competing ref updates, in-progress CI reruns, expiry during preflight, merge-only
changes, SQL staging, encryption/Storage/key custody, snapshot boundaries and
branch-definition drift. Reproduced the continuity classification gap and wrote
negative regressions for the confirmed weaknesses. Preserved historical source,
consumed grants, encrypted archives, private-Free policy and source-only release
restrictions. Shared recovery/credit validation now protects the manual fallback
as well as chat requests without inventing a push event for manual dispatch.

### Pass 3 — independent reread and execution boundary checks

Reread the changed functions, workflow triggers and contracts together. Checked
primary Git, PostgreSQL, Netlify and Supabase documentation. This pass found the
Netlify interpreter-error fail-open boundary, the wrong workflow in a test that
claimed to cover all five required jobs, and the need to exercise Netlify's
documented Node 18 ignore runtime separately from the app's Node 22 runtime.

Ran real disposable Git merge/concurrent-ref regressions, the actual Bash ignore
command against controlled exit/output failures, and the actual SQL shell runner
with a fake Docker command that hashes every input without opening a database.
The resulting coverage trace includes all 33 current migration files and 16 SQL
suites exactly once, with the historical suites at the appropriate schema
boundaries. SQL semantics still require root's exact-commit isolated PostgreSQL
and signed-HTTP CI; a dispatch trace does not substitute for those tests.

## Findings and disposition

| ID | Confirmed finding | Repair / status |
| --- | --- | --- |
| R01 | Native failure logging omitted Git porcelain per-ref rejection details on stdout. The surviving stderr only says refs failed to push. | The Git wrapper retains bounded, sanitized stdout and stderr, categorizes common failures and logs a prepared candidate separately from an accepted ref. Explicit secrets, encoded/basic variants, bearer/basic headers, URL credentials, GitHub tokens, JWTs and terminal escape reconstruction are redacted. **Original provider refusal remains unproven.** |
| R02 | CI selection ordered by completion time; a newer queued/in-progress run had no completion time and could lose to an older success. | Select the greatest valid GitHub check-run ID for each exact-SHA GitHub Actions job. New pending/failing attempts block an older success; other SHAs/apps do not qualify. |
| R03 | Development approval and release refs were read at initial preflight without a final reread. Request/grant timestamps could also expire during work. | Reread both refs before the candidate and before push; recheck current main/checkout envelope, request freshness and grant expiry. Non-force release update and shared serialized workflow group remain intact. |
| R04 | Manual dispatch bypassed the backup/credit evidence validator used by chat requests. | Require bounded explicit `release_evidence_json`, schema 2, exact ID/source inputs, current main/workflow/checkout lease, current development/release heads and matching owner provenance. Both paths use the same fresh snapshot/offsite/credit validation; chat retains real event/path/append-only-journal checks. |
| R05 | Archive completion after a data write does not establish that the earlier pg_dump snapshot included it. | Future worker manifests/logs record a conservative snapshot start before pg_dump; schema 2 enforces latest observed write <= snapshot start <= archive completion <= verification. Missing/inverted/stale proof is rejected. Historical consumed schema-1 requests and archives remain untouched; no claim that today's archive was bad. |
| R06 | Development backup definition used a moving development source, three-day retention and development push trigger; actual main used an immutable published source, 30 days and main-only trigger. Main's pin was still the prior release. | Align development to main-only operation, 30-day encrypted artifact retention and independently verified live source `1e79c458...`. Preserve main's newer aggregate inventory and archive readability check. Root controls whether/when operational main receives the source pin and worker update. |
| R07 | Development recovery definition lacked main's weekly schedule/concurrency and additional aggregate verified-coffee readback. | Mirror the existing main behavior and preserve the complete main recovery script. No restore ran; root need not rewrite the byte-identical main script. |
| R08 | Continuity classification excluded SQL migrations/tests, general shared source, local Actions and the lint configuration. | Those paths now require the same-commit active journal. A meaningful regression covers each previously omitted class. |
| R09 | Default `git diff-tree` can omit merge changes, allowing code introduced only during merge resolution to disappear from continuity inspection. | Compare each commit with its first parent, or use the root diff for a root commit. A real temporary Git merge with an unjournaled code change is rejected. |
| R10 | Concurrent CAS test contenders could construct an identical commit when parent/tree/message/timestamps matched, making its claimed two-contender test timing-dependent. | Use distinct contender messages and assert two different commits before racing the real non-force pushes. One wins and one is rejected. The earlier test was not falsely reported as an observed CI failure. |
| R11 | Dated migration baseline output called all later files unapplied without querying production. | Preserve the dated manifest and byte hashes; report later files as outside the baseline and explicitly decline to infer deployment state. Current local output: 30 baseline matches, three later files. Root separately verifies live history and provider-version aliases. |
| R12 | Four checked-in SQL suites were omitted from the actual isolated runner; one assumed real owner data that the disposable fixture never supplied. | Run native import, owner-only exception and setup/feed suites immediately after their intended migrations. Root rewrote cross-account acceptance with its own synthetic fixture. Final loop includes it and root's new worker-auth suite. The shell trace fails if any future SQL suite is silently omitted, duplicated or staged incorrectly. |
| R13 | The test claiming all five required jobs covered visual review instead of SQL. | Explicitly map `approval`, `validate`, `cloud-tests`, `mobile-browser-qa` and `sql` to their real workflows/jobs and require unfiltered PR triggers. Visual review remains an additional check. |
| R14 | Direct Node ignore invocation used exit 1 for intended allow; syntax/import/runtime errors also exit nonzero, which Netlify interprets as proceed. | Inline Bash adapter requires both exact `DIC_BUILD_ALLOWED` output and exit 42. Everything else returns skip 0, including missing Node/helper, error 1, unexpected 42, mixed output and killed process. Inlining also avoids a missing adapter file becoming an allow. No build hook or publication was used to test it. |
| R15 | App CI used Node 22/24 while the provider's ignore stage is documented as Node 18 before dependencies. | Add Node 18.20.8 credit/grant/adapter regressions to the existing required `validate` job, then restore Node 22 before npm install/lint/build. Hosted result must be attached by root; the local combined result is Node 24. |

## Verification receipts

Final local combined command, with ordinary child-process permissions approved
by automatic review, passed **74/74 named tests, zero skipped**, across 12 owned
test modules. The restricted sandbox had returned `EPERM` even for Bash children
that completed with status zero; this was diagnosed separately and the tests were
rerun without suppressing their errors or assertions. The approved run exercised
the actual shell commands and real disposable Git repositories.

Modules: chat release request; backup security; controlled release runner;
commit continuity; one-use Git race; chat workflow policy; one-use claim;
exclusive workflow; Netlify credit guard; private-Free release policy;
required-check workflows; SQL runner coverage.

`bash -n` passes for both backup/recovery scripts and both isolated SQL/signed-HTTP
runners. The migration guard passes exact byte/version/name validation for its
30-file dated baseline and truthfully labels the three later files. Earlier
focused tests were used only while resolving concrete integration changes.

Still required from root's combined commit: Node 18 and Node 22 hosted CI,
lint/build, isolated SQL/signed-HTTP semantics, application/browser checks as
appropriate, and main operations parity/CI if installed. No native production
push was rerun to manufacture acceptance.

## Open boundaries and issue reconciliation

- **#44 stays open for native end-to-end release acceptance.** Source validation
  and diagnostics are improved; the original native transport refusal has not
  been reconstructed from evidence that never reached the log. Workflow-token
  permission and ref rejection are hypotheses, not diagnoses. A future separately
  authorized release can establish transport acceptance with the safer logs.
- **#38 has stronger source/inert acceptance, not permission to spend again.**
  The original grant has one recovered claim, and the real Git race and replay
  tests are green. Private GitHub Free checks remain advisory. Provider manual
  deploy/build-hook restrictions and platform failures remain separate controls;
  build hooks can bypass Netlify's ignore stage. Do not close based only on unit
  tests or retry the consumed grant.
- **#28 remains open for actual courier/monitor delivery evidence.** Main push
  smoke backups are intentionally not automatically copied by the scheduled
  Apps Script courier. Retain existing owner-confirmed notification preferences
  and prior successful receipts; do not request another screenshot, create a
  duplicate monitor or induce an outage. Current-source encrypted/offsite receipt
  and natural failure-alert delivery need their own observations.
- **Recovery comparison concurrency remains a known limitation.** The existing
  restore drill compares its consistent pg_dump with counts/fingerprints queried
  from production later. A legitimate intervening write can produce a false
  mismatch. No present restore failure or data loss was observed. Fixing this
  fully needs one exported snapshot shared by dump and inventory queries, with a
  disconnected concurrent-write regression; changing the assertion to ignore
  mismatches would weaken recovery verification and was not done.
- **#27 preserves accepted provider boundaries.** Do not relabel private-Free
  advisory checks as enforced protection, re-enable a paid requirement, or infer
  live billing from an old screenshot. Current policy and historical receipts
  remain separate from actual provider enforcement. Root owns current provider
  readbacks and the accepted private-beta Auth scope.
- Cross-branch install must include matching tests and dependencies in one
  reviewed update. The earlier main CI incident specifically omitted the tests
  corresponding to changed source. The manual input, helper, runner, tests and
  schema examples now form one compatibility unit.
- **Operational trigger warning:** writing main's nightly workflow or backup
  worker triggers its existing read-only encrypted push backup. Root must account
  for that existing effect before syncing these paths. No standalone backup,
  restore, database write, invitation, provider setting, credential change or
  Netlify release was executed by this audit worker.

## Primary technical references

- Git porcelain places per-ref status on stdout:
  https://git-scm.com/docs/git-push.html
- GitHub Actions token permissions and repository-scoped behavior:
  https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
  and https://docs.github.com/en/actions/concepts/security/github_token
- PostgreSQL 17 consistent pg_dump snapshots and explicit snapshot support:
  https://www.postgresql.org/docs/17/app-pgdump.html
- Netlify ignore semantics, build-hook exception and Node 18 runtime:
  https://docs.netlify.com/build/configure-builds/ignore-builds/
- Supabase logical backup and Storage payload boundary:
  https://supabase.com/docs/guides/platform/backups
- Supabase current changelog and reviewed PostgreSQL 17.11 advisory:
  https://supabase.com/changelog
  and https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes

The documentation checks establish platform behavior; they do not establish the
project's unseen settings, current balance or the cause of an unlogged refusal.

## Suggested same-commit journal paragraph

Operations audit completed three source/evidence/adversarial passes. Confirmed
fixes cover Git porcelain diagnostics with redaction, newest exact-SHA CI
selection, ref/freshness rechecks, manual/chat recovery evidence parity,
snapshot-start coverage, main/development backup definition drift, SQL/source
and merge continuity, distinct real CAS contenders, honest dated migration
reporting, complete SQL suite dispatch and a fail-closed Netlify ignore adapter.
Local combined acceptance passed 74/74 named tests; hosted exact-commit Node
18/22, SQL/signed-HTTP and integrated app checks are recorded separately when
complete. Historical grants and archives are preserved, the original release
remains live, and no grant was replayed or Netlify credit spent by this audit.
Native transport acceptance, operational backup/offsite refresh and recovery
snapshot-consistent comparison remain precisely bounded follow-ups, not claims
of completion.
