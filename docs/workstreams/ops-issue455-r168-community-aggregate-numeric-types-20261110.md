# Issue #455 R455-168 — source-bound SAME-COMMIT SAFE Community numeric type evidence [skip netlify]

Original live development **2cdfa50691d48e4d1dad0fc1e9b659c302a897d5**, tree **8ccd43ec57b8550331beda0177ad94acf730f0d3**. Original `site/lib/community-evidence.js` Git blob **74c93c7ff7814337752e0ef9052412eaf55890e3**; original research ledger blob **6b081be57e493b436c6a639faf4c30445a291d4c**. Main last independently recovered **11e1e8c7c36dad488519476d8a969bb682915d31**, release/production **a106f5fc0f5208b6d56710e5ccaa9d1af68c47b0**. Read AGENTS, Context Entry/PREFLIGHT, status, Master/Decision supersessions, approvals, release queue metadata, source register, #455/#335/#267/#33/#96 and open PRs. No ownership overlap found for `community-evidence.js`; #267 retains literal line audit, no duplicated credit.

## Reproduced deterministic source bug and bounded scope

Local Node22 copy of the **exact original Git blob** verified by `git hash-object == 74c93c7ff7814337752e0ef9052412eaf55890e3`. Before change, `selectCommunityPrior` admitted a verified-flag candidate with `ratio:true` as **ratio 1**, `time_s:true` as **time 1**, and singleton array values as numeric readings; higher contributor counts let malformed evidence displace a real candidate. Synthetic malformed JSON, **not an observed real member/server incident**. Historic Community values and member history are unchanged.

SAFE correction applies a primitive numeric type guard before the original established bounds: finite actual numbers or nonempty numeric strings (Postgres decimal-string compatibility), not booleans, arrays or objects. Existing style, independence, tier/count, ratio 0.5–8 and time 1–180 eligibility, contributor ranking and weak unproven provenance remain unchanged. No new scientific confidence, taste optimum, user capture, Community RLS, data mutation or Locked supersession.

## Same-commit paths / tests / limits

- `site/lib/community-evidence.js`: two existing numeric eligibility fields gated for primitive type; no source data modification.
- `tests/issue455-community-aggregate-numeric-types.test.mjs`: FOUR direct positive/negative test groups for booleans, arrays/objects, legacy decimal strings/inclusive valid boundaries, and blank/nonnumeric values.
- `docs/audits/issue455-research-source-coverage-20261103.json`: new evidence R455-EV-APP-168-A/B and proposal R455-PROP-168; **92 sources / 252 checks / 129 proposals**; original S019 PDF not available.
- This exact same-commit journal.

**Executed before remote commit:** Node **v22.16.0**, `node --test tests/issue455-community-aggregate-numeric-types.test.mjs` **4 passed / 0 failed** against patched local source. Original copied Git blob independently hash-verified, and prepatch malformed-value reproduction observed. **Not yet executed or verified:** GitHub PR-head full Node22/CI, browser/mobile/offline/SQL/security, exact merge CI, physical espresso tests. Original frozen 603 not run; no claim of pass. New test helpers use synthetic fixtures only, no live member/Auth/SQL/provider operations.

**Next:** create PR against development, inspect exact head checks and repair any failures, nonforce integrate preserving concurrent changes, verify all four merged blob SHAs and exact-source CI, then reconcile scoped CURRENT_STATUS and release queue item as READY only with passing evidence. Do not publish, deploy, move main or release/production. Owner approval not required for this type-integrity bug; any future change to Community matching/weighting/targets does require separate owner authority.

## PR-head mandatory intake failure and nonpublishing repair

Initial [approval workflow 42887528841](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42887528841) **FAILED** with exact line: `HOLD: Untracked app change; add an IN_PROGRESS/TESTING/READY queue item: site/lib/community-evidence.js`. Existing code/tests/ledger Git blobs were unchanged. SAME BRANCH docs-only correction adds `DIC-Q-455-community-aggregate-numeric-type-integrity` IN_PROGRESS with **only deployable site/lib/community-evidence.js** under `scope_paths`; tests/journals/ledger deliberately NOT listed as deployable. Failure is preserved as genuine, rerun required on revised PR head; neither original failure nor skipped frozen603 is PASS. No release approval or production write.
