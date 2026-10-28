# Main operations journal

## October 23 UTC / October 22 MDT: verified Issue70 integration

The owner authorized the current cross-system audit and safe confirmed source/test/CI repairs, not website publication or production data changes.

PR95 is merged at `314ccf362dacba660e3b5a5236bb1bde2878d6e3`. Tested source `81b56a47d7c5d4af75f8217a55ae8f5fb6a799df` passed main acceptance run `39898590290`. Independent push-run readback confirms exact merged source passed `39898695303`; its tree is the tested tree `5b80680d7fa360aec9035d1f956c6d4464afe4eb`.

The weekly regression now resolves development once and supplies its immutable SHA to Node/build, database and mobile/offline jobs. The database job explicitly uses Node22. Sunday 08:00 UTC, read-only permissions, no persisted credentials, no cancellation and all existing suites remain. Six policy/negative regressions and local YAML/dependency checks passed; main CI also passed the existing inert release controls and isolated synthetic snapshot checks. This is not evidence that the future Sunday schedule already executed.

README and current journals now reflect the actual published release and schema v4 rather than stale PR76/pin-approval/v2 instructions. Exact prior README, active checkpoint, operations journal and weekly workflow are archived without alteration.

### Notification interpretation corrected

The initial audit overinterpreted false task-level notification flags. Issue28 already records that same discrepancy against repeatedly accepted owner proof of enabled global Tasks Push and Email. Those flags do not establish disabled settings, a changed configuration or failed delivery. Preserve prior owner and Apps Script alert/trigger evidence; do not ask for another screenshot, settings check or reconfirmation. Natural condition-alert receipt remains unverified. No task or provider setting was changed, no duplicate monitor created and no new release gate introduced.

### Preserved boundaries and evidence

Actual published source remains `f97b8f30c25f6d4ef30c5d79d12daf4fb0670e2f`, Netlify READY/current `6adabcecd4a2a68e94cdc09a`. The nightly backup source pin already agrees. Scheduled ciphertext artifact `12434555176` matches private Drive SHA256 `bd575a9716ea0b76225827f0b33a036df10a49b62b86ecee5faa556ada5fdb0d`; no new export, decryption or restore occurred.

This follow-up is documentation-only. The consumed RELEASE_REQUEST, BACKUP_REQUEST, nightly workflow, backup scripts, release code/grants, provider settings and production branch remain unchanged. #93 remains READY, not deployed. Application reconciliation is PR94; its final integration is independently verified there. The current receipt is `docs/audits/2026-10-23-operations-reconciliation-receipt.json`.

Historical operations journal: [exact archive](archive/2026-10-23-operations/OPS_JOURNAL.previous.md).

## 2026-10-23T14:40:10.410Z — owner-authorized single-use READY batch request

- Release DIC-20261023-READY-QUEUE-05 publish requested from exact tested source d57f0b3cfeac32be6cd7a2192662a63a57e67e0f; approved items #93/#96 only, plus necessary JWT-required Supabase Edge functions and Netlify app. Owner approval Issue #96 comment 6367192910.
- Five exact-source CI checks PASS; no new SQL migrations. Edge functions updated and JWT-required: preview v4, verifier v6. Production Netlify publication remains unverified until provider readback.
- Existing verified encrypted/offsite backup evidence reused for non-destructive release; latest read-only shots/notes count 23/23 (previously 22/22); no production member-data write by release. No new destructive migration or database deletion.
- One guarded chat request, no force push, no credit check, no purchases. Release controller must enforce exact source, one-use grant and queue, then Netlify READY/current verification.

## 2026-10-24T03:06:02Z owner-authorized four-item release request
- Release ID DIC-20261024-READY-QUEUE-06, tested source 28f908dc9828a45558bd56b532fed17022cef3d8. Four READY items: #5, #10, #33, #100. Explicit owner publish authorization. Five exact-source GitHub checks passed.
- Backup run 40053858192, encrypted ZIP artifact 12545035289, SHA256 686b3c78417ab34c8607708ac52b7c7f1b3dc042256c3a6d870e4f954ef928d7, private Drive offsite 13cgHYP1ofSUhvye4PdgvN_tQ6Hr1bFZh, downloaded and byte-matched. Snapshot start 02:22:14 UTC after latest observed write.
- Hosted SQL applied/read back: 20261024030533 dic_admin_safe_delete; 20261024030536 dic_source_target_producer; 20261024030539 dic_personal_family_lifecycle_integrity. Verifier Edge v7 ACTIVE JWT required. No production records intentionally deleted. Netlify publication still unverified, pending one-use controller.


## October 26 UTC — weekly offline job setup correction (#134)
Sunday scheduled run 40194860522 at immutable development source: Node/build and database passed; mobile owner and Admin browser passed; PWA offline assertion failed because the isolated mobile-offline job never generated dist/sw.js. Added Node 22 setup, npm ci and build:cloud with synthetic nonsecret configuration before the real PWA browser test. This is test infrastructure only, no app behavior or production deployment. PR exact-source CI and a fresh corrected weekly run remain to be verified; do not claim success prematurely. No changes to backup scheduling, 08:00 UTC Sunday cron, release branch, Supabase or member data.

## 2026-10-27T19:01:58.873Z — Approved combined release #07: pre-destructive encrypted snapshot
- Owner explicitly authorized one publication of every READY queue item on October 27, 2026. This is not authorization for the IN_PROGRESS extractor parent.
- Request DIC-20261027-READY-QUEUE-07-BACKUP-01 triggers encrypted GitHub backup prior to any potentially destructive SQL; require a verified, recoverable offsite receipt and live database preconditions. No deployed application, member data or credentials modified by this snapshot request.

## 2026-10-27T19:30:56.474Z — owner-approved production release DIC-20261027-READY-QUEUE-07
- Exact source: ca7ab46e1e8c76ce117ffc88470d107aa5903729; expected development: fc9913decaacb4ff20014a0d0f79da58d09f52a6; expected production ref: 65ee38609db6bd5977dd0f2b393e7791a5e1b766; main request parent: 32fd766a4d262e3bfa3d0eca7f32e04fdfde0302; mode: publish.
- Owner authorized ONE batch of 22 READY, excluding original Issue33 unfinished. All six exact source candidate checks PASS; 46 changed app paths covered by the READY queue.
- Fresh encrypted backup artifact 12762602289, GitHub SHA-256 9cfa78dee4d497d6d1f9439c87f137942ff2c8346eb509023ea6b5db21739670. Same byte digest independently checked after download of private offsite Drive file 14524GwFcLHQztf5Te0jRWtdBH7Ui0yAU; encrypted backup.age only.
- Supabase Experiment retirement migration applied with guarded zero Experiment rows and zero linked shots; postread shows 23 shots intact and no Experiment schema. Required JWT Edge function version 8 active with updated evidence helper. One serialized nonforce release requested; provider Netlify READY/current readback pending.

## October 28 UTC — owner-authorized production Community historical backfill, database-only (Issue #193)
- Owner directly authorized immediate Supabase-only backfill of qualifying missing legacy dialed-in contributions for their account; **no Netlify or app publication**.
- Read-only production preflight: one valid contributor; eight eligible, unlinked historical shots across three verified coffees; two existing linked shots; no matching existing Community rows; no hidden or unqualified shots in target set. Prior encrypted release #07 archive had a verified matching offsite ciphertext receipt; additional backup not required for this strictly insert-only operation.
- One atomic, guarded production SQL operation inserted eight Community shot projections plus eight private contribution links; existing after-link quality trigger independently reviewed each projection. Preflight counts, accepted quality status and unchanged personal shot history were enforced inside the transaction with rollback on failure.
- Independent postcommit production readback: eight new eligible contributions, ten total eligible, zero missing eligible, zero flagged, zero duplicate links, and complete original 16 personal shot records unchanged by before/after deterministic digest. Two earlier contributions untouched.
- No schema migration, UPDATE, DELETE, other-member change, source-code change, authentication impersonation or Netlify deployment. Live authenticated Community UI browsing was not tested. Complete scoped receipt in [Issue #193](https://github.com/Schulzet3/The-Dial-In-Collective/issues/193). Database-only operation completed; **no RELEASE_QUEUE item and no application publication**.
