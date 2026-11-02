# READY batch certification journal

## November 2, 2026 — Automatic READY batch combined-source CI (non-publishing)

Owner directed automatic READY certification to eliminate repeated manual release preparation. Added a development-branch push/dispatch workflow that validates the exact queue schema, intake and strict source-to-published coverage, then executes combined Node, cloud/offline/UI, lint and build checks. Workflow is non-publishing, has read-only contents permission, does not create a grant, and explicitly leaves offsite recovery/provider checks to release preflight. This is an implementation awaiting actual hosted workflow execution; no tests are claimed PASSED by this commit. Source parent 64e923b35e62100d05dae0f302cf78d5f3a16068; no production write or deploy.

## November 2 — Repair failed combined build gate

Exact-source GitHub run 41377555013 passed queue validation, Node, cloud/offline/UI and lint but build failed solely because this new workflow omitted the public, nonfunctional Supabase CI coordinates already established in `.github/workflows/cloud-beta-ci.yml`. Reuse that same non-secret CI environment for the build. Retest via automatic development push. No production credentials or provider changes; no deploy.

## Release exact-source five-check CI restoration — November 2

The 17-item combined certification passed at source `a2daf144e6b02e94dd29ca97a00449beba156f84`, but path-filtered legacy check workflows omitted checks on that exact SHA. Add the automatic READY certification workflow as a trigger path to the four existing CI workflows so a single nonpublishing CI-only source change runs the required `validate`, `cloud-tests`, `mobile-browser-qa`, and `sql` jobs alongside unconditional `approval`. This does not relax required checks, change product logic or publish. Retain all workflow tests and verify each exact-source conclusion before considering a release grant.

## Owner-authorized one-use Release14 grant — 2026-11-02T03:09:15.395Z

Owner explicitly directed immediate publication of the 17 READY items. Grant `DIC-20261102-READY17-14` binds to exact-source five-check passing SHA `2c8e1ffe3b83a7524968f50efca3ead4da282cf8`; no SQL/Auth/Edge/member-data operations are authorized. Historical encrypted offsite artifact metadata readback confirmed direct child of approved folder; provider routing and queue isolation remain controller-gated. This commit is a nonpublishing grant only, not a deployment or Netlify receipt.

## Release 14 deployed — November 2

Single-use GitHub controller run 41382114139 SUCCESS; release/production `8e3808f0d7532f47ea348ef9a58e5aa87d714ffe` and Netlify production deploy `6ae8006cd64b30ae9046e44d` READY/current with matching commit at 03:16:13 UTC. Seventeen formerly READY queue items now DEPLOYED; two ongoing unfinished items remain excluded. Verified encrypted `backup.age` SHA-256 and direct-child Google Drive offsite ZIP. Authenticated member-session and live DB write integrity were not exercised; no such PASS claimed.

## 2026-11-02 — release isolation hardening (no deployment)
- Added fail-closed check: a DEPLOYED-labelled item with a merged commit newer than the actual published source cannot be silently included in a future release candidate. A label alone is not a deployment receipt.
- Added regression for a prematurely marked DEPLOYED overlapping-path item; source-bound CI still required before READY. Incident #356 remains open pending end-to-end verification and the broader replacement workflow.
- No Netlify/Supabase/member data writes, no publication, no queue state promotion.

## 2026-11-02 — CI no-batch distinction and continuity incident
- The automatic CI job now reports release-queue status rather than requiring a READY release on every development push; it still runs the full combined tests, lint and build. The production controller retains its strict fail-closed release gate.
- Previous test-only commit `2e0105ba93bd859a5e617a958697164839f2893d` violated the same-commit journal rule. This entry records the defect without rewriting immutable history or falsely claiming that prior CI passed. This commit includes its own same-commit journal.
- Issue #356 source-isolation follow-up and end-to-end release rehearsal remain open; no production release or provider write.

## 2026-11-02 — post-release read-only public smoke
- Added bounded GET-only public route smoke (home, cloud shell, web manifest), reject unexpected origins/paths, redirects, HTTP failures and empty/mismatched responses; no login or production writes.
- Added focused tests and serialized post-release workflow triggered by release/production push or manual dispatch. This is a public reachability check, NOT proof that Netlify deployed the expected source SHA. Provider READY/current SHA receipt remains mandatory before DEPLOYED status.
- No deployment authorized or triggered by this development-branch change. No production member/session/SQL writes. Same-commit journal included.
