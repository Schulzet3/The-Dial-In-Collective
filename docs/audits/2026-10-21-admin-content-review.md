# Independent review of the concurrent administrator content tranche

Canonical sources: [Master Specification](../MASTER_SPECIFICATION.md), [Decision Ledger](../DECISION_LEDGER.json), [Current Status](../CURRENT_STATUS.md). [Requirement register](2026-10-21-requirement-traceability.md). This is a separate follow-up receipt; it does not rewrite the completed three-pass historical audit.

## Reviewed scope and permission

The original concurrent checkpoint, `3e8806ddff5247a4042e970309b6ea5a10195f91`, introduced partial administrator controls associated with [issue #47](https://github.com/Schulzet3/The-Dial-In-Collective/issues/47). The later exact source snapshots `0a400f85bc4d268717660d30a9d4c46e6b66999d` and `5ab369e6755d26e0e2e2c22724722a14ed8535d6` added the narrow permission decision, server contracts and regressions. The incoming changes were reviewed and reconciled with the audit team's already staged corrections; their original intent was retained.

The new canonical key `current_owner_admin_records_edit_20261021`, decision **OPS-ADMIN-RECORDS-EDIT-20261021**, records development/build/test authorization for five ordered categories, complete paged listings, creator identity/email, administrator-only shot/private-note access, audited corrections and optional source enrichment. Only the current admitted administrator receives this expanded access through the new RPCs. The original sanitized `dic_admin_dashboard`, ordinary member isolation, anonymous Community DTOs and all 79 original Locked baseline entries remain unchanged. The owner record asserts consent to this access; the review did not independently inspect individual member consent receipts.

The historical unapplied candidate is `supabase/migrations/20261021222700_dic_admin_content_review.sql`. Supabase CLI **2.121.0** generated the current source filename [20261021224447_dic_admin_content_review.sql](../../supabase/migrations/20261021224447_dic_admin_content_review.sql) in a temporary local project. The mapping is `20261021222700_dic_admin_content_review.sql` → `20261021224447_dic_admin_content_review.sql`, a byte-identical replacement after the execution snapshot barrier, with no duplicate migration retained. Historical execution references keep the candidate filename. Its companion [admin SQL regression](../../supabase/tests/admin_content_review.sql) runs only in disposable `dic_ci` and rolls back. Neither new source migration has been applied to the hosted provider; the recorded live list remains 32 migrations. No hosted migration, production data change or deployment was performed by this reviewer.

## Confirmed findings and repairs

| Finding | Failure before repair | Source repair and regression |
|---|---|---|
| ADMIN-01: omitted shot fields | A notes-only edit assigned NULL to omitted grind/temperature. Nonlegacy shots could fail the existing required-grind check; nullable measurements could disappear. | Presence checks retain omitted values. Explicit NULL still clears a nullable field, while nonlegacy grind remains required. The fixture checks notes-only preservation, exact measurements, explicit temperature clearing and rejected grind clearing. |
| ADMIN-02: omitted canonical details | A summary-only correction cleared unrelated origin, process and other descriptive values. | Each optional field changes only when its key is supplied. The fixture compares all other canonical fields and separately verifies explicit nullable clearing. Name, roaster and release identity cannot be rewritten. |
| ADMIN-03: stale personal recipe evidence | Administrative yield or sensory edits did not run the personal-shot classifier used by ordinary member corrections. Family statistics and Current references could remain based on the previous shot. | The existing classifier runs after correction. The final revision is reread because reclassification can update the shot again. Runtime assertions cover movement from ratio 2 to ratio 4, retirement of the previous family, removal of non-green evidence, cleared unsupported Current references and a matching final audit/return revision. |
| ADMIN-04: invalid category and note limit | NULL category could fall through to account enumeration. The new 8,000-character note cap disagreed with the existing 16,000-character column contract. | NULL category is rejected explicitly. SQL and the associated frontend retain the existing 16,000-character maximum. Tests cover exactly 16,000, rejection at 16,001 and rollback of the rejected correction. |
| ADMIN-05: incomplete source-only audit | Adding an approved coffee's source URL changed `coffee_sources`, while the new audit captured only the `coffees` row. The actual added URL/source metadata was missing from that actor/revision record. | Before/after canonical snapshots now include complete source rows, ordered deterministically. A source-only correction must preserve the previous source and all canonical facts, retain the new URL as nonofficial label evidence, capture exact old/new source metadata and keep a repeated URL from creating another record. |
| ADMIN-06: invalid disposable fixture assumptions | The incoming fixture tried to seed canonical coffee under the SELECT-only authenticated role. A later synthetic setup named its grinder but its calibration omitted the matching grinder identity. | Seed writes use the existing disposable privileged harness; actual RPC calls still use authenticated or anonymous roles. The calibration now names the same synthetic grinder. The historical equipment-provenance trigger and client grants remain unchanged. |

The incoming follow-up independently corrected omitted shot grind/temperature and added positive shot/audit/provenance assertions. Those intentions were preserved in the consolidated regression together with the broader canonical-preservation and family-state checks; duplicate copies of the same fixture were not retained.

## Authorization, identity and retention checks

The source review covered the following boundaries:

- Both listing and mutation require current server-validated admission and administrator status. Public wrappers use explicit EXECUTE ACLs; the private implementation remains inaccessible through ordinary direct table grants. The new protected audit table has RLS and no direct anonymous/authenticated data permission.
- Each returned listing uses an explicit field allowlist. Creator ID/email is derived from the submitting/owning account; approved coffee attribution uses the recorded first submission. No password, session token, recovery secret or arbitrary Auth record is returned. Missing historical attribution remains missing rather than being invented.
- Each category has bounded offset/limit inputs and a stable timestamp-plus-ID ordering. Shot-note joins match both owner and shot identity. Account listings distinguish enabled and removed admitted members.
- Mutation locks the exact record and checks the expected revision before changing it. Shot owner, setup/version, basket/calibration, style and original provenance cannot be supplied through the correction allowlist. Private before/after snapshots retain original notes and measurements alongside actor, reason and revision.
- Approved canonical identity remains protected. New operator URLs are `label` evidence with an explicit nonofficial description and empty extracted field claims; the edit path does not grant official verification or replace previous source rows.
- The existing personal-shot classifier and revision trigger perform family/statistical updates. The repair reuses those rules rather than introducing a second classification algorithm. Tests inspect the final state using the privileged test harness without granting administrators another member's direct-table SELECT access.
- No historical migration, existing member RLS policy, public Community projection, production account, existing source evidence or live member record was rewritten as part of this work.

A separate UI consistency issue was handed to the application auditor: old dashboard counts describe enabled accounts and visible shots, while the new complete listings include removed admitted accounts and hidden shots. Successful page totals should drive their corresponding cards; the old sanitized endpoint remains unchanged. Its final correction and browser checks belong to the application audit receipt.

## Execution evidence

Actual PostgreSQL **17.11** first rejected the synthetic grinder/calibration mismatch through `private.capture_equipment_snapshot()`. Correcting the fixture, without altering the trigger, allowed the integrated admin regression to pass. That scoped passing attempt used migration SHA-256 `b4a5a9b57a6fa4e0a9d7dcf834255bc81eaab98ab6bf27eabda19d205dc6313d` and test SHA-256 `9c3185db7c120ab8a8c0920f8ad1b37662c3413266fd124ebdb0972993252152`.

The subsequent source-history audit repair was frozen with these exact hashes:

| File identity | SHA-256 |
|---|---|
| Historical candidate `20261021222700_dic_admin_content_review.sql` | `0d3270956fafec565afac80473289ea1eae8737fb72d6a3f51cbd5097c880276` |
| `supabase/tests/admin_content_review.sql` | `3b32341dc03e88889c7c98ad3ec2d8fc964b4e81c1773ba1538a8ab05d8cacf6` |

**Final full isolated PostgreSQL rerun: PASS.** The release auditor executed attempt 3 on PostgreSQL 17.11: all **34 source migrations** and **17 staged/final suites** completed with exit status 0, including this final source-only URL audit regression, the rewritten cross-account suite and the source-worker authorization/admission suite. The execution snapshot retained the historical `20261021222700` candidate name and the final hashes above; the CLI-generated replacement changes only that path. Earlier failed attempts remain preserved as fixture-debugging evidence. The exact tested-file manifest and full run receipt belong to the release auditor/integrating journal. This executed merged-source result is distinct from the incoming branch's earlier JS/SQL/Chromium CI claim and from hosted application.

## Remaining acceptance

The review found no further confirmed source blocker in the listed SQL boundaries after these repairs. This is bounded review and regression evidence, not a proof over every future database state or user action. The isolated execution receipt identifies the exact frozen source; remaining integrated JS/browser/continuity results belong to the corresponding audit receipts. New signed administrator/member behavior and owner-device acceptance remain separate from these fixtures and from previously completed unrelated role acceptance. Applying the migration or publishing the interface requires a separately scoped owner production authorization; the prior consumed release grant cannot be reused.
