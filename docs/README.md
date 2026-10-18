# Documentation Index

**Read first for each chat/work session:** [Current Status](CURRENT_STATUS.md), [AGENTS](../AGENTS.md), [Master Specification](MASTER_SPECIFICATION.md), [Decision Ledger](DECISION_LEDGER.json), on `development/backend-foundation`. **GitHub is the owner-Locked continuously updated source of truth and work record**, not an occasional handoff. Historical reports are date-scoped; Locked decisions can change only by explicit owner approval and documented narrow supersession.

**Latest verified deployed change (2026-10-18 UTC):** The PERC/Agtron/producer/anaerobic extractor is now **published and owner-accepted**. Live Netlify [deploy `6ad4541c0e2686c05d66a4f2`](https://app.netlify.com/projects/the-dial-in-collective/deploys/6ad4541c0e2686c05d66a4f2) from GitHub `ebd2bed149f6c9fed998a861a0b8ac819fab98db`; JWT-protected Supabase `dic-preview-coffee` ACTIVE v3. The owner reported actual production URL Autofill correctly populates Mara Estate and Anaerobic; verified Agtron 78.4 remains a provisional Light suggestion under the declared assumption. Evidence/limitations in [Agtron PERC report](AGTRON_AND_PERC_NARRATIVE_EXTRACTION_2026-10-17.md), [rollout issue #32](https://github.com/Schulzet3/The-Dial-In-Collective/issues/32), and [Current Status](CURRENT_STATUS.md). **No later release is approved.**

**Next:** [#9 server-owned community eligibility/withdrawal](https://github.com/Schulzet3/The-Dial-In-Collective/issues/9), then [#11 safe anonymous Community browsing](https://github.com/Schulzet3/The-Dial-In-Collective/issues/11). Community is not yet available, and the wider PWA/recommendation/beta acceptance backlog stays open. `main` recovery source pin now references the published extractor source. A follow-up GitHub-to-Drive transfer was not verified as part of this release. The full previous status with superseded release wording is [archived here](archive/CURRENT_STATUS_PRE_PERC_OWNER_ACCEPTANCE_2026-10-18.md).

**Newest development checkpoint, not published (2026-10-18 UTC):** [Community #9 quality, privacy and lifecycle engineering](COMMUNITY_ELIGIBILITY_DEVELOPMENT_2026-10-18.md) is implemented with [network-isolated SQL CI PASS 39100628654](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39100628654). Production still has one pending-quality projection and zero eligible; **no live migration**. #9 stays open for separately approved publication/real account tests; #11 still disabled. The current status supersedes the earlier “next: implement #9” wording above without erasing dated evidence.

## Latest implementation acceptance (2026-10-17)

- [App-wide error sweep and readiness](APP_WIDE_ERROR_SWEEP_2026-10-17.md): account-transition privacy fixes, conservative extraction, bounded requests, lint/visual gates, fresh read-only provider evidence and explicit limitations. No publication.
- [Queen City exact-URL extractor handoff](QUEEN_CITY_EXTRACTOR_AND_WORK_HANDOFF_2026-10-17.md): prior exact variant/canonical public-source acceptance and preserved pre-sweep evidence.
- [Multi-roaster URL extractor current-source acceptance](COFFEE_URL_MULTIROASTER_VALIDATION_2026_10_17.md): eight of nine concrete coffee product URLs parsed live, 248 Node tests PASS, selected details and real storefront limitations. Owner approved production credits; current balance remains unverified under Locked guard.
- [Seven-tier release and exact coffee migration sequence](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md): prior production compatibility schema passed, seven-tier frontend and five approved coffee corrections published/applied in the owner-approved release.

## Development gap audit and cross-session handoff

- [Current audit reconciliation and prioritized issue backlog](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md): G01–G26 dispositions, #5 and #8–#30, verified corrections and execution order.
- [Historical Open decision crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md): all 20 original topics mapped without inventing approvals.

- [Comprehensive GitHub Gap Audit (October 16)](DIC_Comprehensive_GitHub_Audit_Handoff_2026-10-16.md) is the 26-finding, evidence-labeled read-only review of the application, workflows and requirements at development SHA `c1e8d3175be836b4a7fc92d731729583e7ebe55d`. It distinguishes confirmed missing or unexposed capabilities, risks, incomplete acceptance, provider-access limitations, Open product questions and proposed priorities. **The original audit is not a new product decision or a fresh production test.** The owner subsequently authorized the current issue backlog linked above; its tracking supersedes the audit's earlier issue-count and authorization snapshot. Verify current refs and source before acting.

## Canonical source components and provenance

The files below remain at their existing locations as preserved decision source components. Read their full content through the consolidated canonical files and apply explicit supersession scopes; earlier wording does not win merely because it says Locked.

- [BADGE_PALETTE_SOURCE.json](BADGE_PALETTE_SOURCE.json)
- [DECISION_LEDGER_2026_10_14_UX.json](DECISION_LEDGER_2026_10_14_UX.json)
- [DECISION_LEDGER_2026_10_16_URL_PREVIEW.json](DECISION_LEDGER_2026_10_16_URL_PREVIEW.json)
- [DECISION_LEDGER_2026_10_16_DAILY_BUDGET.json](DECISION_LEDGER_2026_10_16_DAILY_BUDGET.json) (12-claim owner decision; production applied and independently verified)
- [DECISION_LEDGER_2026_10_16_SEVEN_ROAST_TIERS.json](DECISION_LEDGER_2026_10_16_SEVEN_ROAST_TIERS.json) (seven Title Case roast levels and exact five coffee choices, Locked)
- [DECISION_LEDGER_2026_10_17_ONE_CLICK_URL_AUTOFILL.json](DECISION_LEDGER_2026_10_17_ONE_CLICK_URL_AUTOFILL.json) (one-click Autofill → edit/review → Add Coffee; separate Apply step superseded, Locked)
- [DECISION_LEDGER_2026_10_17_AGTRON_PROCESS_AND_PRODUCER.json](DECISION_LEDGER_2026_10_17_AGTRON_PROCESS_AND_PRODUCER.json) (Agtron-backed roast suggestions, same-product Estate and anaerobic evidence, Locked; development only)
- [AGTRON_AND_PERC_NARRATIVE_EXTRACTION_2026-10-17.md](AGTRON_AND_PERC_NARRATIVE_EXTRACTION_2026-10-17.md) (manufacturer chart, exact PERC source, tests, limits and future release gate)
- [DECISION_LEDGER_2026_10_17_RELEASE_AND_BACKUP_PREFS.json](DECISION_LEDGER_2026_10_17_RELEASE_AND_BACKUP_PREFS.json) (owner-monitored Netlify credits, approval before each release, daily backup watch and Notifications screenshot, Locked and operational)
- [SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md) (tested rollout order, production schema live, data and frontend pending)
- [DECISION_LEDGER_BACKEND_AMENDMENTS.json](DECISION_LEDGER_BACKEND_AMENDMENTS.json)
- [DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json](DECISION_LEDGER_BADGE_COLORS_AMENDMENT.json)
- [DECISION_LEDGER_BADGE_LETTERING_AMENDMENT.json](DECISION_LEDGER_BADGE_LETTERING_AMENDMENT.json)
- [DECISION_LEDGER_CLOUD_IMPLEMENTATION_STATUS.json](DECISION_LEDGER_CLOUD_IMPLEMENTATION_STATUS.json)
- [DECISION_LEDGER_IMPORT_STATUS.json](DECISION_LEDGER_IMPORT_STATUS.json)
- [DECISION_LEDGER_PRIVATE_BACKUP_AMENDMENT.json](DECISION_LEDGER_PRIVATE_BACKUP_AMENDMENT.json)
- [MASTER_SPECIFICATION_BACKEND_ADDENDUM.md](MASTER_SPECIFICATION_BACKEND_ADDENDUM.md)
- [MASTER_SPECIFICATION_BADGE_COLORS_ADDENDUM.md](MASTER_SPECIFICATION_BADGE_COLORS_ADDENDUM.md)
- [MASTER_SPECIFICATION_BADGE_LETTERING_ADDENDUM.md](MASTER_SPECIFICATION_BADGE_LETTERING_ADDENDUM.md)

Original recovered requirements and unavailable-source limits are indexed in [archive/README](archive/README.md). The [pre-consolidation status](CURRENT_STATUS_PRE_CONTINUITY_2026-10-16.md) is retained in full.

## Operational and acceptance evidence

- [EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md)

Each report may contain chronological earlier states. Read its latest reconciliation; do not treat the initial unfinished checkpoint as current.

- [COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md](COFFEE_EXTRACTION_ROAST_GRAPHICS_AND_SHOT_CLEANUP_2026-10-16.md)
- [UNIVERSAL_COFFEE_URL_IMPLEMENTATION_ACCEPTANCE_2026-10-16.md](UNIVERSAL_COFFEE_URL_IMPLEMENTATION_ACCEPTANCE_2026-10-16.md)
- [HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md](HOSTED_RECOVERY_MANAGED_SUPABASE_DRILL_2026-10-16.md)
- [EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md](EXACT_ENCRYPTED_BACKUP_ISOLATED_RESTORE_2026-10-16.md)
- [AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md](AUTOMATED_BACKUP_DELIVERY_ALERT_AUDIT_2026-10-16.md)
- [DNS_PROVIDER_FAILOVER_READINESS_2026-10-16.md](DNS_PROVIDER_FAILOVER_READINESS_2026-10-16.md)
- [HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md](HOSTED_PROVIDER_RECOVERY_INVENTORY_2026-10-16.md)

## Operational references with dated history

Use their procedures only after consulting Current Status and the current owner's scope; billing snapshots are not live balances.

- [RELEASE_AND_RECOVERY_RUNBOOK.md](RELEASE_AND_RECOVERY_RUNBOOK.md)
- [RELEASE_RECOVERY_CONTINUATION_2026-10-16.md](RELEASE_RECOVERY_CONTINUATION_2026-10-16.md)
- [NETLIFY_CREDIT_LEDGER.json](NETLIFY_CREDIT_LEDGER.json)

## Historical checkpoints and plans, archived in place

These are evidence of their own date, not independent task queues. Old next steps are superseded only to the extent Current Status cites later evidence. No deletion or link-breaking move was performed.

- [ADMIN_FOUNDATION_CHECKPOINT_2026-10-14.md](ADMIN_FOUNDATION_CHECKPOINT_2026-10-14.md)
- [BACKEND_CHECKPOINT.md](BACKEND_CHECKPOINT.md)
- [CLOUD_OWNER_TEST_CHECKPOINT.md](CLOUD_OWNER_TEST_CHECKPOINT.md)
- [COFFEE_VERIFICATION_CHECKPOINT_2026-10-14.md](COFFEE_VERIFICATION_CHECKPOINT_2026-10-14.md)
- [COMPREHENSIVE_SOURCE_AUDIT_2026-10-16.md](COMPREHENSIVE_SOURCE_AUDIT_2026-10-16.md)
- [CONSOLIDATED_OWNER_RELEASE_CHECKLIST_2026-10-14.md](CONSOLIDATED_OWNER_RELEASE_CHECKLIST_2026-10-14.md)
- [CROSS_CHAT_HANDOFF_2026-10-13.md](CROSS_CHAT_HANDOFF_2026-10-13.md)
- [HOSTED_RECOVERY_AUTH_FRONTEND_PLAN_2026-10-16.md](HOSTED_RECOVERY_AUTH_FRONTEND_PLAN_2026-10-16.md)
- [NATIVE_IMPORT_CHECKPOINT.md](NATIVE_IMPORT_CHECKPOINT.md)
- [PRIVATE_BACKUP_SETUP_CHECKPOINT.md](PRIVATE_BACKUP_SETUP_CHECKPOINT.md)
- [REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md](REAL_ACCOUNT_ACCEPTANCE_2026-10-14.md)
- [REAL_NONADMIN_COFFEE_URL_ACCEPTANCE_2026-10-16.md](REAL_NONADMIN_COFFEE_URL_ACCEPTANCE_2026-10-16.md)
- [RELEASE_2026-10-15_OWNER_PREVIEW.md](RELEASE_2026-10-15_OWNER_PREVIEW.md)
- [RELEASE_UNIVERSAL_COFFEE_URL_2026-10-16.md](RELEASE_UNIVERSAL_COFFEE_URL_2026-10-16.md)
- [UNIVERSAL_ROASTER_URL_EXTRACTION_GAP_2026-10-16.md](UNIVERSAL_ROASTER_URL_EXTRACTION_GAP_2026-10-16.md)
- [VISUAL_REFINEMENT_REVIEW_2026-10-15.md](VISUAL_REFINEMENT_REVIEW_2026-10-15.md)
