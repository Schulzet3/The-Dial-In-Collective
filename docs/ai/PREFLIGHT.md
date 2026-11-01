# Mandatory topic-relevant context preflight

**Before every substantive DIC request:** apply the automatically supplied ChatGPT Project Instructions; check live `development/backend-foundation` (or `main` for backup operations), read [CONTEXT_ENTRYPOINT](CONTEXT_ENTRYPOINT.md), and follow the topic route. This is an operating requirement, not a technical guarantee the connector will always be available.

## Scope-based levels
- **Question / brainstorming:** read the short entrypoint and relevant existing decisions, research, or history as needed; do not mutate GitHub or providers merely to answer.
- **Build/fix/update:** also read `AGENTS.md`, active checkpoint and scoped journal, current status, Master Spec, Decision Ledger, approval coverage, release queue, issues/PRs, actual current source SHA and applicable CI; then test and integrate per existing policy.
- **Sensitive/irreversible work:** independently verify production state, permissions, encrypted recovery, explicit scope and one-use release authority where applicable. A development-only prompt does not authorize deployment.
- **Audit/intake:** verify source byte hash, provenance, metadata vs direct semantic reading, privacy restrictions and separate historical/current source ledgers.

## Procedure
1. Recover the exact relevant branch SHA, identify concurrent/interrupted work and avoid trusting old chats.
2. Inspect entrypoint and choose links for the topic; retrieve only necessary live authoritative evidence.
3. Apply [AUTHORITY_RULES](AUTHORITY_RULES.md) and exact scoped supersessions; distinguish historical state and research from approval.
4. Assess scope, privacy, missing access, safety and testing requirements. If retrieval fails, disclose the limitation; safe discussion may continue but unsafe changes must fail closed.
5. Perform task, verify source/CI/provider evidence for claims, and report **completed**, **READY**, actually **DEPLOYED**, **blocked**, or **unverified** precisely.
6. Update [Source Register](SOURCE_REGISTER.json), journals and canonical authority only for newly verified lasting changes, per [MAINTENANCE](MAINTENANCE.md).

**Prohibitions:** No full code re-read per prompt; Issue #267 owns its separate line audit. No inference that a file exists merely from an index. No automatic or guaranteed connector retrieval, background monitoring, memory import, source factual certification, or publication from a documentation change.

**Minimal final audit line for substantial work:** source branch/SHA checked; authoritative topic sources checked; relevant missing evidence; actual test/provider readback; state of work.
