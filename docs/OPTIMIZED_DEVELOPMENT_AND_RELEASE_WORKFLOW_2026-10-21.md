# Optimized development-to-release workflow — source-only implementation

## 1. Recover (always)
Read \`AGENTS.md\`, active work journal, \`docs/CURRENT_STATUS.md\`, Master Specification, Decision Ledger and approval matrix. Independently compare development HEAD, operations \`main\`, immutable \`release/production\`, Netlify **published** SHA, Supabase migration/Edge versions and the latest Actions. A past GitHub receipt is not a current provider readback. Preserve private GitHub Free, all historical data and Locked decisions.

## 2. Record owner scope immediately
Append scope, Approved/Unapproved status, next action and provider exclusions to the relevant GitHub issue before unrelated work. An optimization or product request is **not** release authority. Product supersessions require exact owner approval and changes to BOTH canonical specification and decision ledger. Prefer the fast Log Shot → Rate → Recommendation UX without inventing additional prompts.

## 3. Develop and iterate quickly
Use a small isolated work branch or expected-head non-force lease when other work is active. \`npm run check:fast\` is an optional **developer feedback** command, never release acceptance. \`npm run test:cloud\` is an independent cloud-focused regression set. Avoid repeating a full Node suite in every secondary workflow. Run focused Node/SQL/UI tests whenever affected files require them. Every code/test/CI commit contains contemporaneous changes in the active GitHub work journal **in that same commit**.

## 4. Verify exact source once, comprehensively
Required checks on the exact immutable proposed app SHA remain: \`approval\`, \`validate\` (full \`npm test\`, Node18 ignore safety, lint, build, file-boundary), \`cloud-tests\` (targeted cloud/admin/coffee/offline), \`mobile-browser-qa\`, and \`sql\` (isolated migrations/signed HTTP/backup). Optional visual and live roaster probes are additional evidence, not replacements. GitHub Free/private checks are advisory, not mandatory push restrictions. Read statuses after all jobs complete; a newer failing/pending check overrides an older success. Record exact run IDs, timings and notable failures. Synthetic browser screenshots do not establish owner-device acceptance.

## 5. Generate the read-only source dossier
Run \`node scripts/audit/source-release-dossier.mjs\` from the exact checkout. It checks local canonical release-record consistency and prints a small machine-readable HOLD report with current recorded production, available (not consumed) source grant and explicit missing external evidence. \`--strict\` exits nonzero because source evidence alone **cannot** authorize a release. Do not add a flag that turns this offline report into provider or owner approval.

## 6. One owner-authorized release only
After an explicit publish/deploy instruction, use the already Locked universal deployment scope **only for the known pending approved bundle**. The release controller must still read five latest exact-SHA Actions checks; one fresh unique grant, backup/courier, current coverage, valid budget, tested source, production branch and concurrency. Never use \`main\` as the application source, force push, replay consumed grants, trigger redundant Netlify builds, spend without approval or bypass provider settings. A push is not a deployed app. Do not ask repeated consent for included SQL/Edge components, but do not infer permission for destructive user-data changes, upgrades, or another future release.

## 7. Minimal honest production verification and handoff
Independently inspect Netlify **current/READY** commit, Supabase applied SQL/Edge parity, key role/isolation checks and read-only user record invariants. Complete a genuinely signed-in owner/member device workflow (or mark UNVERIFIED). Label each feature separately Approved → Implemented → Tested → Deployed → Accepted. Record provider receipts and actual/unknown credit debit. A failure or interruption resumes from the last verified GitHub commit, not a partial local transcript.

## Performance evidence
Raw npm cache install improvements on earlier small-dependency jobs do **not** establish a full-cycle speedup. PR #54's targeted cloud suite ran 299/299 tests in 4.30s versus 587/587 in 9.90s for the previous duplicated full suite; 56.6% lower **test execution time in that secondary job only**, with exact test coverage retained in mandatory validate. Runner conditions and cloud scope differ. End-to-end 10× approval→READY improvement remains **unverified** until multiple comparable authorized real releases produce wall-time receipts.
