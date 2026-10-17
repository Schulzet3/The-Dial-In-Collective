# The Dial In Collective — Current Status

**Checkpoint:** 2026-10-17 UTC / 2026-10-16 America/Denver. **Read this first when continuing the project.** This is the current implementation/acceptance index; [Master Specification](MASTER_SPECIFICATION.md) and [Decision Ledger](DECISION_LEDGER.json) govern requirements. Preserve every unchanged Locked decision.

## Resume here

The owner-approved GitHub documentation consolidation is complete in this revision: original requirements, all retrieved GitHub amendments, a scoped supersession map, this checkpoint, navigation and historical evidence are now available from the active development branch. The [continuity report](GITHUB_CONTINUITY_2026-10-17.md) records validation and provider-access limits. Both continuity commits were read back and verified. The subsequent exact test-shot purge is recorded below.

**Latest GitHub reconciliation:** the supplied audit has been reviewed against development source; [all 26 findings are mapped to scoped tracking or completed documentation corrections](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md). Existing #5 was corrected and 23 new prioritized issues were created. Feature execution remains pending; this checkpoint does not certify all features complete. The [20-topic crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) preserves original decisions.

**Next product action:** ask **one** question about **25 versus 10 URL lookups per rolling 24 hours**. Do not apply either value without the owner's decision. Next, separately resolve the proposed six roast tiers and displayed naming. These questions were already being discussed; neither proposal is Locked. See the [latest extraction/product checkpoint](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md).

**Completed production exception:** The owner explicitly authorized the exact production purge of hidden nonlegacy Hambela test shot `799509a3-a16d-4380-a439-8de2a5d880e2`, its note/detailed payloads and affected timestamps. **That operation is now committed and independently verified below.** The preceding continuity consolidation was documentation-only. No broader deletion, deployment, migration, provider-setting change or historical-backup purge is authorized.

## Exact Hambela test shot purge verified 2026-10-17 UTC

**COMMITTED; independent post-commit checks PASS at 2026-10-17T04:24:15.0808+00:00.** At the owner's explicit request, permanently removed only Sweet Bloom Hambela test shot `799509a3-a16d-4380-a439-8de2a5d880e2` (hidden, nonlegacy, 18 g / 48.8 g / 25.2 s) and its one empty note. Cleared the two detailed audit before/after payloads while retaining original metadata; replaced two cached mutation responses with payload-free `record_purged` tombstones, preserving mutation IDs/request hashes/timestamps. Replaying the original hide request returns the tombstone without recreating data.

- **15 stored / 15 visible shots remain, including all 14 legacy shots.** Full-row SHA-256 checks confirm all other shots/notes and the **1 community shot + 1 contribution link** unchanged.
- **42 protected table-scope fingerprints PASS** across preflight, rollback dry run, committed transaction and independent post-commit reads. Only the exact authorized row scopes changed; no schema, policy, trigger or deployment alteration.
- Hambela workspace `last_logged_at` corrected to **NULL** because no shots remain in that context. Setup `last_feed_shot_at` corrected to **2026-10-16T16:50:19.242Z** from the latest remaining eligible shot; Slow Feed stays true. Normal revisions advanced; all other fields and current-coffee pin unchanged.
- Historical backups, original import/recovery evidence and unrelated records were **not purged**. The only remaining exact-UUID references in application tables are the two payload-free audit metadata rows.

Detailed evidence, dependency preflight, transaction/replay checks and all comparison hashes: [exact purge report](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md). The original [hide/extraction report](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md) and [URL acceptance history](UNIVERSAL_COFFEE_URL_IMPLEMENTATION_ACCEPTANCE_2026-10-16.md) also carry prominent final-purge reconciliation notes; their earlier bodies remain historical evidence. This supersedes the prior **16 retained rows** storage count for this shot; the earlier hide report remains valid historical evidence.

## Branches and release coordinates

| Item | Verified source / scope |
| --- | --- |
| Repository | Private `Schulzet3/The-Dial-In-Collective` |
| Active source and docs | `development/backend-foundation`; consolidation reviewed from `6f37e6647e8ab90afd1965112e90ef4f82bbef8a`. Use the actual current branch ref for subsequent work. |
| Default `main` | Backup operations; older application tree. Do not merge development into it or deploy its app. |
| Production frontend | Netlify `6ad2c872ad7a8fa78dc410dc`, ready; source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`, published `2026-10-17T01:02:27.862Z` (Oct 16 Denver). **Read back from provider during this consolidation.** |
| Latest tested app enhancement | Roast graphic extraction, source `3b98b086babeff2b47a4d218ecd4c1fee02887ff`; GitHub [run 38994786401](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38994786401) completed success, 226/226 Node tests recorded. Run status and SHA rechecked; count from existing detailed evidence. **Unpublished.** |
| Production URL authorization correction | Existing SQL migration `20261017020000_dic_universal_preview_claims_json_auth.sql`; prior evidence records successful production application and rollback-only role/cooldown tests. This is prior release evidence; the later exact shot purge did not apply a migration. |
| Backup source pin | `main:.github/workflows/nightly-backup.yml` still pins published app `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`; cron `23 9 * * *` UTC, 30-day GitHub artifact retention. Workflow read back; untouched. |
| Visitor protection | Netlify read-back confirms SSO `non_production`, no site password. Production relies on Supabase email/password, confirmed email, admission, RLS and admin checks. No access setting changed. |

A development/documentation SHA need not equal the published frontend SHA. A SQL-only correction has its own deployment evidence. Never describe either as a new Netlify publish.

## Completed milestones — exact scope

The dated milestones below preserve earlier acceptance evidence. The exact Hambela purge section above is a **new live production verification** under explicit owner authorization; other results retain their stated dates and scopes.

| Milestone | Accepted evidence | Limits |
| --- | --- | --- |
| Core logging and accounts | Owner completed Log Shot → Rate → Recommendation and persisted reload/login; real second account confirmed email, redeemed one-use invitation, saw an empty private workspace and Admin Access Unavailable. [Real-account record](REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md), [later provider inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md). | Full adversarial HTTP/multi-device security and all engine tiers are not certified. |
| Wuri URL preview and save | Admitted nonadmin successfully previewed and saved the official Wuri URL; prior independent SQL found visible personal library entry, correct source/metadata and **private Pending**, not global Verified. Roast Light was selected manually. [Acceptance](UNIVERSAL_COFFEE_URL_IMPLEMENTATION_ACCEPTANCE_2026-10-16.md), [latest report](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md). | No claim of successful graphic extraction or trusted Verified promotion. Do not ask for the same first Wuri save again. |
| Shot cleanup and subsequent exact purge | Original audited hide left 15 visible / 16 retained rows. The owner's later exact purge now leaves **15 stored / 15 visible**, 14 legacy, two payload-free audit metadata rows and two replay-safe receipt tombstones. [Verified purge](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md); [historical hide](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md). | Only the named test shot/note/payloads and two affected timestamp contexts changed; all other shots/community records verified unchanged. No broader cleanup authorization. |
| Real SMTP/domain/support | Owner received password reset and new-member confirmation mail; app TLS, Supabase callback settings, apex 302 redirect and support forwarding were tested. [Inventory](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md). | No new mail send or DNS change. Root is reserved for a future homepage; preserve `auth` sending subdomain. |
| Automatic encrypted backup delivery | October 15/16 **schedule-event** GitHub archives matched corresponding private Drive copies by SHA-256 and ZIP CRC. Manual release exports are separate. [Delivery/alert audit](AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md). | Those dated runs do not prove future delivery. Retention/expiry and genuine failure/staleness remain distinct monitoring concerns. |
| Exact ciphertext restore | Selected October 16 encrypted archive genuinely decrypted/restored in fresh isolated PostgreSQL; 44/44 first-party/Auth streams and security structures verified. [Exact restore](EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md). | Archive intentionally represents 1 account / 14 shots. |
| Hosted recovery and cleanup | Fresh managed Supabase + protected Netlify rebuilt from archived source/Auth; owner signed into original admin, saw 4 coffees / 14 shots / Admin Dashboard. Prior SQL verified 44 streams / 141 original rows and isolation. Disposable Supabase/Netlify projects were subsequently removed and checked absent. [Managed drill](HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md). | Recovery-only Resend token revocation is **owner-reported**, not independently inspected. No need to recreate deleted drill infrastructure. |
| DNS documentation | Exact owner-provided BIND export and private reconstruction package verified for all 11 app/mail records and full TXT/MX values. [DNS readiness](DNS_PROVIDER_FAILOVER_READINESS_2026-10-16.md). | Actual registrar/nameserver cutover, replacement redirect and inbound forwarding are **not tested**. Raw tokens/export stay private. |
| Alerts | Owner received a labelled TEST alert email; daily read-only backup watchdog recorded enabled. [Audit](AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md). | Genuine induced failure/stale transfer and Apps Script trigger death are not proven. No interruption needed for this consolidation. |

### Do not repeat without a reason

Initial real signup/invite, nonadmin admin denial/empty workspace, root redirect, support email delivery, password-reset/confirmation receipt, owner log/reload, dated backup-to-Drive byte matching, exact archive restore, core hosted reconstruction/deletion, exact DNS export and first Wuri preview/private save have passed their stated scopes. Retest only for changed code/settings, regression evidence or a clearly different acceptance case.

## Development ready, not published

The enhanced universal parser handles explicit semantic roast markers, accessible ALT/ARIA/SVG labels, selected states and product metadata. Ambiguous graphics, conflicts, unsupported Ultra Light and mixed-process facts leave a safe review hint/blank rather than inventing canonical values. It fetches no extra images or AI tokens. [Implementation and tests](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md).

Keep the existing five-value roast taxonomy and adjustable **60 per rolling 24 hours** until an explicit owner decision. **At least 30 seconds between any account's known/unknown-roaster URL previews is Locked.** Manual coffee entry and shot logging remain available. Optional Claude BYOK stays device-only and optional; screenshot/OCR extraction is not newly claimed as implemented.

## Repository gap audit registered (documentation only)

The [Comprehensive GitHub Gap Audit / Cross-Session Handoff](DIC_Comprehensive_GitHub_Audit_Handoff_2026-10-16.md) examined the complete 189-entry development tree at `c1e8d3175be836b4a7fc92d731729583e7ebe55d` and the then-current GitHub branches, commits, workflows and work tracking. It records **26 evidence-labeled findings**, including unexposed Locked workflows (experiment confirmation, Custom style, bags/baskets, shot hide, screenshot/optional device-only Claude input), the placeholder Community screen and incomplete recommendation tiers, the absent installable/offline PWA shell, a source-level offline cold-open risk, and read-only admin tools. Real iPhone/multi-device acceptance, member coffee verification and certain external-provider controls remain separate limits, **not proven failures**.

At the audit checkpoint there was **one open GitHub issue (#5) and no open pull requests**. The audit proposed a structured issue backlog, but **did not create or change issues, requirements or product decisions**. The 25-versus-10 daily URL budget and six-tier roast taxonomy remain Open; the prior real-account, Wuri private Pending save and hosted-recovery acceptance results remain valid for their recorded scopes. This archive is **a read-only source audit followed by documentation-only filing**, not new implementation, a fresh production/provider check, a build, a deploy or a release authorization. Recheck current source, issues and CI before execution.

## Audit reconciled and scoped issue backlog created 2026-10-17 UTC

The owner subsequently authorized reviewing the supplied audit, correcting GitHub and converting confirmed gaps to prioritized issues before moving to feature execution. This **supersedes only the old audit's no-issue-creation scope**; it does not change a product decision or authorize deployment/production writes.

[Audit reconciliation and backlog](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md) maps **all G01–G26**. **23 new issues #8–#30 plus existing #5** are open at the verified checkpoint, with source/spec references, acceptance criteria, dependencies and stated boundaries. Issue #5's empty-catalog and all-deploy SSO wording is corrected. G24's immediate documentation/comment/tracking correction is complete; implementation and real-acceptance gaps remain open in the issues.

[Twenty-topic decision crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) distinguishes later approved constraints, provisional implementation and unresolved semantics without altering original 79 Locked/20 Open records. The current daily cap and roast taxonomy choices remain Open. Questions are one at a time, only when required; unrelated documentation/independent work need not wait.

**Fresh local check:** 226/226 existing Node tests PASS on the reviewed runtime source. Netlify comments corrected with parsed executable settings unchanged. No runtime feature is newly claimed complete, no production database query/mutation repeated, no migration/Edge/frontend deployment or backup deletion. Existing ready production deploy and nonproduction-only SSO were read back unchanged.

The audit is a historical source snapshot, not a live-provider/security certificate. Specifically: the **Hambela purge is already complete**, G12 concerns missing personal-hide UI; Wuri private Pending save passed but trusted Verified/roast-graphic acceptance remains distinct; G14 is a source-level offline risk, not a reproduced iPhone failure; G22/G25 are evidence/access limits.

### Final session handoff and verification

- Audit reconciliation commit: [`c752cd0960e5672e1da6bb2492b30fa2ce8ebdf9`](https://github.com/Schulzet3/The-Dial-In-Collective/commit/c752cd0960e5672e1da6bb2492b30fa2ce8ebdf9), parent `f6f65f6d93b56703e006f8c6b96760646eaf929a`. The branch ref, parent/tree, exact seven-file diff and every changed file's full content/Git blob hash were read back. Verification is a content/ref check, not a cryptographic signature.
- [GitHub Actions run 39003676568](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39003676568) completed **success** for that exact commit: existing Node tests, static build and private-source exclusion gate. Earlier local 226/226 and 16 release-guard results retain their stated scope. No extra live SQL or real-device test was performed.
- All **24 open issue titles/bodies** were independently checked. [#8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8)'s first two crosswalk criteria are checked; unresolved owner decisions keep it open. New issues #8–#30 plus corrected #5 are tracking, not completed feature implementation.
- The original Master Specification and Decision Ledger, purge report, runtime, schema, workflows and backup operations are unchanged by the reconciliation. A post-ref Netlify read still showed ready deploy `6ad2c872ad7a8fa78dc410dc` and nonproduction-only SSO. No release, production-data mutation, account action, provider change or backup deletion occurred in this audit reconciliation/final handoff.
- Resume with this file, the [backlog](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md), [crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) and the actual current branch ref. The next product question remains **25 versus 10 daily URL previews**, one question at a time; current 60/day, >=30-second account cooldown and five roast values stay unchanged. Independent work can start with #21's secure offline design or #9's source/live inventory under their stated boundaries; do not repeat the purge or passed account/recovery acceptance.

The owner subsequently supplied these source attachments in this chat: `dial-in-collective.jsx`; `Espresso_Recommendation_Engine_Handoff.zip`; `Espresso_Recommendation_Engine_Available_Archive_2026-08-21.zip`; `Espresso Extraction Windows by Roast Level and Shot Style.pdf`; `Old 2.pdf`; `Old Chat.pdf`; `Recommend email domain hosting.pdf`; `Build Web App.pdf`; and `DIC Backup Watchdog.pdf`. This final handoff records attachment availability only: their contents and whether they recover the missing original research/workshop material were **not newly inspected or imported in this checkpoint**. Do not certify source recovery from filenames, publish raw private chat exports, or let older attachments override later Locked decisions. Continue source recovery under [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30); if these attachments are absent in another chat, obtain the named files before making content claims.

## Genuine remaining work

1. Resolve daily URL budget, then roast taxonomy **one product question at a time**. Update both canonical requirements files on approval, preserve superseded rationale, implement/test compatibility in development. A later release needs its own applicable authorization; this task must not deploy.
2. After an approved future parser release, verify a real Wuri roast preview for the **new extraction scope**, plus genuine unknown-roaster/manual Pending fallback, trusted Verified promotion and release-conflict behavior. Do not fabricate community data or conflate preview with verification.
3. Real iPhone Safari/PWA/offline reconnection, durable queued writes, account switching, multi-device conflicts, accessibility, experiment/family/current recipe behavior and the agreed recommendation evidence tiers still require distinct acceptance. Existing Node/synthetic Chromium/SQL tests are not substitutes.
4. Admin is currently **read-only**. Writable conflict review and invite management remain planned. Full contributor-balanced community aggregation, related-release/similarity tiers and exact provenance need verified implementation. Do not infer completion from tables or UI.
5. Supabase leaked-password protection was previously reported disabled; plan availability/settings remain to be reviewed before any approved change. Optional DMARC was absent from the exact zone export. These historical observations are not fresh provider checks.
6. Remaining disaster scenarios are accurately limited: actual DNS-provider cutover, recovery-only password reset, recovery-clone shot/rate/recommend writes, extra recovery-only invite redemption, provider-wide disaster and authentic backup-failure alert. They do not reopen the completed core recovery drill.

## Provider settings and access limits

| Area | Current ability / uncertainty |
| --- | --- |
| GitHub branch protection | GET returned **403 Resource not accessible by integration**. Required-review/check protections cannot be verified or changed here; do not claim enabled. |
| GitHub repository rulesets | GET returned **403**, with provider message to upgrade to GitHub Pro or make repo public. No upgrade or visibility change made. |
| Netlify | Current deploy/commit and visitor controls readable and checked. **Live billing/credits, Git build settings and build-hook configuration are not exposed by these connected read tools**; source guard exists, provider bypass settings not certified. |
| Cloudflare / registrar | No applicable connected management tool found. Current DNS, Redirect Rules, Email Routing target, DNSSEC/NS/DS and registrar access not independently inspected in this task. Prior exact export/owner evidence retained. |
| Resend | No applicable connected management tool found. Recovery-key revocation remains owner-reported; current production SMTP secret and key status not inspected. Do not expose or rotate them for docs work. |
| Apps Script courier | No applicable connected Apps Script configuration tool found. Trigger health, properties/token expiry and real failure-alert behavior not independently inspected here; a Drive connection is not Apps Script settings access. |
| Supabase Auth settings | Not inspected in this documentation-only task. Prior SMTP/password/advisor evidence is retained with its date; no claim of a fresh settings audit. |

## Maintenance and preserved evidence

- [Documentation Index](README.md) identifies canonical files, operational references and **historical snapshots archived in place**. [Archive index](archive/README.md) explains provenance and unavailable sources.
- [Previous Current Status](CURRENT_STATUS_PRE_CONTINUITY_2026-10-16.md) retains the full contradictory pre-consolidation body so no evidence is lost. Its old "next" paragraphs are historical.
- Preserve original PDFs/ZIPs, source manifests, recovery reports, private DNS export and permanent recovery key/secondary custody. The duplicate Build Web App PDF remains documented; no deletion API is assumed.
- Record evidence date, exact commit/run/deploy, owner-reported versus provider-observed scope, what remains untested, and the next action after each milestone. Use the actual branch ref and read each GitHub commit back before reporting success.
