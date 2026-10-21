# GitHub Free/private continuation and release safety — active owner decision (2026-10-20)

**Owner LOCKED:** Keep `Schulzet3/The-Dial-In-Collective` **PRIVATE on GitHub Free**. Do **not** propose Pro/paid upgrades or public visibility again unless the owner explicitly changes this decision. Supersedes earlier Pro-dependent setup checklist (historical text remains available in Git commit history).

## What exists and is verified

- `development/backend-foundation` is the active application branch; `main` hosts backups and an inert, manual release controller. Both returned `protected:false`; private rulesets returned 403 requiring an upgraded plan or public source. Under this account, **no enforced branch protection or required GitHub status checks are available**. GitHub Actions results are advisory even if every check passes.
- Development has work-journal-per-source-commit CI, owner-decision inventory validation, Node/lint/build, 390px browser tests, versioned release grant/consumption logic, and a simulated concurrent non-force Git push test. These catch mistakes and refuse cooperating releases, but **cannot stop an actor with direct Git write permission from bypassing them**.
- The GitHub `main` release controller is manual-only and inert; it has **no approved release grant or verified readiness variables**. Netlify still follows the prior app development branch/current deployed version, not a separate controlled release branch. Do not dispatch the controller, fabricate a grant or set its safety flags to unblock it.
- For next work session, start from actual last verified GitHub head and [active journal](ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md), not a dated SHA in this file. Keep user private data/archives intact and commit every meaningful work checkpoint.

## Free/private operating process

1. Work in small, reviewable, non-force commits to `development/backend-foundation`; update the live work journal in the same commit as every source/test/CI change. Use `[skip netlify]` for all nonrelease commits. Read back the exact GitHub SHA and branch status. Do not do new provider changes if logging/readback fails.
2. Treat GitHub Actions as **tests and alerts, not merge guards**. Wait for approval/continuity, Node/lint/build, mobile and applicable visual tests on the exact SHA; inspect failures before proceeding. Manually review changed paths and owner approval crosswalk. GitHub Free cannot make these checks mandatory for a direct push.
3. Keep all production publication inert until a NEW explicit owner approval with exact scope, unique release ID, tested SHA, and owner-accepted residual risk. Before any future release, verify Netlify publication method/source branch and credit impact, current published SHA, the unchanged empty consumption/grant state, and ensure no uncontrolled duplicate build path. A release-branch cutover is a separate **provider setting change requiring consent**. Do not spend credits merely to test release protection.
4. For any exception where fully protected single-writer release control is unavailable, pause and ask the owner to review the specific documented manual procedure and the remaining bypass risk. A non-force Git ref claim prevents two cooperative competing pushes but does **not** prevent other direct writers or an administrator's manual Netlify redeploy.
5. Keep [issue #38](https://github.com/Schulzet3/The-Dial-In-Collective/issues/38) open, with the compensating controls and boundaries labeled accurately. Do not keep asking for Pro/public visibility. No engineering change can honestly guarantee 100% recovery of text lost before it was durably written to GitHub.

## Exact next action

Apply the [revised ChatGPT Project instructions](CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md) in ChatGPT Project Settings (not writable by this connector). Continue feature work in private GitHub Free with the checks above. **No subscription, Netlify release, release branch, user data or provider setting change is authorized by this plan.**
