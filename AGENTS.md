# Default branch navigation

This `main` branch is for encrypted backup/recovery operations and navigation. The active application and canonical project documentation are on `development/backend-foundation`.

For any app continuation:
1. Read the actual development branch ref, then `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, `docs/README.md` and that branch's `AGENTS.md`.
2. Preserve all Locked decisions and source evidence. Ask product questions one at a time and record approved changes in both canonical requirements files.
3. Follow the current owner's scope. A continuity request is not permission to deploy, mutate production data, migrate SQL, change provider settings or buy services.
4. Keep main backup workflows/scripts, secrets and the pinned verified published source unchanged unless separately authorized for backup operations. Do not merge current app source into main.
5. Before reporting GitHub changes complete, verify each commit's parent/tree, actual changed paths/content and final branch ref. Never imply that a documentation commit is a live app release.

See README for direct links to the current documentation and verified consolidation commit.
