# Default branch navigation

This `main` branch is for encrypted backup/recovery operations and navigation. The active application and canonical project documentation are on `development/backend-foundation`.

For any app continuation:
1. Read the actual development branch ref, then `docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md`, `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, `docs/README.md` and that branch's `AGENTS.md`.
2. Preserve all Locked decisions and source evidence. Ask product questions one at a time and record approved changes in both canonical requirements files.
3. Follow the current owner's scope. A continuity request is not permission to deploy, mutate production data, migrate SQL, change provider settings or buy services.
4. Keep main backup workflows/scripts, secrets and the pinned verified published source unchanged unless separately authorized for backup operations. Do not merge current app source into main.
5. Before reporting GitHub changes complete, verify each commit's parent/tree, actual changed paths/content and final branch ref. Never imply that a documentation commit is a live app release.

See README for direct links to the current documentation and verified consolidation commit.

# Operations audit continuity — October 21, 2026

- Read the current branch refs, this branch's active audit checkpoint and operations journal before changes. Any future source/test/CI change includes its contemporaneous operations journal and active checkpoint in the same commit.
- The owner-requested whole-project audit repairs release validation and snapshot-consistent recovery source. It does not authorize a new app publication or blanket future provider/data changes. Keep the separate main/application/release branch roles.
- A main update to backup/recovery paths triggers the existing live-read smoke workflows. Verify their actual results and ciphertext/isolated-target boundaries. The offsite courier does not copy push smoke artifacts; never claim a Drive receipt from a GitHub-only success.
- Current release is independently recorded in the latest journal. Original grant is consumed; never replay docs/RELEASE_REQUEST.json or equate a prepared Git claim with a published application. Native Actions push acceptance is now verified for release `eee687dd4d7fc19493139bc106e63c16849ac91d` by [run 39706556610](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39706556610) and separate Netlify READY/current readback; the prior failed attempt remains historical, and does not establish a current native-push blocker. Read the latest operations receipt before making further claims.
- Include matching tests and all helper dependencies atomically. Check exact PR CI before merging, then read back refs and every changed blob. GitHub Free/private status checks are advisory, not enforced protections.
