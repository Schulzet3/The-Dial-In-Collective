# Independent application review — audit pass 3

Canonical sources: [Master Specification](../MASTER_SPECIFICATION.md), [Decision Ledger](../DECISION_LEDGER.json), [Current Status](../CURRENT_STATUS.md). [Audit overview](2026-10-21-history-audit.md).

This review followed the historical requirements reconciliation and examined the application auditor's source changes against the Locked privacy, offline recovery, exact coffee identity and one-intentional-adjustment contracts. The reviewed paths were [site/cloud/main.js](../../site/cloud/main.js), [site/cloud/client.js](../../site/cloud/client.js), [site/cloud/outbox.js](../../site/cloud/outbox.js), [site/lib/engine.js](../../site/lib/engine.js), and `supabase/functions/dic-verify-coffee/{index.ts,evidence.mjs}`. No production deployment, provider mutation or owner-device acceptance was performed by this reviewer.

## Two additional defects identified and corrected in source

| Finding | Concrete failure | Source correction and evidence |
|---|---|---|
| APP-P3-01: unrelated year accepted as release proof | A matching Product named “Mango Tree Blend” described “Our company was founded in 2025. This product is from the 2024 harvest.” The initial helper accepted a submitted `2025 Harvest`. A company-history year was sufficient despite explicit evidence of another harvest. | The application auditor constrained year proof to product identity or explicit harvest/crop/release/season/selection context and rejects competing explicit release years. Named lot/release qualifiers require their complete normalized phrase. The regression includes the exact counterexample and mixed-year variants. Independent execution after the correction rejected `2025 Harvest` and `2025` and accepted `2024 Harvest`. The existing Wuri “selection for 2026” case remains covered. |
| APP-P3-02: mutation denial discarded before a failing read | Outbox converted a fresh authorization rejection into a generic rejected result. If the next read failed as a network outage, CloudApp could retain admitted status and fall back to the previously cached private workspace even though an explicit denial was already known. | Outbox now forwards access-denial state and HTTP status for fresh thrown rejections and retained rejected-event replay; CloudApp processes it before private reads or cache fallback. A failed local error annotation preserves the original durable event while still forwarding the known denial. The application auditor added a real Outbox-to-CloudApp failure regression plus retained-replay, storage-failure and unrelated-validation cases. Those executed test results belong to the application auditor's receipt, rather than to a separate independent rerun here. |

The release-evidence regression also exposed a weaker OpenGraph candidate bypassing contradictory same-title JSON-LD evidence. The application auditor moved candidate-strength selection before proof selection. The corrected evidence helper and its contradiction cases were re-read as part of this review.

The latest denied-event replay behavior requires a fresh successful server admission response before a restored member can reopen their retained rejected queue. An unavailable admission response permits no cached authorization fallback. This preserves a recovery route for restored membership while continuing to block the freshly denied case. The real SDK mutation adapter unwraps RPC errors into thrown `CloudError` values; the current SQL admission rejection raises `42501`, so the fresh-denial regression follows the actual adapter path.

## Other contract checks

- `denyAccess` clears the private workspace, forms and review state before awaiting cache deletion. Session/owner epoch checks prevent the reviewed asynchronous completions from attaching an old account's state to a newly selected account. Queued events and receipts are preserved.
- Coffee editing reads the current canonical or pending-correction revision and details instead of blindly reusing the original submission snapshot. The conflict contract therefore receives the revision the user actually opened for editing.
- Applying a temperature recommendation retains the exact numeric value even when the display rounds it. Existing draft values do not silently change solely because they were rendered and read back.
- The advice path preserves the previous dose, temperature, grind and yield for variables that are not being intentionally adjusted. This matches the Locked one-change rule. Root authorized the numeric retention repair; the literal “Basket-based” caption remains an explicitly recorded wording boundary.
- Edge official verification rechecks admission and binds returned evidence to the target submission revision. Its final transactional SQL enforcement is covered in the [independent SQL review](2026-10-21-independent-sql-review.md); this review does not imply that the new Edge function or migration has been deployed.

## Remaining boundaries that must stay visible

1. If IndexedDB cache deletion fails, the in-memory denial marker blocks the current tab, but that marker does not survive a full reload. A later fully offline reload may still find an undeleted cache. The application auditor explicitly retained this as an offline/recovery limitation under #21/#22; the present source change must not be described as guaranteeing denial across every storage failure and reload combination.
2. A denied member with unsynced events does not yet have a complete sign-out/export recovery flow in the authentication screen. Events remain durable. Export includes receipts containing private history, so this audit did not invent or enable a new denied-account export policy.
3. Hosted shot payloads and hydration still omit the Locked recommendation-origin metadata (`usedRecommendation`) implemented in the local engine. Copying a recommended value is not completion of provenance persistence. The requirement register retains this as unfinished work.
4. Bag lifecycle, Custom controls, equipment-version lifecycle and a user-visible Hide Shot action remain incomplete. Existing helper functions or queue action names are insufficient proof of delivered UI. Issue #20 remains open for the actual personal Hide Shot flow.
5. Source regression success does not repeat or replace the already recorded owner-device acceptance, and does not grant production deployment. The owner-accepted live release and its historical records remain the current baseline.

## Evidence disposition

The two concrete findings above were sent to the owning application auditor, corrected there, and re-inspected here. Independent review was bounded to the changed execution paths and their governing contracts. Full-suite counts, browser outcomes and final integration status must use the root/application auditor's dated execution receipts. No claim is made that every possible future input, network failure, storage implementation or inaccessible historical conversation has been exhaustively proved safe.
