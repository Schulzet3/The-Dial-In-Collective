# Source authority, conflicts and historical preservation

This is a navigation and adjudication policy; it never overrides the [Master Specification](../MASTER_SPECIFICATION.md), [Decision Ledger](../DECISION_LEDGER.json), or operating authority in [AGENTS](../../AGENTS.md).

1. **Explicit owner decisions:** Latest *documented, scoped, explicit* owner approval controls its precise product topic. Record any future Locked change in both canonical requirement files. Brainstorming, research hypotheses, an open PR or unfinished issue is not approval.
2. **Locked requirements:** The Master Specification and Decision Ledger govern approved product behavior and scoped supersession history. Source order alone is not a precedence rule; retain the original 79 Locked/20 Open baseline and all later evidence.
3. **Operating safety:** AGENTS, scope-specific procedures, privacy/backup/approval controls and release boundary govern actions. Current instructions never authorize unrelated deployment, SQL/Auth/Edge writes, purchases, privacy changes or deletion.
4. **Operational state:** Current Status, Release Queue, task records, current Git refs and actual provider/CI readback jointly establish status. Prefer verified live evidence for current behavior, but a green workflow cannot rewrite product authority. An old READY/DEPLOYED statement is historical unless checked.
5. **Code and tests:** Pin exact Git source SHA and run relevant checks. Code demonstrates implemented behavior—not permission to supplant a Locked requirement.
6. **Research:** Treat nine recovered Markdown reports as user-supplied synthesis, not independently certified primary literature; original citation markers need independent checking. Earlier Implementation Pack, S019 windows (heuristics), and slow-feed PDF are complementary, not substitutes. Scientific evidence informs proposals; the owner authorizes product decisions.
7. **Archives and copies:** Preserve original snapshots, hashes, migrations, receipts, immutable #267 frozen/V1/V2 records and old issue comments. When a historical document conflicts with current explicit authority, label its time and `superseded_by` reference; never modify the old wording to appear current.
8. **Conflict protocol:** Identify exact contradictory statements, record path/version/line or issue decision, determine topic and scope, check approved supersession map, then resolve only to the extent supported. If no explicit product authority exists, document the OPEN decision and ask one essential question before a product change. Never fill missing facts by inference.

[Source Register](SOURCE_REGISTER.json) records original identity, accessibility and restricted references; [Preflight](PREFLIGHT.md) applies these rules.
