# Issue #10: Internal recipe family reliability

## October 23, 2026 — scope-limited development checkpoint

Owner authorization: finish internal reliability while preserving locked `RECIPE-FAMILY-INTERNAL-ONE-VISIBLE-20261020`. No alternate recipe UI, no threshold invention, no publication or production migration.

Starting development SHA: `a724a3f4fa84c03638dbc0d4c305b6b763b1240f`. Separate queued READY changes for #33 and #100 preserved.

Found an issue in the local recipe engine's correction path: when the owner explicitly chose a successful shot with Make Current, correcting that shot's yield could move it into another existing internal ratio family, while `currentFamilies` and `favoriteShots` still referenced its old family. The chooser then silently fell back to automatic selection. This violates the owner-approved manual override.

Change: move the explicit favorite pointer with that same shot when it remains green and changes family; clear the invalid favorite when a correction makes the shot non-green; do not change preferences when an unrelated shot moves. Do not mutate other shots, names, scores, or styles. Add three regression cases in `tests/recipe-family-selection.test.mjs`. No SQL, UI or public API changes.

Verification state at commit creation: **not yet tested**. Run exact-source Node/lint/build and browser-relevant CI; inspect the results and merge to development only after tests pass. Further Issue #10 lifecycle and hosted two-family acceptance criteria remain open; coordinate with #12/#13, do not assert full issue completion.

Release disposition: **IN_PROGRESS / not READY**. No Netlify publication or production changes.

## CI follow-up: intake bookkeeping

PR103 initial source checks: review, validate, cloud-tests, mobile-browser QA, security-inventory and SQL **SUCCESS**; approval job **FAIL** solely because untracked deployable path `site/lib/engine.js` lacked a queue item (approval coverage itself PASS). Add issue 10 TESTING queue item in this same corrective commit. Recheck exact commit after write; merge only after all applicable checks complete SUCCESS.
